import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Percent, 
  DollarSign, 
  User, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Info
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function DiscountApprovalList() {
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Fetch discount requests
  const { data: discountRequests, isLoading } = useQuery({
    queryKey: ['/api/discount-requests'],
    queryFn: async () => {
      const response = await fetch('/api/discount-requests');
      if (!response.ok) {
        throw new Error('Failed to fetch discount requests');
      }
      return response.json();
    },
  });

  // Fetch additional data for each request
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    },
  });

  // Approve discount request
  const approveMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await fetch(`/api/discount-requests/${requestId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to approve discount request');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Discount approved",
        description: "The discount request has been approved successfully.",
      });
      setApprovalDialogOpen(false);
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ['/api/discount-requests'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reject discount request
  const rejectMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await fetch(`/api/discount-requests/${requestId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reject discount request');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Discount rejected",
        description: "The discount request has been rejected.",
      });
      setRejectionDialogOpen(false);
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ['/api/discount-requests'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  // Get user name by ID
  const getUserName = (userId: number) => {
    const user = users?.find((u: any) => u.id === userId);
    return user ? user.name : `User #${userId}`;
  };

  // Handle request approval
  const handleApprove = (request: any) => {
    setSelectedRequest(request);
    setApprovalDialogOpen(true);
  };

  // Handle request rejection
  const handleReject = (request: any) => {
    setSelectedRequest(request);
    setRejectionDialogOpen(true);
  };

  // Handle view details
  const handleViewDetails = (request: any) => {
    setSelectedRequest(request);
    setDetailDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <Percent className="mr-2 h-5 w-5 text-primary" />
            Pending Discount Approvals
          </CardTitle>
          <CardDescription>
            Review and approve discount requests from the sales team
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">Loading discount requests...</div>
          ) : discountRequests && discountRequests.length > 0 ? (
            <div className="space-y-4">
              {discountRequests.map((request: any) => (
                <div key={request.id} className="border rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">
                          {users && getUserName(request.user_id)}
                        </h3>
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          Pending
                        </Badge>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <User className="h-4 w-4 mr-1 text-gray-400" />
                        <span>Requested by: {users && getUserName(request.requested_by)}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                        <span>Date: {new Date(request.requested_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center text-sm font-medium">
                        {request.discount_percent ? (
                          <div className="flex items-center text-primary">
                            <Percent className="h-4 w-4 mr-1" />
                            <span>{request.discount_percent}% Discount</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-primary">
                            <DollarSign className="h-4 w-4 mr-1" />
                            <span>{formatCurrency(request.discount_amount)} Discount</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(request)}>
                        <Info className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                      <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(request)}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleReject(request)}>
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">No pending discount requests</div>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Discount Request</DialogTitle>
            <DialogDescription>
              You are about to approve the following discount request.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500">Customer:</div>
                <div className="font-medium">{users && getUserName(selectedRequest.user_id)}</div>
                
                <div className="text-gray-500">Requested By:</div>
                <div className="font-medium">{users && getUserName(selectedRequest.requested_by)}</div>
                
                <div className="text-gray-500">Discount:</div>
                <div className="font-medium">
                  {selectedRequest.discount_percent 
                    ? `${selectedRequest.discount_percent}%` 
                    : formatCurrency(selectedRequest.discount_amount)}
                </div>
                
                {selectedRequest.quote_id && (
                  <>
                    <div className="text-gray-500">Quote:</div>
                    <div className="font-medium">#{selectedRequest.quote_id}</div>
                  </>
                )}
              </div>
              
              <Separator />
              
              <div>
                <h4 className="text-sm font-medium mb-1">Reason Provided:</h4>
                <p className="text-sm p-2 bg-gray-50 rounded">{selectedRequest.reason}</p>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="notes" className="text-sm font-medium">
                  Approval Notes (Optional):
                </label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this approval..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700" 
              onClick={() => approveMutation.mutate(selectedRequest.id)}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? "Processing..." : "Confirm Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Discount Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this discount request.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500">Customer:</div>
                <div className="font-medium">{users && getUserName(selectedRequest.user_id)}</div>
                
                <div className="text-gray-500">Requested By:</div>
                <div className="font-medium">{users && getUserName(selectedRequest.requested_by)}</div>
                
                <div className="text-gray-500">Discount:</div>
                <div className="font-medium">
                  {selectedRequest.discount_percent 
                    ? `${selectedRequest.discount_percent}%` 
                    : formatCurrency(selectedRequest.discount_amount)}
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="rejection-notes" className="text-sm font-medium">
                  Rejection Reason:
                </label>
                <Textarea
                  id="rejection-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Explain why this discount is being rejected..."
                  rows={3}
                  required
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectionDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => rejectMutation.mutate(selectedRequest.id)}
              disabled={rejectMutation.isPending || !notes.trim()}
            >
              {rejectMutation.isPending ? "Processing..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discount Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500">Request ID:</div>
                <div className="font-medium">#{selectedRequest.id}</div>
                
                <div className="text-gray-500">Customer:</div>
                <div className="font-medium">{users && getUserName(selectedRequest.user_id)}</div>
                
                <div className="text-gray-500">Requested By:</div>
                <div className="font-medium">{users && getUserName(selectedRequest.requested_by)}</div>
                
                <div className="text-gray-500">Date Requested:</div>
                <div className="font-medium">{new Date(selectedRequest.requested_at).toLocaleString()}</div>
                
                <div className="text-gray-500">Status:</div>
                <div className="font-medium">
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    Pending
                  </Badge>
                </div>
                
                <div className="text-gray-500">Discount Type:</div>
                <div className="font-medium">
                  {selectedRequest.discount_percent 
                    ? "Percentage" 
                    : "Fixed Amount"}
                </div>
                
                <div className="text-gray-500">Discount Value:</div>
                <div className="font-medium">
                  {selectedRequest.discount_percent 
                    ? `${selectedRequest.discount_percent}%` 
                    : formatCurrency(selectedRequest.discount_amount)}
                </div>
                
                {selectedRequest.quote_id && (
                  <>
                    <div className="text-gray-500">Quote:</div>
                    <div className="font-medium">#{selectedRequest.quote_id}</div>
                  </>
                )}
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-1">Reason Provided:</h4>
                <p className="text-sm p-3 bg-gray-50 rounded border">{selectedRequest.reason}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
