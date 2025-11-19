import { getFileById, updateFileAction, getCategoryListItems } from "../../actions";
import FileForm from "../../FileForm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cardContainer } from "@/styles/ui-classes";

interface EditFilePageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function EditFilePage({ params }: EditFilePageProps) {
    const { id } = await params;
    const fileId = parseInt(id);

    if (isNaN(fileId)) {
        notFound();
    }

    const [file, categoryListItems] = await Promise.all([
        getFileById(fileId),
        getCategoryListItems(),
    ]);

    if (!file) {
        notFound();
    }

    const updateAction = updateFileAction.bind(null, fileId);

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
                <h1 className="text-3xl font-bold text-gray-900">Edit File</h1>
                <p className="text-gray-600 mt-2">Update file details and content</p>
            </div>

            <div className={`max-w-4xl ${cardContainer}`}>
                <FileForm
                    initialData={file}
                    onSubmitAction={updateAction}
                    submitButtonText="Update File"
                    categoryListItems={categoryListItems}
                />
            </div>
        </div>
    );
}
