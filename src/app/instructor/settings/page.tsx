import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { UserRole } from "@/generated/prisma";
import InstructorSettingsForm from "./InstructorSettingsForm";

export default async function InstructorSettingsPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== UserRole.instructor) {
        redirect("/login");
    }

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 font-outfit">Settings</h1>
                <p className="text-gray-500 mt-2">Manage your instructor profile and account details.</p>
            </div>

            <InstructorSettingsForm />
        </div>
    );
}
