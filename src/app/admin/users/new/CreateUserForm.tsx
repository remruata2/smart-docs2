"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UserRole } from "@/generated/prisma";
import { Loader2, Save } from "lucide-react"; // ArrowLeft removed as BackButton handles it
import { Button } from "@/components/ui/button";
import { createUserAction } from "../actions"; // Adjusted path to actions.ts
import { toast } from "sonner";
import { cardContainer, pageTitle } from "@/styles/ui-classes";
import BackButton from "@/components/ui/BackButton";

export default function CreateUserForm() {
	// The parent CreateUserPage.tsx now wraps this component in pageContainer
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [formData, setFormData] = useState({
		username: "",
		password: "",
		role: "student" as UserRole,
		is_active: true,
	});

	const router = useRouter();

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
	) => {
		const { name, value, type } = e.target as HTMLInputElement;
		if (type === "checkbox") {
			const checked = (e.target as HTMLInputElement).checked;
			setFormData({ ...formData, [name]: checked });
		} else {
			setFormData({ ...formData, [name]: value });
		}
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);

		if (!formData.username || !formData.password) {
			setError("Username and password are required");
			setLoading(false);
			return;
		}

		const result = await createUserAction(formData);
		setLoading(false);

		if (result.success) {
			toast.success("User created successfully.");
			router.push("/admin/users"); // Redirect to user list
		} else {
			console.error("Failed to create user:", result.error);
			setError(result.error || "Failed to create user. Please try again.");
			toast.error(result.error || "Failed to create user. Please try again.");
		}
	};

	return (
		<div className={`w-full max-w-2xl mx-auto ${cardContainer}`}>
			<div className="flex justify-between items-center mb-6">
				<h1 className={pageTitle}>Create New User</h1>
				<BackButton href="/admin/users" text="Back to Users" />
			</div>

			<form onSubmit={handleSubmit}>
				<div className="px-4 py-5 sm:p-6">
					{error && (
						<div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
							{error}
						</div>
					)}

					<div className="grid grid-cols-1 gap-6">
						<div>
							<label
								htmlFor="username"
								className="block text-sm font-medium text-gray-700"
							>
								Username
							</label>
							<div className="mt-1">
								<input
									type="text"
									name="username"
									id="username"
									value={formData.username}
									onChange={handleInputChange}
									required
									className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full text-base border-gray-300 rounded-md h-8 px-4"
								/>
							</div>
						</div>

						<div>
							<label
								htmlFor="password"
								className="block text-sm font-medium text-gray-700"
							>
								Password
							</label>
							<div className="mt-1">
								<input
									type="password"
									name="password"
									id="password"
									value={formData.password}
									onChange={handleInputChange}
									required
									className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full text-base border-gray-300 rounded-md h-8 px-4"
								/>
							</div>
						</div>

						<div>
							<label
								htmlFor="role"
								className="block text-sm font-medium text-gray-700"
							>
								Role
							</label>
							<div className="mt-1">
								<select
									id="role"
									name="role"
									value={formData.role}
									onChange={handleInputChange}
									className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full text-base border-gray-300 rounded-md h-8 px-4"
								>
									<option value="student">Student</option>
									<option value="instructor">Instructor</option>
									<option value="admin">Admin</option>
									<option value="institution">Institution</option>
								</select>
							</div>
						</div>

						<div className="flex items-center">
							<input
								id="is_active"
								name="is_active"
								type="checkbox"
								checked={formData.is_active}
								onChange={handleInputChange}
								className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
							/>
							<label
								htmlFor="is_active"
								className="ml-2 block text-sm text-gray-900"
							>
								Active
							</label>
						</div>
					</div>
				</div>

				<div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
					{/* Cancel button removed, BackButton is at the top */}
					<Button
						type="submit"
						disabled={loading}
						className="bg-indigo-600 hover:bg-indigo-700 text-white"
					>
						{loading ? (
							<>
								<Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
								Creating...
							</>
						) : (
							<>
								<Save className="-ml-1 mr-2 h-4 w-4" />
								Create User
							</>
						)}
					</Button>
				</div>
			</form>
		</div>
	);
}
