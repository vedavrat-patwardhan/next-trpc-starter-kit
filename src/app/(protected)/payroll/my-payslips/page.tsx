'use client';

import React, { useState, useEffect } from 'react';
import { format, isValid } from 'date-fns';
import { api } from '@/trpc/react';
import { 
    listMyPayslipsInputSchema, 
    ListMyPayslipsInput, 
    PayslipOutput, // Using the detailed schema output type
    PayslipLineItem 
} from '@/schemas/payroll.schema';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Pagination } from '@/components/ui/pagination';
import { useToast } from '@/hooks/useToast';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, Eye, Download, InfoIcon, EraserIcon, SearchIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Local Type Definitions ---
type SessionUser = {
  employeeId: string;
};
type Session = {
  user: SessionUser;
} | null;

// Type for the data structure returned by listMyPayslips, specifically the 'payroll' part
type PayrollInfoForPayslip = {
  payPeriodStart: Date;
  payPeriodEnd: Date;
  status: string; // PayrollStatusType
  paymentDate?: Date | null;
};

type PayslipForListing = Omit<PayslipOutput, 'payrollId' | 'employeeId' | 'organizationId' | 'generatedDate'> & {
  payslipId: string; // ensure payslipId is available
  payroll: PayrollInfoForPayslip; // Include nested payroll info
  createdAt: Date; // Assuming this is part of the payslip record from the DB for display
};


