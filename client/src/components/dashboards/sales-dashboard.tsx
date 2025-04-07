import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  UserCheck, 
  TrendingUp, 
  Percent, 
  FileText, 
  FileSpreadsheet, 
  User,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface SalesMetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  colorClass?: string;
}

const SalesMetricCard = ({ 
  title, 
  value, 
  icon, 
  description, 
  colorClass = "bg-primary/10" 
}: SalesMetricCardProps) => (
  <Card>
    <CardContent className="p-5">
      <div className="flex items-center">
        <div className={`flex-shrink-0 ${colorClass} rounded-md p-3`}>
          {icon}
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd>
              <div className="text-lg font-semibold text-gray-900">{value}</div>
              {description && (
                <div className="mt-1 text-sm text-gray-500">{description}</div>
              )}
            </dd>
          </dl>
        </div>
      </div>
    </CardContent>
  </Card>
);

interface QuoteItemProps {
  quote: {
    id: number;
    quote_number: string;
    status: string;
    user_id: number;
    customer_name?: string;
    total: number;
    created_at: string;
  };
}

const QuoteItem = ({ quote }: QuoteItemProps) => {
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <li>
      <Link href={`/quotes/${quote.id}`}>
        <a className="block hover:bg-gray-50">
          <div className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-primary truncate">
                {quote.quote_number}
              </p>
              <div className="ml-2 flex-shrink-0 flex">
                <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(quote.status)}`}>
                  {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                </p>
              </div>
            </div>
            <div className="mt-2 sm:flex sm:justify-between">
              <div className="sm:flex">
                <p className="flex items-center text-sm text-gray-500">
                  <User className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                  Customer: {quote.customer_name || `User #${quote.user_id}`}
                </p>
                <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                  <DollarSign className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                  Total: {formatCurrency(quote.total)}
                </p>
              </div>
              <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                <p>
                  Created: {new Date(quote.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </a>
      </Link>
    </li>
  );
};

export default function SalesDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch pending quotes
  const { data: quotes, isLoading: quotesLoading } = useQuery({
    queryKey: ['/api/quotes'],
    queryFn: async () => {
      const response = await fetch('/api/quotes');
      if (!response.ok) {
        throw new Error('Failed to fetch quotes');
      }
      return response.json();
    },
  });

  // Fetch discount requests
  const { data: discountRequests, isLoading: discountRequestsLoading } = useQuery({
    queryKey: ['/api/discount-requests'],
    queryFn: async () => {
      const response = await fetch('/api/discount-requests');
      if (!response.ok) {
        throw new Error('Failed to fetch discount requests');
      }
      return response.json();
    },
  });

  // Sales metrics - in a real app, these would be fetched from an API
  const salesMetrics = {
    quotesThisMonth: quotes?.filter((q: any) => {
      const quoteDate = new Date(q.created_at);
      const now = new Date();
      return quoteDate.getMonth() === now.getMonth() && 
             quoteDate.getFullYear() === now.getFullYear();
    }).length || 0,
    successRate: "68%",
    discountRequestsPending: discountRequests?.filter((r: any) => r.status === 'pending').length || 0,
    averageDealSize: "$2,450",
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Sales Dashboard</h1>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Sales metrics */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <SalesMetricCard
            title="Quotes This Month"
            value={salesMetrics.quotesThisMonth}
            icon={<FileSpreadsheet className="h-5 w-5 text-primary" />}
          />
          <SalesMetricCard
            title="Success Rate"
            value={salesMetrics.successRate}
            icon={<TrendingUp className="h-5 w-5 text-green-600" />}
            colorClass="bg-green-100"
          />
          <SalesMetricCard
            title="Pending Discount Approvals"
            value={salesMetrics.discountRequestsPending}
            icon={<Percent className="h-5 w-5 text-amber-600" />}
            colorClass="bg-amber-100"
          />
          <SalesMetricCard
            title="Average Deal Size"
            value={salesMetrics.averageDealSize}
            icon={<DollarSign className="h-5 w-5 text-blue-600" />}
            colorClass="bg-blue-100"
          />
        </div>

        {/* Action buttons */}
        <div className="mt-8 flex flex-wrap gap-4">
          <Button size="lg" className="flex items-center">
            <FileSpreadsheet className="mr-2 h-5 w-5" />
            Create New Quote
          </Button>
          <Button size="lg" variant="outline" className="flex items-center">
            <Percent className="mr-2 h-5 w-5" />
            Request Discount
          </Button>
        </div>

        {/* Recent Quotes */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Recent Quotes</h2>
            <Link href="/quotes">
              <a className="text-sm font-medium text-primary hover:text-primary-700">
                View all
              </a>
            </Link>
          </div>
          <div className="mt-3 bg-white shadow overflow-hidden sm:rounded-md">
            {quotesLoading ? (
              <div className="py-8 text-center text-gray-500">Loading quotes...</div>
            ) : quotes && quotes.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {quotes.slice(0, 5).map((quote: any) => (
                  <QuoteItem key={quote.id} quote={quote} />
                ))}
              </ul>
            ) : (
              <div className="py-8 text-center text-gray-500">No quotes found</div>
            )}
          </div>
        </div>

        {/* Performance chart would go here */}
        <div className="mt-8 bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Sales Performance</h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Your performance and closing rates over the past 6 months.</p>
            </div>
            <div className="mt-5 h-64 bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <TrendingUp className="h-10 w-10 text-gray-400 mx-auto" />
                  <p className="mt-2 text-sm text-gray-500">Sales performance visualization would be displayed here</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
