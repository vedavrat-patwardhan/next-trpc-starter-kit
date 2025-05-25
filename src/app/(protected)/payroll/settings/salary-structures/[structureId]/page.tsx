'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '~/trpc/react';
import { usePermission } from '~/hooks/usePermission';
import { PERMISSIONS } from '~/config/permissions';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Loader } from '~/components/Loader';
import { toast } from '~/components/ui/use-toast';
import { ArrowLeftIcon, EditIcon, TrashIcon, CheckCircle2Icon, XCircleIcon } from 'lucide-react';

const SalaryStructureDetailPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const structureId = params.structureId as string;

  const { hasPermission } = usePermission();
  const canManage = hasPermission(PERMISSIONS.SALARY_STRUCTURE_MANAGE);

  const { data: structure, isLoading, error, refetch } = api.salaryStructure.getById.useQuery(
    { structureId },
    { enabled: !!structureId }
  );
  
  const deleteMutation = api.salaryStructure.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Salary structure deleted successfully.' });
      router.push('/payroll/settings/salary-structures');
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message || 'Failed to delete structure.', variant: 'destructive' });
    },
  });

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete the structure "${structure?.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate({ structureId });
    }
  };

  if (isLoading) return <Loader text="Loading salary structure details..." />;
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <p className="text-xl text-red-500 mb-4">Error: {error.message}</p>
        <Button onClick={() => router.push('/payroll/settings/salary-structures')} className="mt-4">Back to List</Button>
      </div>
    );
  }
  if (!structure) {
     return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <p className="text-xl text-muted-foreground">Salary structure not found.</p>
        <Button onClick={() => router.push('/payroll/settings/salary-structures')} className="mt-4">Back to List</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 max-w-3xl">
      <div className="mb-6 flex justify-between items-center">
        <Button variant="outline" size="sm" asChild>
          <Link href="/payroll/settings/salary-structures">
            <ArrowLeftIcon className="mr-2 h-4 w-4" /> Back to Structures List
          </Link>
        </Button>
        {canManage && (
          <div className="space-x-2">
            <Button variant="outline" asChild>
              <Link href={`/payroll/settings/salary-structures/${structureId}/edit`}>
                <EditIcon className="mr-2 h-4 w-4" /> Edit
              </Link>
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isLoading}>
              <TrashIcon className="mr-2 h-4 w-4" /> Delete
            </Button>
          </div>
        )}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl">{structure.name}</CardTitle>
          <CardDescription>{structure.description || 'No description provided.'}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            {structure.isActive ? (
              <CheckCircle2Icon className="h-5 w-5 text-green-500" />
            ) : (
              <XCircleIcon className="h-5 w-5 text-red-500" />
            )}
            <span className="text-sm font-medium">{structure.isActive ? 'Active' : 'Inactive'}</span>
          </div>
          {/* More details can be added here if needed, like assigned employees count */}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Components in this Structure</CardTitle>
        </CardHeader>
        <CardContent>
          {structure.componentMappings && structure.componentMappings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Calc. Type</TableHead>
                  <TableHead>Defined Value</TableHead>
                  <TableHead>Percentage Of</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {structure.componentMappings.map((mapping) => (
                  <TableRow key={mapping.mappingId}>
                    <TableCell className="font-medium">{mapping.salaryComponent.name}</TableCell>
                    <TableCell>{mapping.salaryComponent.type}</TableCell>
                    <TableCell>{mapping.salaryComponent.calculationType}</TableCell>
                    <TableCell>
                      {mapping.definedValue !== null ? mapping.definedValue : 
                       (mapping.salaryComponent.calculationType === 'FIXED' ? '(Uses Component Default)' : 'N/A')}
                    </TableCell>
                    <TableCell>
                      {mapping.percentageOfComponentId ? 
                        (structure.componentMappings.find(m => m.componentId === mapping.percentageOfComponentId)?.salaryComponent.name || 'Invalid Ref') : 
                        'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">No components have been added to this structure.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalaryStructureDetailPage;