const MyPayslipsPage = () => {
  const { toast } = useToast();

  // --- Mock Session (Replace with actual session logic) ---
  // TODO: Replace this mock session with actual session data (e.g., from next-auth `useSession()`)
  const [session, setSession] = useState<Session>({
    user: { employeeId: 'cl_mock_employee_id_123' } // Example employeeId
  });
  const employeeId = session?.user?.employeeId;

  // --- State ---
  const [filters, setFilters] = useState<Omit<ListMyPayslipsInput, 'page' | 'pageSize'>>({
    payPeriodStart: undefined,
    payPeriodEnd: undefined,
  });
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipForListing | null>(null);

  // --- tRPC Query for listing payslips ---
  const payslipsQuery = api.payroll.listMyPayslips.useQuery(
    {
      ...filters,
      page: pagination.page,
      pageSize: pagination.pageSize,
      // employeeId is handled by the protectedProcedure on the backend
    },
    {
      enabled: !!employeeId,
    }
  );
  
  // tRPC Query for fetching individual payslip details for the modal
  // This might be redundant if listMyPayslips already returns all necessary details.
  // For V1, we'll assume listMyPayslips provides enough detail. If not, this query would be used.
  const payslipDetailsQuery = api.payroll.getPayslipForEmployee.useQuery(
    { payslipId: selectedPayslip?.payslipId! }, // `!` because it's only enabled when selectedPayslip exists
    { enabled: !!selectedPayslip && !!selectedPayslip.payslipId && isDetailsDialogOpen }
  );


  // --- Effects ---
  useEffect(() => {
    if (employeeId) {
      payslipsQuery.refetch();
    }
  }, [filters, pagination, employeeId, payslipsQuery.refetch]);


  // --- Handlers ---
  const handleFilterChange = (filterName: keyof typeof filters, value: Date | undefined) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleClearFilters = () => {
    setFilters({ payPeriodStart: undefined, payPeriodEnd: undefined });
    setPagination(prev => ({ ...prev, page: 1 }));
  };
  
  const handleOpenDetailsDialog = (payslip: PayslipForListing) => {
    setSelectedPayslip(payslip);
    setIsDetailsDialogOpen(true);
  };
  
  const handleCloseDetailsDialog = () => {
    setIsDetailsDialogOpen(false);
    setSelectedPayslip(null); 
  };

  const handleDownloadPayslip = (payslipId: string) => {
    toast({
      title: "Download Not Implemented",
      description: "PDF download for payslips will be available soon.",
      variant: "default",
    });
    // Placeholder: In a real app, this would trigger a download, possibly via payslip.fileUrl
    // console.log("Attempting to download payslip:", payslipId);
  };


  // --- Render Logic ---
  if (!employeeId) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <InfoIcon className="w-16 h-16 text-orange-500 mb-4" />
        <p className="text-xl text-muted-foreground">User information not available.</p>
        <p className="text-sm text-muted-foreground">Please ensure you are logged in correctly to view your payslips.</p>
        <p className="text-xs text-gray-400 mt-2">Developer Note: Replace mock session with actual session logic.</p>
      </div>
    );
  }

  const payslips = payslipsQuery.data?.items || [];
  const totalRecords = payslipsQuery.data?.totalRecords || 0;
  
  const payslipForDialog = payslipDetailsQuery.data || selectedPayslip; // Prefer detailed query data if available

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">My Payslips</h1>
      </div>

      {/* Filters Section */}
      <div className="mb-8 p-4 border rounded-lg bg-gray-50 shadow">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-1">
            <Label htmlFor="pay-period-start">Pay Period Start</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="pay-period-start" variant="outline" className={cn("w-full justify-start text-left font-normal", !filters.payPeriodStart && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.payPeriodStart && isValid(new Date(filters.payPeriodStart)) ? format(new Date(filters.payPeriodStart), "PPP") : <span>Pick a start date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filters.payPeriodStart} onSelect={(d) => handleFilterChange('payPeriodStart', d)} initialFocus /></PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pay-period-end">Pay Period End</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="pay-period-end" variant="outline" className={cn("w-full justify-start text-left font-normal", !filters.payPeriodEnd && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.payPeriodEnd && isValid(new Date(filters.payPeriodEnd)) ? format(new Date(filters.payPeriodEnd), "PPP") : <span>Pick an end date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filters.payPeriodEnd} onSelect={(d) => handleFilterChange('payPeriodEnd', d)} initialFocus disabled={(date) => filters.payPeriodStart ? date < new Date(filters.payPeriodStart) : false} /></PopoverContent>
            </Popover>
          </div>
          <div className="flex items-end">
             <Button onClick={handleClearFilters} variant="outline" className="w-full"><EraserIcon className="mr-2 h-4 w-4" />Clear Filters</Button>
          </div>
        </div>
      </div>

      {/* Payslips Table/List */}
      {payslipsQuery.isLoading && <div className="space-y-2 mt-4">{[...Array(pagination.pageSize)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>}
      {payslipsQuery.isError && <div className="mt-4 text-red-600 bg-red-50 p-4 rounded-md">Error loading payslips: {payslipsQuery.error.message} <Button variant="link" onClick={() => payslipsQuery.refetch()}>Try again</Button></div>}
      
      {!payslipsQuery.isLoading && !payslipsQuery.isError && (
        <>
          <div className="overflow-x-auto shadow-md border rounded-lg">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Pay Period</TableHead>
                <TableHead className="text-right">Net Pay</TableHead>
                <TableHead className="text-right">Gross Earnings</TableHead>
                <TableHead className="text-right">Total Deductions</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {payslips.length === 0 && <TableRow><TableCell colSpan={6} className="text-center h-32 text-muted-foreground">No payslips found for the selected period.</TableCell></TableRow>}
                {payslips.map((slip: PayslipForListing) => (
                  <TableRow key={slip.payslipId}>
                    <TableCell>{format(new Date(slip.payroll.payPeriodStart), "PPP")} - {format(new Date(slip.payroll.payPeriodEnd), "PPP")}</TableCell>
                    <TableCell className="text-right font-semibold">{slip.netPay.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{slip.grossEarnings.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{slip.totalDeductions.toFixed(2)}</TableCell>
                    <TableCell>{slip.payroll.paymentDate ? format(new Date(slip.payroll.paymentDate), "PPP") : 'N/A'}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDetailsDialog(slip)}><Eye className="mr-1 h-4 w-4" /> View</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDownloadPayslip(slip.payslipId)}><Download className="mr-1 h-4 w-4" /> Download</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalRecords > 0 && <div className="mt-6"><Pagination totalRecords={totalRecords} currentPage={pagination.page} onPageChange={(p) => setPagination(pg => ({...pg, page: p}))} itemsPerPage={pagination.pageSize} onItemsPerPageChange={(ps) => setPagination({page:1, pageSize:ps})} /></div>}
        </>
      )}

      {/* View Payslip Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Payslip Details</DialogTitle></DialogHeader>
          {payslipDetailsQuery.isLoading && <Skeleton className="h-48 w-full" />}
          {payslipDetailsQuery.isError && <p className="text-red-500">Error loading details: {payslipDetailsQuery.error.message}</p>}
          {payslipForDialog && !payslipDetailsQuery.isLoading && !payslipDetailsQuery.isError && (
            <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <p><strong>Pay Period:</strong> {format(new Date(payslipForDialog.payroll.payPeriodStart), "PPP")} - {format(new Date(payslipForDialog.payroll.payPeriodEnd), "PPP")}</p>
                <p><strong>Payment Date:</strong> {payslipForDialog.payroll.paymentDate ? format(new Date(payslipForDialog.payroll.paymentDate), "PPP") : 'N/A'}</p>
                <p><strong>Generated On:</strong> {format(new Date(payslipForDialog.createdAt), "PPP p")}</p>
                <p><strong>Payroll Status:</strong> {payslipForDialog.payroll.status}</p>
              </div>
              
              <div>
                <h3 className="text-md font-semibold mb-1 mt-3 text-green-700">Earnings</h3>
                <div className="border-t border-b divide-y">
                  {payslipForDialog.earningsBreakdown.map((item: PayslipLineItem, index: number) => (
                    <div key={`earning-${index}`} className="flex justify-between py-1.5 px-1">
                      <span>{item.name}</span>
                      <span>{item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between py-1.5 px-1 font-semibold">
                  <span>Total Gross Earnings</span>
                  <span>{payslipForDialog.grossEarnings.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <h3 className="text-md font-semibold mb-1 mt-3 text-red-700">Deductions</h3>
                 <div className="border-t border-b divide-y">
                  {payslipForDialog.deductionsBreakdown.map((item: PayslipLineItem, index: number) => (
                    <div key={`deduction-${index}`} className="flex justify-between py-1.5 px-1">
                      <span>{item.name}</span>
                      <span>{item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between py-1.5 px-1 font-semibold">
                  <span>Total Deductions</span>
                  <span>{payslipForDialog.totalDeductions.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t">
                <div className="flex justify-between text-lg font-bold py-1.5 px-1">
                  <span>Net Pay</span>
                  <span>{payslipForDialog.netPay.toFixed(2)}</span>
                </div>
              </div>

              {payslipForDialog.summaryInfo && Object.keys(payslipForDialog.summaryInfo).length > 0 && (
                <div>
                  <h3 className="text-md font-semibold mb-1 mt-3 text-gray-700">Summary Info</h3>
                  <div className="border-t pt-1 text-sm">
                    {Object.entries(payslipForDialog.summaryInfo).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-1 px-1">
                        <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {payslipForDialog.notes && (
                <div>
                  <h3 className="text-md font-semibold mb-1 mt-3 text-gray-700">Notes</h3>
                  <p className="text-sm p-1 border-t pt-1">{payslipForDialog.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline" onClick={handleCloseDetailsDialog}>Close</Button></DialogClose>
            <Button onClick={() => selectedPayslip && handleDownloadPayslip(selectedPayslip.payslipId)}><Download className="mr-2 h-4 w-4" /> Download PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyPayslipsPage;
