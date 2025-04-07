import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DollarSign,
  CalendarCheck,
  UserCheck,
  UserMinus,
  User,
  Coins,
  LineChart,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: React.ReactNode;
}

const MetricCard = ({ title, value, change, isPositive, icon }: MetricCardProps) => (
  <Card>
    <CardContent className="p-5">
      <div className="flex items-center">
        <div className={`flex-shrink-0 ${isPositive ? 'bg-primary/10' : 'bg-amber-100'} rounded-md p-3`}>
          {icon}
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd>
              <div className="text-lg font-semibold text-gray-900">{value}</div>
              <div className="mt-1 flex items-baseline text-sm">
                <span className={`${isPositive ? 'text-green-600' : 'text-red-600'} font-semibold`}>
                  {isPositive ? "↑" : "↓"} {change}
                </span>
                <span className="ml-1 text-gray-500">from last month</span>
              </div>
            </dd>
          </dl>
        </div>
      </div>
    </CardContent>
  </Card>
);

interface DiscountApprovalItemProps {
  customer: string;
  discountRequested: string;
  plan: string;
  requestedBy: string;
  onApprove: () => void;
  onReject: () => void;
}

const DiscountApprovalItem = ({
  customer,
  discountRequested,
  plan,
  requestedBy,
  onApprove,
  onReject,
}: DiscountApprovalItemProps) => (
  <li>
    <div className="px-4 py-4 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <p className="text-sm font-medium text-primary truncate">{customer}</p>
          <div className="ml-2 flex-shrink-0 flex">
            <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
              Pending Approval
            </p>
          </div>
        </div>
        <div className="ml-2 flex-shrink-0 flex">
          <Button 
            variant="default" 
            size="sm" 
            className="mr-2 bg-green-600 hover:bg-green-700" 
            onClick={onApprove}
          >
            Approve
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={onReject}
          >
            Reject
          </Button>
        </div>
      </div>
      <div className="mt-2 sm:flex sm:justify-between">
        <div className="sm:flex">
          <p className="flex items-center text-sm text-gray-500">
            <Percent className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
            {discountRequested} Discount Requested
          </p>
          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
            <Coins className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
            {plan}
          </p>
        </div>
        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
          <User className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
          <p>
            Requested by <span className="font-medium text-gray-900">Sales Rep: {requestedBy}</span>
          </p>
        </div>
      </div>
    </div>
  </li>
);

interface SubscriptionItemProps {
  company: string;
  status: string;
  amountPerMonth: string;
  tokens: string;
  startDate: string;
}

const SubscriptionItem = ({
  company,
  status,
  amountPerMonth,
  tokens,
  startDate,
}: SubscriptionItemProps) => (
  <li>
    <a href="#" className="block hover:bg-gray-50">
      <div className="px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-primary truncate">
            {company}
          </p>
          <div className="ml-2 flex-shrink-0 flex">
            <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
              {status}
            </p>
          </div>
        </div>
        <div className="mt-2 sm:flex sm:justify-between">
          <div className="sm:flex">
            <p className="flex items-center text-sm text-gray-500">
              <DollarSign className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
              {amountPerMonth}
            </p>
            <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
              <Coins className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
              {tokens}
            </p>
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
            <CalendarCheck className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
            <p>
              Started <span>{startDate}</span>
            </p>
          </div>
        </div>
      </div>
    </a>
  </li>
);

