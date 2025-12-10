'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserRole } from '@/generated/prisma';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import { updateUserAction } from '../../actions'; // Adjusted path to actions.ts
import { toast } from 'sonner';

export type UserEditData = {
  id: number;
  username: string;
  role: UserRole;
  is_active: boolean;
  // Dates are not directly edited here but could be displayed if needed
};

interface UserEditFormProps {
  user: UserEditData;
}

export default function UserEditForm({ user }: UserEditFormProps) {
  const [formData, setFormData] = useState({
    username: user.username,
    password: '', // Password field is for entering a new password, not displaying the old one
    role: user.role,
    is_active: user.is_active,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Re-initialize form if user prop changes (e.g., after a save and re-fetch)
    setFormData({
      username: user.username,
      password: '',
      role: user.role,
      is_active: user.is_active,
    });
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    if (!formData.username) {
      setError('Username is required.');
      setSaving(false);
      return;
    }

    const result = await updateUserAction(user.id, formData);
    setSaving(false);

    if (result.success && result.user) {
      toast.success('User updated successfully.');
      // router.push(`/admin/users/${result.user.id}`); // Redirect to user detail page
      // OR, stay on the edit page but show success. For now, let's redirect to details.
      router.push(`/admin/users/${result.user.id}`);
      // Optionally, if staying on the page, you might want to refresh data or clear password field:
      // setFormData(prev => ({ ...prev, password: '' }));
    } else {
      setError(result.error || 'Failed to update user. Please try again.');
      toast.error(result.error || 'Failed to update user. Please try again.');
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Link href={`/admin/users/${user.id}`} className="mr-4 text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">Edit User: {user.username}</h1>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <form onSubmit={handleSubmit}>
          <div className="px-4 py-5 sm:p-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="username"
                    id="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full text-base border-gray-300 rounded-md h-8 px-4"
                  />
                </div>
              </div>

              <div className="sm:col-span-4">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password (leave blank to keep current)
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    name="password"
                    id="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full text-base border-gray-300 rounded-md h-8 px-4"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <div className="mt-1">
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full text-base border-gray-300 rounded-md h-8 px-4"
                  >
                    <option value={UserRole.institution}>Institution</option>
                    <option value={UserRole.admin}>Admin</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-6">
                <div className="flex items-center">
                  <input
                    id="is_active"
                    name="is_active"
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                    Active
                  </label>
                </div>
              </div>
            </div>
          </div>
          <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
            <Link
              href={`/admin/users/${user.id}`}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="-ml-1 mr-3 h-5 w-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
