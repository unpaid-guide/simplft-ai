import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart as BarChartIcon,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  TrendingDown,
  ArrowDown,
  ArrowUp,
  Users,
  Activity,
  Calendar,
  DollarSign,
  FileText,
  Filter,
} from "lucide-react";

// Colors for charts
const COLORS = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#ffc658'];

// Mock data for service usage analytics
const serviceData = [
  { name: "HR Services", value: 35, fill: "#8884d8" },
  { name: "Legal Services", value: 25, fill: "#83a6ed" },
  { name: "IT Services", value: 20, fill: "#8dd1e1" },
  { name: "PRO Services", value: 15, fill: "#82ca9d" },
  { name: "Insurance", value: 5, fill: "#ffc658" },
];

// Mock data for business growth metrics
const growthData = [
  { name: "Jan", value: 100 },
  { name: "Feb", value: 120 },
  { name: "Mar", value: 140 },
  { name: "Apr", value: 160 },
  { name: "May", value: 180 },
  { name: "Jun", value: 220 },
  { name: "Jul", value: 240 },
  { name: "Aug", value: 280 },
  { name: "Sep", value: 300 },
  { name: "Oct", value: 340 },
  { name: "Nov", value: 360 },
  { name: "Dec", value: 400 },
];

// Mock data for customer segments
const customerSegments = [
  { name: "SMB", value: 60 },
  { name: "Enterprise", value: 25 },
  { name: "Startup", value: 15 },
];

// Mock data for service utilization over time (hours)
const serviceUtilizationData = [
  { name: "Jan", hr: 120, legal: 80, it: 60, pro: 40, insurance: 20 },
  { name: "Feb", hr: 140, legal: 90, it: 70, pro: 50, insurance: 30 },
  { name: "Mar", hr: 160, legal: 100, it: 80, pro: 60, insurance: 40 },
  { name: "Apr", hr: 180, legal: 110, it: 90, pro: 70, insurance: 50 },
  { name: "May", hr: 200, legal: 120, it: 100, pro: 80, insurance: 60 },
  { name: "Jun", hr: 220, legal: 130, it: 110, pro: 90, insurance: 70 },
];

