import FileForm from "../FileForm";
import { createFileAction, getCategoryListItems } from "../actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cardContainer } from "@/styles/ui-classes";

export default async function NewFilePage() {
    const categoryListItems = await getCategoryListItems();

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <Link
                    href="/app/files"
                    className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Files
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">Upload New File</h1>
                <p className="text-gray-600 mt-2">Upload a document or create content</p>
            </div>

            <div className={`max-w-4xl ${cardContainer}`}>
                <FileForm
                    onSubmitAction={createFileAction}
                    submitButtonText="Upload File"
                    categoryListItems={categoryListItems}
                />
            </div>
        </div>
    );
}
