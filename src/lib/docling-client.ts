import fs from 'fs';
import FormData from 'form-data';


export async function convertFileWithDocling(filePath: string): Promise<string | null> {
    try {
        // 1. Prepare the file for upload
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));

        // 2. Call your local Python microservice
        // Note: We use 'any' for headers because of type mismatch between form-data and node-fetch versions in some environments
        // but generally formData.getHeaders() works.
        const response = await fetch('http://localhost:8000/convert', {
            method: 'POST',
            body: formData as any,
            headers: formData.getHeaders(),
        });

        if (!response.ok) {
            throw new Error(`Conversion failed: ${response.statusText}`);
        }

        // 3. Get the Markdown result
        const data = await response.json() as { markdown: string };
        return data.markdown;

    } catch (error) {
        console.error("Docling conversion error:", error);
        return null;
    }
}
