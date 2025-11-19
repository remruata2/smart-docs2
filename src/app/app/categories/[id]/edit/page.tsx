import { getCategoryById, updateCategoryAction } from "../../actions";
import CategoryForm from "../../CategoryForm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cardContainer } from "@/styles/ui-classes";

interface EditCategoryPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
    const { id } = await params;
    const categoryId = parseInt(id);

    if (isNaN(categoryId)) {
        notFound();
    }

    const category = await getCategoryById(categoryId);

    if (!category) {
        notFound();
    }

    const updateAction = updateCategoryAction.bind(null, categoryId);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <Link
                    href="/app/categories"
                    className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Categories
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">Edit Category</h1>
                <p className="text-gray-600 mt-2">Update category details</p>
            </div>

            <div className={`max-w-2xl ${cardContainer}`}>
                <CategoryForm
                    initialData={category}
                    submitAction={updateAction}
                    buttonText="Update Category"
                />
            </div>
        </div>
    );
}
