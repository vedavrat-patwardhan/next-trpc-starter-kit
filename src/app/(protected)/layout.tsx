'use client';

import { Navbar } from '@/components/Navbar';
import { SidebarLayout } from '@/components/Sidebar';

import { ProtectedRoute } from '@/hooks/protectedRoute';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-svh">
        <main className="flex-1 min-h-svh p-3">
          <Navbar />
          <SidebarLayout>{children}</SidebarLayout>
        </main>
      </div>
    </ProtectedRoute>
  );
}
