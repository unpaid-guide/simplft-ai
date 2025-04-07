import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Coins,
  Clock,
  Download,
  Plus,
  BarChart,
  Calendar,
  AlertTriangle
} from "lucide-react";

interface TokenUsageDetailsProps {
  subscription: any;
  usage: any[];
}

const TokenUsageDetails = ({ subscription, usage }: TokenUsageDetailsProps) => {
  // Calculate token usage
  const totalTokens = subscription?.plan?.token_amount || 0;
  const remainingTokens = subscription?.token_balance || 0;
  const usedTokens = totalTokens - remainingTokens;
  const usagePercentage = totalTokens > 0 ? (usedTokens / totalTokens) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Token usage overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <Coins className="mr-2 h-5 w-5 text-primary" />
            Token Usage Overview
          </CardTitle>
          <CardDescription>
            Your current token usage for the billing period {new Date(subscription?.current_period_start).toLocaleDateString()} - {new Date(subscription?.current_period_end).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Usage</span>
              <span className="text-sm font-medium">{usagePercentage.toFixed(1)}%</span>
            </div>
            <Progress value={usagePercentage} className="h-2" />
            <div className="flex justify-between mt-2 text-sm text-gray-500">
              <span>0</span>
              <span>{totalTokens.toLocaleString()} tokens</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className="text-sm text-gray-500 mb-1">Total Allocation</div>
              <div className="text-2xl font-bold">{totalTokens.toLocaleString()}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className="text-sm text-gray-500 mb-1">Used</div>
              <div className="text-2xl font-bold">{usedTokens.toLocaleString()}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className="text-sm text-gray-500 mb-1">Remaining</div>
              <div className="text-2xl font-bold">{remainingTokens.toLocaleString()}</div>
            </div>
          </div>

          {usagePercentage > 80 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-md flex items-start">
              <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-amber-800">Low token balance</span>
                <p className="text-sm text-amber-700">
                  You've used {usagePercentage.toFixed(1)}% of your tokens for this billing period. 
                  Consider purchasing additional tokens or upgrading your plan.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-6 space-x-2">
            <Button variant="outline" className="flex items-center">
              <Download className="mr-2 h-4 w-4" />
              Export Usage
            </Button>
            <Button className="flex items-center">
              <Plus className="mr-2 h-4 w-4" />
              Buy Additional Tokens
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Token usage history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <Clock className="mr-2 h-5 w-5 text-primary" />
            Token Usage History
          </CardTitle>
          <CardDescription>
            Detailed breakdown of your token consumption
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="chart">Chart View</TabsTrigger>
            </TabsList>
            <TabsContent value="list">
              {usage && usage.length > 0 ? (
                <div className="border rounded-md mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Tokens</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usage.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {new Date(item.used_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="text-right">{item.amount.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No token usage history available
                </div>
              )}
            </TabsContent>
            <TabsContent value="chart" className="pt-4">
              <div className="h-72 bg-gray-50 rounded-lg p-3 border border-gray-200 flex items-center justify-center">
                <div className="text-center">
                  <BarChart className="h-10 w-10 text-gray-400 mx-auto" />
                  <p className="mt-2 text-sm text-gray-500">Token usage chart would be displayed here</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Usage by service */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <BarChart className="mr-2 h-5 w-5 text-primary" />
            Usage by Service
          </CardTitle>
          <CardDescription>
            Token consumption breakdown by service type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-50 rounded-lg p-3 border border-gray-200 flex items-center justify-center">
            <div className="text-center">
              <BarChart className="h-10 w-10 text-gray-400 mx-auto" />
              <p className="mt-2 text-sm text-gray-500">Service usage distribution chart would be displayed here</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default function TokenUsage() {
  const { user } = useAuth();

  // Fetch active subscription
  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['/api/subscriptions/active'],
    queryFn: async () => {
      const response = await fetch('/api/subscriptions/active');
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch subscription');
      }
      return response.json();
    },
  });

  // Fetch token usage
  const { data: tokenUsage, isLoading: usageLoading } = useQuery({
    queryKey: subscription ? [`/api/token-usage/${subscription.id}`] : null,
    queryFn: async () => {
      if (!subscription) return [];
      const response = await fetch(`/api/token-usage/${subscription.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch token usage');
      }
      return response.json();
    },
    enabled: !!subscription,
  });

  if (subscriptionLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-primary border-r-transparent align-[-0.125em]" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-2 text-gray-600">Loading subscription data...</p>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Coins className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No Active Subscription</h3>
              <p className="text-gray-500 mb-6">
                You don't have an active subscription yet. Subscribe to a plan to start using tokens.
              </p>
              <Button className="mx-auto">
                <Calendar className="mr-2 h-4 w-4" />
                View Subscription Plans
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <TokenUsageDetails 
        subscription={subscription} 
        usage={usageLoading ? [] : tokenUsage || []} 
      />
    </div>
  );
}
