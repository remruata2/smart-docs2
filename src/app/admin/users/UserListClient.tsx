'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RoleGuard } from '@/components/auth';
import { deleteUserAction } from './actions'; // Import the server action
import { UserRole } from '@/generated/prisma';
import { Loader2, PlusCircle, Pencil, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { cardContainer } from '@/styles/ui-classes';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export type UserListData = {
  id: number;
  username: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  is_active: boolean | null;
  last_login: string | null;
  created_at: string | null;
};

interface UserListClientProps {
  initialUsers: UserListData[];
  initialError?: string | null;
}

export default function UserListClient({ initialUsers, initialError }: UserListClientProps) {
  const [users, setUsers] = useState<UserListData[]>(initialUsers);
  const [loading, setLoading] = useState(false); // Initial loading is done by server
  const [error, setError] = useState<string | null>(initialError || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: number; username: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const openDeleteDialog = (id: number, username: string) => {
    setUserToDelete({ id, username });
    setIsAlertDialogOpen(true);
  };

  const executeDeleteUser = () => {
    if (!userToDelete) return;

    toast.promise(deleteUserAction(userToDelete.id), {
      loading: `Deleting user ${userToDelete.username}...`,
      success: (result) => {
        if (result.success) {
          setIsAlertDialogOpen(false); // Close dialog on success
          setUserToDelete(null);
          // Optimistically update the list
          setUsers(users.filter(u => u.id !== userToDelete.id));
          return `User ${userToDelete.username} deleted successfully.`;
        } else {
          // This error will be caught by the 'error' callback of toast.promise
          throw new Error(result.error || 'Failed to delete user.');
        }
      },
      error: (err) => {
        console.error('Failed to delete user:', err);
        const errorMessage = err instanceof Error ? err.message : err.toString();
        setIsAlertDialogOpen(false); // Close dialog on error too
        setUserToDelete(null);
        return errorMessage || 'Failed to delete user. Please try again.';
      },
    });
  };

  // Format date for display
  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) { // This loading state is now for actions like delete, not initial load
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Processing...</span>
      </div>
    );
  }

  return (
    <RoleGuard requiredRole="admin">
      <div className="px-4 py-6 sm:px-0">
        {/* Page title and Create button moved to parent server component users/page.tsx */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700 mb-4">
            {error}
          </div>
        )}

        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by username or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div className="w-full sm:w-48">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
              <option value="institution">Institution</option>
            </select>
          </div>
        </div>

        <div className={cardContainer}>
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="w-[200px]">User</TableHead>
                <TableHead className="w-[200px]">Email</TableHead>
                <TableHead className="w-[100px]">Role</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[150px]">Last Login</TableHead>
                <TableHead className="w-[150px]">Created At</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length > 0 && filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="font-semibold">{user.name || user.username}</div>
                    {user.name && <div className="text-xs text-gray-500">{user.username}</div>}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {user.email || <span className="text-gray-400 italic">N/A</span>}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${user.role === 'admin' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-blue-100 text-blue-800 border-blue-200'
                      }`}>
                      {user.role === 'admin' ? 'Admin' : 'Staff'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${user.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'
                      }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(user.last_login)}</TableCell>
                  <TableCell>{formatDate(user.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild title="View">
                      <Link href={`/admin/users/${user.id}`} className="text-blue-600 hover:text-blue-900">
                        <Eye className="h-5 w-5" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild className="mr-2" title="Edit">
                      <Link href={`/admin/users/${user.id}/edit`} className="text-indigo-600 hover:text-indigo-900">
                        <Pencil className="h-5 w-5" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteDialog(user.id, user.username)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {users.length === 0 && !error && (
            <p className="py-4 text-center text-sm text-gray-500">No users found. Get started by creating a new one!</p>
          )}
        </div>
      </div>
      {userToDelete && (
        <AlertDialog open={isAlertDialogOpen} onOpenChange={(isOpen) => {
          setIsAlertDialogOpen(isOpen);
          if (!isOpen) {
            setUserToDelete(null); // Clear userToDelete if dialog is closed externally (e.g., Esc key)
          }
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the user "{userToDelete.username}"
                and remove their data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={executeDeleteUser}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </RoleGuard>
  );
}
