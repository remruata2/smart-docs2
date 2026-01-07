import { redirect } from "next/navigation";

// Redirect old dashboard to my-learning
export default function DashboardRedirect() {
    redirect("/my-courses");
}
