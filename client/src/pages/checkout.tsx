import { useState, useEffect } from "react";
import { useLocation, useSearch, Link, Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { 
  Elements, 
  PaymentElement, 
  useStripe, 
  useElements 
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  CreditCard, 
  CheckCircle2, 
  Package, 
  Coins, 
  ArrowRight, 
  AlertCircle, 
  Loader2,
  FileText
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Make sure to call loadStripe outside of a component's render to avoid
// recreating the Stripe object on every render
// Mock Stripe Promise for development
const stripePromise = null;
// We'll re-enable this when Stripe keys are available
// const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || "");

// Payment form component
const CheckoutForm = ({ total, invoiceId }: { total: number, invoiceId?: number }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const [_, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/subscriptions", // Redirect on success
      },
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(error.message || "An unexpected error occurred");
      toast({
        title: "Payment failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
      setIsLoading(false);
    } else {
      // Payment succeeded
      toast({
        title: "Payment successful",
        description: "Thank you for your payment!",
      });
      // Redirect to subscriptions page
      navigate("/subscriptions");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <PaymentElement />
        
        {errorMessage && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
      
      <Button
        type="submit"
        className="w-full"
        disabled={!stripe || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Pay ${(total / 100).toFixed(2)}
          </>
        )}
      </Button>
    </form>
  );
};

// Main checkout page component
export default function Checkout() {
  const { user } = useAuth();
  const [search] = useSearch();
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState<string>("");

  // Parse URL search params
  const searchParams = new URLSearchParams(search);
  const planId = searchParams.get("plan");
  const invoiceId = searchParams.get("invoice");

  // Fetch plan details if planId is provided
  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: planId ? [`/api/plans/${planId}`] : null,
    queryFn: async () => {
      if (!planId) return null;
      const response = await fetch(`/api/plans/${planId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch plan details");
      }
      return response.json();
    },
    enabled: !!planId,
  });

  // Fetch invoice details if invoiceId is provided
  const { data: invoice, isLoading: invoiceLoading } = useQuery({
    queryKey: invoiceId ? [`/api/invoices/${invoiceId}`] : null,
    queryFn: async () => {
      if (!invoiceId) return null;
      const response = await fetch(`/api/invoices/${invoiceId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch invoice details");
      }
      return response.json();
    },
    enabled: !!invoiceId,
  });

  useEffect(() => {
    // Create a PaymentIntent as soon as the page loads
    if (plan || invoice) {
      const createPaymentIntent = async () => {
        try {
          let amount;
          let intentData: any = {};
          
          if (plan) {
            amount = plan.price;
            intentData = { planId: parseInt(planId!) };
          } else if (invoice) {
            amount = invoice.total;
            intentData = { invoiceId: parseInt(invoiceId!) };
          } else {
            return;
          }
          
          const response = await apiRequest("POST", "/api/create-payment-intent", {
            amount: amount / 100, // Convert cents to dollars for API
            ...intentData
          });
          
          const data = await response.json();
          setClientSecret(data.clientSecret);
        } catch (error) {
          console.error("Error creating payment intent:", error);
          toast({
            title: "Error",
            description: "Failed to initialize payment. Please try again.",
            variant: "destructive",
          });
        }
      };

      createPaymentIntent();
    }
  }, [plan, invoice, planId, invoiceId, toast]);

  // Redirect if no plan or invoice was specified
  if (!planId && !invoiceId) {
    return <Redirect to="/subscriptions" />;
  }

  // Loading state
  if ((planId && planLoading) || (invoiceId && invoiceLoading)) {
    return (
      <DashboardLayout>
        <div className="py-6">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center justify-center h-96">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
              <h2 className="text-lg font-medium">Loading checkout information...</h2>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // If we have client secret, render the checkout form
  const amount = plan ? plan.price : invoice ? invoice.total : 0;

  return (
    <DashboardLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Checkout</h1>
          <p className="mt-1 text-gray-500">
            Complete your payment securely
          </p>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Checkout Form */}
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="mr-2 h-5 w-5 text-primary" />
                    Payment Information
                  </CardTitle>
                  <CardDescription>
                    Complete your purchase securely with Stripe
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-6 border rounded-md bg-blue-50 text-center">
                    <CreditCard className="h-16 w-16 mx-auto mb-4 text-primary" />
                    <h3 className="text-lg font-medium mb-2">Payment System Disabled</h3>
                    <p className="text-gray-600 mb-4">
                      The payment system is currently disabled. Payments will be processed manually.
                    </p>
                    <div className="mt-4">
                      <Button variant="outline" className="w-full mb-2" onClick={() => window.history.back()}>
                        Go Back
                      </Button>
                      {invoiceId && (
                        <p className="text-sm text-gray-500 mt-2">
                          Invoice #{invoiceId} - Total: ${(amount / 100).toFixed(2)}
                        </p>
                      )}
                      {planId && (
                        <p className="text-sm text-gray-500 mt-2">
                          Plan: {plan?.name} - ${(amount / 100).toFixed(2)}/month
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  {plan && (
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center mr-3">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">{plan.name} Plan</h3>
                          <p className="text-sm text-gray-500">
                            Monthly subscription
                          </p>
                        </div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-md flex items-center">
                        <Coins className="h-5 w-5 text-primary mr-2" />
                        <span className="text-sm">
                          {plan.token_amount.toLocaleString()} tokens per month
                        </span>
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Subtotal</span>
                          <span>${(plan.price / 100).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span>Total</span>
                          <span>${(plan.price / 100).toFixed(2)}/month</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {invoice && (
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center mr-3">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">Invoice #{invoice.invoice_number}</h3>
                          <p className="text-sm text-gray-500">
                            Due: {new Date(invoice.due_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Subtotal</span>
                          <span>${(invoice.subtotal / 100).toFixed(2)}</span>
                        </div>
                        {invoice.discount_amount > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Discount</span>
                            <span>-${(invoice.discount_amount / 100).toFixed(2)}</span>
                          </div>
                        )}
                        {invoice.tax > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Tax</span>
                            <span>${(invoice.tax / 100).toFixed(2)}</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between font-medium">
                          <span>Total</span>
                          <span>${(invoice.total / 100).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  <div className="flex items-center text-sm text-gray-500">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mr-2" />
                    Secure payment processing by Stripe
                  </div>
                  <div className="w-full">
                    {planId ? (
                      <Link href="/subscriptions">
                        <Button variant="outline" className="w-full">
                          Back to Plans
                        </Button>
                      </Link>
                    ) : (
                      <Link href="/invoices">
                        <Button variant="outline" className="w-full">
                          Back to Invoices
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
