import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Percent, DollarSign, Quote, FileText } from "lucide-react";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Define form schema with Zod
const discountRequestSchema = z.object({
  quote_id: z.string().optional(),
  user_id: z.string().min(1, "Customer is required"),
  discount_type: z.enum(["percent", "amount"]),
  discount_percent: z.string().optional(),
  discount_amount: z.string().optional(),
  reason: z.string().min(10, "Please provide a detailed reason for the discount"),
}).refine((data) => {
  // Validate that either discount_percent or discount_amount is provided based on discount_type
  if (data.discount_type === "percent") {
    return !!data.discount_percent && parseFloat(data.discount_percent) > 0 && parseFloat(data.discount_percent) <= 100;
  } else {
    return !!data.discount_amount && parseFloat(data.discount_amount) > 0;
  }
}, {
  message: "Please provide a valid discount value",
  path: ["discount_percent"],
});

type DiscountRequestFormValues = z.infer<typeof discountRequestSchema>;

export default function DiscountRequestForm() {
  const { toast } = useToast();
  const { user } = useAuth();

  // Get all customers (filtered by role)
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

  // Get all quotes
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
  const form = useForm<DiscountRequestFormValues>({
    resolver: zodResolver(discountRequestSchema),
    defaultValues: {
      discount_type: "percent",
      discount_percent: "",
      discount_amount: "",
      reason: "",
    },
  });

  // Handle form submission
  const submitMutation = useMutation({
    mutationFn: async (values: DiscountRequestFormValues) => {
      // Convert string IDs to numbers
      const payload = {
        user_id: parseInt(values.user_id),
        quote_id: values.quote_id ? parseInt(values.quote_id) : undefined,
        discount_percent: values.discount_type === "percent" ? parseFloat(values.discount_percent!) : undefined,
        discount_amount: values.discount_type === "amount" ? parseFloat(values.discount_amount!) * 100 : undefined, // Convert to cents
        reason: values.reason,
      };

      const response = await apiRequest("POST", "/api/discount-requests", payload);
      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Discount request submitted",
        description: "Your discount request has been submitted for approval.",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/discount-requests'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit discount request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: DiscountRequestFormValues) {
    submitMutation.mutate(values);
  }

  // Handle quote selection to auto-select customer
  const handleQuoteChange = (quoteId: string) => {
    if (!quoteId) return;
    
    const selectedQuote = quotes?.find((q: any) => q.id.toString() === quoteId);
    if (selectedQuote) {
      form.setValue("user_id", selectedQuote.user_id.toString());
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center">
          <Percent className="mr-2 h-5 w-5 text-primary" />
          Request Discount Approval
        </CardTitle>
        <CardDescription>
          Request a special discount for a customer that exceeds your standard authorization limit.
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
                        Select the quote you're requesting a discount for
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
                        Select the customer requesting the discount
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="discount_type"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Discount Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="percent" id="percent" />
                          <label htmlFor="percent" className="flex items-center">
                            <Percent className="h-4 w-4 mr-1" /> Percentage
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="amount" id="amount" />
                          <label htmlFor="amount" className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" /> Fixed Amount
                          </label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("discount_type") === "percent" ? (
                <FormField
                  control={form.control}
                  name="discount_percent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Percentage</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            placeholder="Enter discount percentage"
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <span className="text-gray-500">%</span>
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Enter a percentage between 0 and 100
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="discount_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <span className="text-gray-500">$</span>
                          </div>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            step="0.01"
                            className="pl-7"
                            placeholder="Enter discount amount"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Enter the fixed amount to discount
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Discount</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Explain why this customer should receive this discount..."
                        rows={4}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide a detailed explanation to help administrators make a decision
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={submitMutation.isPending}>
                {submitMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
