"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ActionResponse, FileDetail, CategoryListItem } from "./actions";
import { Check, ChevronsUpDown, FileText, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TiptapEditor from "@/components/ui/TiptapEditor";
import { htmlToMarkdown } from "@/lib/markdown/htmlToMarkdown";

const fileFormSchema = z
    .object({
        category: z.string().max(500).optional(), // Optional - required only for manual entry, or per-file for uploads
        title: z.string().max(500).optional(), // Optional - required only for manual entry
        note: z.string().optional().nullable(),
        doc1: z.any(), // FileList or string
        entry_date: z.string().optional().nullable(),
        content_source: z.enum(["file", "editor"]),
    })
    .superRefine((data, ctx) => {
        // Title and category are required for manual entry
        if (data.content_source === "editor") {
            if (!data.title || data.title.trim().length === 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Title is required for manual entry",
                    path: ["title"],
                });
            }
            if (!data.category || data.category.trim().length === 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Category is required for manual entry",
                    path: ["category"],
                });
            }
        }
        
        // File is required for file upload
        if (data.content_source === "file") {
            if (typeof data.doc1 === "string" && data.doc1) {
                return; // Valid
            }
            if (data.doc1 instanceof FileList && data.doc1.length > 0) {
                return; // Valid
            }
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "A document file is required when using file upload.",
                path: ["doc1"],
            });
        }
    });

type FileFormValues = z.infer<typeof fileFormSchema>;

interface FileFormProps {
    initialData?: FileDetail | null;
    onSubmitAction: (formData: FormData) => Promise<ActionResponse>;
    submitButtonText?: string;
    categoryListItems: CategoryListItem[];
}

