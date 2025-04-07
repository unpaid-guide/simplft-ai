import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import DiscountApprovalList from "@/components/discount/discount-approval-list";
import DiscountRequestForm from "@/components/discount/discount-request-form";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Percent, CheckCircle } from "lucide-react";

export default function DiscountApprovals() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(user?.role === "admin" ? "pending" : "request");

  if (!user) {
    return <div>Loading...</div>;
  }

  // Admin views pending approvals, sales can request discounts
  const isAdmin = user.role === "admin";
  const isSales = user.role === "sales";

  if (!isAdmin && !isSales) {
    return (
      <DashboardLayout>
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <h1 className="text-2xl font-semibold text-gray-900">Access Denied</h1>
            <p className="mt-2 text-gray-600">
              You don't have permission to access the discount approval system.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Discount Management</h1>
          <p className="mt-1 text-gray-500">
            {isAdmin 
              ? "Review and manage discount requests from the sales team" 
              : "Request special discounts for customers"
            }
          </p>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
          {isAdmin && isSales ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full max-w-md grid grid-cols-2">
                <TabsTrigger value="pending" className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Pending Approvals
                </TabsTrigger>
                <TabsTrigger value="request" className="flex items-center">
                  <Percent className="mr-2 h-4 w-4" />
                  Request Discount
                </TabsTrigger>
              </TabsList>
              <TabsContent value="pending" className="mt-6">
                <DiscountApprovalList />
              </TabsContent>
              <TabsContent value="request" className="mt-6">
                <DiscountRequestForm />
              </TabsContent>
            </Tabs>
          ) : isAdmin ? (
            <DiscountApprovalList />
          ) : (
            <DiscountRequestForm />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
