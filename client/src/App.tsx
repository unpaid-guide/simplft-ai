import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

// Pages
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Subscriptions from "@/pages/subscriptions";
import Invoices from "@/pages/invoices";
import Quotes from "@/pages/quotes";
import DiscountApprovals from "@/pages/discount-approvals";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import Checkout from "@/pages/checkout";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      
      {/* Protected Routes - access based on user role */}
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/subscriptions" component={Subscriptions} />
      <ProtectedRoute path="/invoices" component={Invoices} />
      <ProtectedRoute path="/quotes" component={Quotes} />
      <ProtectedRoute 
        path="/discount-approvals" 
        component={DiscountApprovals} 
        allowedRoles={["admin", "sales"]} 
      />
      <ProtectedRoute 
        path="/reports" 
        component={Reports} 
        allowedRoles={["admin", "finance"]}
      />
      <ProtectedRoute path="/settings" component={Settings} />
      <ProtectedRoute path="/checkout" component={Checkout} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