export default function FileForm({
    initialData,
    onSubmitAction,
    submitButtonText = "Submit",
    categoryListItems,
}: FileFormProps) {

    const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
    const [editorContent, setEditorContent] = useState<string>("");
    const [uploadingFiles, setUploadingFiles] = useState<Array<{ file: File; status: 'pending' | 'uploading' | 'success' | 'error'; error?: string }>>([]);
    const [fileTitles, setFileTitles] = useState<Record<string, string>>({});
    const [fileCategories, setFileCategories] = useState<Record<string, string>>({});
    const [usageLimit, setUsageLimit] = useState<{ current: number; limit: number; allowed: boolean } | null>(null);

    const router = useRouter();
    const form = useForm<FileFormValues>({
        resolver: zodResolver(fileFormSchema),
        defaultValues: {
            category: initialData?.category || "",
            title: initialData?.title || "",
            note: initialData?.note || "",
            doc1: initialData?.doc1 || undefined,
            entry_date:
                initialData?.entry_date_real || new Date().toISOString().split("T")[0],
            content_source: "file" as const,
        },
    });

    const {
        formState: { isSubmitting },
    } = form;

    // Fetch usage limits on mount
    useEffect(() => {
        async function fetchUsageLimits() {
            try {
                const response = await fetch("/api/usage-limits?type=file_upload");
                if (response.ok) {
                    const data = await response.json();
                    setUsageLimit({
                        current: data.currentUsage || 0,
                        limit: data.limit || 0,
                        allowed: data.allowed !== false,
                    });
                }
            } catch (error) {
                console.error("Failed to fetch usage limits:", error);
            }
        }
        fetchUsageLimits();
    }, []);

    async function onSubmit(values: FileFormValues) {
        if (values.content_source === "editor") {
            // Manual entry - single record
            const formData = new FormData();
            formData.append("content_source", values.content_source);
            formData.append("content_format", "markdown");

            Object.entries(values).forEach(([key, value]) => {
                if (key !== "doc1" && key !== "content_source" && value !== null && value !== undefined) {
                    formData.append(key, String(value));
                }
            });

            try {
                const result = await onSubmitAction(formData);
                if (result.success) {
                    toast.success(result.message || "Operation successful!");
                    router.push("/app/files");
                    router.refresh();
                } else {
                    toast.error(result.error || "An error occurred.");
                    if (result.fieldErrors) {
                        Object.entries(result.fieldErrors).forEach(([field, errors]) => {
                            if (errors && errors.length > 0) {
                                form.setError(field as keyof FileFormValues, {
                                    type: "manual",
                                    message: errors.join(", "),
                                });
                            }
                        });
                    }
                }
            } catch (error) {
                toast.error("An unexpected error occurred. Please try again.");
                console.error("Form submission error:", error);
            }
        } else {
            // File upload - handle multiple files
            const files = values.doc1 instanceof FileList ? Array.from(values.doc1) : [];
            
            if (files.length === 0) {
                toast.error("Please select at least one file to upload.");
                return;
            }

            // Check usage limits before upload
            if (usageLimit && !usageLimit.allowed) {
                toast.error(`You have reached your file upload limit of ${usageLimit.limit}. Please upgrade your plan.`);
                return;
            }

            // Check if user has enough remaining uploads for all files
            if (usageLimit && usageLimit.limit !== -1) {
                const remaining = usageLimit.limit - usageLimit.current;
                if (files.length > remaining) {
                    toast.error(`You can only upload ${remaining} more file(s) this month. Please select fewer files or upgrade your plan.`);
                    return;
                }
            }

            // Initialize upload tracking
            setUploadingFiles(files.map(file => ({ file, status: 'pending' as const })));

            let successCount = 0;
            let errorCount = 0;

            // Upload each file separately
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                
                // Update status to uploading
                setUploadingFiles(prev => {
                    const updated = [...prev];
                    updated[i] = { ...updated[i], status: 'uploading' };
                    return updated;
                });

                try {
                    const formData = new FormData();
                    formData.append("content_source", "file");
                    formData.append("content_format", "markdown");
                    
                    // Get title and category from state, fallback to filename
                    const fileId = `${file.name}-${file.size}-${file.lastModified}`;
                    const fileTitle = fileTitles[fileId]?.trim() || file.name.replace(/\.[^/.]+$/, "");
                    const fileCategory = fileCategories[fileId]?.trim() || "";
                    
                    // Validate category is provided
                    if (!fileCategory) {
                        errorCount++;
                        setUploadingFiles(prev => {
                            const updated = [...prev];
                            updated[i] = { ...updated[i], status: 'error', error: 'Category is required' };
                            return updated;
                        });
                        continue;
                    }
                    
                    formData.append("title", fileTitle);
                    formData.append("category", fileCategory);
                    if (values.note) formData.append("note", values.note);
                    if (values.entry_date) formData.append("entry_date", values.entry_date);
                    formData.append("doc1", file);

                    const result = await onSubmitAction(formData);
                    
                    if (result.success) {
                        successCount++;
                        setUploadingFiles(prev => {
                            const updated = [...prev];
                            updated[i] = { ...updated[i], status: 'success' };
                            return updated;
                        });
                    } else {
                        errorCount++;
                        setUploadingFiles(prev => {
                            const updated = [...prev];
                            updated[i] = { ...updated[i], status: 'error', error: result.error };
                            return updated;
                        });
                    }
                } catch (error) {
                    errorCount++;
                    const errorMessage = error instanceof Error ? error.message : "Unknown error";
                    setUploadingFiles(prev => {
                        const updated = [...prev];
                        updated[i] = { ...updated[i], status: 'error', error: errorMessage };
                        return updated;
                    });
                }
            }

            // Show summary
            if (successCount > 0) {
                toast.success(`Successfully uploaded ${successCount} file(s). Parsing will happen in the background.`);
            }
            if (errorCount > 0) {
                toast.error(`Failed to upload ${errorCount} file(s).`);
            }

            // Navigate to files page after a short delay
            if (successCount > 0) {
                // Refresh usage limits after successful upload
                try {
                    const response = await fetch("/api/usage-limits?type=file_upload");
                    if (response.ok) {
                        const data = await response.json();
                        setUsageLimit({
                            current: data.currentUsage || 0,
                            limit: data.limit || 0,
                            allowed: data.allowed !== false,
                        });
                    }
                } catch (error) {
                    console.error("Failed to refresh usage limits:", error);
                }

                setTimeout(() => {
                    router.push("/app/files");
                    router.refresh();
                }, 1000);
            }
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="content_source"
                    render={({ field }: { field: any }) => (
                        <FormItem>
                            <FormLabel>Content Source</FormLabel>
                            <FormControl>
                                <Tabs
                                    defaultValue="file"
                                    className="w-full"
                                    value={field.value}
                                    onValueChange={(value) => {
                                        field.onChange(value as "file" | "editor");
                                    }}
                                >
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger
                                            value="file"
                                            className="flex items-center gap-2"
                                        >
                                            <FileText className="h-4 w-4" /> File Upload
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="editor"
                                            className="flex items-center gap-2"
                                        >
                                            <Edit className="h-4 w-4" /> Manual Entry
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </FormControl>
                            <FormDescription>
                                Choose whether to upload a document file or manually create
                                content using the editor.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Category field only shown for manual entry */}
                {form.watch("content_source") === "editor" && (
                    <FormField
                        control={form.control}
                        name="category"
                        render={({ field }: { field: any }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Category *</FormLabel>
                                <Popover
                                    open={categoryPopoverOpen}
                                    onOpenChange={setCategoryPopoverOpen}
                                >
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className={cn(
                                                    "w-full justify-between",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value
                                                    ? categoryListItems.find(
                                                        (item) => item.category === field.value
                                                    )?.category
                                                    : "Select Category"}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="w-[--radix-popover-trigger-width] p-0"
                                        align="start"
                                    >
                                        <Command>
                                            <CommandInput placeholder="Search category..." />
                                            <CommandList>
                                                <CommandEmpty>No category found.</CommandEmpty>
                                                <CommandGroup>
                                                    {categoryListItems.map((item) => (
                                                        <CommandItem
                                                            value={item.category}
                                                            key={`${item.id}-cat-${item.category}`}
                                                            onSelect={(currentValue: string) => {
                                                                form.setValue(
                                                                    "category",
                                                                    currentValue === field.value
                                                                        ? ""
                                                                        : currentValue,
                                                                    { shouldValidate: true, shouldDirty: true }
                                                                );
                                                                setCategoryPopoverOpen(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4 shrink-0",
                                                                    item.category === field.value
                                                                        ? "opacity-100"
                                                                        : "opacity-0"
                                                                )}
                                                            />
                                                            <span className="truncate">{item.category}</span>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                {/* Title field only shown for manual entry */}
                {form.watch("content_source") === "editor" && (
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }: { field: any }) => (
                            <FormItem>
                                <FormLabel>Title *</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter the file title" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}


                {form.watch("content_source") === "file" && (
                    <>
                        <FormField
                            control={form.control}
                            name="doc1"
                            render={({ field }: { field: any }) => (
                                <FormItem>
                                    <FormLabel>
                                        Document Upload (Word, Excel, PDF) *
                                        {uploadingFiles.length > 0 && (
                                            <span className="ml-2 text-sm text-muted-foreground">
                                                ({uploadingFiles.filter(f => f.status === 'success').length}/{uploadingFiles.length} uploaded)
                                            </span>
                                        )}
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="file"
                                            accept=".docx,.xlsx,.xls,.pdf"
                                            multiple
                                            onChange={(e) => {
                                                const files = e.target.files;
                                                if (files && files.length > 0) {
                                                    // Check file count limit (5 files max)
                                                    if (files.length > 5) {
                                                        toast.error("Maximum 5 files allowed per upload");
                                                        e.target.value = "";
                                                        return;
                                                    }

                                                    // Check file sizes
                                                    const maxSize = 50 * 1024 * 1024;
                                                    const oversizedFiles = Array.from(files).filter(f => f.size > maxSize);
                                                    if (oversizedFiles.length > 0) {
                                                        toast.error(
                                                            `${oversizedFiles.length} file(s) too large. Maximum size is 50MB.`
                                                        );
                                                        e.target.value = "";
                                                        return;
                                                    }

                                                    field.onChange(files);
                                                    
                                                    // Initialize upload tracking
                                                    setUploadingFiles(Array.from(files).map(file => ({ file, status: 'pending' as const })));
                                                    
                                                    // Initialize file titles and categories (default to filename without extension, empty category)
                                                    const titles: Record<string, string> = {};
                                                    const categories: Record<string, string> = {};
                                                    Array.from(files).forEach(file => {
                                                        const fileId = `${file.name}-${file.size}-${file.lastModified}`;
                                                        titles[fileId] = file.name.replace(/\.[^/.]+$/, "");
                                                        categories[fileId] = ""; // Empty category, user must select
                                                    });
                                                    setFileTitles(titles);
                                                    setFileCategories(categories);
                                                } else {
                                                    field.onChange(null);
                                                    setUploadingFiles([]);
                                                    setFileTitles({});
                                                    setFileCategories({});
                                                }
                                            }}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Upload up to 5 document files. Files will be parsed in the background after upload.
                                    </FormDescription>
                                    {form.watch("doc1") && form.watch("doc1") instanceof FileList && Array.from(form.watch("doc1")).length > 0 && (
                                        <div className="mt-4 space-y-3">
                                            <FormLabel>Files to Upload</FormLabel>
                                            {Array.from(form.watch("doc1") || []).map((file: unknown) => {
                                                if (!(file instanceof File)) return null;
                                                const fileId = `${file.name}-${file.size}-${file.lastModified}`;
                                                return (
                                                    <div key={fileId} className="p-3 border rounded-md bg-gray-50 space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium truncate">{file.name}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="text-xs text-muted-foreground mb-1 block">Title (optional)</label>
                                                                <Input
                                                                    placeholder="Enter title"
                                                                    value={fileTitles[fileId] || ""}
                                                                    onChange={(e) => {
                                                                        setFileTitles(prev => ({
                                                                            ...prev,
                                                                            [fileId]: e.target.value
                                                                        }));
                                                                    }}
                                                                    className="text-sm"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-xs text-muted-foreground mb-1 block">Category *</label>
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <Button
                                                                            variant="outline"
                                                                            role="combobox"
                                                                            className="w-full justify-between text-sm h-9"
                                                                        >
                                                                            {fileCategories[fileId] && categoryListItems.find(
                                                                                (item) => item.category === fileCategories[fileId]
                                                                            )?.category || "Select Category"}
                                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                                                        <Command>
                                                                            <CommandInput placeholder="Search category..." />
                                                                            <CommandList>
                                                                                <CommandEmpty>No category found.</CommandEmpty>
                                                                                <CommandGroup>
                                                                                    {categoryListItems.map((item) => (
                                                                                        <CommandItem
                                                                                            value={item.category}
                                                                                            key={`${item.id}-cat-${item.category}-${fileId}`}
                                                                                            onSelect={(currentValue: string) => {
                                                                                                setFileCategories(prev => ({
                                                                                                    ...prev,
                                                                                                    [fileId]: currentValue === fileCategories[fileId] ? "" : currentValue
                                                                                                }));
                                                                                            }}
                                                                                        >
                                                                                            <Check
                                                                                                className={cn(
                                                                                                    "mr-2 h-4 w-4 shrink-0",
                                                                                                    item.category === fileCategories[fileId]
                                                                                                        ? "opacity-100"
                                                                                                        : "opacity-0"
                                                                                                )}
                                                                                            />
                                                                                            <span className="truncate">{item.category}</span>
                                                                                        </CommandItem>
                                                                                    ))}
                                                                                </CommandGroup>
                                                                            </CommandList>
                                                                        </Command>
                                                                    </PopoverContent>
                                                                </Popover>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {usageLimit && (
                                        <div className="mt-2 text-sm">
                                            <span className={usageLimit.allowed ? "text-muted-foreground" : "text-red-600 font-medium"}>
                                                {usageLimit.limit === -1 
                                                    ? "Unlimited uploads"
                                                    : `${Math.max(0, usageLimit.limit - usageLimit.current)}/${usageLimit.limit} files remaining this month`
                                                }
                                            </span>
                                        </div>
                                    )}
                                    {initialData?.doc1 && (
                                        <FormDescription>
                                            Current file:{" "}
                                            <a
                                                href={initialData.doc1}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-indigo-600 hover:underline"
                                            >
                                                {initialData.doc1.split("/").pop()}
                                            </a>
                                            . Uploading a new file will replace it.
                                        </FormDescription>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </>
                )}

                {form.watch("content_source") === "editor" && (
                    <>
                        <FormField
                            control={form.control}
                            name="note"
                            render={({ field }: { field: any }) => (
                                <FormItem>
                                    <FormLabel>Create Content</FormLabel>
                                    <FormControl>
                                        <div className="border rounded-md">
                                            <TiptapEditor
                                                initialHtml={editorContent || ""}
                                                onChange={(html: string) => {
                                                    setEditorContent(html);
                                                    const markdown = htmlToMarkdown(html);
                                                    field.onChange(markdown);
                                                }}
                                                editable={true}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormDescription>
                                        Create your content using the rich text editor above.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="note"
                            render={({ field }: { field: any }) => (
                                <FormItem>
                                    <FormLabel>Document Content</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            value={field.value || ""}
                                            className="min-h-[200px] font-mono text-sm mt-2"
                                            readOnly
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        This shows the content that will be saved as markdown.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </>
                )}

                <FormField
                    control={form.control}
                    name="entry_date"
                    render={({ field }: { field: any }) => (
                        <FormItem>
                            <FormLabel>Entry Date</FormLabel>
                            <FormControl>
                                <Input
                                    type="date"
                                    {...field}
                                    value={field.value || ""}
                                    className="w-auto"
                                />
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
                    {isSubmitting ? "Submitting..." : submitButtonText}
                </Button>
            </form>
        </Form>
    );
}
