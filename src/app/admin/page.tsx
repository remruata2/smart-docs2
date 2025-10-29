import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import AdminDashboard from "./AdminDashboard";

async function getDashboardStats() {
	try {
		const [categoriesCount, filesCount, usersCount, activeUsersCount] = await Promise.all([
			prisma.categoryList.count(),
			prisma.fileList.count(),
			prisma.user.count(),
			prisma.user.count({ where: { is_active: true } }),
		]);

		return {
			categoriesCount,
			filesCount,
			usersCount,
			activeUsersCount,
		};
	} catch (error) {
		console.error("Error fetching dashboard stats:", error);
		return {
			categoriesCount: 0,
			filesCount: 0,
			usersCount: 0,
			activeUsersCount: 0,
		};
	}
}

export default async function AdminPage() {
	const session = await getServerSession(authOptions);

	if (!session || !session.user) {
		return null;
	}

	const stats = await getDashboardStats();

	return <AdminDashboard session={session} stats={stats} />;
}
