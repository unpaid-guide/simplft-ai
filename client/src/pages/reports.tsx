import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  BarChart as BarChartIcon,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  FileText,
  Download,
  CalendarRange,
  Filter,
  Calendar as CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";

// Mock data for charts - in a real implementation this would come from the API
const revenueData = [
  { name: "Jan", mrr: 30000, arr: 360000 },
  { name: "Feb", mrr: 32000, arr: 384000 },
  { name: "Mar", mrr: 32500, arr: 390000 },
  { name: "Apr", mrr: 33500, arr: 402000 },
  { name: "May", mrr: 35600, arr: 427200 },
  { name: "Jun", mrr: 38000, arr: 456000 },
];

const customerData = [
  { name: "Jan", active: 120, churned: 4 },
  { name: "Feb", active: 125, churned: 3 },
  { name: "Mar", active: 130, churned: 5 },
  { name: "Apr", active: 135, churned: 4 },
  { name: "May", active: 142, churned: 3 },
  { name: "Jun", active: 150, churned: 2 },
];

const tokenData = [
  { name: "Document Processing", value: 45 },
  { name: "Data Analysis", value: 25 },
  { name: "API Calls", value: 15 },
  { name: "Report Generation", value: 10 },
  { name: "Other", value: 5 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function Reports() {
  const { user } = useAuth();
  const [reportType, setReportType] = useState("revenue");
  const [timeRange, setTimeRange] = useState("last6months");
  const [date, setDate] = useState<Date>(new Date());

  // Fetch metrics data
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/reports/metrics'],
    queryFn: async () => {
      const response = await fetch('/api/reports/metrics');
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      return response.json();
    },
  });

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  if (!user || !["admin", "finance"].includes(user.role)) {
    return (
      <DashboardLayout>
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <h1 className="text-2xl font-semibold text-gray-900">Access Denied</h1>
            <p className="mt-2 text-gray-600">
              You don't have permission to access reports.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
          <p className="mt-1 text-gray-500">
            Analyze business performance and trends
          </p>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
          {/* Report Filters */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-grow">
              <Label htmlFor="report-type">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="customers">Customers</SelectItem>
                  <SelectItem value="tokens">Token Usage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="time-range">Time Range</Label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[200px] mt-1">
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last30days">Last 30 Days</SelectItem>
                  <SelectItem value="last3months">Last 3 Months</SelectItem>
                  <SelectItem value="last6months">Last 6 Months</SelectItem>
                  <SelectItem value="lastyear">Last Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {timeRange === "custom" && (
              <div>
                <Label>Custom Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className="w-[240px] justify-start text-left font-normal mt-1"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(date) => date && setDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div className="flex items-end">
              <Button className="mb-0.5">
                <Filter className="mr-2 h-4 w-4" />
                Apply Filters
              </Button>
            </div>
          </div>

          {/* Report Content */}
          {reportType === "revenue" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <BarChartIcon className="mr-2 h-5 w-5 text-primary" />
                  Revenue Report
                </CardTitle>
                <CardDescription>
                  Monthly recurring revenue (MRR) and annual recurring revenue (ARR)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">
                        {metricsLoading ? "Loading..." : formatCurrency(metrics?.mrr || 0)}
                      </div>
                      <p className="text-sm text-gray-500">Monthly Recurring Revenue</p>
                      <div className="text-sm text-green-600 mt-1">
                        <span>↑ 8.2%</span> <span className="text-gray-500">from last month</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">
                        {metricsLoading ? "Loading..." : formatCurrency(metrics?.arr || 0)}
                      </div>
                      <p className="text-sm text-gray-500">Annual Recurring Revenue</p>
                      <div className="text-sm text-green-600 mt-1">
                        <span>↑ 12.5%</span> <span className="text-gray-500">from last year</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Tabs defaultValue="chart">
                  <TabsList>
                    <TabsTrigger value="chart">Chart</TabsTrigger>
                    <TabsTrigger value="table">Table</TabsTrigger>
                  </TabsList>
                  <TabsContent value="chart" className="pt-4">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={revenueData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`$${value}`, ""]} />
                          <Legend />
                          <Bar dataKey="mrr" name="MRR" fill="#3B82F6" />
                          <Bar dataKey="arr" name="ARR" fill="#6366F1" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </TabsContent>
                  <TabsContent value="table">
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Month</TableHead>
                            <TableHead>MRR</TableHead>
                            <TableHead>ARR</TableHead>
                            <TableHead>MoM Growth</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {revenueData.map((item, index) => {
                            const prevItem = index > 0 ? revenueData[index - 1] : null;
                            const growth = prevItem ? ((item.mrr - prevItem.mrr) / prevItem.mrr) * 100 : 0;
                            
                            return (
                              <TableRow key={item.name}>
                                <TableCell>{item.name}</TableCell>
                                <TableCell>${item.mrr.toLocaleString()}</TableCell>
                                <TableCell>${item.arr.toLocaleString()}</TableCell>
                                <TableCell>
                                  {index > 0 ? (
                                    <span className={growth >= 0 ? "text-green-600" : "text-red-600"}>
                                      {growth >= 0 ? "+" : ""}{growth.toFixed(1)}%
                                    </span>
                                  ) : "—"}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end mt-6">
                  <Button variant="outline" className="flex items-center">
                    <Download className="mr-2 h-4 w-4" />
                    Export Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {reportType === "customers" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <LineChartIcon className="mr-2 h-5 w-5 text-primary" />
                  Customer Report
                </CardTitle>
                <CardDescription>
                  Active subscribers and churn rate over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">
                        {metricsLoading ? "Loading..." : metrics?.activeSubscriptionsCount || 0}
                      </div>
                      <p className="text-sm text-gray-500">Active Subscriptions</p>
                      <div className="text-sm text-green-600 mt-1">
                        <span>↑ 5.3%</span> <span className="text-gray-500">from last month</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">
                        {metricsLoading ? "Loading..." : `${(metrics?.churnRate || 0).toFixed(1)}%`}
                      </div>
                      <p className="text-sm text-gray-500">Churn Rate</p>
                      <div className="text-sm text-red-600 mt-1">
                        <span>↑ 0.5%</span> <span className="text-gray-500">from last month</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Tabs defaultValue="chart">
                  <TabsList>
                    <TabsTrigger value="chart">Chart</TabsTrigger>
                    <TabsTrigger value="table">Table</TabsTrigger>
                  </TabsList>
                  <TabsContent value="chart" className="pt-4">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={customerData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="active" name="Active Customers" stroke="#3B82F6" strokeWidth={2} />
                          <Line type="monotone" dataKey="churned" name="Churned Customers" stroke="#EF4444" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </TabsContent>
                  <TabsContent value="table">
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Month</TableHead>
                            <TableHead>Active Customers</TableHead>
                            <TableHead>Churned</TableHead>
                            <TableHead>Churn Rate</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customerData.map((item) => (
                            <TableRow key={item.name}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell>{item.active}</TableCell>
                              <TableCell>{item.churned}</TableCell>
                              <TableCell>
                                {((item.churned / item.active) * 100).toFixed(1)}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end mt-6">
                  <Button variant="outline" className="flex items-center">
                    <Download className="mr-2 h-4 w-4" />
                    Export Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {reportType === "tokens" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <PieChartIcon className="mr-2 h-5 w-5 text-primary" />
                  Token Usage Report
                </CardTitle>
                <CardDescription>
                  Distribution of token consumption by service
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">145,230</div>
                      <p className="text-sm text-gray-500">Total Tokens Consumed</p>
                      <div className="text-sm text-green-600 mt-1">
                        <span>↑ 12.7%</span> <span className="text-gray-500">from last month</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Tabs defaultValue="chart">
                  <TabsList>
                    <TabsTrigger value="chart">Chart</TabsTrigger>
                    <TabsTrigger value="table">Table</TabsTrigger>
                  </TabsList>
                  <TabsContent value="chart" className="pt-4">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={tokenData}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {tokenData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value}%`, "Usage"]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </TabsContent>
                  <TabsContent value="table">
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Service</TableHead>
                            <TableHead>Percentage</TableHead>
                            <TableHead>Total Tokens</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tokenData.map((item) => (
                            <TableRow key={item.name}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell>{item.value}%</TableCell>
                              <TableCell>{Math.round(145230 * (item.value / 100)).toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end mt-6">
                  <Button variant="outline" className="flex items-center">
                    <Download className="mr-2 h-4 w-4" />
                    Export Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
