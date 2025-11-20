from fastapi import FastAPI, UploadFile, File, HTTPException
from docling.document_converter import DocumentConverter
from docling_core.types.io import DocumentStream
from io import BytesIO
import uvicorn

app = FastAPI()
# Initialize converter once at startup
converter = DocumentConverter()

@app.post("/convert")
async def convert_document(file: UploadFile = File(...)):
    try:
        # 1. Read file bytes into memory
        file_content = await file.read()
        
        # 2. Wrap bytes in a stream object that Docling accepts
        doc_stream = DocumentStream(name=file.filename, stream=BytesIO(file_content))
        
        # 3. Convert directly using the stream (API changed - no DocumentConversionInput needed)
        result = converter.convert(doc_stream)
        
        # 4. Export to Markdown
        markdown_output = result.document.export_to_markdown()
        
        return {"filename": file.filename, "markdown": markdown_output}

    except Exception as e:
        print(f"Error converting document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Run on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
