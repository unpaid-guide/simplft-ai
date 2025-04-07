import { useState } from "react";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertAccountSchema } from "@shared/schema";
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
import { BookOpenIcon, Edit, Trash2, Plus, BookIcon } from "lucide-react";

// Extended schema with validation
const createAccountSchema = insertAccountSchema.extend({
  name: z.string().min(3, "Name must be at least 3 characters"),
  type: z.enum(["asset", "liability", "equity", "income", "expense"]),
  account_number: z.string().min(3, "Account number must be at least 3 characters").optional().nullable(),
  description: z.string().optional().nullable(),
});

export default function AccountsManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [editingAccount, setEditingAccount] = useState<number | null>(null);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<number | null>(null);

  // Account form
  const accountForm = useForm<z.infer<typeof createAccountSchema>>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      name: "",
      type: "asset",
      account_number: "",
      description: "",
    },
  });

  // Fetch accounts
  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["/api/accounts"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/accounts");
      if (!response.ok) throw new Error("Failed to fetch accounts");
      return response.json();
    },
  });

  // Create account mutation
  const createAccountMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createAccountSchema>) => {
      const response = await apiRequest("POST", "/api/accounts", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create account");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account Created",
        description: "Account has been successfully created",
      });
      accountForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update account mutation
  const updateAccountMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof createAccountSchema> }) => {
      const response = await apiRequest("PATCH", `/api/accounts/${id}`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update account");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account Updated",
        description: "Account has been successfully updated",
      });
      accountForm.reset();
      setEditingAccount(null);
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/accounts/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete account");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "Account has been successfully deleted",
      });
      setIsDeleteAccountOpen(false);
      setAccountToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle account form submission
  function onAccountSubmit(data: z.infer<typeof createAccountSchema>) {
    if (editingAccount) {
      updateAccountMutation.mutate({ id: editingAccount, data });
    } else {
      createAccountMutation.mutate(data);
    }
  }

  // Set up account form for editing
  function handleEditAccount(accountId: number) {
    const account = accounts.find((a) => a.id === accountId);
    if (account) {
      accountForm.reset({
        name: account.name,
        type: account.type,
        account_number: account.account_number || "",
        description: account.description || "",
      });
      setEditingAccount(accountId);
    }
  }

  // Cancel editing
  function handleCancelAccountEdit() {
    setEditingAccount(null);
    accountForm.reset();
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100); // Convert cents to dollars for display
  }

  // Filter accounts by type
  function getFilteredAccounts() {
    if (activeTab === "all") return accounts;
    return accounts.filter((account) => account.type === activeTab);
  }

  // Get account type display name
  function getAccountTypeDisplay(type: string) {
    const typeMap: Record<string, string> = {
      asset: "Asset",
      liability: "Liability",
      equity: "Equity",
      income: "Income",
      expense: "Expense",
    };
    return typeMap[type] || type;
  }

  // Get account type color
  function getAccountTypeColor(type: string) {
    const colorMap: Record<string, string> = {
      asset: "bg-blue-100 text-blue-800",
      liability: "bg-red-100 text-red-800",
      equity: "bg-purple-100 text-purple-800",
      income: "bg-green-100 text-green-800",
      expense: "bg-orange-100 text-orange-800",
    };
    return colorMap[type] || "bg-gray-100 text-gray-800";
  }

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Chart of Accounts</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your accounting structure
          </p>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Account Form */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>{editingAccount ? "Edit Account" : "Add New Account"}</CardTitle>
                <CardDescription>
                  {editingAccount
                    ? "Update account information"
                    : "Create a new account in your chart of accounts"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...accountForm}>
                  <form onSubmit={accountForm.handleSubmit(onAccountSubmit)} className="space-y-4">
                    <FormField
                      control={accountForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Name*</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter account name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={accountForm.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Type*</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select account type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="asset">Asset</SelectItem>
                              <SelectItem value="liability">Liability</SelectItem>
                              <SelectItem value="equity">Equity</SelectItem>
                              <SelectItem value="income">Income</SelectItem>
                              <SelectItem value="expense">Expense</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={accountForm.control}
                      name="account_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Optional account number" value={field.value || ""} onChange={field.onChange} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={accountForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe the account purpose"
                              className="min-h-[80px]"
                              value={field.value || ""}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end pt-4 space-x-2">
                      {editingAccount && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancelAccountEdit}
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        type="submit"
                        disabled={createAccountMutation.isPending || updateAccountMutation.isPending}
                      >
                        {editingAccount ? "Update Account" : "Add Account"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Accounts List */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Chart of Accounts</CardTitle>
                <CardDescription>
                  View and manage your financial accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                  <TabsList className="grid grid-cols-6 w-full bg-gray-100">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="asset">Assets</TabsTrigger>
                    <TabsTrigger value="liability">Liabilities</TabsTrigger>
                    <TabsTrigger value="equity">Equity</TabsTrigger>
                    <TabsTrigger value="income">Income</TabsTrigger>
                    <TabsTrigger value="expense">Expenses</TabsTrigger>
                  </TabsList>

                  <TabsContent value={activeTab} className="mt-4">
                    {isLoadingAccounts ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                      </div>
                    ) : getFilteredAccounts().length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <BookOpenIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                        <p>No accounts found. Add your first account to get started.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Account Name</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Account Number</TableHead>
                              <TableHead>Balance</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getFilteredAccounts().map((account) => (
                              <TableRow key={account.id}>
                                <TableCell className="font-medium">{account.name}</TableCell>
                                <TableCell>
                                  <span className={`px-2 py-1 rounded-full text-xs ${getAccountTypeColor(account.type)}`}>
                                    {getAccountTypeDisplay(account.type)}
                                  </span>
                                </TableCell>
                                <TableCell>{account.account_number || "—"}</TableCell>
                                <TableCell>{formatCurrency(account.balance)}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEditAccount(account.id)}
                                      disabled={account.is_system}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog open={isDeleteAccountOpen && accountToDelete === account.id}>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => {
                                            setAccountToDelete(account.id);
                                            setIsDeleteAccountOpen(true);
                                          }}
                                          disabled={account.is_system}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete Account</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete the account "{account.name}"?
                                            This action cannot be undone.
                                            
                                            {account.balance > 0 && (
                                              <p className="mt-2 text-red-500 font-semibold">
                                                Warning: This account has a balance of {formatCurrency(account.balance)}.
                                                Deleting it may cause accounting discrepancies.
                                              </p>
                                            )}
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel onClick={() => setIsDeleteAccountOpen(false)}>
                                            Cancel
                                          </AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => deleteAccountMutation.mutate(account.id)}
                                            className="bg-red-600 hover:bg-red-700"
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
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