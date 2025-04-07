import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  FileText,
  Search,
  Download,
  Filter,
  Check,
  Clock,
  AlertCircle,
  Eye,
  CreditCard,
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
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

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'paid':
      return (
        <Badge className="bg-green-100 text-green-800 border-0 flex items-center">
          <Check className="h-3 w-3 mr-1" />
          Paid
        </Badge>
      );
    case 'pending':
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-0 flex items-center">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    case 'overdue':
      return (
        <Badge className="bg-red-100 text-red-800 border-0 flex items-center">
          <AlertCircle className="h-3 w-3 mr-1" />
          Overdue
        </Badge>
      );
    default:
      return <Badge>{status}</Badge>;
  }
};

// Invoice detail dialog
interface InvoiceDetailProps {
  invoice: any;
}

const InvoiceDetail = ({ invoice }: InvoiceDetailProps) => {
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
          <h3 className="text-lg font-bold">{invoice.invoice_number}</h3>
          <p className="text-gray-500 text-sm">Created: {new Date(invoice.created_at).toLocaleDateString()}</p>
        </div>
        <StatusBadge status={invoice.status} />
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <h4 className="font-medium text-gray-500">Bill To</h4>
          <p className="font-medium mt-1">Customer #{invoice.user_id}</p>
        </div>
        <div>
          <h4 className="font-medium text-gray-500">Due Date</h4>
          <p className="font-medium mt-1">{new Date(invoice.due_date).toLocaleDateString()}</p>
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
            {invoice.items && invoice.items.length > 0 ? (
              invoice.items.map((item: any, index: number) => (
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
          <span>{formatCurrency(invoice.subtotal)}</span>
        </div>
        {invoice.discount_amount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount ({invoice.discount_percent}%)</span>
            <span>-{formatCurrency(invoice.discount_amount)}</span>
          </div>
        )}
        {invoice.tax > 0 && (
          <div className="flex justify-between">
            <span>Tax</span>
            <span>{formatCurrency(invoice.tax)}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span>{formatCurrency(invoice.total)}</span>
        </div>
      </div>

      {invoice.status === 'pending' && (
        <div className="pt-4">
          <Button className="w-full">
            <CreditCard className="mr-2 h-4 w-4" />
            Pay Now
          </Button>
        </div>
      )}
    </div>
  );
};

export default function InvoiceList() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch invoices
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['/api/invoices'],
    queryFn: async () => {
      const response = await fetch('/api/invoices');
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }
      return response.json();
    },
  });

  // Filter invoices based on search term and status
  const filteredInvoices = invoices?.filter((invoice: any) => {
    const matchesSearch = 
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      new Date(invoice.due_date).toLocaleDateString().includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
            <FileText className="mr-2 h-5 w-5 text-primary" />
            Invoices
          </CardTitle>
          <CardDescription>
            Manage and view all your invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search invoices..."
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
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Invoices table */}
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-primary border-r-transparent" />
              <p className="mt-2">Loading invoices...</p>
            </div>
          ) : filteredInvoices && filteredInvoices.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox />
                    </TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice: any) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Checkbox />
                      </TableCell>
                      <TableCell className="font-medium">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>
                        {new Date(invoice.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(invoice.due_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(invoice.total)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={invoice.status} />
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
                                <DialogTitle>Invoice Details</DialogTitle>
                                <DialogDescription>
                                  View complete invoice information
                                </DialogDescription>
                              </DialogHeader>
                              <InvoiceDetail invoice={invoice} />
                            </DialogContent>
                          </Dialog>
                          
                          <Button variant="ghost" size="icon">
                            <Download className="h-4 w-4" />
                          </Button>
                          
                          {invoice.status === 'pending' && (
                            <Button size="sm" className="flex items-center">
                              <CreditCard className="h-3 w-3 mr-1" />
                              Pay
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
              <FileText className="h-10 w-10 text-gray-400 mx-auto mb-2" />
              <h3 className="text-lg font-medium text-gray-900">No invoices found</h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? "Try adjusting your search or filters" 
                  : "You don't have any invoices yet"}
              </p>
            </div>
          )}

          {/* Pagination */}
          {filteredInvoices && filteredInvoices.length > 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                Showing {filteredInvoices.length} of {invoices?.length || 0} invoices
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
