import { notFound } from "next/navigation";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import CategoryForm from "../../CategoryForm";
import { getCategoryById, updateCategoryAction } from "../../actions";
import { Metadata } from "next";
import { pageContainer, pageTitle, cardContainer } from "@/styles/ui-classes";
import BackButton from '@/components/ui/BackButton';

export async function generateMetadata({
	params,
}: {
	params: Promise<{ id: string }>;
}): Promise<Metadata> {
	const { id: paramId } = await params;
	const id = parseInt(paramId, 10);
	if (isNaN(id)) {
		return { title: "Category Not Found" };
	}
	const category = await getCategoryById(id);
	return {
		title: category
			? `Edit Category: ${category.category}`
			: "Category Not Found",
	};
}

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
	const { id: paramId } = await params;
	const id = parseInt(paramId, 10);

	if (isNaN(id)) {
		notFound();
	}

	const category = await getCategoryById(id);

	if (!category) {
		notFound();
	}

	// Bind the id to the updateCategoryAction
	const updateActionWithId = updateCategoryAction.bind(null, id);

	return (
		<div className={pageContainer}>
			<div className={`max-w-2xl mx-auto ${cardContainer}`}>
				<div className="flex justify-between items-center mb-6">
					<h1 className={pageTitle}>
						Edit Category:{" "}
						<span className="font-normal">{category.category}</span>
					</h1>
					<BackButton href="/admin/categories" text="Back to Categories" />
				</div>
				<CategoryForm
					initialData={category}
					submitAction={updateActionWithId}
					buttonText="Update Category"
				/>
			</div>
		</div>
	);
}