// Performance metrics data
const performanceData = [
  {
    name: "Customer Satisfaction",
    uv: 90,
    fill: "#8884d8",
  },
  {
    name: "Support Response Time",
    uv: 85,
    fill: "#83a6ed",
  },
  {
    name: "Service Delivery",
    uv: 95,
    fill: "#8dd1e1",
  },
  {
    name: "Cost Efficiency",
    uv: 88,
    fill: "#82ca9d",
  },
  {
    name: "Quality Metrics",
    uv: 92,
    fill: "#ffc658",
  },
];

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);
};

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border border-gray-200 shadow-sm rounded">
        <p className="text-gray-700 font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === "number" && entry.name.toLowerCase().includes("cost") 
              ? formatCurrency(entry.value) 
              : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState("year");
  const [chartType, setChartType] = useState("service-usage");

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

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Business Intelligence Dashboard</h1>
        <p className="mt-1 text-gray-500">
          Advanced analytics to drive business decisions
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
        {/* Dashboard Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div>
            <Label htmlFor="time-range">Time Range</Label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px] mt-1">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Last Month</SelectItem>
                <SelectItem value="quarter">Last Quarter</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="chart-type">Analytics View</Label>
            <Select value={chartType} onValueChange={setChartType}>
              <SelectTrigger className="w-[220px] mt-1">
                <SelectValue placeholder="Select analytics view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="service-usage">Service Usage</SelectItem>
                <SelectItem value="customer-segments">Customer Segments</SelectItem>
                <SelectItem value="growth-trends">Growth Trends</SelectItem>
                <SelectItem value="performance">Performance Metrics</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button className="mb-0.5">
              <Filter className="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
          </div>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Cost per Customer</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(480)}</p>
                </div>
                <div className="p-2 rounded-full bg-green-100">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div className="text-sm text-green-600 mt-2 flex items-center">
                <TrendingDown className="h-4 w-4 mr-1" />
                <span>↓ 8%</span> <span className="text-gray-500 ml-1">from last period</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Customer Lifetime Value</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(4820)}</p>
                </div>
                <div className="p-2 rounded-full bg-blue-100">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="text-sm text-green-600 mt-2 flex items-center">
                <ArrowUp className="h-4 w-4 mr-1" />
                <span>↑ 12%</span> <span className="text-gray-500 ml-1">from last period</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Average Service Usage</p>
                  <p className="text-2xl font-bold mt-1">18.5 hrs/mo</p>
                </div>
                <div className="p-2 rounded-full bg-purple-100">
                  <Activity className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <div className="text-sm text-green-600 mt-2 flex items-center">
                <ArrowUp className="h-4 w-4 mr-1" />
                <span>↑ 15%</span> <span className="text-gray-500 ml-1">from last period</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Contract Renewal Rate</p>
                  <p className="text-2xl font-bold mt-1">92%</p>
                </div>
                <div className="p-2 rounded-full bg-amber-100">
                  <Calendar className="h-5 w-5 text-amber-600" />
                </div>
              </div>
              <div className="text-sm text-green-600 mt-2 flex items-center">
                <ArrowUp className="h-4 w-4 mr-1" />
                <span>↑ 5%</span> <span className="text-gray-500 ml-1">from last period</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart Views */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              {chartType === "service-usage" && <PieChartIcon className="mr-2 h-5 w-5 text-primary" />}
              {chartType === "customer-segments" && <Users className="mr-2 h-5 w-5 text-primary" />}
              {chartType === "growth-trends" && <LineChartIcon className="mr-2 h-5 w-5 text-primary" />}
              {chartType === "performance" && <Activity className="mr-2 h-5 w-5 text-primary" />}
              
              {chartType === "service-usage" && "Service Usage Analysis"}
              {chartType === "customer-segments" && "Customer Segment Analysis"}
              {chartType === "growth-trends" && "Business Growth Trends"}
              {chartType === "performance" && "Performance Metrics"}
            </CardTitle>
            <CardDescription>
              {chartType === "service-usage" && "Distribution of service usage across different service categories"}
              {chartType === "customer-segments" && "Breakdown of customer segments by business type"}
              {chartType === "growth-trends" && "Monthly growth metrics and trends analysis"}
              {chartType === "performance" && "Key performance indicators across business operations"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="visualization">
              <TabsList>
                <TabsTrigger value="visualization">Visualization</TabsTrigger>
                <TabsTrigger value="detailed">Detailed Analysis</TabsTrigger>
              </TabsList>
              <TabsContent value="visualization" className="pt-4">
                <div className="h-96">
                  {chartType === "service-usage" && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={serviceData}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          outerRadius={150}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {serviceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                      </PieChart>
                    </ResponsiveContainer>
                  )}

                  {chartType === "customer-segments" && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={customerSegments}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="value" name="Percentage" fill="#8884d8">
                          {customerSegments.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {chartType === "growth-trends" && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={growthData}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <CartesianGrid strokeDasharray="3 3" />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#8884d8"
                          fillOpacity={1}
                          fill="url(#colorValue)"
                          name="Growth Score"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}

                  {chartType === "performance" && (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart
                        cx="50%"
                        cy="50%"
                        innerRadius="10%"
                        outerRadius="80%"
                        barSize={20}
                        data={performanceData}
                      >
                        <RadialBar
                          label={{ position: 'insideStart', fill: '#333', fontSize: 12 }}
                          background
                          dataKey="uv"
                          name="Score"
                        />
                        <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
                        <Tooltip content={<CustomTooltip />} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="detailed">
                <div className="mb-6">
                  <div className="rounded-md border">
                    {chartType === "service-usage" && (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage %</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Growth Rate</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Efficiency</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {serviceData.map((item) => (
                            <tr key={item.name}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.value}%</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-green-500">+{Math.floor(Math.random() * 20)}%</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Math.floor(80 + Math.random() * 20)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {chartType === "customer-segments" && (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Segment</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Contract Value</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Retention Rate</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {customerSegments.map((item) => (
                            <tr key={item.name}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.value}%</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatCurrency(item.name === "Enterprise" ? 12500 : item.name === "SMB" ? 4800 : 2500)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.name === "Enterprise" ? 95 : item.name === "SMB" ? 88 : 75}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {chartType === "growth-trends" && (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Growth Score</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MoM Change</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Growth</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {growthData.map((item, index) => {
                            const prevValue = index > 0 ? growthData[index - 1].value : 0;
                            const change = prevValue ? ((item.value - prevValue) / prevValue) * 100 : 0;
                            return (
                              <tr key={item.name}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.value}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <span className={change > 0 ? "text-green-500" : "text-red-500"}>
                                    {change > 0 ? "+" : ""}{change.toFixed(1)}%
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {Math.floor(Math.random() * 10) + 1} new
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}

                    {chartType === "performance" && (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Industry Average</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {performanceData.map((item) => (
                            <tr key={item.name}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.uv}/100</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-green-500">
                                +{Math.floor(Math.random() * 10)}%
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.name === "Customer Satisfaction" ? 78 : 
                                 item.name === "Support Response Time" ? 72 : 
                                 item.name === "Service Delivery" ? 85 : 
                                 item.name === "Cost Efficiency" ? 82 : 85}/100
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Export Options */}
        <div className="mt-6 flex items-center justify-end gap-4">
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
          <Button variant="outline">
            <LineChartIcon className="mr-2 h-4 w-4" />
            Export Charts
          </Button>
        </div>
      </div>
    </div>
  );
}