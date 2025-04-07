import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertVatReturnSchema } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { format, addDays, addMonths } from "date-fns";
import { 
  FileText, 
  Edit, 
  Calendar, 
  Check, 
  FilePieChart, 
  Download, 
  Calculator,
  Percent
} from "lucide-react";

// Extended schema with validation
const createVatReturnSchema = insertVatReturnSchema.extend({
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date in YYYY-MM-DD format"),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date in YYYY-MM-DD format"),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date in YYYY-MM-DD format"),
  output_vat: z.coerce.number().min(0, "Output VAT cannot be negative"),
  input_vat: z.coerce.number().min(0, "Input VAT cannot be negative"),
  net_vat: z.coerce.number(),
  notes: z.string().optional(),
  reference_number: z.string().optional(),
});

export default function VatReturnsManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editingVatReturn, setEditingVatReturn] = useState<number | null>(null);
  const [showCalculationDialog, setShowCalculationDialog] = useState(false);
  const [calculationPeriod, setCalculationPeriod] = useState({
    start: format(new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1), "yyyy-MM-dd"),
    end: format(new Date(new Date().getFullYear(), new Date().getMonth(), 0), "yyyy-MM-dd"),
  });
  const [calculationResult, setCalculationResult] = useState<{
    output: number;
    input: number;
    net: number;
  } | null>(null);

  // VAT Return form
  const vatReturnForm = useForm<z.infer<typeof createVatReturnSchema>>({
    resolver: zodResolver(createVatReturnSchema),
    defaultValues: {
      period_start: format(new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1), "yyyy-MM-dd"),
      period_end: format(new Date(new Date().getFullYear(), new Date().getMonth(), 0), "yyyy-MM-dd"),
      due_date: format(addDays(new Date(new Date().getFullYear(), new Date().getMonth(), 28), 7), "yyyy-MM-dd"),
      output_vat: 0,
      input_vat: 0,
      net_vat: 0,
      status: "draft",
      notes: "",
      reference_number: "",
    },
  });

  // Auto-calculate net VAT
  const watchOutputVat = vatReturnForm.watch("output_vat");
  const watchInputVat = vatReturnForm.watch("input_vat");
  
  // Update net VAT when input or output changes
  useEffect(() => {
    const outputVat = parseFloat(watchOutputVat.toString());
    const inputVat = parseFloat(watchInputVat.toString());
    vatReturnForm.setValue("net_vat", outputVat - inputVat);
  }, [watchOutputVat, watchInputVat]);

  // Fetch VAT returns
  const { data: vatReturns = [], isLoading: isLoadingVatReturns } = useQuery({
    queryKey: ["/api/vat-returns"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/vat-returns");
      if (!response.ok) throw new Error("Failed to fetch VAT returns");
      return response.json();
    },
  });

  // Create VAT return mutation
  const createVatReturnMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createVatReturnSchema>) => {
      // Convert amounts from dollars to cents for database storage
      const formattedData = {
        ...data,
        output_vat: Math.round(data.output_vat * 100),
        input_vat: Math.round(data.input_vat * 100),
        net_vat: Math.round(data.net_vat * 100),
      };
      
      const response = await apiRequest("POST", "/api/vat-returns", formattedData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create VAT return");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "VAT Return Created",
        description: "VAT return has been successfully created",
      });
      vatReturnForm.reset({
        period_start: format(new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1), "yyyy-MM-dd"),
        period_end: format(new Date(new Date().getFullYear(), new Date().getMonth(), 0), "yyyy-MM-dd"),
        due_date: format(addDays(new Date(new Date().getFullYear(), new Date().getMonth(), 28), 7), "yyyy-MM-dd"),
        output_vat: 0,
        input_vat: 0,
        net_vat: 0,
        status: "draft",
        notes: "",
        reference_number: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vat-returns"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update VAT return mutation
  const updateVatReturnMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof createVatReturnSchema> }) => {
      // Convert amounts from dollars to cents for database storage
      const formattedData = {
        ...data,
        output_vat: Math.round(data.output_vat * 100),
        input_vat: Math.round(data.input_vat * 100),
        net_vat: Math.round(data.net_vat * 100),
      };
      
      const response = await apiRequest("PATCH", `/api/vat-returns/${id}`, formattedData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update VAT return");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "VAT Return Updated",
        description: "VAT return has been successfully updated",
      });
      vatReturnForm.reset({
        period_start: format(new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1), "yyyy-MM-dd"),
        period_end: format(new Date(new Date().getFullYear(), new Date().getMonth(), 0), "yyyy-MM-dd"),
        due_date: format(addDays(new Date(new Date().getFullYear(), new Date().getMonth(), 28), 7), "yyyy-MM-dd"),
        output_vat: 0,
        input_vat: 0,
        net_vat: 0,
        status: "draft",
        notes: "",
        reference_number: "",
      });
      setEditingVatReturn(null);
      queryClient.invalidateQueries({ queryKey: ["/api/vat-returns"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Submit VAT return mutation
  const submitVatReturnMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/vat-returns/${id}/submit`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit VAT return");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "VAT Return Submitted",
        description: "VAT return has been successfully submitted",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vat-returns"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Pay VAT return mutation
  const payVatReturnMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/vat-returns/${id}/pay`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to mark VAT return as paid");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "VAT Return Paid",
        description: "VAT return has been successfully marked as paid",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vat-returns"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Calculate VAT for period mutation
  const calculateVatMutation = useMutation({
    mutationFn: async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
      const response = await apiRequest("POST", "/api/vat-returns/calculate", { startDate, endDate });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to calculate VAT");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setCalculationResult(data);
      toast({
        title: "Calculation Complete",
        description: "VAT calculation has been completed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle VAT return form submission
  function onVatReturnSubmit(data: z.infer<typeof createVatReturnSchema>) {
    if (editingVatReturn) {
      updateVatReturnMutation.mutate({ id: editingVatReturn, data });
    } else {
      createVatReturnMutation.mutate(data);
    }
  }

  // Set up VAT return form for editing
  function handleEditVatReturn(vatReturnId: number) {
    const vatReturn = vatReturns.find((v) => v.id === vatReturnId);
    if (vatReturn) {
      // Convert cents to dollars for form display
      vatReturnForm.reset({
        ...vatReturn,
        period_start: format(new Date(vatReturn.period_start), "yyyy-MM-dd"),
        period_end: format(new Date(vatReturn.period_end), "yyyy-MM-dd"),
        due_date: format(new Date(vatReturn.due_date), "yyyy-MM-dd"),
        output_vat: vatReturn.output_vat / 100,
        input_vat: vatReturn.input_vat / 100,
        net_vat: vatReturn.net_vat / 100,
        notes: vatReturn.notes || "",
        reference_number: vatReturn.reference_number || "",
      });
      setEditingVatReturn(vatReturnId);
    }
  }

  // Cancel editing
  function handleCancelVatReturnEdit() {
    setEditingVatReturn(null);
    vatReturnForm.reset({
      period_start: format(new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1), "yyyy-MM-dd"),
      period_end: format(new Date(new Date().getFullYear(), new Date().getMonth(), 0), "yyyy-MM-dd"),
      due_date: format(addDays(new Date(new Date().getFullYear(), new Date().getMonth(), 28), 7), "yyyy-MM-dd"),
      output_vat: 0,
      input_vat: 0,
      net_vat: 0,
      status: "draft",
      notes: "",
      reference_number: "",
    });
  }

  // Handle automatic calculation of VAT
  function handleCalculateVAT() {
    calculateVatMutation.mutate({
      startDate: calculationPeriod.start,
      endDate: calculationPeriod.end,
    });
  }

  // Use calculation results in the form
  function useCalculationResults() {
    if (calculationResult) {
      vatReturnForm.setValue("output_vat", calculationResult.output / 100);
      vatReturnForm.setValue("input_vat", calculationResult.input / 100);
      vatReturnForm.setValue("net_vat", calculationResult.net / 100);
      vatReturnForm.setValue("period_start", calculationPeriod.start);
      vatReturnForm.setValue("period_end", calculationPeriod.end);
      setShowCalculationDialog(false);
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100); // Convert cents to dollars for display
  }

  // Format dates
  function formatDate(dateString: string | Date) {
    return format(new Date(dateString), "PPP");
  }

  // Get status color
  function getStatusColor(status: string) {
    const statusMap: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      submitted: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
    };
    return statusMap[status] || "bg-gray-100 text-gray-800";
  }

  // Generate a VAT return PDF (mock function)
  function generateVatReturnPDF(vatReturn: any) {
    toast({
      title: "PDF Generated",
      description: "The VAT return PDF has been generated and downloaded",
    });
  }

  if (!user) {
    return <div>Loading...</div>;
  }

  // Check if user has appropriate role
  const hasAdminOrFinanceRole = user.role === "admin" || user.role === "finance";
  if (!hasAdminOrFinanceRole) {
    return (
      <DashboardLayout>
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <h1 className="text-2xl font-semibold text-gray-900">VAT Returns</h1>
            <div className="mt-8 text-center">
              <h2 className="text-lg font-medium text-red-600">Access Denied</h2>
              <p className="mt-2 text-gray-600">
                You don't have permission to access the VAT returns management page.
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
          <h1 className="text-2xl font-semibold text-gray-900">VAT Returns</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage VAT returns for UAE 5% standard rate
          </p>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* VAT Return Form */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>{editingVatReturn ? "Edit VAT Return" : "Create VAT Return"}</CardTitle>
                <CardDescription>
                  {editingVatReturn
                    ? "Update VAT return information"
                    : "Prepare a new VAT return for filing"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...vatReturnForm}>
                  <form onSubmit={vatReturnForm.handleSubmit(onVatReturnSubmit)} className="space-y-4">
                    <div className="flex justify-between">
                      <h3 className="text-sm font-medium text-gray-700">Reporting Period</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCalculationDialog(true)}
                        className="flex items-center text-xs"
                      >
                        <Calculator className="h-3 w-3 mr-1" />
                        Auto-Calculate
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={vatReturnForm.control}
                        name="period_start"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date*</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={vatReturnForm.control}
                        name="period_end"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Date*</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={vatReturnForm.control}
                      name="due_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date*</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="pt-2">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">VAT Amounts</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={vatReturnForm.control}
                          name="output_vat"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Output VAT*</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={vatReturnForm.control}
                          name="input_vat"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Input VAT*</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <FormField
                      control={vatReturnForm.control}
                      name="net_vat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Net VAT (Output - Input)*</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              disabled
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={vatReturnForm.control}
                      name="reference_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reference Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Optional reference number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={vatReturnForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Add any additional notes"
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end pt-4 space-x-2">
                      {editingVatReturn && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancelVatReturnEdit}
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        type="submit"
                        disabled={createVatReturnMutation.isPending || updateVatReturnMutation.isPending}
                      >
                        {editingVatReturn ? "Update VAT Return" : "Create VAT Return"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* VAT Returns List */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>VAT Return History</CardTitle>
                <CardDescription>
                  View and manage VAT returns
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingVatReturns ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : vatReturns.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FilePieChart className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No VAT returns found. Create your first VAT return to get started.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Period</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Output VAT</TableHead>
                          <TableHead>Input VAT</TableHead>
                          <TableHead>Net VAT</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vatReturns.map((vatReturn) => (
                          <TableRow key={vatReturn.id}>
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span>{formatDate(vatReturn.period_start)}</span>
                                <span className="text-gray-500 text-xs">to</span>
                                <span>{formatDate(vatReturn.period_end)}</span>
                              </div>
                            </TableCell>
                            <TableCell>{formatDate(vatReturn.due_date)}</TableCell>
                            <TableCell>{formatCurrency(vatReturn.output_vat)}</TableCell>
                            <TableCell>{formatCurrency(vatReturn.input_vat)}</TableCell>
                            <TableCell className={vatReturn.net_vat < 0 ? "text-red-600" : "text-green-600"}>
                              {formatCurrency(vatReturn.net_vat)}
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(vatReturn.status)}`}>
                                {vatReturn.status.charAt(0).toUpperCase() + vatReturn.status.slice(1)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                {/* Edit button (only for draft returns) */}
                                {vatReturn.status === "draft" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditVatReturn(vatReturn.id)}
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                                
                                {/* Submit button (only for draft returns) */}
                                {vatReturn.status === "draft" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => submitVatReturnMutation.mutate(vatReturn.id)}
                                    title="Submit"
                                  >
                                    <Check className="h-4 w-4 text-green-600" />
                                  </Button>
                                )}
                                
                                {/* Mark as paid button (only for submitted returns) */}
                                {vatReturn.status === "submitted" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => payVatReturnMutation.mutate(vatReturn.id)}
                                    title="Mark as Paid"
                                  >
                                    <Check className="h-4 w-4 text-green-600" />
                                  </Button>
                                )}
                                
                                {/* Download/Print PDF button */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => generateVatReturnPDF(vatReturn)}
                                  title="Generate PDF"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* VAT Calculation Dialog */}
      <AlertDialog open={showCalculationDialog} onOpenChange={setShowCalculationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Calculate VAT</AlertDialogTitle>
            <AlertDialogDescription>
              Select a period to automatically calculate VAT based on transactions in the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={calculationPeriod.start}
                onChange={(e) => setCalculationPeriod({ ...calculationPeriod, start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={calculationPeriod.end}
                onChange={(e) => setCalculationPeriod({ ...calculationPeriod, end: e.target.value })}
              />
            </div>
          </div>
          
          {calculationResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <h3 className="font-medium mb-2">Calculation Results</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Output VAT:</div>
                <div className="text-right">{formatCurrency(calculationResult.output)}</div>
                <div>Input VAT:</div>
                <div className="text-right">{formatCurrency(calculationResult.input)}</div>
                <div className="font-medium">Net VAT:</div>
                <div className={`text-right font-medium ${
                  calculationResult.net < 0 ? "text-red-600" : "text-green-600"
                }`}>
                  {formatCurrency(calculationResult.net)}
                </div>
              </div>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {calculationResult ? (
              <AlertDialogAction onClick={useCalculationResults}>
                Use These Values
              </AlertDialogAction>
            ) : (
              <AlertDialogAction onClick={handleCalculateVAT} disabled={calculateVatMutation.isPending}>
                Calculate
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}