import { useState } from "react";
import { Link } from "wouter";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  ReceiptIcon, 
  FilePieChart, 
  DollarSign, 
  PieChart, 
  TrendingUp, 
  FileText,
  CreditCard,
  ShoppingBag,
  Percent
} from "lucide-react";

export default function AccountingDashboard() {
  const { user } = useAuth();

  // Fetch accounts summary
  const { data: accountsSummary, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["/api/accounts/summary"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/accounts/summary");
      if (!response.ok) return {
        assetTotal: 0,
        liabilityTotal: 0,
        equityTotal: 0,
        incomeTotal: 0,
        expenseTotal: 0,
        accountsCount: 0
      };
      return response.json();
    },
  });

  // Fetch expenses summary
  const { data: expensesSummary, isLoading: isLoadingExpenses } = useQuery({
    queryKey: ["/api/expenses/summary"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/expenses/summary");
      if (!response.ok) return {
        totalExpenses: 0,
        pendingExpenses: 0,
        approvedExpenses: 0,
        expensesCount: 0
      };
      return response.json();
    },
  });

  // Fetch VAT returns summary
  const { data: vatSummary, isLoading: isLoadingVat } = useQuery({
    queryKey: ["/api/vat-returns/summary"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/vat-returns/summary");
      if (!response.ok) return {
        nextDueDate: null,
        pendingReturns: 0,
        totalPaid: 0,
        returnsCount: 0
      };
      return response.json();
    },
  });

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100); // Convert cents to dollars for display
  }

  // Format date if it exists
  function formatDate(dateString: string | null) {
    if (!dateString) return "None";
    return new Date(dateString).toLocaleDateString();
  }

  // Check if user has finance or admin role
  const hasFinanceAccess = user && (user.role === "admin" || user.role === "finance");

  if (!user) {
    return <div>Loading...</div>;
  }

  // If user doesn't have finance role, show access denied
  if (!hasFinanceAccess) {
    return (
      <DashboardLayout>
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <h1 className="text-2xl font-semibold text-gray-900">Accounting & Finance</h1>
            <div className="mt-8 text-center">
              <h2 className="text-lg font-medium text-red-600">Access Denied</h2>
              <p className="mt-2 text-gray-600">
                You don't have permission to access the accounting and finance management page.
                Please contact an administrator if you need access.
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Accounting & Finance</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage financial records, expenses and VAT returns
          </p>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
          {/* Financial Overview Section */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Financial Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Chart of Accounts Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <BookOpen className="mr-2 h-5 w-5 text-primary" />
                    Chart of Accounts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingAccounts ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        <span className="text-gray-500">Assets:</span>
                        <span className="text-right font-medium">{formatCurrency(accountsSummary?.assetTotal || 0)}</span>
                        
                        <span className="text-gray-500">Liabilities:</span>
                        <span className="text-right font-medium">{formatCurrency(accountsSummary?.liabilityTotal || 0)}</span>
                        
                        <span className="text-gray-500">Equity:</span>
                        <span className="text-right font-medium">{formatCurrency(accountsSummary?.equityTotal || 0)}</span>
                        
                        <span className="text-gray-500">Income:</span>
                        <span className="text-right font-medium">{formatCurrency(accountsSummary?.incomeTotal || 0)}</span>
                        
                        <span className="text-gray-500">Expenses:</span>
                        <span className="text-right font-medium">{formatCurrency(accountsSummary?.expenseTotal || 0)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Link href="/accounting/accounts">
                    <Button className="w-full">Manage Accounts</Button>
                  </Link>
                </CardFooter>
              </Card>

              {/* Expenses Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <ReceiptIcon className="mr-2 h-5 w-5 text-primary" />
                    Expenses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingExpenses ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        <span className="text-gray-500">Total Expenses:</span>
                        <span className="text-right font-medium">{formatCurrency(expensesSummary?.totalExpenses || 0)}</span>
                        
                        <span className="text-gray-500">Pending:</span>
                        <span className="text-right font-medium">{formatCurrency(expensesSummary?.pendingExpenses || 0)}</span>
                        
                        <span className="text-gray-500">Approved:</span>
                        <span className="text-right font-medium">{formatCurrency(expensesSummary?.approvedExpenses || 0)}</span>
                        
                        <span className="text-gray-500">Count:</span>
                        <span className="text-right font-medium">{expensesSummary?.expensesCount || 0} expenses</span>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Link href="/accounting/expenses">
                    <Button className="w-full">Manage Expenses</Button>
                  </Link>
                </CardFooter>
              </Card>

              {/* VAT Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Percent className="mr-2 h-5 w-5 text-primary" />
                    VAT Returns
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingVat ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        <span className="text-gray-500">Next Due Date:</span>
                        <span className="text-right font-medium">{formatDate(vatSummary?.nextDueDate)}</span>
                        
                        <span className="text-gray-500">Pending Returns:</span>
                        <span className="text-right font-medium">{vatSummary?.pendingReturns || 0}</span>
                        
                        <span className="text-gray-500">Total Paid:</span>
                        <span className="text-right font-medium">{formatCurrency(vatSummary?.totalPaid || 0)}</span>
                        
                        <span className="text-gray-500">Total Returns:</span>
                        <span className="text-right font-medium">{vatSummary?.returnsCount || 0} returns</span>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Link href="/accounting/vat-returns">
                    <Button className="w-full">Manage VAT Returns</Button>
                  </Link>
                </CardFooter>
              </Card>
            </div>
          </div>

          {/* Accounting Tools Section */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Accounting Tools</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              <Link href="/accounting/accounts">
                <Card className="h-full cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BookOpen className="mr-2 h-5 w-5 text-primary" />
                      Chart of Accounts
                    </CardTitle>
                    <CardDescription>
                      Manage your financial accounts structure
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      <li>Create and manage accounts</li>
                      <li>Track assets, liabilities, and equity</li>
                      <li>Monitor income and expenses</li>
                    </ul>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/accounting/expenses">
                <Card className="h-full cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <ReceiptIcon className="mr-2 h-5 w-5 text-primary" />
                      Expense Management
                    </CardTitle>
                    <CardDescription>
                      Track and manage company expenses
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      <li>Record business expenses</li>
                      <li>Approval workflow</li>
                      <li>VAT tracking and recovery</li>
                    </ul>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/accounting/vat-returns">
                <Card className="h-full cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FilePieChart className="mr-2 h-5 w-5 text-primary" />
                      VAT Returns
                    </CardTitle>
                    <CardDescription>
                      Manage VAT returns (UAE 5% standard rate)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      <li>Create and submit VAT returns</li>
                      <li>Auto-calculate VAT from records</li>
                      <li>Track VAT payment status</li>
                    </ul>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/reports">
                <Card className="h-full cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="mr-2 h-5 w-5 text-primary" />
                      Financial Reports
                    </CardTitle>
                    <CardDescription>
                      Generate and view financial reports
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      <li>Profit and loss statements</li>
                      <li>Balance sheet reports</li>
                      <li>Cash flow analysis</li>
                    </ul>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/invoices">
                <Card className="h-full cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CreditCard className="mr-2 h-5 w-5 text-primary" />
                      Invoices & Payments
                    </CardTitle>
                    <CardDescription>
                      Manage customer invoices and payments
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      <li>Generate and send invoices</li>
                      <li>Track payment status</li>
                      <li>Process refunds</li>
                    </ul>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/products-management">
                <Card className="h-full cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <ShoppingBag className="mr-2 h-5 w-5 text-primary" />
                      Products & Pricing
                    </CardTitle>
                    <CardDescription>
                      Manage products, categories and pricing
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      <li>Set up product categories</li>
                      <li>Manage internal costs and sales prices</li>
                      <li>Configure VAT rates for products</li>
                    </ul>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}