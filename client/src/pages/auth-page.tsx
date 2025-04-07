import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogIn, UserPlus, Tag, CheckCircle, LockKeyhole, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Login form schema
const loginSchema = z.object({
  username: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

// Registration form schema
const registerSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  company: z.string().min(1, "Company name is required"),
  phone: z.string().min(1, "Phone number is required"),
});

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const { user, loginMutation, registerMutation } = useAuth();

  // Login form
  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Registration form
  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      company: "",
      phone: "",
    },
  });
  
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  // Handle login submission
  const onLoginSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(values);
  };

  // Handle registration submission
  const onRegisterSubmit = async (values: z.infer<typeof registerSchema>) => {
    try {
      setRegistrationError(null);
      const response = await apiRequest("POST", "/api/register", values);
      
      if (response.ok) {
        const data = await response.json();
        setRegistrationSuccess(true);
      } else {
        const errorData = await response.json();
        setRegistrationError(errorData.message || "Registration failed. Please try again.");
      }
    } catch (error) {
      setRegistrationError("An unexpected error occurred. Please try again.");
    }
  };

  // Redirect if user is already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Left Column - Forms */}
      <div className="w-full lg:w-1/2 p-6 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-2">
              <div className="w-12 h-12 rounded-md bg-primary flex items-center justify-center text-white font-bold text-2xl mr-2">
                S
              </div>
              <span className="text-2xl font-bold">Simplft</span>
            </div>
            <CardTitle className="text-2xl font-bold text-center">
              Welcome to Simplft
            </CardTitle>
            <CardDescription className="text-center">
              {activeTab === "login" 
                ? "Sign in to your account to continue" 
                : "Create an account to get started"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              {/* Login Form */}
              <TabsContent value="login">
                <div className="mt-4">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your email" type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter your password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? (
                          "Signing In..."
                        ) : (
                          <>
                            <LogIn className="mr-2 h-4 w-4" />
                            Sign In
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </div>
              </TabsContent>
              
              {/* Registration Form */}
              <TabsContent value="register">
                <div className="mt-4">
                  {registrationSuccess ? (
                    <Alert className="bg-green-50 text-green-800 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-800 font-semibold">Registration Successful!</AlertTitle>
                      <AlertDescription>
                        Your account has been created but is pending approval by an administrator. 
                        You'll be notified by email when your account is approved.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Form {...registerForm}>
                      <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                        {registrationError && (
                          <Alert className="bg-red-50 text-red-800 border-red-200">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-800">{registrationError}</AlertDescription>
                          </Alert>
                        )}
                        
                        <FormField
                          control={registerForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your full name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-1 gap-4">
                          <FormField
                            control={registerForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="Enter your email" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Create a password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="company"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your company name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your phone number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={registerForm.formState.isSubmitting}
                        >
                          {registerForm.formState.isSubmitting ? (
                            "Creating Account..."
                          ) : (
                            <>
                              <UserPlus className="mr-2 h-4 w-4" />
                              Create Account
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col">
            <p className="text-center text-sm text-gray-500 mt-2">
              {activeTab === "login" 
                ? "Don't have an account?" 
                : "Already have an account?"}{" "}
              <button
                className="text-primary hover:underline font-medium"
                onClick={() => setActiveTab(activeTab === "login" ? "register" : "login")}
              >
                {activeTab === "login" ? "Register" : "Login"}
              </button>
            </p>
          </CardFooter>
        </Card>
      </div>

      {/* Right Column - Info */}
      <div className="w-full lg:w-1/2 bg-gradient-to-br from-primary to-primary/80 p-8 flex items-center justify-center text-white hidden lg:flex">
        <div className="max-w-xl">
          <h1 className="text-4xl font-bold mb-6">
            Simplft provides a comprehensive solution
          </h1>
          <p className="text-lg mb-8 text-white/90">
            "Our Customers' Growth Is Our Priority—We Simplify, they Succeed!"
          </p>
          
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="bg-white/10 p-3 rounded-full mr-4">
                <Tag className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-xl mb-1">Unified Solution</h3>
                <p className="text-white/80">
                  We eliminate the hassle of working with multiple service providers by offering HR, PRO, Legal, IT, and Insurance under one convenient subscription.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-white/10 p-3 rounded-full mr-4">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-xl mb-1">Expert Pool on Demand</h3>
                <p className="text-white/80">
                  Gain access to a diverse team of highly skilled professionals ready to deliver quality and dependability.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-white/10 p-3 rounded-full mr-4">
                <LockKeyhole className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-xl mb-1">Cost Efficiency</h3>
                <p className="text-white/80">
                  Our subscription plans are designed specifically for small and medium-sized businesses, ensuring affordability with no hidden fees.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-white/10 p-3 rounded-full mr-4">
                <Tag className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-xl mb-1">Scalable Growth</h3>
                <p className="text-white/80">
                  Our flexible plans adapt to your business's evolving needs, empowering you at every stage of growth.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
