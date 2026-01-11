import os
import shutil
import tempfile
import uvicorn
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from docling.document_converter import DocumentConverter
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("docling_server")

app = FastAPI(title="Docling PDF Parser", description="Local replacement for LlamaParse")

# Allow CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DocumentConverter
# Pre-configure for PDF
pipeline_options = PdfPipelineOptions()
pipeline_options.do_ocr = True
pipeline_options.do_table_structure = True

doc_converter = DocumentConverter(
    format_options={
        InputFormat.PDF: pipeline_options
    }
)

@app.post("/convert")
async def convert_document(file: UploadFile = File(...)):
    """
    Accepts a file upload and returns parsed markdown and layout data.
    Matches the structure expected by the client originally designed for LlamaParse.
    """
    temp_file_path = None
    try:
        logger.info(f"Received conversion request for file: {file.filename}, content_type: {file.content_type}")
        
        # Create a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            shutil.copyfileobj(file.file, tmp)
            temp_file_path = tmp.name

        logger.info(f"Processing file: {file.filename} ({temp_file_path})")

        # Convert the document
        result = doc_converter.convert(temp_file_path)
        doc = result.document

        # Construct the response
        # We need to structure this like LlamaParse's response to maintain compatibility
        # LlamaParse returns: { pages: [{ page: 1, text: "...", md: "...", items: [...] }] }
        
        pages_output = []
        
        # Docling has a hierarchical structure. We need to iterate pages.
        # Note: Docling's page numbers are 1-based.
        
        # Helper to find items on a specific page
        # iterating through doc.texts, doc.tables, etc. is one way, but let's try to group them
        
        # Create a map of items per page
        items_per_page = {}
        
        # Collect text items
        for item in doc.texts:
            for prov in item.prov:
                page_no = prov.page_no
                if page_no not in items_per_page:
                    items_per_page[page_no] = []
                
                # Normalize bbox to [x, y, w, h] (Docling uses [l, b, r, t] or similar, need to check datamodel)
                # Docling bbox is usually [left, bottom, right, top] in PDF coordinates relative to bottom-left?
                # LlamaParse often normalized to top-left origin?
                # For compatibility, let's just pass the raw bbox and let client handle or ignore if unused.
                # Actually, our analysis showed 'chapter ingestion' ignores bbox.
                # 'file-parsing' uses it.
                
                items_per_page[page_no].append({
                    "type": "text",
                    "text": item.text,
                    "value": item.text,
                    "md": item.text, # fallback
                    "bbox": prov.bbox.as_tuple() if prov.bbox else None
                })

        # Collect tables
        for table in doc.tables:
            for prov in table.prov:
                page_no = prov.page_no
                if page_no not in items_per_page:
                    items_per_page[page_no] = []
                
                items_per_page[page_no].append({
                    "type": "table",
                    "text": table.export_to_markdown(), # Rough text rep
                    "md": table.export_to_markdown(),
                    "bbox": prov.bbox.as_tuple() if prov.bbox else None
                })

        # Construct pages list
        # We'll rely on the fact that docling likely processed all pages.
        # However, doc.pages is a dict {page_no: PageInfo}
        
        for page_no, page_info in doc.pages.items():
            # Get markdown for this page specifically?
            # Docling doesn't have a direct "get markdown for page X" method readily exposed on the doc object 
            # without re-serializing.
            # But the client mostly cares about the full text split by pages.
            
            # Simple approximation for "md" field of the page:
            # Join all items on this page.
            page_items = items_per_page.get(page_no, [])
            page_md = "\n\n".join([item.get("md", "") for item in page_items])
            page_text = "\n\n".join([item.get("text", "") for item in page_items])
            
            pages_output.append({
                "page": page_no,
                "text": page_text,
                "md": page_md,
                "width": page_info.size.width,
                "height": page_info.size.height,
                "items": page_items
            })
            
        # If pages_output is empty but we have doc text, fallback
        if not pages_output and doc.export_to_markdown():
             pages_output.append({
                "page": 1,
                "text": doc.export_to_markdown(),
                "md": doc.export_to_markdown(),
                "items": []
            })

        logger.info(f"Successfully processed {len(pages_output)} pages")
        
        return {
            "markdown": doc.export_to_markdown(), # Global markdown
            "pages": pages_output
        }

    except Exception as e:
        logger.error(f"Error converting document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)

if __name__ == "__main__":
    uvicorn.run("docling_server:app", host="0.0.0.0", port=8000, reload=True)