export default function AdminDashboard() {
  const { toast } = useToast();

  // Fetch dashboard metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/reports/metrics'],
    queryFn: async () => {
      const response = await fetch('/api/reports/metrics');
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      return response.json();
    },
  });

  // Fetch pending discount requests
  const { data: discountRequests, isLoading: discountRequestsLoading, refetch: refetchDiscountRequests } = useQuery({
    queryKey: ['/api/discount-requests'],
    queryFn: async () => {
      const response = await fetch('/api/discount-requests');
      if (!response.ok) {
        throw new Error('Failed to fetch discount requests');
      }
      return response.json();
    },
  });

  // Placeholder data for recent subscriptions
  // In a real application, this would be fetched from the API
  const recentSubscriptions = [
    {
      company: 'Stellar Innovations',
      status: 'Active',
      amountPerMonth: '$1,800/mo',
      tokens: '1,500 Tokens',
      startDate: 'May 15, 2023',
    },
    {
      company: 'Quantum Enterprises',
      status: 'Active',
      amountPerMonth: '$2,400/mo',
      tokens: '2,200 Tokens',
      startDate: 'May 12, 2023',
    },
    {
      company: 'Nexus Industries',
      status: 'Active',
      amountPerMonth: '$3,200/mo',
      tokens: '3,000 Tokens',
      startDate: 'May 10, 2023',
    },
  ];

  const handleApproveDiscount = async (id: number) => {
    try {
      const response = await fetch(`/api/discount-requests/${id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: 'Approved by admin' }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve discount request');
      }

      toast({
        title: 'Discount approved',
        description: 'The discount request has been approved successfully',
      });

      refetchDiscountRequests();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve discount',
        variant: 'destructive',
      });
    }
  };

  const handleRejectDiscount = async (id: number) => {
    try {
      const response = await fetch(`/api/discount-requests/${id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: 'Rejected by admin' }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject discount request');
      }

      toast({
        title: 'Discount rejected',
        description: 'The discount request has been rejected',
      });

      refetchDiscountRequests();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reject discount',
        variant: 'destructive',
      });
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100); // Convert cents to dollars
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Metrics overview */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="MRR"
            value={metricsLoading ? "Loading..." : formatCurrency(metrics?.mrr || 0)}
            change="8.2%"
            isPositive={true}
            icon={<DollarSign className="h-5 w-5 text-primary" />}
          />
          <MetricCard
            title="ARR"
            value={metricsLoading ? "Loading..." : formatCurrency(metrics?.arr || 0)}
            change="12.5%"
            isPositive={true}
            icon={<CalendarCheck className="h-5 w-5 text-secondary" />}
          />
          <MetricCard
            title="Active Subscriptions"
            value={metricsLoading ? "Loading..." : metrics?.activeSubscriptionsCount.toString()}
            change="5.3%"
            isPositive={true}
            icon={<UserCheck className="h-5 w-5 text-green-600" />}
          />
          <MetricCard
            title="Churn Rate"
            value={metricsLoading ? "Loading..." : `${metrics?.churnRate.toFixed(1)}%`}
            change="0.5%"
            isPositive={false}
            icon={<UserMinus className="h-5 w-5 text-amber-600" />}
          />
        </div>

        {/* Approval Requests */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900">Pending Discount Approvals</h2>
          <div className="mt-3 bg-white shadow overflow-hidden sm:rounded-md">
            {discountRequestsLoading ? (
              <div className="py-8 text-center text-gray-500">Loading discount requests...</div>
            ) : discountRequests && discountRequests.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {discountRequests.map((request: any) => (
                  <DiscountApprovalItem
                    key={request.id}
                    customer={request.user_id}
                    discountRequested={`${request.discount_percent}%`}
                    plan={request.quote_id ? `Quote #${request.quote_id}` : 'Custom Plan'}
                    requestedBy={request.requested_by}
                    onApprove={() => handleApproveDiscount(request.id)}
                    onReject={() => handleRejectDiscount(request.id)}
                  />
                ))}
              </ul>
            ) : (
              <div className="py-8 text-center text-gray-500">No pending discount approvals</div>
            )}
          </div>
        </div>

        {/* Recent Subscriptions */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Recent Subscriptions</h2>
            <a href="/subscriptions" className="text-sm font-medium text-primary hover:text-primary-700">
              View all
            </a>
          </div>
          <div className="mt-3 bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {recentSubscriptions.map((subscription, index) => (
                <SubscriptionItem
                  key={index}
                  company={subscription.company}
                  status={subscription.status}
                  amountPerMonth={subscription.amountPerMonth}
                  tokens={subscription.tokens}
                  startDate={subscription.startDate}
                />
              ))}
            </ul>
          </div>
        </div>

        {/* Token Usage Chart */}
        <div className="mt-8 bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Monthly Token Usage</h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Distribution of token consumption across customer base in the past 30 days.</p>
            </div>
            <div className="mt-5 h-64 bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <LineChart className="h-10 w-10 text-gray-400 mx-auto" />
                  <p className="mt-2 text-sm text-gray-500">Token usage visualization would be displayed here</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
