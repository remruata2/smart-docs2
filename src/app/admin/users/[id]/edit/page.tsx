// This is now a Server Component
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { getUserById } from '@/services/user-service';
import { UserRole } from '@/generated/prisma';
import UserEditForm, { UserEditData } from './UserEditForm'; // Import the new client component
import { Loader2, ArrowLeft } from 'lucide-react'; // For loading/error states before client component renders
import Link from 'next/link'; // For error state navigation

export default async function UserEditPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== UserRole.admin) {
    redirect('/unauthorized');
  }

  const { id: paramId } = await params;
  const userId = parseInt(paramId, 10);
  let initialUserData: UserEditData | null = null;
  let error: string | null = null;

  if (isNaN(userId)) {
    error = 'Invalid user ID.';
  } else {
    try {
      const rawUser = await getUserById(userId);
      if (rawUser) {
        initialUserData = {
          id: rawUser.id,
          username: rawUser.username,
          name: rawUser.name,
          image: rawUser.image,
          role: rawUser.role,
          is_active: rawUser.is_active === null ? true : rawUser.is_active, // Default to true if null
        };
      } else {
        error = 'User not found.';
      }
    } catch (err: any) {
      console.error('Failed to fetch user for editing:', err);
      error = 'Failed to load user data for editing. Please try again.';
    }
  }

  if (error) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="flex items-center mb-6">
          <Link href="/admin/users" className="mr-4 text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">Edit User</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!initialUserData) {
    // This case should ideally be covered by the error above (user not found or invalid ID)
    // but as a fallback:
    return (
      <div className="px-4 py-6 sm:px-0 flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading user data...</span>
      </div>
    );
  }

  return <UserEditForm user={initialUserData} />;
}
