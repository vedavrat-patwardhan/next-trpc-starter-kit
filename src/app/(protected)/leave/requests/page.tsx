'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, isValid } from 'date-fns';
import { api } from '@/trpc/react';
import { 
  listLeaveApplicationsForOrgSchema, 
  ListLeaveApplicationsForOrgInput,
  updateLeaveApplicationStatusSchema,
  UpdateLeaveApplicationStatusInput,
  leaveApplicationStatusSchema, // For status options
  LeaveApplicationStatusType
} from '@/schemas/leave.schema';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Pagination } from '@/components/ui/pagination'; 
import { useToast } from '@/hooks/useToast';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, CheckCircle2, XCircle, FilterIcon, SearchIcon, EraserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce'; // Assuming a debounce hook exists

// --- Local Type Definitions ---
type LeaveType = {
  id: string;
  name: string;
};

type Employee = {
  id: string;
  firstName: string | null;
  lastName: string | null;
};

type LeaveApplicationForOrg = {
  id: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  reason: string | null;
  status: LeaveApplicationStatusType;
  createdAt: Date;
  employee: Employee; // Assuming employee details are included
  leaveType?: LeaveType; // Assuming leaveType details are included
  comments?: string | null; // For displaying existing comments
};

// For the Approve/Reject form
type ApproveRejectFormValues = {
  comments?: string;
};


