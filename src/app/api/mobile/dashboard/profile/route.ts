import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
    console.log(`[DEBUG-MOBILE-PROFILE] Incoming GET request: ${request.url}`);

    try {
        const user = await getMobileUser(request);
        const dbUser = await prisma.user.findUnique({
            where: { id: Number(user.id) },
            select: { id: true, username: true, email: true, image: true, role: true }
        });

        if (!dbUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ user: dbUser });

    } catch (error: any) {
        console.error("[DEBUG-MOBILE-PROFILE] GET ERROR:", error.message);
        return NextResponse.json(
            { error: error.message || "Failed to fetch profile" },
            { status: error.message.includes("token") ? 401 : 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    console.log(`[DEBUG-MOBILE-PROFILE] Incoming PATCH request`);

    try {
        const user = await getMobileUser(request);
        const body = await request.json();

        const updatedUser = await prisma.user.update({
            where: { id: Number(user.id) },
            data: {
                username: body.name || undefined, // Mobile app uses 'name' in updateProfile
                image: body.image || undefined,
            },
            select: { id: true, username: true, email: true, image: true, role: true }
        });

        return NextResponse.json({ user: updatedUser });

    } catch (error: any) {
        console.error("[DEBUG-MOBILE-PROFILE] PATCH ERROR:", error.message);
        return NextResponse.json(
            { error: error.message || "Failed to update profile" },
            { status: error.message.includes("token") ? 401 : 500 }
        );
    }
}
