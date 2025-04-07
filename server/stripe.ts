import { storage } from "./storage";
import { InsertSubscription } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { subscriptions, invoices } from "@shared/schema";

// Stripe functionality is intentionally disabled per user request
console.warn("STRIPE_SECRET_KEY environment variable is not set. Stripe functionality will be disabled.");

export async function isStripeConfigured(): Promise<boolean> {
  // Always return false since we're disabling Stripe functionality
  return false;
}

// Mock PaymentIntent interface for TypeScript compatibility
export interface PaymentIntent {
  id: string;
  client_secret: string;
  status: string;
  amount: number;
  currency: string;
}

export async function createPaymentIntent(amount: number, currency: string = "usd"): Promise<PaymentIntent> {
  // Return a mock payment intent since Stripe is disabled
  return {
    id: `mock_pi_${Date.now()}`,
    client_secret: `mock_secret_${Date.now()}`,
    status: "succeeded",
    amount: Math.round(amount * 100),
    currency
  };
}

export async function createOrRetrieveCustomer(userId: number, email: string, name: string): Promise<string> {
  // Get user
  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // If user already has a customer ID, return it
  if (user.stripe_customer_id) {
    return user.stripe_customer_id;
  }

  // Create a mock customer ID
  const mockCustomerId = `mock_cus_${Date.now()}`;
  
  // Update user with mock customer ID
  await storage.updateStripeCustomerId(userId, mockCustomerId);

  return mockCustomerId;
}

export async function createSubscription(
  userId: number,
  planId: number,
  paymentMethodId: string
): Promise<{ subscriptionId: string; clientSecret?: string }> {
  // Get user and plan
  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const plan = await storage.getPlan(planId);
  if (!plan) {
    throw new Error("Plan not found");
  }

  // Create a mock subscription ID
  const mockSubscriptionId = `mock_sub_${Date.now()}`;
  
  // Create subscription in our database directly
  const now = new Date();
  const subscriptionEnd = new Date();
  subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1); // Add 1 month by default

  const newSubscription: InsertSubscription = {
    user_id: userId,
    plan_id: planId,
    stripe_subscription_id: mockSubscriptionId,
    status: "active",
    token_balance: plan.token_amount,
    auto_renew: true,
    end_date: subscriptionEnd
  };

  await storage.createSubscription(newSubscription);

  // Return mock subscription ID
  return {
    subscriptionId: mockSubscriptionId,
    clientSecret: `mock_secret_${Date.now()}`
  };
}

export async function handleSubscriptionUpdated(subscriptionId: string): Promise<void> {
  // No-op since we're not using Stripe
  console.log(`Subscription update requested for ${subscriptionId} (no-op since Stripe is disabled)`);
  
  // If actually needed, we could do something like this:
  // const subs = await db.select().from(subscriptions).where(eq(subscriptions.stripe_subscription_id, subscriptionId));
  // if (subs.length > 0) {
  //   await storage.updateSubscription(subs[0].id, { status: "active" });
  // }
}

export async function handlePaymentIntentSucceeded(paymentIntentId: string): Promise<void> {
  // Mark invoices as paid directly if needed
  console.log(`Payment intent success for ${paymentIntentId} (no-op since Stripe is disabled)`);
  
  // If actually needed, we could do something like:
  // const invoicesList = await db.select().from(invoices).where(eq(invoices.stripe_payment_intent_id, paymentIntentId));
  // if (invoicesList.length > 0) {
  //   await storage.markInvoiceAsPaid(invoicesList[0].id, "credit_card", paymentIntentId);
  // }
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  // Find our subscription by ID directly in our database and update it
  console.log(`Subscription cancellation requested for ${subscriptionId} (no-op since Stripe is disabled)`);
}

export async function updateSubscriptionQuantity(subscriptionId: string, quantity: number): Promise<void> {
  // Update subscription quantity directly in our database if needed
  console.log(`Subscription quantity update requested for ${subscriptionId} to ${quantity} (no-op since Stripe is disabled)`);
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
