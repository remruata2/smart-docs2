"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Client component that polls the background processing API
 * to process pending files. Only runs when component is mounted.
 *
 * Also dispatches a custom event when files are processed to trigger
 * UI updates in FileListClient.
 */
export default function FileProcessingWorker() {
	const intervalRef = useRef<NodeJS.Timeout | null>(null);
	const processedFilesRef = useRef<Set<number>>(new Set());
	const isProcessingRef = useRef<boolean>(false);

	useEffect(() => {
		// Poll every 30 seconds for pending files (fallback when idle)
		const pollInterval = 30000; // 30 seconds

		const processFiles = async () => {
			// Prevent concurrent processing
			if (isProcessingRef.current) {
				return;
			}

			isProcessingRef.current = true;
			try {
				const response = await fetch("/api/process-file?limit=1", {
					method: "POST",
				});

				if (!response.ok) {
					console.error(
						"[FileProcessingWorker] Failed to process files:",
						response.statusText
					);
					return;
				}

				const data = await response.json();

				if (data.success && data.results && data.results.length > 0) {
					let hasNewFile = false;

					// Check for newly completed files
					for (const result of data.results) {
						if (
							result.success &&
							!processedFilesRef.current.has(result.fileId)
						) {
							hasNewFile = true;
							processedFilesRef.current.add(result.fileId);
							// Show toast notification
							toast.success(`File processing completed!`, {
								description: `File ID ${result.fileId} is now searchable.`,
							});
							// Dispatch custom event to trigger file list refresh
							window.dispatchEvent(
								new CustomEvent("fileProcessingComplete", {
									detail: { fileId: result.fileId },
								})
							);
						} else if (
							!result.success &&
							!processedFilesRef.current.has(result.fileId)
						) {
							hasNewFile = true;
							processedFilesRef.current.add(result.fileId);
							// Show error notification
							toast.error(`File processing failed`, {
								description: `File ID ${result.fileId}: ${
									result.error || "Unknown error"
								}`,
							});
							// Dispatch custom event to trigger file list refresh
							window.dispatchEvent(
								new CustomEvent("fileProcessingFailed", {
									detail: { fileId: result.fileId },
								})
							);
						}
					}

					// If a file was just processed, immediately check for more
					// This eliminates the waiting gap between files
					if (hasNewFile && data.processed > 0) {
						// Small delay to allow database to update, then process next file
						setTimeout(() => {
							isProcessingRef.current = false;
							processFiles();
						}, 500); // 500ms delay to ensure DB state is updated
						return; // Don't reset isProcessingRef here, it will be reset in setTimeout
					}
				}
			} catch (error) {
				console.error("[FileProcessingWorker] Error processing files:", error);
				// Don't show error toast - this is background operation
			} finally {
				isProcessingRef.current = false;
			}
		};

		// Process immediately on mount, then set up interval
		processFiles();
		intervalRef.current = setInterval(processFiles, pollInterval);

		// Cleanup on unmount
		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, []);

	// This component doesn't render anything
	return null;
}
