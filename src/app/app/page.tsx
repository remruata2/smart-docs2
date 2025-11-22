import { redirect } from "next/navigation";

export default async function AppRootPage() {
	redirect("/app/dashboard");
}
