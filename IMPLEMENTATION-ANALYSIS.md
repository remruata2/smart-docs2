# Split-Screen Citation Implementation Analysis

## Executive Summary

Your implementation is **95% correct**, but there is **one critical issue** that will prevent bounding boxes from displaying correctly. The image path logic is actually correct (contrary to the analysis you received).

---

## ✅ What's Working Correctly

### 1. **Frontend (UI) - ✅ Perfect**
- `page.tsx` correctly wraps content in `<SplitScreenProvider>`
- Citation click handler properly extracts and passes citation data:
  ```typescript
  if (source.citation) {
      openCitation({
          pageNumber: source.citation.pageNumber,
          imageUrl: source.citation.imageUrl,
          boundingBox: source.citation.boundingBox,
      });
  }
  ```
- `SplitScreenLayout` component exists and properly renders `EvidenceViewer`
- `EvidenceViewer` component correctly displays images and highlights

### 2. **Image Path Logic - ✅ Correct**
**The analysis you received was incorrect about this.**

**Flow:**
1. `parse-document/route.ts` (line 75): Creates temp folder using timestamp: `public/files/${Date.now()}`
2. `parse-document/route.ts` (line 95): pdftocairo generates `page-1.jpg`, `page-2.jpg`, etc.
3. `parse-document/route.ts` (line 157): Returns `fileId` (timestamp) to client
4. `actions.ts` (line 397): Receives `tempFileId` from formData
5. `actions.ts` (line 404-408): **Moves folder** from `public/files/${tempFileId}` → `public/files/${newFile.id}`
6. `actions.ts` (line 416): Creates `DocumentPage` records with `image_url: /files/${newFile.id}/page-${p.pageNumber}.jpg`
7. `hybrid-search.ts` (line 194): Constructs `imageUrl: /files/${r.id}/page-${r.page_number}.jpg`

**Result:** The image URLs match the actual storage location. ✅

### 3. **Database Schema - ✅ Correct**
- `file_chunks` table has `bbox` column (JSON) for storing coordinates
- `file_chunks` table has `page_number` column
- `document_pages` table stores image URLs correctly

### 4. **Ingestion (Bounding Box Extraction) - ⚠️ Partial**
- `actions.ts` correctly extracts `bBox` from LlamaParse layout items
- Stores bbox as `[x, y, w, h]` array
- **BUT:** Does not convert from PDF points to percentages (see issue below)

---

## ❌ Critical Issue: Bounding Box Coordinate Conversion

### The Problem

**LlamaParse returns bounding boxes in PDF points (absolute coordinates), but your code stores them as-is without conversion.**

**Example:**
- PDF page dimensions: 612 points wide × 792 points tall (8.5" × 11" at 72 DPI)
- LlamaParse bBox: `{ x: 100, y: 200, w: 300, h: 50 }` (absolute points)
- Your code stores: `[100, 200, 300, 50]` (still in points)
- `EvidenceViewer` expects: `[0.163, 0.253, 0.490, 0.063]` (percentages 0-1)

**Result:** The highlight overlay will appear in the wrong position (likely off-screen or at the wrong scale).

### The Fix

You need to convert PDF point coordinates to percentages. However, **LlamaParse doesn't provide page dimensions in the layout items**, so you have two options:

#### Option 1: Use Standard PDF Dimensions (Recommended)
Most PDFs follow standard sizes. Convert assuming common dimensions:

```typescript
// In actions.ts, after extracting bBox
function convertBBoxToPercentages(bbox: { x: number; y: number; w: number; h: number }, pageWidth: number = 612, pageHeight: number = 792): number[] {
    return [
        bbox.x / pageWidth,      // x as percentage
        bbox.y / pageHeight,     // y as percentage
        bbox.w / pageWidth,      // width as percentage
        bbox.h / pageHeight      // height as percentage
    ];
}

// Then in your chunk creation:
if (item.bBox) {
    // Convert from PDF points to percentages (0-1)
    // Standard US Letter: 612×792 points, A4: 595×842 points
    // Use 612×792 as default (most common)
    bbox = convertBBoxToPercentages(item.bBox, 612, 792);
}
```

#### Option 2: Extract Page Dimensions from PDF (More Accurate)
Parse the PDF to get actual page dimensions, then convert:

```typescript
// You'd need to use a PDF library like pdf-lib or pdfjs-dist
// to extract page dimensions, then use those for conversion
```

**Recommendation:** Start with Option 1 (standard dimensions). If you notice misalignment, implement Option 2.

---

## 🔧 Required Changes

### File: `src/app/app/files/actions.ts`

**Location:** Around line 444-450

**Current Code:**
```typescript
if (item.bBox) {
    bbox = [
        item.bBox.x || 0,
        item.bBox.y || 0,
        item.bBox.w || 1,
        item.bBox.h || 1
    ];
}
```

**Fixed Code:**
```typescript
// Helper function to convert PDF points to percentages
function convertBBoxToPercentages(bbox: { x: number; y: number; w: number; h: number }): number[] {
    // Standard US Letter PDF dimensions: 612×792 points (8.5" × 11" at 72 DPI)
    // A4: 595×842 points
    // Default to US Letter (most common)
    const pageWidth = 612;
    const pageHeight = 792;
    
    return [
        Math.max(0, Math.min(1, bbox.x / pageWidth)),      // x (clamped 0-1)
        Math.max(0, Math.min(1, bbox.y / pageHeight)),     // y (clamped 0-1)
        Math.max(0, Math.min(1, bbox.w / pageWidth)),      // width (clamped 0-1)
        Math.max(0, Math.min(1, bbox.h / pageHeight))      // height (clamped 0-1)
    ];
}

// Then in the loop:
if (item.bBox) {
    bbox = convertBBoxToPercentages(item.bBox);
}
```

---

## 📋 Verification Checklist

- [x] Frontend citation click handler works
- [x] SplitScreenContext manages state correctly
- [x] SplitScreenLayout renders EvidenceViewer
- [x] Image URLs match storage paths
- [x] Bounding boxes are extracted from LlamaParse
- [ ] **Bounding boxes are converted to percentages** ← **FIX NEEDED**
- [x] EvidenceViewer displays images
- [x] EvidenceViewer applies highlight overlay

---

## 🧪 Testing Steps

1. **Upload a PDF** with clear text regions
2. **Search for content** that appears in the PDF
3. **Click a citation** in the search results
4. **Verify:**
   - ✅ Image loads correctly
   - ✅ Highlight box appears
   - ⚠️ **Highlight box position matches the cited text** (will fail until fix is applied)

---

## 📝 Additional Notes

### Image File Naming
- pdftocairo generates: `page-1.jpg`, `page-2.jpg`, etc. (1-based)
- Your code uses: `page-${pageNumber}.jpg` where `pageNumber` is 1-based
- **This is correct** ✅

### Bounding Box Format
- **Storage:** `[x, y, w, h]` as percentages (0-1) in JSON
- **Display:** CSS percentages (multiply by 100)
- **Current Issue:** Storing as PDF points instead of percentages

---

## Summary

Your implementation is **very close to perfect**. The only critical issue is the bounding box coordinate conversion. Once you apply the fix above, the split-screen citation feature should work correctly.

**Priority:** High - Without this fix, highlights will not appear in the correct positions.

