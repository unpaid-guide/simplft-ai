import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/layouts/dashboard-layout";

// Types
interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  role: "admin" | "sales" | "customer" | "finance";
  status: "active" | "pending" | "suspended";
  company: string | null;
  phone: string | null;
  created_at: string;
}

export default function UserManagementPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [newUserData, setNewUserData] = useState({
    email: "",
    password: "",
    name: "",
    role: "customer",
    company: "",
    phone: ""
  });
  const [activeTab, setActiveTab] = useState("pending");

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== "admin") {
      window.location.href = "/";
    }
  }, [user]);

  // Fetch pending users
  const { data: pendingUsers, isLoading: pendingLoading } = useQuery({
    queryKey: ["/api/users/pending"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users/pending");
      if (!res.ok) throw new Error("Failed to fetch pending users");
      return res.json();
    },
    enabled: !!user && user.role === "admin"
  });

  // Fetch all users
  const { data: allUsers, isLoading: allUsersLoading } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    enabled: !!user && user.role === "admin"
  });

  // Approve user mutation
  const approveUserMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number, role?: string }) => {
      const res = await apiRequest("POST", `/api/users/${userId}/approve`, { role });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to approve user");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "User approved",
        description: "The user has been approved and can now log in.",
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/users/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to approve user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Suspend user mutation
  const suspendUserMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: number, reason?: string }) => {
      const res = await apiRequest("POST", `/api/users/${userId}/suspend`, { reason });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to suspend user");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "User suspended",
        description: "The user has been suspended.",
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to suspend user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create new user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUserData & { role: string }) => {
      const res = await apiRequest("POST", "/api/register", userData);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create user");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "User created",
        description: "The new user has been created successfully.",
      });
      setNewUserData({
        email: "",
        password: "",
        name: "",
        role: "customer",
        company: "",
        phone: ""
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create user",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Change user role mutation
  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number, role: string }) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}/role`, { role });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to change user role");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Role updated",
        description: "The user's role has been updated successfully.",
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update role",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: number, newPassword: string }) => {
      const res = await apiRequest("POST", `/api/users/${userId}/reset-password`, { newPassword });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to reset password");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password reset",
        description: "The user's password has been reset successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reset password",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = () => {
    if (!newUserData.email || !newUserData.password || !newUserData.name) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    createUserMutation.mutate({ ...newUserData, role: newUserData.role });
  };

  // Render functions for status badges
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-600">Active</Badge>;
      case "pending":
        return <Badge className="bg-yellow-600">Pending</Badge>;
      case "suspended":
        return <Badge className="bg-red-600">Suspended</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const renderRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-purple-600">Admin</Badge>;
      case "finance":
        return <Badge className="bg-blue-600">Finance</Badge>;
      case "sales":
        return <Badge className="bg-indigo-600">Sales</Badge>;
      case "customer":
        return <Badge className="bg-teal-600">Customer</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <h1 className="text-xl">Loading...</h1>
      </div>
    );
  }

  // Role check is done by ProtectedRoute, but we can keep it here as a backup check
  if (user.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <h1 className="text-xl">Access denied - Only admins can access User Management</h1>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">User Management</h1>
        
        <div className="grid grid-cols-1 gap-6">
          {/* Create User Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-2">Create New User</h2>
            <p className="text-gray-500 text-sm mb-6">
              As an admin, you can create new users directly without the approval process.
            </p>
            
            <div className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    className="mt-1"
                    value={newUserData.name}
                    onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    className="mt-1"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    className="mt-1"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={newUserData.role}
                    onValueChange={(value) => setNewUserData({ ...newUserData, role: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    placeholder="Company name"
                    className="mt-1"
                    value={newUserData.company}
                    onChange={(e) => setNewUserData({ ...newUserData, company: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="+1 (555) 123-4567"
                    className="mt-1"
                    value={newUserData.phone}
                    onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleCreateUser}
                disabled={createUserMutation.isPending}
              >
                {createUserMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create User
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* User List Tabs */}
          <div className="bg-white rounded-lg shadow">
            <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="p-4 border-b">
                <TabsList className="grid grid-cols-2 w-64">
                  <TabsTrigger value="pending">Pending Approval</TabsTrigger>
                  <TabsTrigger value="all">All Users</TabsTrigger>
                </TabsList>
              </div>
              
              {/* Pending Users Tab */}
              <TabsContent value="pending">
                <div className="px-6 py-4">
                  <h2 className="text-xl font-semibold mb-2">Users Pending Approval</h2>
                  <p className="text-gray-500 text-sm mb-6">
                    New user registrations that require admin approval.
                  </p>
                  
                  {pendingLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : pendingUsers && pendingUsers.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Company</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Registered</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingUsers.map((user: User) => (
                            <TableRow key={user.id}>
                              <TableCell>{user.name}</TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>{user.company || "-"}</TableCell>
                              <TableCell>{user.phone || "-"}</TableCell>
                              <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-2">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Approve
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Approve User</DialogTitle>
                                        <DialogDescription>
                                          You can optionally change the role of the user before approval.
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="py-4">
                                        <Label htmlFor={`approve-role-${user.id}`}>User Role</Label>
                                        <Select
                                          defaultValue="customer"
                                          onValueChange={(value) => {
                                            approveUserMutation.mutate({
                                              userId: user.id,
                                              role: value
                                            });
                                          }}
                                        >
                                          <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Select role" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="customer">Customer</SelectItem>
                                            <SelectItem value="sales">Sales</SelectItem>
                                            <SelectItem value="finance">Finance</SelectItem>
                                            <SelectItem value="admin">Admin</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <DialogFooter>
                                        <Button
                                          onClick={() => approveUserMutation.mutate({ userId: user.id })}
                                          disabled={approveUserMutation.isPending}
                                        >
                                          {approveUserMutation.isPending ? (
                                            <>
                                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                              Approving...
                                            </>
                                          ) : (
                                            "Approve as Customer"
                                          )}
                                        </Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                  
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => suspendUserMutation.mutate({
                                      userId: user.id,
                                      reason: "Registration rejected by admin"
                                    })}
                                    disabled={suspendUserMutation.isPending}
                                  >
                                    {suspendUserMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <XCircle className="h-4 w-4 mr-1" />
                                        Reject
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No pending user registrations.
                    </div>
                  )}
                </div>
              </TabsContent>
              
              {/* All Users Tab */}
              <TabsContent value="all">
                <div className="px-6 py-4">
                  <h2 className="text-xl font-semibold mb-2">All Users</h2>
                  <p className="text-gray-500 text-sm mb-6">
                    Manage all users in the system.
                  </p>
                  
                  {allUsersLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : allUsers && allUsers.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Company</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allUsers.map((user: User) => (
                            <TableRow key={user.id}>
                              <TableCell>{user.name}</TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>{renderRoleBadge(user.role)}</TableCell>
                              <TableCell>{renderStatusBadge(user.status)}</TableCell>
                              <TableCell>{user.company || "-"}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-2">
                                  {/* Change Role Button - Only show if not the current user */}
                                  {user.id !== user?.id && (
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button variant="outline" size="sm">
                                          Change Role
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>Update User Role</DialogTitle>
                                          <DialogDescription>
                                            Change the role for {user.name}
                                          </DialogDescription>
                                        </DialogHeader>
                                        <div className="py-4">
                                          <Label htmlFor={`role-${user.id}`}>Select New Role</Label>
                                          <Select
                                            defaultValue={user.role}
                                            onValueChange={(value) => {
                                              changeRoleMutation.mutate({
                                                userId: user.id,
                                                role: value
                                              });
                                            }}
                                          >
                                            <SelectTrigger id={`role-${user.id}`} className="mt-1">
                                              <SelectValue placeholder="Select role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="admin">Admin</SelectItem>
                                              <SelectItem value="finance">Finance</SelectItem>
                                              <SelectItem value="sales">Sales</SelectItem>
                                              <SelectItem value="customer">Customer</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  )}
                                  
                                  {/* Reset Password Button */}
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        Reset Password
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Reset Password</DialogTitle>
                                        <DialogDescription>
                                          Set a new password for {user.name}
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="py-4">
                                        <Label htmlFor={`new-password-${user.id}`}>New Password</Label>
                                        <Input
                                          id={`new-password-${user.id}`}
                                          type="password"
                                          className="mt-2"
                                        />
                                      </div>
                                      <DialogFooter>
                                        <Button onClick={() => {
                                          const passwordInput = document.getElementById(`new-password-${user.id}`) as HTMLInputElement;
                                          if (passwordInput && passwordInput.value) {
                                            resetPasswordMutation.mutate({
                                              userId: user.id,
                                              newPassword: passwordInput.value
                                            });
                                          } else {
                                            toast({
                                              title: "Password required",
                                              description: "Please enter a new password",
                                              variant: "destructive",
                                            });
                                          }
                                        }}>
                                          Reset Password
                                        </Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                  
                                  {/* Suspend/Activate Button */}
                                  {user.id !== user?.id && (
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button 
                                          variant={user.status === "active" ? "destructive" : "outline"}
                                          size="sm"
                                        >
                                          {user.status === "active" ? "Suspend" : "Activate"}
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>
                                            {user.status === "active" ? "Suspend User" : "Activate User"}
                                          </DialogTitle>
                                          <DialogDescription>
                                            {user.status === "active" 
                                              ? "This will suspend the user and prevent them from logging in."
                                              : "This will reactivate the suspended user account."
                                            }
                                          </DialogDescription>
                                        </DialogHeader>
                                        {user.status === "active" && (
                                          <div className="py-4">
                                            <Label htmlFor={`suspend-reason-${user.id}`}>Reason</Label>
                                            <Input
                                              id={`suspend-reason-${user.id}`}
                                              placeholder="Reason for suspension"
                                              className="mt-2"
                                            />
                                          </div>
                                        )}
                                        <DialogFooter>
                                          <Button 
                                            variant={user.status === "active" ? "destructive" : "default"}
                                            onClick={() => {
                                              if (user.status === "active") {
                                                const reasonInput = document.getElementById(`suspend-reason-${user.id}`) as HTMLInputElement;
                                                suspendUserMutation.mutate({
                                                  userId: user.id,
                                                  reason: reasonInput?.value
                                                });
                                              } else {
                                                approveUserMutation.mutate({
                                                  userId: user.id
                                                });
                                              }
                                            }}
                                          >
                                            {user.status === "active" ? "Suspend User" : "Activate User"}
                                          </Button>
                                        </DialogFooter>
                                      </DialogContent>
                                    </Dialog>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No users found.
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}