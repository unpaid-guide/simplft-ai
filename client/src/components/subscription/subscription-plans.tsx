import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Coins, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface PlanCardProps {
  plan: {
    id: number;
    name: string;
    description: string;
    price: number;
    token_amount: number;
    features: string[];
    is_active: boolean;
  };
  isPopular?: boolean;
  onSelectPlan: (planId: number) => void;
  isCurrentPlan?: boolean;
}

const PlanCard = ({ plan, isPopular, onSelectPlan, isCurrentPlan }: PlanCardProps) => {
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  return (
    <Card className={`flex flex-col ${isPopular ? 'border-primary shadow-lg' : ''}`}>
      {isPopular && (
        <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
          <Badge className="bg-primary hover:bg-primary text-white">Popular</Badge>
        </div>
      )}
      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="mb-4">
          <span className="text-3xl font-bold">{formatCurrency(plan.price)}</span>
          <span className="text-gray-500">/month</span>
        </div>
        <div className="flex items-center mb-4 text-primary font-medium">
          <Coins className="h-5 w-5 mr-2" />
          <span>{plan.token_amount.toLocaleString()} tokens per month</span>
        </div>
        <ul className="space-y-2">
          {(plan.features || []).map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
              <span className="text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button 
          className={`w-full ${isCurrentPlan ? 'bg-green-600 hover:bg-green-700' : ''}`}
          variant={isCurrentPlan ? "default" : "outline"}
          disabled={isCurrentPlan}
          onClick={() => onSelectPlan(plan.id)}
        >
          {isCurrentPlan ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Current Plan
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default function SubscriptionPlans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();

  // Fetch plans
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['/api/plans'],
    queryFn: async () => {
      const response = await fetch('/api/plans');
      if (!response.ok) {
        throw new Error('Failed to fetch plans');
      }
      return response.json();
    },
  });

  // Fetch active subscription
  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['/api/subscriptions/active'],
    queryFn: async () => {
      const response = await fetch('/api/subscriptions/active');
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch subscription');
      }
      return response.json();
    },
  });

  // Handle plan selection
  const handleSelectPlan = (planId: number) => {
    // If already subscribed, handle plan change
    if (subscription) {
      toast({
        title: 'Change subscription',
        description: 'You are about to change your subscription plan.',
      });
    }
    
    // Navigate to checkout with plan ID
    navigate(`/checkout?plan=${planId}`);
  };

  // Check if a plan is the current active plan
  const isCurrentPlan = (planId: number) => {
    return subscription && subscription.plan_id === planId;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-2">Choose the Right Plan</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Select a subscription plan that best suits your needs. All plans include access 
          to our core services and token allocation.
        </p>
      </div>

      {plansLoading || subscriptionLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-primary border-r-transparent align-[-0.125em]" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-2 text-gray-600">Loading subscription plans...</p>
        </div>
      ) : plans && plans.length > 0 ? (
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan: any, index: number) => (
            <PlanCard
              key={plan.id}
              plan={{
                ...plan,
                features: plan.features || [
                  "Core platform access",
                  `${plan.token_amount.toLocaleString()} tokens per month`,
                  "24/7 customer support",
                  "API access",
                  "Usage analytics"
                ]
              }}
              isPopular={index === 1} // Make the middle plan "popular"
              onSelectPlan={handleSelectPlan}
              isCurrentPlan={isCurrentPlan(plan.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600">No subscription plans available</p>
        </div>
      )}

      <div className="max-w-4xl mx-auto mt-16">
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Need a custom plan?</h3>
          <p className="text-gray-600 mb-4">
            If none of our standard plans meet your requirements, we offer custom solutions 
            tailored to your specific needs. Our consultative approach ensures you get exactly 
            what your business requires.
          </p>
          <Button variant="outline">Contact Sales for Custom Pricing</Button>
        </div>
      </div>
    </div>
  );
}
