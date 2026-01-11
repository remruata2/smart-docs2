```typescript
import fs from 'fs';
import path from 'path';

export interface DoclingPage {
    page: number;
    text: string;
    md: string;
    width?: number;
    height?: number;
    items?: any[];
}

export async function convertFileWithDocling(filePath: string): Promise<DoclingPage[]> {
    try {
        // 1. Prepare the file for upload using standard FormData and Blob
        // This is much more reliable with global fetch than the legacy form-data package
        const fileBuffer = fs.readFileSync(filePath);
        const fileName = path.basename(filePath);
        const blob = new Blob([fileBuffer], { type: 'application/pdf' });
        
        const formData = new FormData();
        formData.append('file', blob, fileName);

        // 2. Call your local Python microservice
        // IMPORTANT: We do NOT set headers manually. Fetch will automatically set 
        // the multipart Content-Type with the correct boundary.
        const response = await fetch('http://127.0.0.1:8000/convert', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Conversion failed: ${ response.statusText } (${ errorText })`);
        }

        // 3. Get the structured result
        const data = await response.json() as { markdown: string; pages: DoclingPage[] };

        // Return pages array to match LlamaParse behavior
        return data.pages || [];

    } catch (error) {
        console.error("Docling conversion error:", error);
        throw error; // Throw so the caller knows it failed
    }
}
