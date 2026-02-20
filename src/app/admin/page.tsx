import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import AdminDashboard from "./AdminDashboard";
import { redirect } from "next/navigation";

export default async function AdminPage() {
	const session = await getServerSession(authOptions);

	if (!session || !session.user) {
		redirect("/login");
	}

	if (session.user.role !== "admin") {
		redirect("/dashboard");
	}

	return <AdminDashboard session={session} />;
}
