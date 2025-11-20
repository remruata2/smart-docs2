import { getFilesPaginated, getFilterOptions } from "./actions";
import FileListClient from "./FileListClient";
import FileProcessingWorker from "@/components/files/FileProcessingWorker";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function FilesPage() {
    const page = 1;
    const pageSize = 50;

    const [filesData, filterOptions] = await Promise.all([
        getFilesPaginated({ page, pageSize }),
        getFilterOptions(),
    ]);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Files</h1>
                    <p className="text-gray-600 mt-2">Manage your documents and files</p>
                </div>
                <Link href="/app/files/new">
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Plus className="mr-2 h-4 w-4" />
                        Upload File
                    </Button>
                </Link>
            </div>

            <FileListClient
                initialItems={filesData.items}
                initialTotal={filesData.total}
                initialPage={filesData.page}
                initialPageSize={filesData.pageSize}
                filterOptions={filterOptions}
                canDelete={true}
            />
            <FileProcessingWorker />
        </div>
    );
}
