import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ fileId: string; pageNumber: string }> }
) {
    const { fileId, pageNumber } = await params;

    const id = parseInt(fileId);
    const page = parseInt(pageNumber);

    if (isNaN(id) || isNaN(page)) {
        return new NextResponse("Invalid ID or Page Number", { status: 400 });
    }

    const documentPage = await prisma.documentPage.findFirst({
        where: {
            file_id: id,
            page_number: page
        },
        select: {
            image_url: true
        }
    });

    if (!documentPage || !documentPage.image_url) {
        return new NextResponse("Page not found", { status: 404 });
    }

    // Redirect to the actual image URL (e.g., /files/123/page_1.jpg)
    return NextResponse.redirect(new URL(documentPage.image_url, request.url));
}
