import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  UserCog,
  Bell,
  CreditCard,
  Shield,
  LogOut,
  Save,
  User,
  Mail,
  Building,
  Key,
} from "lucide-react";

// Profile form schema
const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  company: z.string().optional(),
});

// Notification preferences schema
const notificationFormSchema = z.object({
  email_invoices: z.boolean().default(true),
  email_updates: z.boolean().default(true),
  email_token_low: z.boolean().default(true),
  email_marketing: z.boolean().default(false),
});

export default function Settings() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");

  // Profile form
  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      company: user?.company || "",
    },
  });

  // Notification preferences form
  const notificationForm = useForm<z.infer<typeof notificationFormSchema>>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      email_invoices: true,
      email_updates: true,
      email_token_low: true,
      email_marketing: false,
    },
  });

  // Handle profile update
  const profileMutation = useMutation({
    mutationFn: async (values: z.infer<typeof profileFormSchema>) => {
      if (!user) return null;
      const res = await apiRequest("PUT", `/api/users/${user.id}`, values);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      // Update the user data in the cache
      queryClient.setQueryData(["/api/user"], { ...user, ...data });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle notification preferences update
  const notificationMutation = useMutation({
    mutationFn: async (values: z.infer<typeof notificationFormSchema>) => {
      if (!user) return null;
      const res = await apiRequest("PUT", `/api/users/${user.id}/notifications`, values);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Preferences updated",
        description: "Your notification preferences have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle profile form submission
  function onProfileSubmit(values: z.infer<typeof profileFormSchema>) {
    profileMutation.mutate(values);
  }

  // Handle notification form submission
  function onNotificationSubmit(values: z.infer<typeof notificationFormSchema>) {
    notificationMutation.mutate(values);
  }

  // Handle logout
  function handleLogout() {
    logoutMutation.mutate();
  }

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="mt-1 text-gray-500">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile" className="flex items-center">
                <UserCog className="h-4 w-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex items-center">
                <CreditCard className="h-4 w-4 mr-2" />
                Billing
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                Security
              </TabsTrigger>
            </TabsList>

            {/* Profile Settings */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Settings</CardTitle>
                  <CardDescription>
                    Manage your personal information and account details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4 mb-6">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-medium">{user.name}</h3>
                      <p className="text-sm text-gray-500 capitalize">{user.role}</p>
                    </div>
                  </div>

                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                      <FormField
                        control={profileForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input className="pl-10" placeholder="Enter your full name" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input className="pl-10" placeholder="Enter your email" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="company"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company (Optional)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input className="pl-10" placeholder="Enter your company name" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div>
                        <h3 className="text-base font-medium">Account Information</h3>
                        <Separator className="my-4" />
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-500">Username</p>
                            <p className="mt-1">{user.username}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Role</p>
                            <p className="mt-1 capitalize">{user.role}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Member Since</p>
                            <p className="mt-1">{new Date(user.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="flex items-center"
                        disabled={profileMutation.isPending}
                      >
                        {profileMutation.isPending ? (
                          "Saving Changes..."
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notification Settings */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Manage how you receive notifications and updates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...notificationForm}>
                    <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-6">
                      <div>
                        <h3 className="text-base font-medium mb-3">Email Notifications</h3>
                        <div className="space-y-4">
                          <FormField
                            control={notificationForm.control}
                            name="email_invoices"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between">
                                <div className="space-y-0.5">
                                  <FormLabel>Invoices and Payment Receipts</FormLabel>
                                  <FormDescription>
                                    Receive email notifications about invoices and payments
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={notificationForm.control}
                            name="email_updates"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between">
                                <div className="space-y-0.5">
                                  <FormLabel>Product Updates</FormLabel>
                                  <FormDescription>
                                    Receive emails about new features and improvements
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={notificationForm.control}
                            name="email_token_low"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between">
                                <div className="space-y-0.5">
                                  <FormLabel>Token Low Balance Alerts</FormLabel>
                                  <FormDescription>
                                    Get notified when your token balance is running low
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={notificationForm.control}
                            name="email_marketing"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between">
                                <div className="space-y-0.5">
                                  <FormLabel>Marketing Emails</FormLabel>
                                  <FormDescription>
                                    Receive promotional offers and marketing communications
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="flex items-center"
                        disabled={notificationMutation.isPending}
                      >
                        {notificationMutation.isPending ? (
                          "Saving Preferences..."
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Preferences
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Billing Settings */}
            <TabsContent value="billing">
              <Card>
                <CardHeader>
                  <CardTitle>Billing Information</CardTitle>
                  <CardDescription>
                    Manage your billing information and payment methods
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-medium">Current Subscription</h3>
                      <Separator className="my-4" />
                      <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Pro Plan</p>
                            <p className="text-sm text-gray-500">$99.00/month • Renews on June 15, 2023</p>
                          </div>
                          <Button variant="outline" size="sm">
                            Manage Plan
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-medium">Payment Methods</h3>
                      <Separator className="my-4" />
                      <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="h-8 w-12 bg-gray-200 rounded mr-3 flex items-center justify-center">
                              <span className="text-xs font-medium">VISA</span>
                            </div>
                            <div>
                              <p className="font-medium">Visa ending in 4242</p>
                              <p className="text-sm text-gray-500">Expires 06/2025</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                            <Button variant="outline" size="sm">
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Button variant="outline">
                          <CreditCard className="mr-2 h-4 w-4" />
                          Add Payment Method
                        </Button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-medium">Billing History</h3>
                      <Separator className="my-4" />
                      <div className="rounded-md border">
                        <div className="p-4 text-center text-gray-500">
                          No billing history available
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Settings */}
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Manage your account security and password
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-base font-medium">Change Password</h3>
                    <Separator className="my-4" />
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="current-password" className="block text-sm font-medium">
                          Current Password
                        </label>
                        <div className="relative mt-1">
                          <Key className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="current-password"
                            type="password"
                            placeholder="Enter your current password"
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="new-password" className="block text-sm font-medium">
                          New Password
                        </label>
                        <div className="relative mt-1">
                          <Key className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="new-password"
                            type="password"
                            placeholder="Enter your new password"
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="confirm-password" className="block text-sm font-medium">
                          Confirm New Password
                        </label>
                        <div className="relative mt-1">
                          <Key className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="confirm-password"
                            type="password"
                            placeholder="Confirm your new password"
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <Button className="mt-2">
                        Update Password
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-medium">Two-Factor Authentication</h3>
                    <Separator className="my-4" />
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Two-Factor Authentication</p>
                          <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                        </div>
                        <Button variant="outline">
                          Enable
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-medium">Account Actions</h3>
                    <Separator className="my-4" />
                    <div className="space-y-4">
                      <Button variant="outline" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </Button>
                      <div>
                        <Button variant="destructive">
                          Delete Account
                        </Button>
                        <p className="text-sm text-gray-500 mt-2">
                          This action cannot be undone. All of your data will be permanently deleted.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}
