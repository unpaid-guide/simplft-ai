import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import SubscriptionPlans from "@/components/subscription/subscription-plans";
import TokenUsage from "@/components/subscription/token-usage";
import { Coins, Package } from "lucide-react";

export default function Subscriptions() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("plans");

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Subscriptions</h1>
          <p className="mt-1 text-gray-500">
            Manage your subscription plans and token usage
          </p>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-gray-100 p-1">
              <TabsTrigger 
                value="plans" 
                className="flex items-center" 
                data-state={activeTab === "plans" ? "active" : ""}
              >
                <Package className="mr-2 h-4 w-4" />
                Subscription Plans
              </TabsTrigger>
              
              {/* Only show token usage tab for customers */}
              {(user.role === "customer" || user.role === "admin") && (
                <TabsTrigger 
                  value="tokens" 
                  className="flex items-center"
                  data-state={activeTab === "tokens" ? "active" : ""}
                >
                  <Coins className="mr-2 h-4 w-4" />
                  Token Usage
                </TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="plans" className="mt-6">
              <SubscriptionPlans />
            </TabsContent>
            
            {(user.role === "customer" || user.role === "admin") && (
              <TabsContent value="tokens" className="mt-6">
                <TokenUsage />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}
