import { db } from "@/lib/db";
import { UserRole } from "@/generated/prisma";
import { hash } from "bcryptjs";

/**
 * Get all users from the database
 */
export async function getAllUsers() {
	console.log("[USER-SERVICE] Fetching all users...");
	try {
		const users = await db.user.findMany({
			select: {
				id: true,
				username: true,
				name: true,
				image: true,
				role: true,
				is_active: true,
				last_login: true,
				created_at: true,
			},
			orderBy: {
				created_at: "desc",
			},
		});
		console.log(`[USER-SERVICE] Found ${users.length} users:`, users);
		return users;
	} catch (error) {
		console.error("[USER-SERVICE] Error fetching users:", error);
		throw error;
	}
}

/**
 * Get a user by ID
 */
export async function getUserById(id: number) {
	return await db.user.findUnique({
		where: { id },
		select: {
			id: true,
			username: true,
			name: true,
			image: true,
			role: true,
			is_active: true,
			last_login: true,
			created_at: true,
		},
	});
}

/**
 * Create a new user
 */
export async function createUser(data: {
	username: string;
	name?: string;
	image?: string;
	password: string;
	role: UserRole;
	is_active?: boolean;
}) {
	const { username, name, image, password, role, is_active = true } = data;

	// Hash the password
	const password_hash = await hash(password, 10);

	const newUser = await db.user.create({
		data: {
			username,
			name,
			image,
			password_hash,
			role,
			is_active,
		},
		select: {
			id: true,
			username: true,
			name: true,
			image: true,
			role: true,
			is_active: true,
			created_at: true,
		},
	});

	// Synchronize Instructor profile
	if (role === 'instructor') {
		try {
			await db.instructor.create({
				data: {
					user_id: newUser.id,
					title: 'Instructor'
				}
			});
			console.log(`[USER-SERVICE] Created Instructor profile for user ${newUser.id}`);
		} catch (error) {
			console.error(`[USER-SERVICE] Failed to create Instructor profile:`, error);
		}
	}

	return newUser;
}

/**
 * Update a user
 */
export async function updateUser(
	id: number,
	data: {
		username?: string;
		name?: string;
		image?: string;
		password?: string;
		role?: UserRole;
		is_active?: boolean;
	}
) {
	const { username, name, image, password, role, is_active } = data;

	// Prepare update data
	const updateData: any = {};

	if (username !== undefined) {
		updateData.username = username;
	}

	if (name !== undefined) {
		updateData.name = name;
	}
	if (image !== undefined) {
		updateData.image = image;
	}
	if (password !== undefined) {
		updateData.password_hash = await hash(password, 10);
	}

	if (role !== undefined) {
		updateData.role = role;
	}

	if (is_active !== undefined) {
		updateData.is_active = is_active;
	}

	const updatedUser = await db.user.update({
		where: { id },
		data: updateData,
		select: {
			id: true,
			username: true,
			name: true,
			image: true,
			role: true,
			is_active: true,
			last_login: true,
			created_at: true,
		},
	});

	// Synchronize Instructor profile
	if (role as any === 'instructor') {
		try {
			// Upsert to ensure it exists
			await db.instructor.upsert({
				where: { user_id: id },
				update: {}, // No updates needed if it exists
				create: {
					user_id: id,
					title: 'Instructor'
				}
			});
			console.log(`[USER-SERVICE] Ensured Instructor profile exists for user ${id}`);
		} catch (error) {
			console.error(`[USER-SERVICE] Failed to ensure Instructor profile:`, error);
		}
	} else if (role !== undefined && (role as any) !== 'instructor') {
		// If role changed FROM instructor, we could delete it, but only if it has no courses
		try {
			const instructor = await db.instructor.findUnique({
				where: { user_id: id },
				include: { _count: { select: { courses: true } } }
			});

			if (instructor && instructor._count.courses === 0) {
				await db.instructor.delete({ where: { id: instructor.id } });
				console.log(`[USER-SERVICE] Deleted unneeded Instructor profile for user ${id}`);
			}
		} catch (error) {
			console.error(`[USER-SERVICE] Failed to cleanup Instructor profile:`, error);
		}
	}

	return updatedUser;
}

/**
 * Delete a user
 */
export async function deleteUser(id: number) {
	return await db.user.delete({
		where: { id },
	});
}
