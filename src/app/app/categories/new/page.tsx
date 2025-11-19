import CategoryForm from "../CategoryForm";
import { createCategoryAction } from "../actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cardContainer } from "@/styles/ui-classes";

export default function NewCategoryPage() {
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
                <h1 className="text-3xl font-bold text-gray-900">Add New Category</h1>
                <p className="text-gray-600 mt-2">Create a new category for your documents</p>
            </div>

            <div className={`max-w-2xl ${cardContainer}`}>
                <CategoryForm submitAction={createCategoryAction} buttonText="Create Category" />
            </div>
        </div>
    );
}
