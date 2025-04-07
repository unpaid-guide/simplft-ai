import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { 
  LayoutDashboard, Users, Coins, FileText, Percent, 
  BarChart, Settings, UserCog, LogOut, Menu, X, Search, BellIcon,
  FileSpreadsheet, LineChart, Package, BookOpen, Receipt, DollarSign
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
};

const navItems: NavItem[] = [
  { 
    label: "Dashboard", 
    href: "/", 
    icon: <LayoutDashboard className="mr-3 h-4 w-4" />,
    roles: ["admin", "sales", "finance", "customer"]
  },
  { 
    label: "User Management", 
    href: "/user-management", 
    icon: <Users className="mr-3 h-4 w-4" />,
    roles: ["admin"]
  },
  { 
    label: "Products", 
    href: "/products-management", 
    icon: <Package className="mr-3 h-4 w-4" />,
    roles: ["admin", "sales", "finance"]
  },
  { 
    label: "Subscriptions", 
    href: "/subscriptions", 
    icon: <Coins className="mr-3 h-4 w-4" />,
    roles: ["admin", "finance", "customer"]
  },
  { 
    label: "Quotes", 
    href: "/quotes", 
    icon: <FileSpreadsheet className="mr-3 h-4 w-4" />,
    roles: ["admin", "sales", "finance", "customer"]
  },
  { 
    label: "Invoices", 
    href: "/invoices", 
    icon: <FileText className="mr-3 h-4 w-4" />,
    roles: ["admin", "finance", "customer"]
  },
  { 
    label: "Discount Approvals", 
    href: "/discount-approvals", 
    icon: <Percent className="mr-3 h-4 w-4" />,
    roles: ["admin", "sales"]
  },
  { 
    label: "Accounting", 
    href: "/accounting", 
    icon: <BookOpen className="mr-3 h-4 w-4" />,
    roles: ["admin", "finance"]
  },
  { 
    label: "Reports", 
    href: "/reports", 
    icon: <BarChart className="mr-3 h-4 w-4" />,
    roles: ["admin", "finance"]
  },
  { 
    label: "Business Intelligence", 
    href: "/business-intelligence", 
    icon: <LineChart className="mr-3 h-4 w-4" />,
    roles: ["admin", "finance"]
  },
  { 
    label: "Settings", 
    href: "/settings", 
    icon: <Settings className="mr-3 h-4 w-4" />,
    roles: ["admin", "finance", "customer", "sales"]
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  if (!user) {
    return <div>Loading...</div>;
  }

  const roleBasedNavItems = navItems.filter(item => item.roles.includes(user.role));

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 z-50 flex w-64 flex-col bg-white border-r border-gray-200 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out lg:hidden`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 mr-2 rounded-md bg-primary flex items-center justify-center text-white font-bold">
              S
            </div>
            <span className="text-lg font-semibold text-gray-800">Simplft</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSidebarOpen(false)}
            className="p-2 text-gray-500 rounded-md hover:bg-gray-100 focus:outline-none"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Mobile navigation */}
        <nav className="flex-1 px-2 py-4 overflow-y-auto">
          <div className="space-y-1">
            {roleBasedNavItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <a
                  className={`flex items-center px-2 py-2 text-sm font-medium rounded-md group ${
                    location === item.href
                      ? "text-white bg-primary"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </a>
              </Link>
            ))}
          </div>
        </nav>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white lg:pt-5 lg:pb-4">
        <div className="flex items-center justify-center">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center text-white font-bold text-xl">
            S
          </div>
          <span className="text-xl font-semibold text-gray-800 ml-2">Simplft</span>
        </div>
        
        <div className="mt-8 flex flex-col flex-1">
          <nav className="flex-1 px-2 space-y-1">
            {roleBasedNavItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <a
                  className={`flex items-center px-2 py-2 text-sm font-medium rounded-md group ${
                    location === item.href
                      ? "text-white bg-primary"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </a>
              </Link>
            ))}
          </nav>
          
          <div className="px-2 py-4 mt-auto border-t border-gray-200">
            <div className="flex items-center px-2">
              <Avatar>
                <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">{user.name}</p>
                <p className="text-xs font-medium text-gray-500 capitalize">{user.role}</p>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <Link href="/settings/profile">
                <a className="flex items-center px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100 group">
                  <UserCog className="mr-3 h-4 w-4" />
                  Profile
                </a>
              </Link>
              <Button
                variant="ghost"
                className="flex w-full items-center px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100 group"
                onClick={handleLogout}
              >
                <LogOut className="mr-3 h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top navigation */}
        <div className="sticky top-0 z-10 flex flex-shrink-0 h-16 bg-white border-b border-gray-200">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="px-4 text-gray-500 border-r border-gray-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </Button>
          
          {/* Search bar */}
          <div className="flex flex-1 justify-between px-4 items-center">
            <div className="flex flex-1">
              <div className="w-full max-w-lg lg:max-w-xs">
                <label htmlFor="search" className="sr-only">Search</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <Input
                    id="search"
                    name="search"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder="Search"
                    type="search"
                  />
                </div>
              </div>
            </div>
            <div className="ml-4 flex items-center md:ml-6">
              {/* Notifications dropdown */}
              <div className="ml-3 relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="p-1 text-gray-400 rounded-full hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  <BellIcon className="h-5 w-5" />
                </Button>
                {/* Notification badge */}
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
              </div>
              
              {/* Logout button in header */}
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="ml-4 flex items-center text-sm font-medium text-gray-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span className="hidden md:inline">Sign out</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
