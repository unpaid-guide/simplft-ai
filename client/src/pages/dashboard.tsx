import { useAuth } from "@/hooks/use-auth";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import AdminDashboard from "@/components/dashboards/admin-dashboard";
import CustomerDashboard from "@/components/dashboards/customer-dashboard";
import SalesDashboard from "@/components/dashboards/sales-dashboard";
import FinanceDashboard from "@/components/dashboards/finance-dashboard";

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardLayout>
      {user.role === "admin" && <AdminDashboard />}
      {user.role === "customer" && <CustomerDashboard />}
      {user.role === "sales" && <SalesDashboard />}
      {user.role === "finance" && <FinanceDashboard />}
    </DashboardLayout>
  );
}
