import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    // Redirect legacy /app/chapters/[id] to /app/study/[id]
    redirect(`/app/study/${id}`);
}
