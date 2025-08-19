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
import { Controller } from "react-hook-form";
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
// marked import removed - not used in this component
import { htmlToMarkdown } from "@/lib/markdown/htmlToMarkdown";

// Define the Zod schema based on actions.ts (or import if centralized and exported)
const fileFormSchema = z
  .object({
    file_no: z.string().min(1, { message: "File No is required" }).max(100),
    category: z.string().min(1, { message: "Category is required" }).max(500),
    title: z.string().min(1, { message: "Title is required" }).max(500),
    note: z.string().optional().nullable(),
    doc1: z.any(), // FileList or string
    entry_date: z.string().optional().nullable(),
    content_source: z.enum(["file", "editor"]),
  })
  .refine(
    (data) => {
      // If using the editor, we don't need a file
      if (data.content_source === "editor") {
        return true;
      }

      // If doc1 is a string, it's an existing file path, so it's valid.
      if (typeof data.doc1 === "string" && data.doc1) {
        return true;
      }
      // If it's not a string, it must be a FileList with at least one file.
      if (data.doc1 instanceof FileList && data.doc1.length > 0) {
        return true;
      }
      // In any other case (e.g., empty FileList, null, undefined), it's invalid.
      return false;
    },
    {
      message: "A document file is required when using file upload.",
      path: ["doc1"],
    }
  );

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
  const [fileNoPopoverOpen, setFileNoPopoverOpen] = useState(false);
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [editorContent, setEditorContent] = useState<string>("");

  useEffect(() => {
    setIsClient(true);
  }, []);

  const router = useRouter();
  const form = useForm<FileFormValues>({
    resolver: zodResolver(fileFormSchema),
    defaultValues: {
      file_no: initialData?.file_no || "",
      category: initialData?.category || "",
      title: initialData?.title || "",
      note: initialData?.note || "",
      doc1: initialData?.doc1 || undefined, // Use undefined for new files
      entry_date:
        initialData?.entry_date_real || new Date().toISOString().split("T")[0],
      content_source: "file" as const,
    },
  });

  // Note: we now store Markdown in the form's note field directly in the onChange handler below.

  const {
    formState: { isSubmitting },
  } = form;

  async function onSubmit(values: FileFormValues) {
    const formData = new FormData();

    // Add content source to form data
    formData.append("content_source", values.content_source);

    Object.entries(values).forEach(([key, value]) => {
      if (key === "doc1") {
        // Only append file if using file upload
        if (
          values.content_source === "file" &&
          value instanceof FileList &&
          value.length > 0
        ) {
          formData.append(key, value[0]);
        }
        // If value is a string (existing file), we don't append it,
        // as the backend will only update the file if a new one is provided.
      } else if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    });

    // If using editor, we now store Markdown
    if (values.content_source === "editor") {
      formData.set("content_format", "markdown");
    } else {
      // For file uploads or manual markdown entry, set format as markdown
      formData.set("content_format", "markdown");
    }

    try {
      const result = await onSubmitAction(formData);
      if (result.success) {
        toast.success(result.message || "Operation successful!");
        router.push("/admin/files");
        router.refresh(); // To ensure the list page shows updated data
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
  }

  async function parseDocumentViaApi(
    file: File
  ): Promise<{ content: string; metadata: any; error?: string }> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/parse-document", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    return data;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Content Source Selection */}
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

        <FormField
          control={form.control}
          name="file_no"
          render={({ field }: { field: any }) => (
            <FormItem className="flex flex-col">
              <FormLabel>File No *</FormLabel>
              <Popover
                open={fileNoPopoverOpen}
                onOpenChange={setFileNoPopoverOpen}
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
                            (item) => item.file_no === field.value
                          )?.file_no
                        : "Select File No"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[--radix-popover-trigger-width] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="Search file no..." />
                    <CommandList>
                      <CommandEmpty>No file number found.</CommandEmpty>
                      <CommandGroup>
                        {categoryListItems.map((item) => (
                          <CommandItem
                            value={item.file_no}
                            key={item.id}
                            onSelect={(currentValue: string) => {
                              form.setValue(
                                "file_no",
                                currentValue === field.value
                                  ? ""
                                  : currentValue,
                                { shouldValidate: true, shouldDirty: true }
                              );
                              const linkedItem = categoryListItems.find(
                                (li) => li.file_no === currentValue
                              );
                              if (linkedItem) {
                                form.setValue("category", linkedItem.category, {
                                  shouldValidate: true,
                                  shouldDirty: true,
                                });
                              }
                              setFileNoPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 shrink-0",
                                item.file_no === field.value
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <span className="truncate">{item.file_no}</span>
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
                              const linkedItem = categoryListItems.find(
                                (li) => li.category === currentValue
                              );
                              if (linkedItem) {
                                form.setValue("file_no", linkedItem.file_no, {
                                  shouldValidate: true,
                                  shouldDirty: true,
                                });
                              }
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

        {/* File Upload Tab Content */}
        {form.watch("content_source") === "file" && (
          <>
            <FormField
              control={form.control}
              name="doc1"
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    Document Upload (Word, Excel, PDF) *
                    {isParsing && (
                      <span className="ml-2 flex items-center text-sm text-gray-500">
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Parsing document...
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept=".docx,.xlsx,.xls,.pdf"
                      disabled={isParsing}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Check file size (50MB limit)
                          const maxSize = 50 * 1024 * 1024; // 50MB in bytes
                          if (file.size > maxSize) {
                            toast.error(
                              `File too large. Maximum size is 50MB. Your file is ${(
                                file.size /
                                (1024 * 1024)
                              ).toFixed(2)}MB.`
                            );
                            e.target.value = ""; // Clear the input
                            return;
                          }

                          setIsParsing(true);
                          const result = await parseDocumentViaApi(file);
                          if (result.error) {
                            toast.error(result.error);
                            form.setValue("note", "");
                          } else {
                            form.setValue("note", result.content || "");
                            toast.success("Document parsed successfully!");
                          }
                          form.setValue("doc1", e.target.files, {
                            shouldValidate: true,
                          });
                          setIsParsing(false);
                        }
                      }}
                    />
                  </FormControl>
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
                      className="min-h-[200px] font-mono text-sm"
                      readOnly={isParsing}
                    />
                  </FormControl>
                  <FormDescription>
                    This content is automatically generated from the uploaded
                    file. You can edit it if needed.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {/* TipTap Editor Tab Content */}
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
                          // Keep HTML locally for the editor UI, but store Markdown in the form
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
                    This shows the content that will be saved as markdown. It
                    updates automatically as you edit in the rich text editor
                    above.
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
