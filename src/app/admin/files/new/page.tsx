import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { UserRole } from "@/generated/prisma";
import NewFileForm from "../NewFileForm";
import { getCategoryListItems } from "../actions";
import BackButton from "@/components/ui/BackButton";
import { pageContainer, pageTitle, cardContainer } from "@/styles/ui-classes";

export default async function NewFilePage() {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !session.user ||
    (session.user.role !== UserRole.admin && session.user.role !== UserRole.staff)
  ) {
    redirect("/unauthorized");
  }

  const categoryListItems = await getCategoryListItems();

  return (
    <div className={pageContainer}>
      <div className="flex justify-between items-center mb-6">
        <h1 className={pageTitle}>Create New File</h1>
        <BackButton href="/admin/files" />
      </div>
      <div className={cardContainer}>
        <NewFileForm categoryListItems={categoryListItems} />
      </div>
    </div>
  );
}
