/**
 * Client-Side PDF Text Extractor
 * Uses react-pdf (pdfjs) to extract text from PDF files in the browser
 * for quick chapter detection (no server required)
 * react-pdf is designed for React/Next.js applications
 */

export interface PDFPage {
    page: number;
    text: string;
    md: string; // For compatibility with LlamaParse format
}

/**
 * Extract text from a PDF file (client-side)
 * @param file PDF File object
 * @returns Array of pages with extracted text
 */
export async function extractTextFromPDF(file: File): Promise<PDFPage[]> {
    // Ensure this only runs on the client side
    if (typeof window === 'undefined') {
        throw new Error('PDF extraction must run on the client side');
    }

    try {
        // Dynamically import react-pdf to avoid bundling issues
        const { pdfjs } = await import('react-pdf');
        
        // Configure worker using CDN (works reliably with Next.js)
        pdfjs.GlobalWorkerOptions.workerSrc = 
            `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

        // Read file as ArrayBuffer and convert to Uint8Array
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Load PDF document
        const loadingTask = pdfjs.getDocument({ 
            data: uint8Array,
            useSystemFonts: true,
            verbosity: 0, // Suppress warnings
        });
        const pdf = await loadingTask.promise;

        const pages: PDFPage[] = [];
        const totalPages = pdf.numPages;

        // Extract text from each page
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();

            // Combine text items into a single string
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ')
                .trim();

            pages.push({
                page: pageNum,
                text: pageText,
                md: pageText, // Same format for now (no markdown conversion)
            });
        }

        return pages;
    } catch (error) {
        console.error('Error extracting PDF text:', error);
        throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Get PDF metadata (page count, title, etc.)
 * @param file PDF File object
 * @returns PDF metadata
 */
export async function getPDFMetadata(file: File): Promise<{
    pageCount: number;
    title?: string;
    author?: string;
}> {
    // Ensure this only runs on the client side
    if (typeof window === 'undefined') {
        throw new Error('PDF metadata extraction must run on the client side');
    }

    try {
        // Dynamically import react-pdf
        const { pdfjs } = await import('react-pdf');
        
        // Configure worker
        pdfjs.GlobalWorkerOptions.workerSrc = 
            `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Load PDF document
        const loadingTask = pdfjs.getDocument({ 
            data: uint8Array,
            useSystemFonts: true,
            verbosity: 0,
        });
        const pdf = await loadingTask.promise;
        
        // Get metadata
        const metadata = await pdf.getMetadata();
        const info = (metadata?.info || {}) as Record<string, any>;

        return {
            pageCount: pdf.numPages,
            title: info.Title as string | undefined,
            author: info.Author as string | undefined,
        };
    } catch (error) {
        console.error('Error getting PDF metadata:', error);
        throw new Error(`Failed to get PDF metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
