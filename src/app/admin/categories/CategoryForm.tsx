"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CategoryList } from "@/generated/prisma";

const formSchema = z.object({
	category: z
		.string()
		.min(1, "Category is required")
		.max(500, "Category must be 500 characters or less"),
});

type CategoryFormValues = z.infer<typeof formSchema>;

interface CategoryFormProps {
	initialData?: CategoryList | null;
	submitAction: (formData: FormData) => Promise<{
		success: boolean;
		error?: string;
		fieldErrors?: Record<string, string[]>;
	}>;
	buttonText?: string;
}

export default function CategoryForm({
	initialData,
	submitAction,
	buttonText = "Save Category",
}: CategoryFormProps) {
	const router = useRouter();
	const form = useForm<CategoryFormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: initialData || {
			category: "",
		},
	});

	const { isSubmitting } = form.formState;

	async function onSubmit(values: CategoryFormValues) {
		const formData = new FormData();
		formData.append("category", values.category);

		const result = await submitAction(formData);

		if (result.success) {
			toast.success(
				initialData
					? "Category updated successfully."
					: "Category created successfully."
			);
			router.push("/admin/categories");
			router.refresh(); // Ensure the list page is refreshed
		} else {
			if (result.fieldErrors) {
				for (const field in result.fieldErrors) {
					const fieldName = field as keyof CategoryFormValues;
					const message = result.fieldErrors[field]?.[0] || "Invalid input";
					form.setError(fieldName, { type: "manual", message });
				}
				toast.error("Please correct the errors in the form.");
			} else {
				toast.error(result.error || "An unexpected error occurred.");
			}
		}
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
				<FormField
					control={form.control}
					name="category"
					render={({ field }: { field: any }) => (
						<FormItem>
							<FormLabel>Category Name</FormLabel>
							<FormControl>
								<Input placeholder="e.g., General Correspondence" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<Button
					type="submit"
					disabled={isSubmitting}
					className="bg-indigo-600 hover:bg-indigo-700 text-white"
				>
					{isSubmitting ? "Saving..." : buttonText}
				</Button>
			</form>
		</Form>
	);
}
