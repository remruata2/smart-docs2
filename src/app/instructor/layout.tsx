import InstructorLayoutClient from "./InstructorLayoutClient";

export default function InstructorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <InstructorLayoutClient>{children}</InstructorLayoutClient>;
}
