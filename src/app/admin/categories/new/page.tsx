import CategoryForm from "../CategoryForm";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { UserRole } from "@/generated/prisma";
import { createCategoryAction } from "../actions";
import { Metadata } from "next";
import { pageContainer, pageTitle, cardContainer } from "@/styles/ui-classes";
import BackButton from "@/components/ui/BackButton";

export const metadata: Metadata = {
	title: "Add New Category",
};

export default async function NewCategoryPage() {
	const session = await getServerSession(authOptions);
	if (
		!session ||
		!session.user ||
		(session.user.role !== UserRole.admin && session.user.role !== UserRole.staff)
	) {
		redirect("/unauthorized");
	}
	return (
		<div className={pageContainer}>
			<div className={`max-w-2xl mx-auto ${cardContainer}`}>
				<div className="flex justify-between items-center mb-6">
					<h1 className={pageTitle}>Add New Category</h1>
					<BackButton href="/admin/categories" text="Back to Categories" />
				</div>
				<CategoryForm
					submitAction={createCategoryAction}
					buttonText="Create Category"
				/>
			</div>
		</div>
	);
}
