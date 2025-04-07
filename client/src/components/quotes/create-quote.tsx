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
  FileSpreadsheet,
  CalendarIcon,
  Plus,
  Trash2,
  FileCheck,
  DollarSign,
  Calculator,
} from "lucide-react";
import { format } from "date-fns";

// Define the item schema
const quoteItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be positive"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
});

// Define the form schema with Zod
const quoteFormSchema = z.object({
  user_id: z.string().min(1, "Customer is required"),
  expiry_date: z.date({
    required_error: "Expiry date is required",
  }),
  notes: z.string().optional(),
  tax: z.number().min(0, "Tax must be positive").optional(),
  discount_percent: z
    .number()
    .min(0, "Discount must be positive")
    .max(100, "Discount cannot exceed 100%")
    .optional(),
  discount_amount: z.number().min(0, "Discount must be positive").optional(),
  items: z.array(quoteItemSchema).min(1, "At least one item is required"),
});

type QuoteFormValues = z.infer<typeof quoteFormSchema>;

// Quote form component
export default function CreateQuote() {
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

  // Fetch products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      return response.json();
    },
  });

  // Set up form
  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
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
        description: "A quote must have at least one item",
        variant: "destructive",
      });
    }
  };

  // Handle adding a product from catalog
  const handleAddProduct = (product: any, index: number) => {
    const currentItems = form.getValues("items") || [];
    currentItems[index] = {
      ...currentItems[index],
      name: product.name,
      description: product.description,
      price: product.price / 100, // Convert cents to dollars for form
    };
    form.setValue("items", currentItems);
  };

  // Handle form submission
  const submitMutation = useMutation({
    mutationFn: async (values: QuoteFormValues) => {
      const { subtotal, discountAmount, taxAmount, total } = calculateTotals();
      
      // Convert string IDs to numbers and prepare payload
      const payload = {
        user_id: parseInt(values.user_id),
        created_by: user?.id,
        expiry_date: values.expiry_date.toISOString(),
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
      
      const response = await apiRequest("POST", "/api/quotes", payload);
      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Quote created",
        description: "The quote has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      navigate('/quotes');
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create quote",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: QuoteFormValues) {
    submitMutation.mutate(values);
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Check if user has permission to create a quote
  const canCreateQuote = ['admin', 'sales', 'finance'].includes(user?.role || '');

  if (!canCreateQuote) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl text-red-600">Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to create quotes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Please contact an administrator if you need access to this feature.</p>
          <Button className="mt-4" onClick={() => navigate('/quotes')}>
            Back to Quotes
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center">
          <FileSpreadsheet className="mr-2 h-5 w-5 text-primary" />
          Create New Quote
        </CardTitle>
        <CardDescription>
          Generate a quote for your customer
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
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
                      Select the customer for this quote
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiry_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Quote Valid Until</FormLabel>
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
                      The date until which this quote is valid
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="border rounded-md p-4">
                <h3 className="text-lg font-medium mb-4">Quote Items</h3>
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
                      {products && products.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Or select a product:</p>
                          <Select
                            onValueChange={(value) => {
                              const product = products.find((p: any) => p.id.toString() === value);
                              if (product) {
                                handleAddProduct(product, index);
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select from catalog" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product: any) => (
                                <SelectItem key={product.id} value={product.id.toString()}>
                                  {product.name} - {formatCurrency(product.price / 100)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
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
                        Tax percentage to apply to the quote
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
                        Discount percentage to apply to the quote
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
                        placeholder="Additional information for the customer..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Any special terms, conditions, or additional information
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="border rounded-md p-4 bg-gray-50">
                <h3 className="text-lg font-medium mb-4">Quote Summary</h3>
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
              <Button variant="outline" type="button" onClick={() => navigate('/quotes')}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitMutation.isPending}>
                {submitMutation.isPending ? (
                  "Creating Quote..."
                ) : (
                  <>
                    <FileCheck className="mr-2 h-4 w-4" />
                    Create Quote
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