const ManageLeaveRequestsPage = () => {
  const { toast } = useToast();

  // --- State ---
  const [filters, setFilters] = useState<Omit<ListLeaveApplicationsForOrgInput, 'page' | 'pageSize'>>({
    status: undefined,
    startDate: undefined,
    endDate: undefined,
  });
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<LeaveApplicationForOrg | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);

  const debouncedFilters = useDebounce(filters, 500);

  // --- tRPC Queries & Mutations ---
  const applicationsQuery = api.leaveApplication.listForOrganization.useQuery({
    ...debouncedFilters,
    page: pagination.page,
    pageSize: pagination.pageSize,
  });

  const updateStatusMutation = api.leaveApplication.updateStatus.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: `Application ${actionType?.toLowerCase()}d successfully.` });
      applicationsQuery.refetch();
      setIsActionDialogOpen(false);
      setSelectedApplication(null);
      actionForm.reset();
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: `Error ${actionType?.toLowerCase()}ing application`,
        description: error.message,
      });
    },
  });

  // --- Forms ---
  const actionForm = useForm<ApproveRejectFormValues>({
    resolver: zodResolver(z.object({ comments: z.string().optional() })), // Simple schema for comments
    defaultValues: { comments: '' },
  });

  // --- Effects ---
  // Refetch data when debounced filters or pagination change
  useEffect(() => {
    applicationsQuery.refetch();
  }, [debouncedFilters, pagination, applicationsQuery.refetch]);


  // --- Handlers ---
  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page on filter change
  };
  
  const handleClearFilters = () => {
    setFilters({ status: undefined, startDate: undefined, endDate: undefined });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleOpenActionDialog = (application: LeaveApplicationForOrg, type: 'APPROVE' | 'REJECT') => {
    setSelectedApplication(application);
    setActionType(type);
    actionForm.reset({ comments: application.comments || '' }); // Pre-fill comments if editing existing ones
    setIsActionDialogOpen(true);
  };

  const handleCloseActionDialog = () => {
    setIsActionDialogOpen(false);
    setSelectedApplication(null);
    setActionType(null);
    actionForm.reset();
  };

  const onActionSubmit = (values: ApproveRejectFormValues) => {
    if (!selectedApplication || !actionType) return;

    if (actionType === 'REJECT' && (!values.comments || values.comments.trim() === '')) {
      actionForm.setError('comments', { type: 'manual', message: 'Comments are required for rejection.' });
      return;
    }

    updateStatusMutation.mutate({
      applicationId: selectedApplication.id,
      status: actionType, // 'APPROVE' or 'REJECT'
      comments: values.comments,
    });
  };
  
  const renderStatusBadge = (status: LeaveApplicationStatusType) => {
    const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
    switch (status) {
      case 'PENDING': return <span className={cn(baseClasses, "bg-yellow-100 text-yellow-800")}>Pending</span>;
      case 'APPROVED': return <span className={cn(baseClasses, "bg-green-100 text-green-800")}>Approved</span>;
      case 'REJECTED': return <span className={cn(baseClasses, "bg-red-100 text-red-800")}>Rejected</span>;
      case 'CANCELLED': return <span className={cn(baseClasses, "bg-gray-100 text-gray-800")}>Cancelled</span>;
      default: return <span className={cn(baseClasses, "bg-gray-200 text-gray-700")}>{status}</span>;
    }
  };

  const applicationData = applicationsQuery.data?.applications || [];
  const totalRecords = applicationsQuery.data?.totalRecords || 0;

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Manage Leave Requests</h1>
      </div>

      {/* Filters Section */}
      <div className="mb-6 p-4 border rounded-lg bg-gray-50 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
          {/* Status Filter */}
          <div className="space-y-1">
            <Label htmlFor="status-filter">Status</Label>
            <Select
              value={filters.status || ''}
              onValueChange={(value) => handleFilterChange('status', value as LeaveApplicationStatusType | undefined || undefined)}
            >
              <SelectTrigger id="status-filter">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                {leaveApplicationStatusSchema.options.map(status => (
                  <SelectItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Date Filter */}
          <div className="space-y-1">
            <Label htmlFor="start-date-filter">Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="start-date-filter" variant="outline" className={cn("w-full justify-start text-left font-normal", !filters.startDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.startDate && isValid(new Date(filters.startDate)) ? format(new Date(filters.startDate), "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={filters.startDate ? new Date(filters.startDate) : undefined} onSelect={(date) => handleFilterChange('startDate', date)} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date Filter */}
          <div className="space-y-1">
            <Label htmlFor="end-date-filter">End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="end-date-filter" variant="outline" className={cn("w-full justify-start text-left font-normal", !filters.endDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.endDate && isValid(new Date(filters.endDate)) ? format(new Date(filters.endDate), "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={filters.endDate ? new Date(filters.endDate) : undefined} onSelect={(date) => handleFilterChange('endDate', date)} initialFocus disabled={(date) => filters.startDate ? date < new Date(filters.startDate) : false} />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex space-x-2">
            <Button onClick={handleClearFilters} variant="outline" className="w-full sm:w-auto">
              <EraserIcon className="mr-2 h-4 w-4" /> Clear Filters
            </Button>
             {/* Search/Refetch button can be added if needed, though debouncing helps */}
          </div>
        </div>
      </div>
      
      {/* Leave Applications Table */}
      {applicationsQuery.isLoading && (
        <div className="space-y-2 mt-4">
          {[...Array(pagination.pageSize)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-md" />)}
        </div>
      )}

      {applicationsQuery.isError && (
         <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{applicationsQuery.error.message}</span>
            <Button variant="link" size="sm" onClick={() => applicationsQuery.refetch()} className="ml-2 text-red-700">Try again</Button>
        </div>
      )}

      {!applicationsQuery.isLoading && !applicationsQuery.isError && (
        <>
          <div className="overflow-x-auto shadow-sm border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applicationData.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center h-32 text-muted-foreground">No leave requests found matching your filters.</TableCell></TableRow>
                )}
                {applicationData.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>{app.employee.firstName} {app.employee.lastName}</TableCell>
                    <TableCell>{app.leaveType?.name || app.leaveTypeId}</TableCell>
                    <TableCell>{format(new Date(app.startDate), "dd/MM/yy")} - {format(new Date(app.endDate), "dd/MM/yy")}</TableCell>
                    <TableCell className="max-w-xs truncate" title={app.reason || undefined}>{app.reason || '-'}</TableCell>
                    <TableCell>{renderStatusBadge(app.status)}</TableCell>
                    <TableCell>{format(new Date(app.createdAt), "PPP")}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {app.status === 'PENDING' && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleOpenActionDialog(app, 'APPROVE')} className="text-green-600 hover:text-green-700">
                            <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleOpenActionDialog(app, 'REJECT')} className="text-red-600 hover:text-red-700">
                            <XCircle className="mr-1 h-4 w-4" /> Reject
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalRecords > 0 && (
            <div className="mt-6">
              <Pagination
                totalRecords={totalRecords}
                currentPage={pagination.page}
                onPageChange={(page) => setPagination(p => ({ ...p, page }))}
                itemsPerPage={pagination.pageSize}
                onItemsPerPageChange={(size) => setPagination({ page: 1, pageSize: size })}
              />
            </div>
          )}
        </>
      )}

      {/* Approve/Reject Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) handleCloseActionDialog(); else setIsActionDialogOpen(true);}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{actionType === 'APPROVE' ? 'Approve' : 'Reject'} Leave Application</DialogTitle>
          </DialogHeader>
          {selectedApplication && (
            <div className="py-2 space-y-2 text-sm">
              <p><strong>Employee:</strong> {selectedApplication.employee.firstName} {selectedApplication.employee.lastName}</p>
              <p><strong>Leave Type:</strong> {selectedApplication.leaveType?.name || selectedApplication.leaveTypeId}</p>
              <p><strong>Dates:</strong> {format(new Date(selectedApplication.startDate), "PPP")} - {format(new Date(selectedApplication.endDate), "PPP")}</p>
              <p><strong>Reason:</strong> {selectedApplication.reason || 'N/A'}</p>
            </div>
          )}
          <Form {...actionForm}>
            <form onSubmit={actionForm.handleSubmit(onActionSubmit)} className="space-y-4">
              <FormField
                control={actionForm.control}
                name="comments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comments {actionType === 'REJECT' ? '(Required for Rejection)' : '(Optional)'}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={actionType === 'REJECT' ? "Reason for rejection..." : "Optional comments..."} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline" onClick={handleCloseActionDialog}>Cancel</Button></DialogClose>
                <Button 
                  type="submit" 
                  variant={actionType === 'APPROVE' ? 'default' : 'destructive'}
                  disabled={updateStatusMutation.isLoading || updateStatusMutation.isSuccess}
                >
                  {updateStatusMutation.isLoading ? 'Processing...' : 
                   (updateStatusMutation.isSuccess ? `${actionType}d!` : 
                   (actionType === 'APPROVE' ? 'Approve Application' : 'Reject Application'))}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageLeaveRequestsPage;
