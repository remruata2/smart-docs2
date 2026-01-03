"use client";

import { useState, useRef } from "react";
import { uploadImageAction } from "@/app/actions/upload-actions";
import { toast } from "sonner";
import { Loader2, Upload, X, ImageIcon } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";

interface ImageUploadProps {
    value?: string;
    onChange: (url: string) => void;
    label?: string;
    description?: string;
    className?: string;
}

export function ImageUpload({ value, onChange, label, description, className }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Visual feedback immediately
        setUploading(true);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const result = await uploadImageAction(formData);
            if (result.success && result.url) {
                onChange(result.url);
                toast.success("Image uploaded successfully");
            } else {
                toast.error(result.error || "Failed to upload image");
            }
        } catch (error) {
            console.error("[IMAGE-UPLOAD] Error:", error);
            toast.error("An unexpected error occurred during upload");
        } finally {
            setUploading(false);
            // Reset input so the same file can be selected again if needed
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const removeImage = () => {
        onChange("");
    };

    return (
        <div className={`space-y-2 ${className}`}>
            {label && <Label className="text-sm font-medium text-gray-700">{label}</Label>}

            <div className="flex flex-col gap-4">
                {value ? (
                    <div className="relative w-full aspect-video sm:w-48 sm:h-48 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                        <img
                            src={value}
                            alt="Profile preview"
                            className="w-full h-full object-cover"
                        />
                        <button
                            type="button"
                            onClick={removeImage}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-sm"
                            title="Remove image"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full aspect-video sm:w-48 sm:h-48 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-all group"
                    >
                        <div className="flex flex-col items-center gap-2 text-gray-500 group-hover:text-indigo-600">
                            <ImageIcon className="w-8 h-8" />
                            <span className="text-sm font-medium">Click to upload</span>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                        disabled={uploading}
                    />

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploading}
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2"
                        >
                            {uploading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Upload className="w-4 h-4" />
                            )}
                            {uploading ? "Uploading..." : value ? "Change Image" : "Upload Image"}
                        </Button>

                        {value && (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                Image ready
                            </span>
                        )}
                    </div>

                    {description && <p className="text-xs text-gray-500">{description}</p>}
                </div>
            </div>
        </div>
    );
}
