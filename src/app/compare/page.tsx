import { prisma } from "@/lib/prisma";
import CompareClientPage from "@/components/compare/CompareClientPage";

export const dynamic = "force-dynamic";

export default async function ComparePage() {
    // Fetch files that have content (note is not null)
    const files = await prisma.fileList.findMany({
        where: {
            note: {
                not: null
            }
        },
        select: {
            id: true,
            title: true,
            category: true,
            entry_date: true
        },
        orderBy: {
            created_at: "desc"
        }
    });

    return <CompareClientPage files={files} />;
}
