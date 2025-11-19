import { type DefaultSession } from "next-auth";
import { UserRole } from "@/generated/prisma";

// Define the role hierarchy
const ROLE_HIERARCHY = {
	user: 0,
	staff: 1,
	admin: 2,
} as const;

/**
 * Check if a user has the required role or higher
 * @param userRole The user's role
 * @param requiredRole The minimum role required
 * @returns boolean indicating if the user has the required role or higher
 */
export const hasRequiredRole = (
	userRole: UserRole,
	requiredRole: UserRole
): boolean => {
	return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

/**
 * Check if a user has admin privileges
 * @param userRole The user's role
 * @returns boolean indicating if the user is an admin
 */
export const isAdmin = (userRole: UserRole): boolean => {
	return userRole === "admin";
};

/**
 * Type guard to check if a user has a valid role
 * @param role The role to check
 * @returns boolean indicating if the role is valid
 */
export const isValidRole = (role: string): role is UserRole => {
	return role === "admin" || role === "staff";
};

/**
 * Get the user's role from the session
 * @param session The session object
 * @returns The user's role or null if not available
 */
export const getUserRole = (
	session: DefaultSession | null
): UserRole | null => {
	if (!session?.user) return null;
	const role = (session.user as any).role;
	return isValidRole(role) ? role : null;
};

// Export the role constants
export const ROLES = {
	ADMIN: "admin" as UserRole,
	STAFF: "staff" as UserRole,
} as const;

// Type for the role values
export type UserRoleType = keyof typeof ROLES;
