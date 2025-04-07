import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileSpreadsheet,
  Search,
  Download,
  Filter,
  Eye,
  Check,
  X,
  Clock,
  FileText,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'accepted':
      return (
        <Badge className="bg-green-100 text-green-800 border-0 flex items-center">
          <Check className="h-3 w-3 mr-1" />
          Accepted
        </Badge>
      );
    case 'pending':
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-0 flex items-center">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    case 'rejected':
      return (
        <Badge className="bg-red-100 text-red-800 border-0 flex items-center">
          <X className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      );
    case 'expired':
      return (
        <Badge className="bg-gray-100 text-gray-800 border-0 flex items-center">
          <CalendarClock className="h-3 w-3 mr-1" />
          Expired
        </Badge>
      );
    default:
      return <Badge>{status}</Badge>;
  }
};

// Quote detail dialog
interface QuoteDetailProps {
  quote: any;
  onAccept?: () => void;
  onReject?: () => void;
  canUpdateStatus: boolean;
}

const QuoteDetail = ({ quote, onAccept, onReject, canUpdateStatus }: QuoteDetailProps) => {
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold">{quote.quote_number}</h3>
          <p className="text-gray-500 text-sm">Created: {new Date(quote.created_at).toLocaleDateString()}</p>
        </div>
        <StatusBadge status={quote.status} />
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <h4 className="font-medium text-gray-500">Customer</h4>
          <p className="font-medium mt-1">
            {quote.customer_name || `Customer #${quote.user_id}`}
          </p>
        </div>
        <div>
          <h4 className="font-medium text-gray-500">Valid Until</h4>
          <p className="font-medium mt-1">
            {quote.expiry_date ? new Date(quote.expiry_date).toLocaleDateString() : "N/A"}
          </p>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quote.items && quote.items.length > 0 ? (
              quote.items.map((item: any, index: number) => (
                <TableRow key={index}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.price * item.quantity)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-gray-500">
                  No items
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-2 pt-2">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatCurrency(quote.subtotal)}</span>
        </div>
        {quote.discount_amount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount ({quote.discount_percent}%)</span>
            <span>-{formatCurrency(quote.discount_amount)}</span>
          </div>
        )}
        {quote.tax > 0 && (
          <div className="flex justify-between">
            <span>Tax</span>
            <span>{formatCurrency(quote.tax)}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span>{formatCurrency(quote.total)}</span>
        </div>
      </div>

      {quote.notes && (
        <div className="pt-4">
          <h4 className="font-medium text-gray-500">Notes</h4>
          <p className="text-sm mt-1 p-3 bg-gray-50 rounded-md border">
            {quote.notes}
          </p>
        </div>
      )}

      {quote.status === 'pending' && canUpdateStatus && (
        <div className="flex space-x-2 pt-4">
          {onAccept && (
            <Button onClick={onAccept} className="flex-1">
              <Check className="mr-2 h-4 w-4" />
              Accept Quote
            </Button>
          )}
          {onReject && (
            <Button variant="outline" onClick={onReject} className="flex-1">
              <X className="mr-2 h-4 w-4" />
              Reject Quote
            </Button>
          )}
        </div>
      )}

      {quote.status === 'accepted' && (
        <div className="pt-4">
          <Button className="w-full">
            <FileText className="mr-2 h-4 w-4" />
            Generate Invoice
          </Button>
        </div>
      )}
    </div>
  );
};

export default function QuoteList() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch quotes
  const { data: quotes, isLoading } = useQuery({
    queryKey: ['/api/quotes'],
    queryFn: async () => {
      const response = await fetch('/api/quotes');
      if (!response.ok) {
        throw new Error('Failed to fetch quotes');
      }
      return response.json();
    },
  });

  // Fetch customers for name display
  const { data: customers } = useQuery({
    queryKey: ['/api/users?role=customer'],
    queryFn: async () => {
      const response = await fetch('/api/users?role=customer');
      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }
      return response.json();
    },
  });

  // Filter quotes based on search term and status
  const filteredQuotes = quotes?.filter((quote: any) => {
    const matchesSearch = 
      quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customers?.find((c: any) => c.id === quote.user_id)?.name || '')
        .toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Get customer name by id
  const getCustomerName = (userId: number) => {
    const customer = customers?.find((c: any) => c.id === userId);
    return customer ? customer.name : `Customer #${userId}`;
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <FileSpreadsheet className="mr-2 h-5 w-5 text-primary" />
            Quotes
          </CardTitle>
          <CardDescription>
            Manage and view all your quotes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search quotes..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 mr-2" />
                    <span>Status: </span>
                    <SelectValue placeholder="All" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Quotes table */}
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-primary border-r-transparent" />
              <p className="mt-2">Loading quotes...</p>
            </div>
          ) : filteredQuotes && filteredQuotes.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox />
                    </TableHead>
                    <TableHead>Quote</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotes.map((quote: any) => (
                    <TableRow key={quote.id}>
                      <TableCell>
                        <Checkbox />
                      </TableCell>
                      <TableCell className="font-medium">
                        {quote.quote_number}
                      </TableCell>
                      <TableCell>
                        {getCustomerName(quote.user_id)}
                      </TableCell>
                      <TableCell>
                        {new Date(quote.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(quote.total)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={quote.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Quote Details</DialogTitle>
                                <DialogDescription>
                                  View complete quote information
                                </DialogDescription>
                              </DialogHeader>
                              <QuoteDetail 
                                quote={quote} 
                                canUpdateStatus={user?.role === 'customer'}
                              />
                            </DialogContent>
                          </Dialog>
                          
                          <Button variant="ghost" size="icon">
                            <Download className="h-4 w-4" />
                          </Button>
                          
                          {quote.status === 'accepted' && (
                            <Button size="sm" className="flex items-center">
                              <FileText className="h-3 w-3 mr-1" />
                              Invoice
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 border rounded-md bg-gray-50">
              <FileSpreadsheet className="h-10 w-10 text-gray-400 mx-auto mb-2" />
              <h3 className="text-lg font-medium text-gray-900">No quotes found</h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? "Try adjusting your search or filters" 
                  : "You don't have any quotes yet"}
              </p>
            </div>
          )}

          {/* Pagination */}
          {filteredQuotes && filteredQuotes.length > 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                Showing {filteredQuotes.length} of {quotes?.length || 0} quotes
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="icon" disabled>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="px-3">
                  1
                </Button>
                <Button variant="outline" size="icon" disabled>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
