'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, isValid } from 'date-fns';
import { api } from '@/trpc/react';
import {
  runPayrollInputSchema,
  RunPayrollInput,
  listPayrollInputSchema,
  ListPayrollInput,
  payrollStatusSchema,
  PayrollStatusType,
} from '@/schemas/payroll.schema';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { CalendarIcon, PlusCircle, Eye, EraserIcon, InfoIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
// Assuming useDebounce hook is not available

type PayrollRunForTable = {
  payrollId: string;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  status: PayrollStatusType;
  createdAt: Date;
  paymentDate?: Date | null;
};

const ManagePayrollRunsPage = () => {
  const { toast } = useToast();

  const [filters, setFilters] = useState<Omit<ListPayrollInput, 'page' | 'pageSize'>>({
    status: undefined,
    startDate: undefined,
    endDate: undefined,
  });
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [isInitiateDialogOpen, setIsInitiateDialogOpen] = useState(false);

  // tRPC query for listing payroll runs
  const payrollRunsQuery = api.payroll.listRuns.useQuery({
    ...filters,
    page: pagination.page,
    pageSize: pagination.pageSize,
  });

  // tRPC mutation for initiating a payroll run
  const initiateRunMutation = api.payroll.initiateRun.useMutation({
    onSuccess: (data) => {
      toast({ title: "Success", description: data.message || `Payroll run initiated with ID: ${data.payrollId}` });
      payrollRunsQuery.refetch();
      setIsInitiateDialogOpen(false);
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Failed to Initiate Run", description: error.message });
    },
  });

  const initiateRunForm = useForm<RunPayrollInput>({
    resolver: zodResolver(runPayrollInputSchema),
    defaultValues: {
      payPeriodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // Default to start of current month
      payPeriodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), // Default to end of current month
      employeeIds: [], // Default to empty for "all eligible" or can be populated by a selector later
    },
  });
  
  // Simplified employeeIds input for V1: comma-separated string
  const [employeeIdsString, setEmployeeIdsString] = useState('');


  useEffect(() => {
    payrollRunsQuery.refetch();
  }, [filters, pagination, payrollRunsQuery.refetch]);

  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value === '' ? undefined : value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleClearFilters = () => {
    setFilters({ status: undefined, startDate: undefined, endDate: undefined });
    setPagination(prev => ({ ...prev, page: 1 }));
    initiateRunForm.reset(); // Also reset the form if open or if values are linked
  };
  
  const onInitiateRunSubmit = (values: RunPayrollInput) => {
    const parsedEmployeeIds = employeeIdsString.split(',').map(id => id.trim()).filter(id => id);
    initiateRunMutation.mutate({
        ...values,
        employeeIds: parsedEmployeeIds.length > 0 ? parsedEmployeeIds : undefined, // Pass undefined if string is empty
    });
  };

  const renderStatusBadge = (status: PayrollStatusType) => {
    const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
    switch (status) {
      case 'DRAFT': return <span className={cn(baseClasses, "bg-gray-200 text-gray-800")}>Draft</span>;
      case 'PENDING_APPROVAL': return <span className={cn(baseClasses, "bg-yellow-100 text-yellow-800")}>Pending Approval</span>;
      case 'PROCESSING': return <span className={cn(baseClasses, "bg-blue-100 text-blue-800")}>Processing</span>;
      case 'COMPLETED': return <span className={cn(baseClasses, "bg-green-100 text-green-800")}>Completed</span>;
      case 'FAILED': return <span className={cn(baseClasses, "bg-red-100 text-red-800")}>Failed</span>;
      default: return <span className={cn(baseClasses, "bg-gray-300 text-gray-900")}>{status}</span>;
    }
  };

  const runs = payrollRunsQuery.data?.items || [];
  const totalRecords = payrollRunsQuery.data?.totalRecords || 0;

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 space-y-4 sm:space-y-0">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Manage Payroll Runs</h1>
        <Button onClick={() => setIsInitiateDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Initiate New Payroll Run
        </Button>
      </div>

      {/* Filters Section */}
      <div className="mb-8 p-4 border rounded-lg bg-gray-50 shadow">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1">
            <Label htmlFor="status-filter">Status</Label>
            <Select value={filters.status || ''} onValueChange={(value) => handleFilterChange('status', value as PayrollStatusType | undefined)}>
              <SelectTrigger id="status-filter"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                {payrollStatusSchema.options.map(status => (
                  <SelectItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="start-date-filter">Period Start After</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="start-date-filter" variant="outline" className={cn("w-full justify-start text-left font-normal", !filters.startDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.startDate && isValid(new Date(filters.startDate)) ? format(new Date(filters.startDate), "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filters.startDate ? new Date(filters.startDate) : undefined} onSelect={(d) => handleFilterChange('startDate', d)} initialFocus /></PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1">
            <Label htmlFor="end-date-filter">Period End Before</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="end-date-filter" variant="outline" className={cn("w-full justify-start text-left font-normal", !filters.endDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.endDate && isValid(new Date(filters.endDate)) ? format(new Date(filters.endDate), "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filters.endDate ? new Date(filters.endDate) : undefined} onSelect={(d) => handleFilterChange('endDate', d)} initialFocus disabled={(date) => filters.startDate ? date < new Date(filters.startDate) : false} /></PopoverContent>
            </Popover>
          </div>
          <div className="flex items-end">
            <Button onClick={handleClearFilters} variant="outline" className="w-full"><EraserIcon className="mr-2 h-4 w-4" />Clear Filters</Button>
          </div>
        </div>
      </div>

      {/* Payroll Runs Table */}
      {payrollRunsQuery.isLoading && <div className="space-y-2 mt-4">{[...Array(pagination.pageSize)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>}
      {payrollRunsQuery.isError && <div className="mt-4 text-red-600 bg-red-50 p-4 rounded-md">Error: {payrollRunsQuery.error.message} <Button variant="link" onClick={() => payrollRunsQuery.refetch()}>Try again</Button></div>}
      
      {!payrollRunsQuery.isLoading && !payrollRunsQuery.isError && (
        <>
          <div className="overflow-x-auto shadow-md border rounded-lg">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Payroll ID</TableHead><TableHead>Pay Period</TableHead>
                <TableHead>Status</TableHead><TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {runs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center h-32 text-muted-foreground">No payroll runs found.</TableCell></TableRow>}
                {runs.map((run: PayrollRunForTable) => (
                  <TableRow key={run.payrollId}>
                    <TableCell className="font-medium">{run.payrollId}</TableCell>
                    <TableCell>{format(new Date(run.payPeriodStart), "PPP")} - {format(new Date(run.payPeriodEnd), "PPP")}</TableCell>
                    <TableCell>{renderStatusBadge(run.status)}</TableCell>
                    <TableCell>{format(new Date(run.createdAt), "Pp")}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/payroll/run/${run.payrollId}`} passHref>
                        <Button variant="ghost" size="sm"><Eye className="mr-1 h-4 w-4" /> View Details</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalRecords > 0 && <div className="mt-6"><Pagination totalRecords={totalRecords} currentPage={pagination.page} onPageChange={(p) => setPagination(pg => ({...pg, page: p}))} itemsPerPage={pagination.pageSize} onItemsPerPageChange={(ps) => setPagination({page:1, pageSize:ps})} /></div>}
        </>
      )}

      {/* Initiate Payroll Run Dialog */}
      <Dialog open={isInitiateDialogOpen} onOpenChange={setIsInitiateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Initiate New Payroll Run</DialogTitle></DialogHeader>
          <Form {...initiateRunForm}>
            <form onSubmit={initiateRunForm.handleSubmit(onInitiateRunSubmit)} className="space-y-4 py-2">
              <FormField control={initiateRunForm.control} name="payPeriodStart" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Pay Period Start</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild><FormControl><Button variant="outline" className={cn(!field.value && "text-muted-foreground", "w-full justify-start text-left font-normal")}>{field.value ? format(field.value, "PPP") : <span>Pick start date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                  </Popover><FormMessage />
                </FormItem>
              )} />
              <FormField control={initiateRunForm.control} name="payPeriodEnd" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Pay Period End</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild><FormControl><Button variant="outline" className={cn(!field.value && "text-muted-foreground", "w-full justify-start text-left font-normal")}>{field.value ? format(field.value, "PPP") : <span>Pick end date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => initiateRunForm.getValues("payPeriodStart") ? date < initiateRunForm.getValues("payPeriodStart")! : false} initialFocus /></PopoverContent>
                  </Popover><FormMessage />
                </FormItem>
              )} />
              <FormItem>
                <FormLabel>Specific Employee IDs (Optional)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., empId1,empId2 (comma-separated)"
                    value={employeeIdsString}
                    onChange={(e) => setEmployeeIdsString(e.target.value)}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">Leave empty to process for all eligible employees.</p>
              </FormItem>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline" onClick={() => setIsInitiateDialogOpen(false)}>Cancel</Button></DialogClose>
                <Button type="submit" disabled={initiateRunMutation.isLoading}>{initiateRunMutation.isLoading ? 'Initiating...' : 'Initiate Run'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagePayrollRunsPage;
