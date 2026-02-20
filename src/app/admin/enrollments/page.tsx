import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import EnrollmentsClient from "./EnrollmentsClient";

export const metadata = {
    title: "Enrollments | Admin",
    description: "Manage all course enrollments",
};

export default async function EnrollmentsPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
        redirect("/unauthorized");
    }

    return <EnrollmentsClient />;
}
