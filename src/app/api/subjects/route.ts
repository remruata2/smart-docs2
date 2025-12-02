import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const subjects = await prisma.subject.findMany({
            where: { is_active: true },
            orderBy: { name: 'asc' }
        });

        // Serialize BigInt if necessary (though Subject usually uses Int id)
        const serializedSubjects = subjects.map(s => ({
            ...s,
            id: s.id.toString()
        }));

        return NextResponse.json({ subjects: serializedSubjects });
    } catch (error) {
        console.error("Error fetching subjects:", error);
        return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 });
    }
}
