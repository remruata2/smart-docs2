import { getEligibleUsers } from "../actions";
import InstructorForm from "../InstructorForm";

export default async function NewInstructorPage() {
    const eligibleUsers = await getEligibleUsers();

    return <InstructorForm eligibleUsers={eligibleUsers} />;
}
