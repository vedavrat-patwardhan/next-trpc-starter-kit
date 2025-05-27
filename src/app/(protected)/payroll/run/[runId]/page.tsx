'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { ArrowLeft, CheckCircle, Mail, Printer, InfoIcon } from 'lucide-react';

// Assuming PayrollRunOutput and PayslipOutput types are similar to those in payroll.schema.ts
// These should ideally be imported or generated.
type EmployeeMinimal = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

type PayslipInRun = {
  payslipId: string;
  employee: EmployeeMinimal;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  // status: string; // If payslips have individual statuses
};

type PayrollRunDetails = {
  payrollId: string;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  status: string; // PayrollStatusType
  paymentDate?: Date | null;
  createdAt: Date;
  payslips: PayslipInRun[];
};


const PayrollRunDetailsPage = () => {
  const params = useParams();
  const router = useRouter(); // For back button
  const { toast } = useToast();
  const runId = params.runId as string;

  const { data: runDetails, isLoading, error, refetch } = api.payroll.getRunDetails.useQuery(
    { payrollId: runId },
    { enabled: !!runId }
  );
  
  // Placeholder mutations
  const approveRunMutation = api.payroll.approveRun.useMutation({
    onSuccess: (data) => {
      toast({ title: "Success", description: `Payroll run ${data.payrollId} status changed to ${data.newStatus}.`});
      refetch();
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Approval Failed", description: err.message });
    }
  });

  const emailAllPayslipsMutation = api.payroll.emailPayslip.useMutation({ 
     onSuccess: (data) => {
      toast({ title: "Emailing Payslips", description: `Process initiated to email all payslips for run ${runId}.`});
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Emailing Failed", description: err.message });
    }
  });
  
  const emailIndividualPayslipMutation = api.payroll.emailPayslip.useMutation({
     onSuccess: (data) => {
      toast({ title: "Emailing Payslip", description: data.message});
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Emailing Failed", description: err.message });
    }
  });


  const handleApproveRun = () => {
    if (!runId) return;
    approveRunMutation.mutate({ payrollId: runId });
  };

  const handleEmailAllPayslips = () => {
    if (!runDetails || runDetails.payslips.length === 0) {
        toast({variant: "destructive", title: "No Payslips", description: "No payslips to email for this run."});
        return;
    }
    // This is a simplified call. In reality, you might loop or have a dedicated bulk email procedure.
    // For now, we'll just simulate one call as a placeholder for the action.
    emailAllPayslipsMutation.mutate({ payslipId: runDetails.payslips[0].payslipId }); // Example: use first payslip for mock
  };
  
  const handleEmailIndividualPayslip = (payslipId: string) => {
    emailIndividualPayslipMutation.mutate({ payslipId });
  };
  
  const renderStatusBadge = (status: string) => {
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

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <Skeleton className="h-10 w-1/2 mb-6" />
        <Skeleton className="h-32 w-full mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 text-center">
        <InfoIcon className="mx-auto h-12 w-12 text-red-500" />
        <p className="mt-4 text-lg text-red-600">Error loading payroll run details: {error.message}</p>
        <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
      </div>
    );
  }

  if (!runDetails) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 text-center">
         <InfoIcon className="mx-auto h-12 w-12 text-yellow-500" />
        <p className="mt-4 text-lg text-muted-foreground">Payroll run not found.</p>
        <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
      </div>
    );
  }

  const isApprovable = runDetails.status === 'DRAFT' || runDetails.status === 'PENDING_APPROVAL';

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Payroll Runs
      </Button>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Payroll Run: {runDetails.payrollId}</h1>
          <p className="text-sm text-muted-foreground">
            Period: {format(new Date(runDetails.payPeriodStart), "PPP")} - {format(new Date(runDetails.payPeriodEnd), "PPP")}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
           {isApprovable && (
            <Button onClick={handleApproveRun} disabled={approveRunMutation.isLoading}>
                <CheckCircle className="mr-2 h-4 w-4" /> {approveRunMutation.isLoading ? 'Approving...' : 'Approve Run'}
            </Button>
           )}
          <Button variant="outline" onClick={handleEmailAllPayslips} disabled={emailAllPayslipsMutation.isLoading || runDetails.status !== 'COMPLETED'}>
            <Mail className="mr-2 h-4 w-4" /> {emailAllPayslipsMutation.isLoading ? 'Emailing...' : 'Email All Payslips'}
          </Button>
        </div>
      </div>

      {/* Run Summary */}
      <div className="mb-8 p-6 border rounded-lg bg-white shadow-sm">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Run Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><strong className="text-gray-600">Status:</strong> {renderStatusBadge(runDetails.status)}</div>
          <div><strong className="text-gray-600">Payment Date:</strong> {runDetails.paymentDate ? format(new Date(runDetails.paymentDate), "PPP") : 'N/A'}</div>
          <div><strong className="text-gray-600">Total Payslips:</strong> {runDetails.payslips.length}</div>
          <div><strong className="text-gray-600">Created At:</strong> {format(new Date(runDetails.createdAt), "Pp")}</div>
        </div>
      </div>

      {/* Payslips Table */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Payslips ({runDetails.payslips.length})</h2>
        <div className="overflow-x-auto shadow-md border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-right">Gross Earnings</TableHead>
                <TableHead className="text-right">Total Deductions</TableHead>
                <TableHead className="text-right">Net Pay</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runDetails.payslips.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No payslips found for this run.</TableCell></TableRow>
              )}
              {runDetails.payslips.map((slip) => (
                <TableRow key={slip.payslipId}>
                  <TableCell>
                    <div>{slip.employee.firstName} {slip.employee.lastName}</div>
                    <div className="text-xs text-muted-foreground">{slip.employee.email}</div>
                  </TableCell>
                  <TableCell className="text-right">{slip.grossEarnings.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{slip.totalDeductions.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-semibold">{slip.netPay.toFixed(2)}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" disabled>View</Button> {/* Placeholder */}
                    <Button variant="ghost" size="sm" onClick={() => handleEmailIndividualPayslip(slip.payslipId)} disabled={emailIndividualPayslipMutation.isLoading || runDetails.status !== 'COMPLETED'}>
                        <Mail className="h-4 w-4"/>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default PayrollRunDetailsPage;
