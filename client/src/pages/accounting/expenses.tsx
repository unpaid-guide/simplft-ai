import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertExpenseSchema } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ReceiptIcon, 
  Edit, 
  Trash2, 
  Plus, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  FileText,
  Receipt,
  DollarSign
} from "lucide-react";
import { format } from "date-fns";

// Extended schema with validation
const createExpenseSchema = insertExpenseSchema.extend({
  title: z.string().min(3, "Title must be at least 3 characters"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  vat_amount: z.coerce.number().min(0, "VAT amount cannot be negative").optional(),
  vat_rate: z.coerce.number().min(0, "VAT rate cannot be negative").max(100, "VAT rate cannot exceed 100%").default(5),
  vat_recoverable: z.boolean().default(true),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date in YYYY-MM-DD format"),
  description: z.string().optional(),
  category: z.enum(["utilities", "software", "marketing", "office", "payroll", "other"]),
  account_id: z.number().min(1, "Please select an account"),
  payment_method: z.string().optional(),
  payment_reference: z.string().optional(),
  receipt_url: z.string().optional(),
});

export default function ExpensesManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [editingExpense, setEditingExpense] = useState<number | null>(null);
  const [isDeleteExpenseOpen, setIsDeleteExpenseOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<number | null>(null);

  // Expense form
  const expenseForm = useForm<z.infer<typeof createExpenseSchema>>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      title: "",
      amount: 0,
      vat_amount: 0,
      vat_rate: 5, // Default UAE VAT rate is 5%
      vat_recoverable: true,
      expense_date: format(new Date(), "yyyy-MM-dd"),
      description: "",
      category: "other",
      payment_method: "",
      payment_reference: "",
      receipt_url: "",
    },
  });

  // Auto-calculate VAT amount when amount or rate changes
  const watchAmount = expenseForm.watch("amount");
  const watchVatRate = expenseForm.watch("vat_rate");
  const watchVatRecoverable = expenseForm.watch("vat_recoverable");
  
  // Calculate VAT amount when amount or rate changes
  const calculateVatAmount = () => {
    if (watchVatRecoverable) {
      const amount = parseFloat(watchAmount.toString());
      const vatRate = parseFloat(watchVatRate.toString());
      const vatAmount = (amount * vatRate) / 100;
      expenseForm.setValue("vat_amount", Math.round(vatAmount * 100) / 100);
    } else {
      expenseForm.setValue("vat_amount", 0);
    }
  };

  // Update VAT amount when amount, rate or recoverable status changes
  useEffect(() => {
    calculateVatAmount();
  }, [watchAmount, watchVatRate, watchVatRecoverable]);

  // Fetch accounts for dropdown
  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["/api/accounts"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/accounts");
      if (!response.ok) throw new Error("Failed to fetch accounts");
      return response.json();
    },
  });

  // Fetch expenses
  const { data: expenses = [], isLoading: isLoadingExpenses } = useQuery({
    queryKey: ["/api/expenses"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/expenses");
      if (!response.ok) throw new Error("Failed to fetch expenses");
      return response.json();
    },
  });

  // Create expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createExpenseSchema>) => {
      // Convert price values from dollars to cents for database storage
      const formattedData = {
        ...data,
        amount: Math.round(data.amount * 100),
        vat_amount: Math.round((data.vat_amount || 0) * 100),
      };
      
      const response = await apiRequest("POST", "/api/expenses", formattedData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create expense");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Expense Created",
        description: "Expense has been successfully created",
      });
      expenseForm.reset({
        title: "",
        amount: 0,
        vat_amount: 0,
        vat_rate: 5,
        vat_recoverable: true,
        expense_date: format(new Date(), "yyyy-MM-dd"),
        description: "",
        category: "other",
        payment_method: "",
        payment_reference: "",
        receipt_url: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update expense mutation
  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof createExpenseSchema> }) => {
      // Convert price values from dollars to cents for database storage
      const formattedData = {
        ...data,
        amount: Math.round(data.amount * 100),
        vat_amount: Math.round((data.vat_amount || 0) * 100),
      };
      
      const response = await apiRequest("PATCH", `/api/expenses/${id}`, formattedData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update expense");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Expense Updated",
        description: "Expense has been successfully updated",
      });
      expenseForm.reset({
        title: "",
        amount: 0,
        vat_amount: 0,
        vat_rate: 5,
        vat_recoverable: true,
        expense_date: format(new Date(), "yyyy-MM-dd"),
        description: "",
        category: "other",
        payment_method: "",
        payment_reference: "",
        receipt_url: "",
      });
      setEditingExpense(null);
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/expenses/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete expense");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Expense Deleted",
        description: "Expense has been successfully deleted",
      });
      setIsDeleteExpenseOpen(false);
      setExpenseToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Approve expense mutation
  const approveExpenseMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/expenses/${id}/approve`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to approve expense");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Expense Approved",
        description: "Expense has been successfully approved",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reject expense mutation
  const rejectExpenseMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const response = await apiRequest("POST", `/api/expenses/${id}/reject`, { reason });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to reject expense");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Expense Rejected",
        description: "Expense has been successfully rejected",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle expense form submission
  function onExpenseSubmit(data: z.infer<typeof createExpenseSchema>) {
    if (editingExpense) {
      updateExpenseMutation.mutate({ id: editingExpense, data });
    } else {
      createExpenseMutation.mutate(data);
    }
  }

  // Set up expense form for editing
  function handleEditExpense(expenseId: number) {
    const expense = expenses.find((e) => e.id === expenseId);
    if (expense) {
      // Convert cents to dollars for form display
      expenseForm.reset({
        ...expense,
        amount: expense.amount / 100,
        vat_amount: expense.vat_amount / 100,
        vat_rate: parseFloat(expense.vat_rate),
        expense_date: format(new Date(expense.expense_date), "yyyy-MM-dd"),
      });
      setEditingExpense(expenseId);
    }
  }

  // Cancel editing
  function handleCancelExpenseEdit() {
    setEditingExpense(null);
    expenseForm.reset({
      title: "",
      amount: 0,
      vat_amount: 0,
      vat_rate: 5,
      vat_recoverable: true,
      expense_date: format(new Date(), "yyyy-MM-dd"),
      description: "",
      category: "other",
      payment_method: "",
      payment_reference: "",
      receipt_url: "",
    });
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100); // Convert cents to dollars for display
  }

  // Filter expenses by status
  function getFilteredExpenses() {
    if (activeTab === "all") return expenses;
    return expenses.filter((expense) => expense.status === activeTab);
  }

  // Get account name by id
  function getAccountNameById(id: number) {
    const account = accounts.find((a) => a.id === id);
    return account ? account.name : "Unknown";
  }

  // Get category display name
  function getCategoryDisplay(category: string) {
    const categoryMap: Record<string, string> = {
      utilities: "Utilities",
      software: "Software",
      marketing: "Marketing",
      office: "Office Supplies",
      payroll: "Payroll",
      other: "Other",
    };
    return categoryMap[category] || category;
  }

  // Get status color
  function getStatusColor(status: string) {
    const statusMap: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return statusMap[status] || "bg-gray-100 text-gray-800";
  }

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Expense Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and manage company expenses
          </p>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Expense Form */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>{editingExpense ? "Edit Expense" : "Add New Expense"}</CardTitle>
                <CardDescription>
                  {editingExpense
                    ? "Update expense information"
                    : "Record a new company expense"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...expenseForm}>
                  <form onSubmit={expenseForm.handleSubmit(onExpenseSubmit)} className="space-y-4">
                    <FormField
                      control={expenseForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expense Title*</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter expense title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={expenseForm.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount*</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  // VAT will be auto-calculated via effect
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={expenseForm.control}
                        name="expense_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date*</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={expenseForm.control}
                        name="vat_rate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>VAT Rate (%)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                placeholder="5.00"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  // VAT will be auto-calculated via effect
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={expenseForm.control}
                        name="vat_amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>VAT Amount</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                disabled={watchVatRecoverable}
                                placeholder="0.00"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={expenseForm.control}
                      name="vat_recoverable"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>VAT Recoverable</FormLabel>
                            <p className="text-sm text-gray-500">
                              Check if the VAT on this expense can be reclaimed
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={expenseForm.control}
                      name="account_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account*</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(Number(value))}
                            value={field.value?.toString() || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select account" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {accounts
                                .filter(account => account.type === "expense")
                                .map((account) => (
                                  <SelectItem
                                    key={account.id}
                                    value={account.id.toString()}
                                  >
                                    {account.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={expenseForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category*</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="utilities">Utilities</SelectItem>
                              <SelectItem value="software">Software</SelectItem>
                              <SelectItem value="marketing">Marketing</SelectItem>
                              <SelectItem value="office">Office Supplies</SelectItem>
                              <SelectItem value="payroll">Payroll</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={expenseForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Add details about this expense"
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={expenseForm.control}
                      name="payment_method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Credit Card, Cash, Bank Transfer" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={expenseForm.control}
                      name="payment_reference"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Reference</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Invoice #, Receipt #" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={expenseForm.control}
                      name="receipt_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Receipt URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com/receipt.pdf" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end pt-4 space-x-2">
                      {editingExpense && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancelExpenseEdit}
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        type="submit"
                        disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending}
                      >
                        {editingExpense ? "Update Expense" : "Add Expense"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Expenses List */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Expense List</CardTitle>
                <CardDescription>
                  View and manage company expenses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                  <TabsList className="grid grid-cols-3 w-full bg-gray-100">
                    <TabsTrigger value="all">All Expenses</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="approved">Approved</TabsTrigger>
                  </TabsList>

                  <TabsContent value={activeTab} className="mt-4">
                    {isLoadingExpenses ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                      </div>
                    ) : getFilteredExpenses().length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <ReceiptIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                        <p>No expenses found. Add your first expense to get started.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Expense</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>VAT</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getFilteredExpenses().map((expense) => (
                              <TableRow key={expense.id}>
                                <TableCell className="font-medium">
                                  <div>
                                    <div>{expense.title}</div>
                                    <div className="text-xs text-gray-500">
                                      {format(new Date(expense.expense_date), "PPP")}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>{getCategoryDisplay(expense.category)}</TableCell>
                                <TableCell>{formatCurrency(expense.amount)}</TableCell>
                                <TableCell>
                                  {formatCurrency(expense.vat_amount)}
                                  {expense.vat_recoverable && (
                                    <span className="ml-1 text-xs text-green-600">(Recoverable)</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(expense.status)}`}>
                                    {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end space-x-2">
                                    {/* Admin or Finance can approve/reject */}
                                    {(user.role === "admin" || user.role === "finance") && expense.status === "pending" && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => approveExpenseMutation.mutate(expense.id)}
                                          title="Approve"
                                        >
                                          <CheckCircle className="h-4 w-4 text-green-600" />
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              title="Reject"
                                            >
                                              <XCircle className="h-4 w-4 text-red-600" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Reject Expense</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Are you sure you want to reject this expense?
                                                Please provide a reason for rejection.
                                              </AlertDialogDescription>
                                              <Textarea 
                                                id="rejection-reason" 
                                                placeholder="Reason for rejection"
                                                className="mt-2"
                                              />
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction
                                                onClick={() => {
                                                  const reasonElement = document.getElementById("rejection-reason") as HTMLTextAreaElement;
                                                  const reason = reasonElement?.value || "No reason provided";
                                                  rejectExpenseMutation.mutate({ id: expense.id, reason });
                                                }}
                                                className="bg-red-600 hover:bg-red-700"
                                              >
                                                Reject
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </>
                                    )}
                                    
                                    {/* Edit button (only for pending expenses) */}
                                    {expense.status === "pending" && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEditExpense(expense.id)}
                                        title="Edit"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    )}
                                    
                                    {/* Delete button (only for pending expenses) */}
                                    {expense.status === "pending" && (
                                      <AlertDialog open={isDeleteExpenseOpen && expenseToDelete === expense.id}>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                              setExpenseToDelete(expense.id);
                                              setIsDeleteExpenseOpen(true);
                                            }}
                                            title="Delete"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Are you sure you want to delete this expense?
                                              This action cannot be undone.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel onClick={() => setIsDeleteExpenseOpen(false)}>
                                              Cancel
                                            </AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => deleteExpenseMutation.mutate(expense.id)}
                                              className="bg-red-600 hover:bg-red-700"
                                            >
                                              Delete
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    )}
                                    
                                    {/* View receipt button (if receipt_url exists) */}
                                    {expense.receipt_url && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => window.open(expense.receipt_url, "_blank")}
                                        title="View Receipt"
                                      >
                                        <FileText className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}