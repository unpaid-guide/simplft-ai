import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { v4 as uuidv4 } from "uuid";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  FileText,
  CalendarIcon,
  Plus,
  Trash2,
  FileCheck,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";

// Define the item schema
const invoiceItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be positive"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
});

// Define the form schema with Zod
const invoiceFormSchema = z.object({
  user_id: z.string().min(1, "Customer is required"),
  quote_id: z.string().optional(),
  due_date: z.date({
    required_error: "Due date is required",
  }),
  notes: z.string().optional(),
  tax: z.number().min(0, "Tax must be positive").optional(),
  discount_percent: z
    .number()
    .min(0, "Discount must be positive")
    .max(100, "Discount cannot exceed 100%")
    .optional(),
  discount_amount: z.number().min(0, "Discount must be positive").optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

// Invoice form component
export default function CreateInvoice() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const [items, setItems] = useState<any[]>([
    { id: uuidv4(), name: "", description: "", price: 0, quantity: 1 },
  ]);

  // Fetch customers
  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ['/api/users?role=customer'],
    queryFn: async () => {
      const response = await fetch('/api/users?role=customer');
      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }
      return response.json();
    },
  });

  // Fetch quotes
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

  // Set up form
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      tax: 0,
      discount_percent: 0,
      items: items,
    },
  });

  // Calculate subtotal, discount, tax, and total
  const calculateTotals = () => {
    const formItems = form.watch("items") || [];
    const subtotal = formItems.reduce(
      (total, item) => total + (item.price || 0) * (item.quantity || 0),
      0
    );
    
    const discountPercent = form.watch("discount_percent") || 0;
    const discountAmount = Math.round(subtotal * (discountPercent / 100));
    
    const tax = form.watch("tax") || 0;
    const taxAmount = Math.round((subtotal - discountAmount) * (tax / 100));
    
    const total = subtotal - discountAmount + taxAmount;
    
    return {
      subtotal,
      discountAmount,
      taxAmount,
      total,
    };
  };

  const { subtotal, discountAmount, taxAmount, total } = calculateTotals();

  // Handle add item
  const addItem = () => {
    const newItem = { id: uuidv4(), name: "", description: "", price: 0, quantity: 1 };
    const currentItems = form.getValues("items") || [];
    form.setValue("items", [...currentItems, newItem]);
    setItems([...items, newItem]);
  };

  // Handle remove item
  const removeItem = (index: number) => {
    const currentItems = form.getValues("items") || [];
    if (currentItems.length > 1) {
      const updatedItems = currentItems.filter((_, i) => i !== index);
      form.setValue("items", updatedItems);
      setItems(updatedItems);
    } else {
      toast({
        title: "Cannot remove item",
        description: "An invoice must have at least one item",
        variant: "destructive",
      });
    }
  };

  // Handle form submission
  const submitMutation = useMutation({
    mutationFn: async (values: InvoiceFormValues) => {
      const { subtotal, discountAmount, taxAmount, total } = calculateTotals();
      
      // Convert string IDs to numbers and prepare payload
      const payload = {
        user_id: parseInt(values.user_id),
        quote_id: values.quote_id ? parseInt(values.quote_id) : undefined,
        due_date: values.due_date.toISOString(),
        notes: values.notes,
        subtotal: Math.round(subtotal * 100), // Convert to cents
        discount_percent: values.discount_percent,
        discount_amount: Math.round(discountAmount * 100), // Convert to cents
        tax: Math.round(taxAmount * 100), // Convert to cents
        total: Math.round(total * 100), // Convert to cents
        items: values.items.map(item => ({
          ...item,
          price: Math.round(item.price * 100) // Convert to cents
        })),
      };
      
      const response = await apiRequest("POST", "/api/invoices", payload);
      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Invoice created",
        description: "Your invoice has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      navigate('/invoices');
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create invoice",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: InvoiceFormValues) {
    submitMutation.mutate(values);
  }

  // Handle quote selection to auto-populate items
  const handleQuoteChange = (quoteId: string) => {
    if (!quoteId) return;
    
    const selectedQuote = quotes?.find((q: any) => q.id.toString() === quoteId);
    if (selectedQuote) {
      form.setValue("user_id", selectedQuote.user_id.toString());
      
      // If quote has items, auto-populate them
      if (selectedQuote.items && selectedQuote.items.length > 0) {
        const formattedItems = selectedQuote.items.map((item: any) => ({
          id: uuidv4(),
          name: item.name,
          description: item.description || "",
          price: item.price / 100, // Convert from cents to dollars for form display
          quantity: item.quantity || 1,
        }));
        
        form.setValue("items", formattedItems);
        setItems(formattedItems);
        
        // Also set discount if present on quote
        if (selectedQuote.discount_percent) {
          form.setValue("discount_percent", selectedQuote.discount_percent);
        }
      }
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center">
          <FileText className="mr-2 h-5 w-5 text-primary" />
          Create New Invoice
        </CardTitle>
        <CardDescription>
          Generate an invoice for your customer
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quote_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quote (Optional)</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleQuoteChange(value);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a quote" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No quote selected</SelectItem>
                          {!quotesLoading && quotes?.map((quote: any) => (
                            <SelectItem key={quote.id} value={quote.id.toString()}>
                              {quote.quote_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Create invoice from an existing quote
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="user_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {!customersLoading && customers?.map((customer: any) => (
                            <SelectItem key={customer.id} value={customer.id.toString()}>
                              {customer.name} {customer.company ? `(${customer.company})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the customer for this invoice
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={`w-full pl-3 text-left font-normal ${
                              !field.value ? "text-muted-foreground" : ""
                            }`}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date()
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Select the due date for payment
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="border rounded-md p-4">
                <h3 className="text-lg font-medium mb-4">Invoice Items</h3>
                <div className="space-y-4">
                  {form.watch("items")?.map((item, index) => (
                    <div key={item.id || index} className="space-y-4 p-4 border rounded-md bg-gray-50">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Item {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`items.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Item Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g., Consulting Service" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description (Optional)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Brief description" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`items.${index}.price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                  <Input
                                    type="number"
                                    className="pl-8"
                                    placeholder="0.00"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="1"
                                  min="1"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={addItem}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Rate (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Tax percentage to apply to the invoice
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="discount_percent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Discount percentage to apply to the invoice
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes for the customer..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Any special instructions or payment terms
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="border rounded-md p-4 bg-gray-50">
                <h3 className="text-lg font-medium mb-4">Invoice Summary</h3>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-right font-medium">Subtotal:</TableCell>
                      <TableCell className="text-right">{formatCurrency(subtotal)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-right font-medium">Discount:</TableCell>
                      <TableCell className="text-right text-red-600">
                        -{formatCurrency(discountAmount)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-right font-medium">Tax:</TableCell>
                      <TableCell className="text-right">{formatCurrency(taxAmount)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-right font-medium text-lg">Total:</TableCell>
                      <TableCell className="text-right font-bold text-lg">{formatCurrency(total)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-4 pt-4">
              <Button variant="outline" type="button" onClick={() => navigate('/invoices')}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitMutation.isPending}>
                {submitMutation.isPending ? (
                  "Creating Invoice..."
                ) : (
                  <>
                    <FileCheck className="mr-2 h-4 w-4" />
                    Create Invoice
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
