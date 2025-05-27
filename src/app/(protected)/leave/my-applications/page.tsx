'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { api } from '@/trpc/react';
import { createLeaveApplicationSchema, CreateLeaveApplicationInput } from '@/schemas/leave.schema';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Input } from '@/components/ui/input'; // Though not explicitly in form, good to have
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
import { useToast } from '@/hooks/useToast';
import { Skeleton } from '@/components/ui/skeleton';
import { Terminal, PlusCircle, CalendarIcon, BanIcon, InfoIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
// Assuming Alert component is available. If not, error display will be simpler.
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; 

// --- Local Type Definitions ---
// (Assuming session object and its structure for employeeId)
// This would typically come from your auth solution, e.g., next-auth
type SessionUser = {
  employeeId: string; 
  // other user properties
};

// A simplified session structure for demonstration
type Session = {
  user: SessionUser;
  // other session properties
} | null;


// Prisma types (or simplified versions if not directly importable)
type LeaveType = {
  id: string;
  name: string;
  defaultDays: number;
  // other fields...
};

type LeaveApplication = {
  id: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  reason: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  createdAt: Date;
  leaveType?: LeaveType; // Optional: if you join leaveType name in the query
};

type LeaveBalance = {
  leaveTypeId: string;
  leaveTypeName: string;
  allocatedDays: number;
  daysTaken: number;
  availableDays: number;
};


const MyLeaveApplicationsPage = () => {
  // --- State ---
  const [isApplyLeaveDialogOpen, setIsApplyLeaveDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [applicationToCancel, setApplicationToCancel] = useState<LeaveApplication | null>(null);
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();

  // --- Mock Session (Replace with actual session logic) ---
  // In a real app, this would come from `useSession()` or similar.
  const [session, setSession] = useState<Session>({ 
    user: { employeeId: 'cl_mock_employee_id_123' } // Replace with actual or fetched ID
  });
  // TODO: Add a note for the developer to replace this mock session.

  // --- tRPC Queries ---
  const employeeId = session?.user?.employeeId;

  const { data: leaveTypesData, isLoading: isLoadingLeaveTypes, isError: isErrorLeaveTypes } = api.leaveType.listByOrg.useQuery(
    undefined, // No input for listByOrg for all types in an org
    { enabled: !!employeeId } // Only fetch if employeeId is available
  );
  // Removed api.leaveApplication.getAllLeaveBalancesForEmployee.useQuery()

  const { data: applications, isLoading: isLoadingApplications, refetch: refetchApplications } = 
    api.leaveApplication.listForEmployee.useQuery(
    { employeeId: employeeId! }, // `!` assumes employeeId will be there
    { enabled: !!employeeId }
  );

  // --- Forms ---
  const applyLeaveForm = useForm<CreateLeaveApplicationInput>({
    resolver: zodResolver(createLeaveApplicationSchema),
    defaultValues: {
      leaveTypeId: '',
      startDate: undefined, 
      endDate: undefined,   
      reason: '',
    },
  });

  // --- tRPC Mutations ---
  const applyForLeaveMutation = api.leaveApplication.applyForLeave.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Leave application submitted.' });
      refetchApplications();
      // Individual balances will refetch if their underlying data changes, 
      // or we could trigger a specific refetch if a common query key is used for all balances.
      // For now, relying on cache invalidation or manual refetch on the leave types list if needed.
      // For simplicity, will not add explicit balance refetch here as it's per-type now.
      setIsApplyLeaveDialogOpen(false);
      applyLeaveForm.reset({ leaveTypeId: '', startDate: undefined, endDate: undefined, reason: '' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Application Failed', description: error.message });
    },
  });

  const cancelApplicationMutation = api.leaveApplication.cancelApplication.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Leave application cancelled.' });
      refetchApplications();
      refetchBalances(); // Balances might change
      setIsCancelDialogOpen(false);
      setApplicationToCancel(null);
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Cancellation Failed', description: error.message });
    },
  });

  // --- Handlers ---
  const onApplyLeaveSubmit = (values: CreateLeaveApplicationInput) => {
    // Frontend validation for dates can be added here for better UX, though Zod handles it
    if (values.startDate && values.endDate && values.startDate > values.endDate) {
        applyLeaveForm.setError("endDate", { type: "manual", message: "End date cannot be before start date."});
        return;
    }
    applyForLeaveMutation.mutate(values);
  };
  
  const handleOpenApplyLeaveDialog = () => {
    applyLeaveForm.reset({ leaveTypeId: '', startDate: undefined, endDate: undefined, reason: '' });
    setIsApplyLeaveDialogOpen(true);
  }

  const handleCloseApplyLeaveDialog = () => {
    setIsApplyLeaveDialogOpen(false);
    // applyLeaveForm.reset(); // Already handled on open and success
  };

  const handleOpenCancelDialog = (application: LeaveApplication) => {
    setApplicationToCancel(application);
    setIsCancelDialogOpen(true);
  };

  const handleCloseCancelDialog = () => {
    setIsCancelDialogOpen(false);
    setApplicationToCancel(null);
  };

  const handleConfirmCancel = () => {
    if (applicationToCancel) {
      cancelApplicationMutation.mutate({ applicationId: applicationToCancel.id });
    }
  };
  
  // --- Render Logic ---
  if (!employeeId) {
    // This state should ideally be handled by a global auth provider redirecting to login
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <InfoIcon className="w-16 h-16 text-yellow-500 mb-4" />
        <p className="text-xl text-muted-foreground">User information not available.</p>
        <p className="text-sm text-muted-foreground">Please ensure you are logged in.</p>
        {/* Add a comment for developers: Replace mock session with actual session logic. */}
      </div>
    );
  }


  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Leave Applications</h1>
        <Button onClick={handleOpenApplyLeaveDialog}>
          <PlusCircle className="mr-2 h-4 w-4" /> Apply for Leave
        </Button>
      </div>

      {/* Leave Balances Section */}
      <div className="mb-8 p-4 border rounded-lg shadow bg-gray-50">
        <h2 className="text-xl font-semibold mb-4">My Leave Balances ({currentYear})</h2>
        {isLoadingLeaveTypes && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <Skeleton key={`bal_skel_${i}`} className="h-24 w-full" />)}
          </div>
        )}
        {isErrorLeaveTypes && (
            <p className="text-sm text-red-600">Could not load leave types to determine balances.</p>
        )}
        {!isLoadingLeaveTypes && !isErrorLeaveTypes && leaveTypesData && leaveTypesData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leaveTypesData.map((leaveType) => (
              <LeaveBalanceDisplay
                key={leaveType.id}
                employeeId={employeeId!}
                leaveTypeId={leaveType.id}
                leaveTypeName={leaveType.name}
                year={currentYear}
              />
            ))}
          </div>
        )}
        {!isLoadingLeaveTypes && !isErrorLeaveTypes && (!leaveTypesData || leaveTypesData.length === 0) && (
          <p className="text-sm text-muted-foreground">No leave types configured for your organization.</p>
        )}
      </div>
      
      {/* Apply for Leave Dialog */}
      <Dialog open={isApplyLeaveDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) handleCloseApplyLeaveDialog(); else setIsApplyLeaveDialogOpen(true);}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
          </DialogHeader>
          <Form {...applyLeaveForm}>
            <form onSubmit={applyLeaveForm.handleSubmit(onApplyLeaveSubmit)} className="space-y-4">
              <FormField
                control={applyLeaveForm.control}
                name="leaveTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leave Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingLeaveTypes}>
                      <FormControl>
                        <SelectTrigger>{isLoadingLeaveTypes ? "Loading types..." : (field.value ? leaveTypesData?.find(lt => lt.id === field.value)?.name : "Select leave type")}</SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {leaveTypes?.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name} ({type.defaultDays} days)
                          </SelectItem>
                        ))}
                        {(!leaveTypesData || leaveTypesData.length === 0) && !isLoadingLeaveTypes && <p className="p-2 text-sm text-muted-foreground">No leave types available.</p>}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={applyLeaveForm.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={applyLeaveForm.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus disabled={(date) => (applyLeaveForm.getValues("startDate") ? date < applyLeaveForm.getValues("startDate")! : date < new Date(new Date().setHours(0,0,0,0)) )}/>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={applyLeaveForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Provide a reason for your leave" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline" onClick={handleCloseApplyLeaveDialog}>Cancel</Button></DialogClose>
                <Button type="submit" disabled={applyForLeaveMutation.isLoading || applyForLeaveMutation.isSuccess}>
                  {applyForLeaveMutation.isLoading ? 'Submitting...' : (applyForLeaveMutation.isSuccess ? 'Submitted!' : 'Submit Application')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* My Applications History Table */}
      <div>
        <h2 className="text-xl font-semibold mb-3 mt-8">My Applications History</h2>
        {isLoadingApplications && (
          <div className="space-y-2 mt-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        )}
        {/* TODO: Handle application query error state with an Alert-like component */}
        {!isLoadingApplications && applications && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Leave Type</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applied On</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">You have no leave applications yet.</TableCell></TableRow>
              )}
              {applications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell>{app.leaveType?.name || app.leaveTypeId}</TableCell>
                  <TableCell>{format(new Date(app.startDate), "PPP")}</TableCell>
                  <TableCell>{format(new Date(app.endDate), "PPP")}</TableCell>
                  <TableCell className="max-w-xs truncate">{app.reason || '-'}</TableCell>
                  <TableCell>
                    <span className={cn("px-2 py-1 text-xs font-semibold rounded-full", {
                      "bg-yellow-100 text-yellow-800": app.status === "PENDING",
                      "bg-green-100 text-green-800": app.status === "APPROVED",
                      "bg-red-100 text-red-800": app.status === "REJECTED",
                      "bg-gray-100 text-gray-800": app.status === "CANCELLED",
                    })}>
                      {app.status}
                    </span>
                  </TableCell>
                  <TableCell>{format(new Date(app.createdAt), "PPP")}</TableCell>
                  <TableCell className="text-right">
                    {app.status === 'PENDING' && (
                      <Button variant="ghost" size="sm" onClick={() => handleOpenCancelDialog(app)} disabled={cancelApplicationMutation.isLoading && applicationToCancel?.id === app.id}>
                        <BanIcon className="mr-1 h-4 w-4 text-red-500" /> Cancel
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) handleCloseCancelDialog(); else setIsCancelDialogOpen(true);}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Leave Application</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to cancel your leave application for <strong>{applicationToCancel?.leaveType?.name || 'this leave'}</strong> from <strong>{applicationToCancel ? format(new Date(applicationToCancel.startDate), "PPP") : ''}</strong> to <strong>{applicationToCancel ? format(new Date(applicationToCancel.endDate), "PPP") : ''}</strong>?</p>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" onClick={handleCloseCancelDialog}>No, Keep It</Button></DialogClose>
            <Button variant="destructive" onClick={handleConfirmCancel} disabled={cancelApplicationMutation.isLoading || cancelApplicationMutation.isSuccess}>
              {cancelApplicationMutation.isLoading ? 'Cancelling...' : (cancelApplicationMutation.isSuccess ? 'Cancelled!' : 'Yes, Cancel Application')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Developer Note: Replace mock session with actual session logic from your auth provider. */}
    </div>
  );
};

export default MyLeaveApplicationsPage;
