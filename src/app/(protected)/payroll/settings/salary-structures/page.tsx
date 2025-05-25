'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '~/trpc/react';
import { usePermission } from '~/hooks/usePermission';
import { PERMISSIONS } from '~/config/permissions';
import { Button } from '~/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '~/components/ui/dialog';
import { toast } from '~/components/ui/use-toast';
import { Loader } from '~/components/Loader';
import { PlusCircleIcon, EditIcon, TrashIcon, EyeIcon } from 'lucide-react';
import type { SalaryStructure } from '@prisma/client'; // For type hinting

// Extend SalaryStructure type if needed to include _count for employeeAssignments
interface SalaryStructureWithCounts extends SalaryStructure {
  _count?: {
    employeeAssignments?: number;
    componentMappings?: number; // Prisma automatically counts relations if selected
  };
  componentMappings?: any[]; // Keep this if you pass it from query
}


const SalaryStructuresListPage: React.FC = () => {
  const router = useRouter();
  const { hasPermission } = usePermission();
  const canManage = hasPermission(PERMISSIONS.SALARY_STRUCTURE_MANAGE);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [structureToDelete, setStructureToDelete] = useState<SalaryStructureWithCounts | null>(null);

  // Fetch salary structures - organizationId will be derived from session by tRPC
  const { data: structures, isLoading, error, refetch } = api.salaryStructure.listByOrg.useQuery(
    {}, // Empty input as orgId is from session
    { 
      enabled: canManage,
      select: (data) => data.map(s => ({
        ...s,
        // Prisma's _count on relations is automatically included if selected in the query
        // componentMappings count is implicitly s.componentMappings.length if you include the relation
        numComponents: s.componentMappings?.length ?? 0, 
        numAssignedEmployees: s._count?.employeeAssignments ?? 0,
      }))
    }
  );
  
  const deleteMutation = api.salaryStructure.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Salary structure deleted successfully.' });
      refetch();
      setIsDeleteDialogOpen(false);
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message || 'Failed to delete structure.', variant: 'destructive' });
      setIsDeleteDialogOpen(false);
    },
  });
  
  const openDeleteDialog = (structure: SalaryStructureWithCounts) => {
    setStructureToDelete(structure);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (structureToDelete) {
      deleteMutation.mutate({ structureId: structureToDelete.structureId });
    }
  };

  if (!canManage && !isLoading) {
    return <p className="p-4 text-red-500">You do not have permission to manage salary structures.</p>;
  }
  if (isLoading) return <Loader text="Loading salary structures..." />;
  if (error) return <p className="p-4 text-red-500">Error loading structures: {error.message}</p>;

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Salary Structures</h1>
        {canManage && (
          <Button asChild>
            <Link href="/payroll/settings/salary-structures/new">
              <PlusCircleIcon className="mr-2 h-5 w-5" /> Add New Structure
            </Link>
          </Button>
        )}
      </div>

      <div className="bg-background shadow-md rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-center">Components</TableHead>
              <TableHead className="text-center">Assigned Employees</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {structures && structures.length > 0 ? (
              structures.map((structure) => (
                <TableRow key={structure.structureId}>
                  <TableCell className="font-medium">{structure.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {structure.description || 'N/A'}
                  </TableCell>
                  <TableCell className="text-center">{(structure as any).numComponents}</TableCell>
                  <TableCell className="text-center">{(structure as any).numAssignedEmployees}</TableCell>
                  <TableCell className="text-center">
                     <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      structure.isActive ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' : 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100'
                    }`}>
                      {structure.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {canManage && (
                      <>
                        <Button asChild variant="ghost" size="icon" title="View Details">
                          <Link href={`/payroll/settings/salary-structures/${structure.structureId}`}>
                            <EyeIcon className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" size="icon" title="Edit Structure">
                           <Link href={`/payroll/settings/salary-structures/${structure.structureId}/edit`}>
                            <EditIcon className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(structure)} title="Delete Structure">
                          <TrashIcon className="h-4 w-4 text-red-500" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  No salary structures found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Salary Structure</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the structure "{structureToDelete?.name}"? 
              This action cannot be undone. Ensure no employees are assigned to this structure if your backend enforces this.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={deleteMutation.isLoading}>Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteMutation.isLoading}>
              {deleteMutation.isLoading ? <Loader text="Deleting..." /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalaryStructuresListPage;
