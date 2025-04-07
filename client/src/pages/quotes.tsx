import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import QuoteList from "@/components/quotes/quote-list";
import CreateQuote from "@/components/quotes/create-quote";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";

export default function Quotes() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const isCreating = location.includes("/create");

  if (!user) {
    return <div>Loading...</div>;
  }

  // Only admin, sales, and finance roles can create quotes
  const canCreateQuote = ["admin", "sales", "finance"].includes(user.role);

  return (
    <DashboardLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex justify-between items-center">
            {isCreating ? (
              <>
                <div className="flex items-center">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate("/quotes")}
                    className="mr-2"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <h1 className="text-2xl font-semibold text-gray-900">Create Quote</h1>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-semibold text-gray-900">Quotes</h1>
                {canCreateQuote && (
                  <Button onClick={() => navigate("/quotes/create")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Quote
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
          {isCreating ? <CreateQuote /> : <QuoteList />}
        </div>
      </div>
    </DashboardLayout>
  );
}
