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
import { Input } from "@/components/ui/input";
import { Controller } from "react-hook-form";
import { ActionResponse, FileDetail, CategoryListItem } from "./actions"; // Added CategoryListItem
import { Check, ChevronsUpDown } from "lucide-react";
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

// Define the Zod schema based on actions.ts (or import if centralized and exported)
const fileFormSchema = z
  .object({
    file_no: z.string().min(1, { message: "File No is required" }).max(100),
    category: z.string().min(1, { message: "Category is required" }).max(500),
    title: z.string().min(1, { message: "Title is required" }).max(500),
    note: z.string().optional().nullable(),
    doc1: z.any(), // FileList or string
    entry_date: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
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
      message: "A document file is required.",
      path: ["doc1"],
    }
  );

type FileFormValues = z.infer<typeof fileFormSchema>;

interface FileFormProps {
  initialData?: FileDetail | null;
  onSubmitAction: (formData: FormData) => Promise<ActionResponse>;
  submitButtonText?: string;
  categoryListItems: CategoryListItem[]; // New prop for combobox data
}

export default function FileForm({
  initialData,
  onSubmitAction,
  submitButtonText = "Submit",
  categoryListItems, // Destructure new prop
}: FileFormProps) {
  const [fileNoPopoverOpen, setFileNoPopoverOpen] = useState(false);
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

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
    },
  });

  const {
    formState: { isSubmitting },
  } = form;

  async function onSubmit(data: FileFormValues) {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (key === "doc1") {
        if (value instanceof FileList && value.length > 0) {
          formData.append(key, value[0]);
        }
        // If value is a string (existing file), we don't append it,
        // as the backend will only update the file if a new one is provided.
      } else if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    });

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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="file_no"
          render={({ field }) => (
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
                                "mr-2 h-4 w-4 shrink-0", // Added shrink-0
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
          render={({ field }) => (
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
                            (item) => item.category === field.value // Potential issue if categories are not unique, shows first match
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
                        {/* Create a unique list of categories for selection if needed, here using all */}
                        {categoryListItems.map((item) => (
                          <CommandItem
                            value={item.category} // Using category as value, ensure it's unique enough or handle selection carefully
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
                                "mr-2 h-4 w-4 shrink-0", // Added shrink-0
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
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input placeholder="Enter the file title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="doc1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document Upload (Word, Excel) *</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept=".docx,.xlsx,.xls"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
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
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document Content</FormLabel>
              <FormControl>
                <textarea
                  placeholder="The content of the uploaded document will appear here..."
                  className="w-full p-2 border rounded-md min-h-[400px] resize-y"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>
                This content is automatically generated from the uploaded file.
                You can edit it if needed.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="entry_date"
          render={({ field }) => (
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
