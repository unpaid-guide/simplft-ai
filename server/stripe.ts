import Stripe from "stripe";
import { storage } from "./storage";
import { InsertSubscription } from "@shared/schema";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY environment variable is not set. Stripe functionality will be disabled.");
}

// Initialize Stripe with fallback to prevent errors
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "DISABLED_NO_KEY_PROVIDED";
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2023-10-16",
});

export async function isStripeConfigured(): Promise<boolean> {
  return !!process.env.STRIPE_SECRET_KEY;
}

export async function createPaymentIntent(amount: number, currency: string = "usd"): Promise<Stripe.PaymentIntent> {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured");
  }

  return stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert dollars to cents
    currency,
  });
}

export async function createOrRetrieveCustomer(userId: number, email: string, name: string): Promise<string> {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured");
  }

  // Get user
  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // If user already has a Stripe customer ID, return it
  if (user.stripe_customer_id) {
    return user.stripe_customer_id;
  }

  // Create a new customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      userId: userId.toString(),
    },
  });

  // Update user with Stripe customer ID
  await storage.updateStripeCustomerId(userId, customer.id);

  return customer.id;
}

export async function createSubscription(
  userId: number,
  planId: number,
  paymentMethodId: string
): Promise<{ subscriptionId: string; clientSecret?: string }> {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured");
  }

  // Get user and plan
  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const plan = await storage.getPlan(planId);
  if (!plan) {
    throw new Error("Plan not found");
  }

  if (!plan.stripe_price_id) {
    throw new Error("Plan does not have a Stripe price ID");
  }

  // Get or create customer
  let customerId = user.stripe_customer_id;
  if (!customerId) {
    customerId = await createOrRetrieveCustomer(userId, user.email, user.name);
  }

  // Attach payment method to customer
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });

  // Set default payment method
  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });

  // Create subscription
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: plan.stripe_price_id }],
    expand: ["latest_invoice.payment_intent"],
  });

  // Create subscription in our database
  const now = new Date();
  const subscriptionEnd = new Date();
  subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1); // Add 1 month by default

  const newSubscription: InsertSubscription = {
    user_id: userId,
    plan_id: planId,
    stripe_subscription_id: subscription.id,
    status: subscription.status === "active" ? "active" : "pending",
    token_balance: plan.token_amount,
    auto_renew: true,
    current_period_start: new Date(subscription.current_period_start * 1000),
    current_period_end: new Date(subscription.current_period_end * 1000),
    end_date: subscriptionEnd,
  };

  await storage.createSubscription(newSubscription);

  // Return subscription ID and client secret for payment confirmation
  return {
    subscriptionId: subscription.id,
    clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
  };
}

export async function handleSubscriptionUpdated(subscriptionId: string): Promise<void> {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured");
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  // Find our subscription by Stripe ID
  const subscriptions = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripe_subscription_id, subscriptionId));
  
  if (subscriptions.length === 0) {
    console.warn(`Subscription ${subscriptionId} not found in our database`);
    return;
  }
  
  const subscription = subscriptions[0];
  
  // Update subscription status
  await storage.updateSubscription(subscription.id, {
    status: stripeSubscription.status === "active" ? "active" : 
           stripeSubscription.status === "canceled" ? "expired" : "pending",
    current_period_start: new Date(stripeSubscription.current_period_start * 1000),
    current_period_end: new Date(stripeSubscription.current_period_end * 1000),
  });
}

export async function handlePaymentIntentSucceeded(paymentIntentId: string): Promise<void> {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured");
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  
  // Find invoices with this payment intent
  const invoices = await db
    .select()
    .from(invoices)
    .where(eq(invoices.stripe_payment_intent_id, paymentIntentId));
  
  if (invoices.length > 0) {
    // Mark invoice as paid
    await storage.markInvoiceAsPaid(invoices[0].id, "credit_card", paymentIntentId);
  }
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured");
  }

  await stripe.subscriptions.cancel(subscriptionId);
}

export async function updateSubscriptionQuantity(subscriptionId: string, quantity: number): Promise<void> {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured");
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const itemId = subscription.items.data[0].id;

  await stripe.subscriptions.update(subscriptionId, {
    items: [{ id: itemId, quantity }],
  });
}

export default {
  isStripeConfigured,
  createPaymentIntent,
  createOrRetrieveCustomer,
  createSubscription,
  handleSubscriptionUpdated,
  handlePaymentIntentSucceeded,
  cancelSubscription,
  updateSubscriptionQuantity,
};
