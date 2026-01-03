'use server';

import { createUser as createUserService, deleteUser as deleteUserService, updateUser as updateUserService } from '@/services/user-service';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { UserRole } from '@/generated/prisma';

export async function deleteUserAction(id: number): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== UserRole.admin) {
    return { success: false, error: 'Unauthorized' };
  }

  // Prevent admin from deleting themselves
  const loggedInUserId = parseInt(session.user.id, 10);
  if (loggedInUserId === id) {
    return { success: false, error: 'You cannot delete your own account.' };
  }

  try {
    await deleteUserService(id);
    revalidatePath('/admin/users'); // Revalidate the user list page to reflect changes
    return { success: true };
  } catch (error) {
    console.error('Failed to delete user:', error);
    // In a real app, you might want to return a more specific error message
    return { success: false, error: 'Failed to delete user. Please try again.' };
  }
}

export async function createUserAction(formData: {
  username: string;
  name?: string;
  image?: string;
  password: string;
  role: UserRole;
  is_active: boolean;
}): Promise<{ success: boolean; error?: string; userId?: number }> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== UserRole.admin) {
    return { success: false, error: 'Unauthorized' };
  }

  const { username, name, image, password, role, is_active } = formData;

  if (!username || !password) {
    return { success: false, error: 'Username and password are required.' };
  }

  try {
    const newUser = await createUserService({
      username,
      name,
      image,
      password,
      role,
      is_active,
    });
    revalidatePath('/admin/users'); // Revalidate the user list page
    return { success: true, userId: newUser.id };
  } catch (error: any) {
    console.error('Failed to create user:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
      return { success: false, error: 'Username already exists. Please choose a different username.' };
    }
    return { success: false, error: error.message || 'Failed to create user. Please try again.' };
  }
}

export async function updateUserAction(userId: number, formData: {
  username: string;
  name?: string;
  image?: string;
  password?: string; // Password is optional
  role: UserRole;
  is_active: boolean;
}): Promise<{ success: boolean; error?: string; user?: { id: number } }> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== UserRole.admin) {
    return { success: false, error: 'Unauthorized' };
  }

  const { username, name, image, password, role, is_active } = formData;

  if (!username) {
    return { success: false, error: 'Username is required.' };
  }

  // Prepare update data, only include password if provided
  const updateData: {
    username: string;
    name?: string;
    image?: string;
    password?: string;
    role: UserRole;
    is_active: boolean;
  } = { username, name, image, role, is_active };

  if (password && password.trim() !== '') {
    updateData.password = password;
  }

  try {
    const updatedUser = await updateUserService(userId, updateData);
    revalidatePath('/admin/users'); // Revalidate the user list page
    revalidatePath(`/admin/users/${userId}`); // Revalidate the user detail page
    revalidatePath(`/admin/users/${userId}/edit`); // Revalidate this edit page itself
    return { success: true, user: { id: updatedUser.id } };
  } catch (error: any) {
    console.error('Failed to update user:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
      return { success: false, error: 'Username already exists. Please choose a different username.' };
    }
    return { success: false, error: error.message || 'Failed to update user. Please try again.' };
  }
}
