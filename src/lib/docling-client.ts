import fs from 'fs';
import FormData from 'form-data';


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
        // 1. Prepare the file for upload
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));

        // 2. Call your local Python microservice
        const response = await fetch('http://127.0.0.1:8000/convert', {
            method: 'POST',
            body: formData as any,
            headers: formData.getHeaders(),
        });

        if (!response.ok) {
            throw new Error(`Conversion failed: ${response.statusText}`);
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
