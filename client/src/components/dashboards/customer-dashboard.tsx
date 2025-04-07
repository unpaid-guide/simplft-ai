import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Coins,
  Package,
  Calendar,
  ArrowUpRight,
  FileText,
  CreditCard,
  Clock,
  Check,
  AlertCircle,
} from "lucide-react";

interface TokenCardProps {
  subscription: any;
}

const TokenBalanceCard = ({ subscription }: TokenCardProps) => {
  // Calculate token usage percentage
  const totalTokens = subscription?.plan?.token_amount || 0;
  const remainingTokens = subscription?.token_balance || 0;
  const usedTokens = totalTokens - remainingTokens;
  const usagePercentage = totalTokens > 0 ? (usedTokens / totalTokens) * 100 : 0;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Token Balance</h3>
          <Coins className="h-5 w-5 text-primary" />
        </div>
        <div className="mb-4">
          <span className="text-3xl font-bold">{remainingTokens}</span>
          <span className="text-gray-500 ml-2">/ {totalTokens} tokens remaining</span>
        </div>
        <Progress value={usagePercentage} className="h-2 mb-2" />
        <div className="flex justify-between text-sm text-gray-500">
          <span>{usagePercentage.toFixed(0)}% used</span>
          <span>{usedTokens} tokens consumed</span>
        </div>
        <div className="mt-4">
          <Button variant="outline" className="w-full">
            Purchase Additional Tokens
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface SubscriptionCardProps {
  subscription: any;
}

const SubscriptionInfoCard = ({ subscription }: SubscriptionCardProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Subscription</h3>
          <Package className="h-5 w-5 text-primary" />
        </div>
        <div className="mb-2">
          <span className="text-xl font-bold">{subscription?.plan?.name || "No active plan"}</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500">Status</span>
            <span className="font-medium capitalize">
              {subscription?.status === "active" ? (
                <span className="text-green-600 flex items-center">
                  Active <Check className="ml-1 h-4 w-4" />
                </span>
              ) : subscription?.status === "pending" ? (
                <span className="text-amber-600 flex items-center">
                  Pending <Clock className="ml-1 h-4 w-4" />
                </span>
              ) : (
                <span className="text-red-600 flex items-center">
                  Expired <AlertCircle className="ml-1 h-4 w-4" />
                </span>
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Monthly Fee</span>
            <span className="font-medium">
              ${((subscription?.plan?.price || 0) / 100).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Renews On</span>
            <span className="font-medium">
              {subscription?.current_period_end
                ? new Date(subscription.current_period_end).toLocaleDateString()
                : "N/A"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Auto Renew</span>
            <span className="font-medium">{subscription?.auto_renew ? "Yes" : "No"}</span>
          </div>
        </div>
        <div className="mt-4">
          <Button variant="outline" className="w-full">
            Manage Subscription
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface RecentInvoiceCardProps {
  invoice: any;
}

const RecentInvoiceCard = ({ invoice }: RecentInvoiceCardProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Recent Invoice</h3>
          <FileText className="h-5 w-5 text-primary" />
        </div>
        {invoice ? (
          <>
            <div className="mb-2">
              <span className="text-xl font-bold">
                ${((invoice.total || 0) / 100).toFixed(2)}
              </span>
              <span className="text-gray-500 ml-2">
                {invoice.status === "paid" ? (
                  <span className="text-green-600">Paid</span>
                ) : invoice.status === "pending" ? (
                  <span className="text-amber-600">Due</span>
                ) : (
                  <span className="text-red-600">Overdue</span>
                )}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Invoice #</span>
                <span className="font-medium">{invoice.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span className="font-medium">
                  {new Date(invoice.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Due Date</span>
                <span className="font-medium">
                  {new Date(invoice.due_date).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="mt-4 flex space-x-2">
              <Button variant="default" className="flex-1">
                <CreditCard className="mr-2 h-4 w-4" /> Pay Now
              </Button>
              <Button variant="outline" className="flex-1">
                View Details
              </Button>
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-gray-500">No recent invoices</div>
        )}
      </CardContent>
    </Card>
  );
};

interface ActivityItemProps {
  title: string;
  timestamp: string;
  description: string;
  icon: React.ReactNode;
}

const ActivityItem = ({ title, timestamp, description, icon }: ActivityItemProps) => (
  <div className="flex space-x-3">
    <div className="flex-shrink-0">
      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
        {icon}
      </div>
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
    <div className="flex-shrink-0 whitespace-nowrap text-sm text-gray-500">{timestamp}</div>
  </div>
);

export default function CustomerDashboard() {
  const { user } = useAuth();

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

  // Fetch recent invoice
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['/api/invoices'],
    queryFn: async () => {
      const response = await fetch('/api/invoices');
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }
      return response.json();
    },
  });

  // Get most recent invoice
  const recentInvoice = invoices && invoices.length > 0 ? invoices[0] : null;

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Welcome message */}
        <div className="mt-6 bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-xl font-medium text-gray-900">Welcome back, {user?.name}!</h2>
          <p className="mt-2 text-gray-500">
            Here's an overview of your subscription, token usage, and recent activity.
          </p>
        </div>

        {/* Dashboard cards */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {subscriptionLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="py-8 text-center text-gray-500">Loading subscription info...</div>
              </CardContent>
            </Card>
          ) : subscription ? (
            <>
              <TokenBalanceCard subscription={subscription} />
              <SubscriptionInfoCard subscription={subscription} />
            </>
          ) : (
            <Card className="sm:col-span-2">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">No Active Subscription</h3>
                  <Package className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-4">
                  You don't have an active subscription yet. Choose a plan to get started with our services.
                </p>
                <Button variant="default" className="w-full">
                  View Plans
                </Button>
              </CardContent>
            </Card>
          )}

          {invoicesLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="py-8 text-center text-gray-500">Loading invoice info...</div>
              </CardContent>
            </Card>
          ) : (
            <RecentInvoiceCard invoice={recentInvoice} />
          )}
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
            <a href="#" className="text-sm font-medium text-primary hover:text-primary-700 flex items-center">
              View all <ArrowUpRight className="ml-1 h-3 w-3" />
            </a>
          </div>
          <div className="mt-3 bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flow-root">
                <ul role="list" className="-mb-8">
                  <li>
                    <div className="relative pb-8">
                      <span className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                      <ActivityItem
                        title="Token Usage"
                        timestamp="2 hours ago"
                        description="Used 50 tokens for document processing."
                        icon={<Coins className="h-4 w-4 text-primary" />}
                      />
                    </div>
                  </li>
                  <li>
                    <div className="relative pb-8">
                      <span className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                      <ActivityItem
                        title="Invoice Paid"
                        timestamp="Yesterday"
                        description="Invoice #INV-2023-05 has been paid successfully."
                        icon={<Check className="h-4 w-4 text-green-600" />}
                      />
                    </div>
                  </li>
                  <li>
                    <div className="relative">
                      <ActivityItem
                        title="Subscription Renewed"
                        timestamp="3 days ago"
                        description="Your subscription has been renewed for another month."
                        icon={<Calendar className="h-4 w-4 text-primary" />}
                      />
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
