'use client';
import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-svh bg-gray-100 text-center p-6">
      <h1 className="text-5xl font-bold text-red-600">403</h1>
      <h2 className="text-2xl font-semibold mt-4">Access Denied</h2>
      <p className="text-gray-600 mt-2">
        You do not have permission to view this page.
      </p>
      <Link href="/home">
        <button className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700">
          Go to home page
        </button>
      </Link>
    </div>
  );
}
