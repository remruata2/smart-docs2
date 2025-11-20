import React, { useState, useEffect } from "react";
import Image from "next/image";

interface EvidenceViewerProps {
	imageUrl: string;
	boundingBox?: number[]; // [x, y, w, h] in percentages (0-1) - fallback/default
	pageNumber: number;
	onClose?: () => void;
	layoutItems?: Array<{ text: string; bbox: number[] }>; // Array of layout items for fuzzy matching
	chunkContent?: string; // Chunk content to match against layout items
	title?: string; // File title/name
}

export function EvidenceViewer({
	imageUrl,
	boundingBox,
	pageNumber,
	onClose,
	layoutItems,
	chunkContent,
	title,
}: EvidenceViewerProps) {
	const [imageLoaded, setImageLoaded] = useState(false);

	// Reset loading state when image changes
	useEffect(() => {
		setImageLoaded(false);
	}, [imageUrl]);

	// Helper function to normalize bounding box coordinates
	// Handles both old format (PDF points) and new format (percentages 0-1)
	const normalizeBoundingBox = (
		bbox: number[] | undefined
	): number[] | null => {
		if (!bbox || bbox.length !== 4) return null;

		const [x, y, w, h] = bbox;

		// If any value is > 1, assume it's in PDF points (old format)
		// Convert to percentages using standard A4 dimensions (595×842)
		if (x > 1 || y > 1 || w > 1 || h > 1) {
			const pageWidth = 595;
			const pageHeight = 842;
			return [
				Math.max(0, Math.min(1, x / pageWidth)),
				Math.max(0, Math.min(1, y / pageHeight)),
				Math.max(0, Math.min(1, w / pageWidth)),
				Math.max(0, Math.min(1, h / pageHeight)),
			];
		}

		// Already in percentage format (0-1), return as-is
		return [x, y, w, h];
	};

	// Fuzzy text matching: Find the best matching layout item based on chunk content
	const findBestMatchingBbox = (): number[] | null => {
		// If we have layout items and chunk content, try to find the best match
		if (layoutItems && layoutItems.length > 0 && chunkContent) {
			const chunkLower = chunkContent.toLowerCase().trim();

			// Score each layout item based on text similarity
			let bestMatch: {
				item: { text: string; bbox: number[] };
				score: number;
			} | null = null;

			for (const item of layoutItems) {
				const itemText = item.text.toLowerCase().trim();
				if (!itemText) continue;

				// Calculate similarity score
				let score = 0;

				// Exact match gets highest score
				if (chunkLower.includes(itemText) || itemText.includes(chunkLower)) {
					score += 100;
				}

				// Word overlap scoring
				const chunkWords = chunkLower.split(/\s+/).filter((w) => w.length > 2);
				const itemWords = itemText.split(/\s+/).filter((w) => w.length > 2);
				const commonWords = chunkWords.filter((w) => itemWords.includes(w));
				score += commonWords.length * 10;

				// Substring matching
				const longestCommonSubstring = (str1: string, str2: string): number => {
					let max = 0;
					for (let i = 0; i < str1.length; i++) {
						for (let j = 0; j < str2.length; j++) {
							let k = 0;
							while (
								i + k < str1.length &&
								j + k < str2.length &&
								str1[i + k] === str2[j + k]
							) {
								k++;
							}
							max = Math.max(max, k);
						}
					}
					return max;
				};

				const commonLength = longestCommonSubstring(chunkLower, itemText);
				score += commonLength * 2;

				// Update best match if this score is higher
				if (!bestMatch || score > bestMatch.score) {
					bestMatch = { item, score };
				}
			}

			// If we found a good match (score > 20), use it
			if (bestMatch && bestMatch.score > 20) {
				return normalizeBoundingBox(bestMatch.item.bbox);
			}
		}

		// Fallback to default boundingBox
		return normalizeBoundingBox(boundingBox);
	};

	const normalizedBbox = findBestMatchingBbox();

	return (
		<div className="flex flex-col h-full bg-gray-50 border-l border-gray-200 shadow-xl w-full max-w-2xl">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
				<div className="flex flex-col min-w-0 flex-1">
					<h3 className="font-medium text-gray-900 truncate">
						{title || "Evidence"}
					</h3>
					<p className="text-xs text-gray-500 mt-0.5">Page {pageNumber}</p>
				</div>
				<button
					onClick={onClose}
					className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
					aria-label="Close evidence viewer"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-auto p-4 relative flex justify-center">
				<div className="relative shadow-lg border border-gray-200 bg-white inline-block">
					{!imageLoaded && (
						<div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
						</div>
					)}

					{/* We use a regular img tag for simplicity with dynamic sizing, or Next.js Image if dimensions known */}
					{/* Using Next.js Image with fill requires parent to be relative and have dimensions */}
					{/* For simplicity in this viewer, we'll use a standard img tag to let it size naturally, 
              but we'll wrap it to control max width */}
					<img
						src={imageUrl}
						alt={`Page ${pageNumber}`}
						className="max-w-full h-auto block"
						style={{ maxHeight: "calc(100vh - 150px)" }}
						onLoad={() => setImageLoaded(true)}
					/>

					{/* Highlight Overlay */}
					{imageLoaded &&
						normalizedBbox &&
						(() => {
							// For large highlights (like tables), use lighter opacity to avoid obscuring content
							const isLargeHighlight = normalizedBbox[3] > 0.5; // Height > 50% of page
							const opacity = isLargeHighlight ? 0.15 : 0.3; // Lighter for large blocks
							const borderOpacity = isLargeHighlight ? 0.5 : 1.0;

							return (
								<div
									className="absolute border-2 border-yellow-500 mix-blend-multiply transition-all duration-300"
									style={{
										left: `${normalizedBbox[0] * 100}%`,
										top: `${normalizedBbox[1] * 100}%`,
										width: `${normalizedBbox[2] * 100}%`,
										height: `${normalizedBbox[3] * 100}%`,
										backgroundColor: `rgba(254, 240, 138, ${opacity})`, // yellow-200 with dynamic opacity
										borderColor: `rgba(234, 179, 8, ${borderOpacity})`, // yellow-500 with dynamic opacity
									}}
								>
									<div className="absolute -top-6 left-0 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
										Citation
									</div>
								</div>
							);
						})()}
				</div>
			</div>
		</div>
	);
}
