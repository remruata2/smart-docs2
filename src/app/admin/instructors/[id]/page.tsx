import { getInstructorById } from "../actions";
import InstructorForm from "../InstructorForm";
import { notFound } from "next/navigation";

export default async function EditInstructorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const instructor = await getInstructorById(parseInt(id));

    if (!instructor) {
        notFound();
    }

    return <InstructorForm instructor={instructor} />;
}
