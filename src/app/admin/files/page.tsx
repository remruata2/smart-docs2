import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth-options';
import { UserRole } from '@/generated/prisma';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { pageContainer, pageTitle } from '@/styles/ui-classes';
import { getFilesPaginated, getFilterOptions } from './actions'; 
import FileListClient from './FileListClient';
export default async function FilesPage() {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !session.user ||
    (session.user.role !== UserRole.admin && session.user.role !== UserRole.staff)
  ) {
    redirect('/unauthorized');
  }

  let error: string | null = null;

  try {
    // Initial load: first page with defaults
    const [{ items, total, page, pageSize }, filterOptions] = await Promise.all([
      getFilesPaginated({ page: 1, pageSize: 50 }),
      getFilterOptions(),
    ]);
    return (
      <div className={pageContainer}>
        <div className="flex justify-between items-center mb-8">
          <h1 className={pageTitle}>Manage Files</h1>
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Link href="/admin/files/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New File
            </Link>
          </Button>
        </div>
        <FileListClient
          initialItems={items}
          initialTotal={total}
          initialPage={page}
          initialPageSize={pageSize}
          filterOptions={filterOptions}
          initialError={error}
          canDelete={session.user.role === UserRole.admin}
        />
      </div>
    );
  } catch (err) {
    console.error('Failed to fetch files on server:', err);
    error = 'Failed to load files. Please try again later.';
    return (
      <div className={pageContainer}>
        <div className="flex justify-between items-center mb-8">
          <h1 className={pageTitle}>Manage Files</h1>
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Link href="/admin/files/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New File
            </Link>
          </Button>
        </div>
        <FileListClient
          initialItems={[]}
          initialTotal={0}
          initialPage={1}
          initialPageSize={50}
          filterOptions={{ categories: [], years: [] }}
          initialError={error}
          canDelete={session.user.role === UserRole.admin}
        />
      </div>
    );
  }
}
