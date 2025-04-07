import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  FileText,
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { Link } from "wouter";

interface FinanceMetricCardProps {
  title: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  icon: React.ReactNode;
}

const FinanceMetricCard = ({ title, value, change, isPositive, icon }: FinanceMetricCardProps) => (
  <Card>
    <CardContent className="p-5">
      <div className="flex items-center">
        <div className={`flex-shrink-0 ${isPositive !== undefined ? (isPositive ? 'bg-green-100' : 'bg-red-100') : 'bg-primary/10'} rounded-md p-3`}>
          {icon}
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd>
              <div className="text-lg font-semibold text-gray-900">{value}</div>
              {change && (
                <div className="mt-1 flex items-baseline text-sm">
                  <span className={`${isPositive ? 'text-green-600' : 'text-red-600'} font-semibold`}>
                    {isPositive ? "↑" : "↓"} {change}
                  </span>
                  <span className="ml-1 text-gray-500">from last month</span>
                </div>
              )}
            </dd>
          </dl>
        </div>
      </div>
    </CardContent>
  </Card>
);

interface InvoiceItemProps {
  invoice: {
    id: number;
    invoice_number: string;
    status: string;
    user_id: number;
    customer_name?: string;
    total: number;
    due_date: string;
  };
}

const InvoiceItem = ({ invoice }: InvoiceItemProps) => {
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <li>
      <Link href={`/invoices/${invoice.id}`}>
        <a className="block hover:bg-gray-50">
          <div className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-primary truncate">
                {invoice.invoice_number}
              </p>
              <div className="ml-2 flex-shrink-0 flex">
                <p className={`px-2 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                  {getStatusIcon(invoice.status)}
                  <span className="ml-1">{invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}</span>
                </p>
              </div>
            </div>
            <div className="mt-2 sm:flex sm:justify-between">
              <div className="sm:flex">
                <p className="flex items-center text-sm text-gray-500">
                  <Users className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                  Customer: {invoice.customer_name || `User #${invoice.user_id}`}
                </p>
                <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                  <DollarSign className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                  {formatCurrency(invoice.total)}
                </p>
              </div>
              <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                <p>
                  Due: {new Date(invoice.due_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </a>
      </Link>
    </li>
  );
};

export default function FinanceDashboard() {
  const { user } = useAuth();

  // Fetch financial metrics
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

  // Fetch recent invoices
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

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Finance Dashboard</h1>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Financial metrics */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <FinanceMetricCard
            title="Monthly Recurring Revenue"
            value={metricsLoading ? "Loading..." : formatCurrency(metrics?.mrr || 0)}
            change="8.2%"
            isPositive={true}
            icon={<DollarSign className="h-5 w-5 text-green-600" />}
          />
          <FinanceMetricCard
            title="Annual Recurring Revenue"
            value={metricsLoading ? "Loading..." : formatCurrency(metrics?.arr || 0)}
            change="12.5%"
            isPositive={true}
            icon={<Calendar className="h-5 w-5 text-green-600" />}
          />
          <FinanceMetricCard
            title="Active Subscriptions"
            value={metricsLoading ? "Loading..." : metrics?.activeSubscriptionsCount.toString()}
            change="5.3%"
            isPositive={true}
            icon={<Users className="h-5 w-5 text-green-600" />}
          />
          <FinanceMetricCard
            title="Churn Rate"
            value={metricsLoading ? "Loading..." : `${metrics?.churnRate.toFixed(1)}%`}
            change="0.5%"
            isPositive={false}
            icon={<TrendingDown className="h-5 w-5 text-red-600" />}
          />
        </div>

        {/* Action buttons */}
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/invoices/create">
            <Button size="lg" className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Create New Invoice
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5" />
            Generate Finance Report
          </Button>
        </div>

        {/* Recent Invoices */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Recent Invoices</h2>
            <Link href="/invoices">
              <a className="text-sm font-medium text-primary hover:text-primary-700">
                View all
              </a>
            </Link>
          </div>
          <div className="mt-3 bg-white shadow overflow-hidden sm:rounded-md">
            {invoicesLoading ? (
              <div className="py-8 text-center text-gray-500">Loading invoices...</div>
            ) : invoices && invoices.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {invoices.slice(0, 5).map((invoice: any) => (
                  <InvoiceItem key={invoice.id} invoice={invoice} />
                ))}
              </ul>
            ) : (
              <div className="py-8 text-center text-gray-500">No invoices found</div>
            )}
          </div>
        </div>

        {/* Payment Overview */}
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Overview</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="bg-green-100 p-2 rounded-full">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="ml-2 text-sm font-medium">Paid</span>
                  </div>
                  <span className="text-sm font-medium">{invoices?.filter((i: any) => i.status === 'paid').length || 0} invoices</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="bg-yellow-100 p-2 rounded-full">
                      <Clock className="h-5 w-5 text-yellow-600" />
                    </div>
                    <span className="ml-2 text-sm font-medium">Pending</span>
                  </div>
                  <span className="text-sm font-medium">{invoices?.filter((i: any) => i.status === 'pending').length || 0} invoices</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="bg-red-100 p-2 rounded-full">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <span className="ml-2 text-sm font-medium">Overdue</span>
                  </div>
                  <span className="text-sm font-medium">{invoices?.filter((i: any) => i.status === 'overdue').length || 0} invoices</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Breakdown</h3>
              <div className="h-48 bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <TrendingUp className="h-10 w-10 text-gray-400 mx-auto" />
                    <p className="mt-2 text-sm text-gray-500">Revenue breakdown chart would be displayed here</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
