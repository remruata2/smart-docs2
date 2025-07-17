# CID-AI Application Upgrade Plan 🚀

## Overview

This document outlines the comprehensive upgrade plan for the CID-AI application to implement:

1. **Document Upload & Parsing**: Replace manual text entry with Word/Excel/PDF document upload
2. **Markdown Storage**: Convert from HTML to Markdown format in the `note` column
3. **Hybrid Search**: Implement semantic vector search combined with existing tsvector approach
4. **Enhanced AI Processing**: Read directly from `note` column, remove dependency on `note_plain_text`

---

## 📋 Current State Analysis

### ✅ **Existing Infrastructure (Working)**
- File upload functionality (`doc1` field)
- TiptapEditor for rich text editing (HTML format)
- PostgreSQL with tsvector search (already implemented)
- `note_plain_text` field for AI processing
- Modern tech stack (Next.js, Prisma, TypeScript)

### ⚠️ **Areas for Improvement**
- Manual copy-paste into text editor
- HTML format storage
- Only using tsvector search
- AI reading from `note_plain_text` instead of main `note` column

---

## 🎯 Feasibility Assessment: **HIGHLY FEASIBLE** ✅

Your current application architecture is perfectly positioned for this upgrade because:

1. **✅ File Upload**: Already exists with `doc1` field and working implementation
2. **✅ Rich Text Editor**: TiptapEditor can be replaced with MarkdownEditor
3. **✅ PostgreSQL**: Perfect database for both tsvector and pgvector
4. **✅ Search Infrastructure**: tsvector already implemented and working
5. **✅ Modern Stack**: Next.js, Prisma, TypeScript all support required libraries

---

## 🗂️ Implementation Phases

## **Phase 1: Document Parsing & Markdown Conversion**

### 1.1 Install Required Dependencies

```bash
npm install mammoth docx-parser xlsx pdf-parse marked
npm install --save-dev @types/marked
npm install @xenova/transformers
```

### 1.2 Create Document Parser Service

**File: `src/lib/document-parser.ts`**

```typescript
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import * as pdf from 'pdf-parse';
import { marked } from 'marked';

export interface ParsedDocument {
  content: string;
  metadata: {
    title?: string;
    author?: string;
    pages?: number;
    wordCount?: number;
    sheets?: number;
  };
}

export class DocumentParser {
  static async parseWordDocument(buffer: Buffer): Promise<ParsedDocument> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const content = result.value;
      
      return {
        content: this.convertToMarkdown(content),
        metadata: {
          wordCount: content.split(/\s+/).length,
        }
      };
    } catch (error) {
      throw new Error(`Failed to parse Word document: ${error.message}`);
    }
  }

  static async parseExcelDocument(buffer: Buffer): Promise<ParsedDocument> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetNames = workbook.SheetNames;
      let content = '';

      for (const sheetName of sheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        content += `## ${sheetName}\n\n`;
        if (jsonData.length > 0) {
          content += '| ' + jsonData[0].join(' | ') + ' |\n';
          content += '| ' + jsonData[0].map(() => '---').join(' | ') + ' |\n';
          
          for (let i = 1; i < jsonData.length; i++) {
            content += '| ' + jsonData[i].join(' | ') + ' |\n';
          }
        }
        content += '\n';
      }

      return {
        content: content,
        metadata: {
          sheets: sheetNames.length,
        }
      };
    } catch (error) {
      throw new Error(`Failed to parse Excel document: ${error.message}`);
    }
  }

  static async parsePdfDocument(buffer: Buffer): Promise<ParsedDocument> {
    try {
      const data = await pdf(buffer);
      
      return {
        content: this.convertToMarkdown(data.text),
        metadata: {
          pages: data.numpages,
          wordCount: data.text.split(/\s+/).length,
        }
      };
    } catch (error) {
      throw new Error(`Failed to parse PDF document: ${error.message}`);
    }
  }

  private static convertToMarkdown(text: string): string {
    // Convert plain text to basic markdown structure
    return text
      .split('\n')
      .map(line => {
        line = line.trim();
        if (line.length === 0) return '';
        
        // Detect headers (lines with all caps or ending with :)
        if (/^[A-Z\s]+:$/.test(line) || /^[A-Z\s]{3,}$/.test(line)) {
          return `## ${line.replace(':', '')}`;
        }
        
        // Detect numbered lists
        if (/^\d+\.\s/.test(line)) {
          return line;
        }
        
        // Detect bullet points
        if (/^[-*]\s/.test(line)) {
          return line;
        }
        
        return line;
      })
      .filter(line => line.length > 0)
      .join('\n\n');
  }

  static async parseDocument(file: File): Promise<ParsedDocument> {
    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = file.name.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'docx':
        return this.parseWordDocument(buffer);
      case 'xlsx':
      case 'xls':
        return this.parseExcelDocument(buffer);
      case 'pdf':
        return this.parsePdfDocument(buffer);
      default:
        throw new Error(`Unsupported file type: ${extension}`);
    }
  }
}
```

---

## **Phase 2: Database Schema Updates**

### 2.1 Update Prisma Schema

**File: `prisma/schema.prisma`**

```prisma
model FileList {
  id              Int                      @id @default(autoincrement())
  file_no         String                   @db.VarChar(100)
  category        String                   @db.VarChar(150)
  title           String                   @db.VarChar(255)
  note            String?                  // Now stores Markdown instead of HTML
  doc1            String?                  @db.VarChar(150)
  doc2            String?                  @db.VarChar(255)
  doc3            String?                  @db.VarChar(255)
  doc4            String?                  @db.VarChar(255)
  doc5            String?                  @db.VarChar(255)
  doc6            String?                  @db.VarChar(255)
  entry_date      String?                  @db.VarChar(50)
  entry_date_real DateTime?                @db.Date
  search_vector   Unsupported("tsvector")?
  semantic_vector Unsupported("vector")?   // NEW: For pgvector semantic search
  created_at      DateTime?                @default(now()) @db.Timestamptz(6)
  updated_at      DateTime?                @updatedAt @db.Timestamptz(6)
  // Remove note_plain_text - AI will read from note column directly

  @@index([category], map: "idx_file_list_category")
  @@index([entry_date_real], map: "idx_file_list_entry_date")
  @@index([file_no], map: "idx_file_list_file_no")
  @@index([search_vector], map: "idx_search_vector", type: Gin)
  @@index([semantic_vector], map: "idx_semantic_vector", type: Ivfflat) // NEW
  @@map("file_list")
}
```

### 2.2 Enable pgvector Extension

```sql
-- Run this in your PostgreSQL database
CREATE EXTENSION IF NOT EXISTS vector;

-- Add semantic_vector column (if not already added by Prisma)
ALTER TABLE file_list ADD COLUMN IF NOT EXISTS semantic_vector vector(384);

-- Create index for semantic vector search
CREATE INDEX IF NOT EXISTS idx_semantic_vector ON file_list 
USING ivfflat (semantic_vector vector_cosine_ops) WITH (lists = 100);
```

---

## **Phase 3: Markdown Editor Integration**

### 3.1 Create Markdown Editor Component

**File: `src/components/ui/MarkdownEditor.tsx`**

```typescript
"use client";

import { useState, useEffect } from 'react';
import { marked } from 'marked';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Eye, Edit, Upload } from 'lucide-react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = "Enter your notes in Markdown format...",
  editable = true
}: MarkdownEditorProps) {
  const [isPreview, setIsPreview] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    if (value) {
      setHtmlContent(marked(value));
    } else {
      setHtmlContent('');
    }
  }, [value]);

  if (!editable) {
    return (
      <div className="w-full p-4 border rounded-lg bg-gray-50">
        <div 
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    );
  }

  return (
    <div className="w-full border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-gray-50 border-b">
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant={isPreview ? "outline" : "default"}
            size="sm"
            onClick={() => setIsPreview(false)}
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
          <Button
            type="button"
            variant={isPreview ? "default" : "outline"}
            size="sm"
            onClick={() => setIsPreview(true)}
          >
            <Eye className="w-4 h-4 mr-1" />
            Preview
          </Button>
        </div>
        <div className="text-xs text-gray-500">
          Supports Markdown formatting
        </div>
      </div>

      {/* Content */}
      {isPreview ? (
        <div className="p-4 min-h-[200px]">
          {htmlContent ? (
            <div 
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          ) : (
            <div className="text-gray-500 italic">No content to preview</div>
          )}
        </div>
      ) : (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-[200px] border-0 resize-none focus:ring-0 font-mono text-sm"
        />
      )}
    </div>
  );
}
```

### 3.2 Update FileForm Component

**File: `src/app/admin/files/FileForm.tsx`**

```typescript
// Add imports at the top
import MarkdownEditor from "@/components/ui/MarkdownEditor";
import { DocumentParser } from "@/lib/document-parser";

// Replace the note field in the form (around line 324):
{isClient && (
  <FormField
    control={form.control}
    name="note"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Note (Markdown Format)</FormLabel>
        <FormControl>
          <MarkdownEditor
            value={field.value || ""}
            onChange={field.onChange}
            placeholder="Enter your notes in Markdown format or upload a document to auto-populate..."
          />
        </FormControl>
        <FormDescription>
          Content is stored in Markdown format. You can also upload a document below to automatically extract and populate this field.
        </FormDescription>
        <FormMessage />
      </FormItem>
    )}
  />
)}

// Update the file upload field (around line 350):
<FormField
  control={form.control}
  name="doc1"
  render={({ field: { onChange, onBlur, name, ref } }) => (
    <FormItem>
      <FormLabel>Upload Document (Word, Excel, PDF)</FormLabel>
      <FormControl>
        <Input
          type="file"
          accept=".docx,.xlsx,.xls,.pdf"
          onChange={async (e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
              const file = files[0];
              
              // Show loading state
              toast.info("Parsing document...", { duration: 2000 });
              
              try {
                const parsedDoc = await DocumentParser.parseDocument(file);
                
                // Auto-fill the note field with parsed content
                form.setValue('note', parsedDoc.content);
                
                // Show success message with metadata
                const { metadata } = parsedDoc;
                let successMsg = `Document parsed successfully!`;
                if (metadata.pages) successMsg += ` (${metadata.pages} pages)`;
                if (metadata.sheets) successMsg += ` (${metadata.sheets} sheets)`;
                if (metadata.wordCount) successMsg += ` (~${metadata.wordCount} words)`;
                
                toast.success(successMsg);
                onChange(files);
              } catch (error) {
                console.error('Document parsing error:', error);
                toast.error(`Failed to parse document: ${error.message}`);
              }
            }
          }}
          onBlur={onBlur}
          name={name}
          ref={ref}
        />
      </FormControl>
      <FormDescription>
        <strong>Supported formats:</strong> Word (.docx), Excel (.xlsx, .xls), PDF (.pdf)
        <br />
        <em>Uploading a document will automatically extract and convert content to Markdown format in the Note field above.</em>
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

---

## **Phase 4: Semantic Vector Integration**

### 4.1 Create Semantic Vector Service

**File: `src/lib/semantic-vector.ts`**

```typescript
import { pipeline } from '@xenova/transformers';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

export class SemanticVectorService {
  private static embedder: any = null;

  static async initialize() {
    if (!this.embedder) {
      console.log('Initializing semantic embedder...');
      this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      console.log('Semantic embedder initialized successfully');
    }
  }

  static async generateEmbedding(text: string): Promise<number[]> {
    await this.initialize();
    
    // Clean and prepare text for embedding
    const cleanText = text
      .replace(/[#*`]/g, '') // Remove markdown formatting
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim()
      .substring(0, 500); // Limit to first 500 characters for performance
    
    const result = await this.embedder(cleanText, {
      pooling: 'mean',
      normalize: true
    });
    
    return Array.from(result.data);
  }

  static async updateSemanticVector(fileId: number, content: string) {
    try {
      if (!content || content.trim().length === 0) {
        console.log(`Skipping semantic vector update for file ${fileId} - no content`);
        return;
      }

      const embedding = await this.generateEmbedding(content);
      
      await prisma.$executeRaw`
        UPDATE file_list 
        SET semantic_vector = ${embedding}::vector
        WHERE id = ${fileId}
      `;
      
      console.log(`✅ Updated semantic vector for file ${fileId}`);
    } catch (error) {
      console.error(`❌ Failed to update semantic vector for file ${fileId}:`, error);
      throw error;
    }
  }

  static async semanticSearch(query: string, limit: number = 10): Promise<any[]> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      
      const results = await prisma.$queryRaw`
        SELECT 
          id,
          file_no,
          category,
          title,
          note,
          entry_date_real,
          1 - (semantic_vector <=> ${queryEmbedding}::vector) as similarity
        FROM file_list 
        WHERE semantic_vector IS NOT NULL
        ORDER BY semantic_vector <=> ${queryEmbedding}::vector
        LIMIT ${limit}
      `;
      
      console.log(`🔍 Semantic search found ${results.length} results for query: "${query}"`);
      return results;
    } catch (error) {
      console.error('Semantic search error:', error);
      return [];
    }
  }

  static async batchUpdateSemanticVectors() {
    try {
      console.log('🔄 Starting batch semantic vector update...');
      
      const records = await prisma.fileList.findMany({
        where: {
          note: { not: null },
          semantic_vector: null
        },
        select: {
          id: true,
          note: true
        }
      });

      console.log(`📊 Found ${records.length} records to process`);

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        if (record.note) {
          await this.updateSemanticVector(record.id, record.note);
          
          // Progress logging
          if ((i + 1) % 10 === 0) {
            console.log(`Progress: ${i + 1}/${records.length} records processed`);
          }
        }
      }

      console.log('🎉 Batch semantic vector update completed!');
    } catch (error) {
      console.error('❌ Batch update failed:', error);
      throw error;
    }
  }
}
```

---

## **Phase 5: Hybrid Search Implementation**

### 5.1 Create Hybrid Search Service

**File: `src/lib/hybrid-search.ts`**

```typescript
import { PrismaClient } from '../generated/prisma';
import { SemanticVectorService } from './semantic-vector';

const prisma = new PrismaClient();

export interface HybridSearchResult {
  id: number;
  file_no: string;
  category: string;
  title: string;
  note: string;
  entry_date_real: Date | null;
  ts_rank?: number;
  semantic_similarity?: number;
  combined_score?: number;
}

export class HybridSearchService {
  /**
   * The Hybrid Search Recipe Implementation
   * 
   * Step 1: Fast Keyword Filter (tsvector) - Pre-filter candidates
   * Step 2: Semantic Re-Ranker (pgvector) - Rank by meaning
   * Step 3: Intelligent Fallback - Full semantic search if no tsvector results
   */
  static async search(
    query: string,
    limit: number = 20
  ): Promise<{
    results: HybridSearchResult[];
    searchMethod: 'hybrid' | 'semantic_fallback' | 'tsvector_only';
    stats: {
      tsvectorResults: number;
      semanticResults: number;
      finalResults: number;
    };
  }> {
    try {
      console.log(`[HYBRID SEARCH] Starting search for: "${query}"`);

      // Step 1: The Fast Keyword Filter (tsvector)
      const tsvectorResults = await this.tsvectorSearch(query, limit * 2);
      
      console.log(`[HYBRID SEARCH] Step 1 - tsvector found ${tsvectorResults.length} candidates`);

      if (tsvectorResults.length === 0) {
        console.log('[HYBRID SEARCH] Step 3 - Using intelligent fallback (full semantic search)');
        
        // Step 3: The Intelligent Fallback
        const semanticResults = await SemanticVectorService.semanticSearch(query, limit);
        
        return {
          results: semanticResults.map(result => ({
            ...result,
            semantic_similarity: result.similarity,
            combined_score: result.similarity
          })),
          searchMethod: 'semantic_fallback',
          stats: {
            tsvectorResults: 0,
            semanticResults: semanticResults.length,
            finalResults: semanticResults.length
          }
        };
      }

      // Step 2: The Semantic Re-Ranker (pgvector)
      const candidateIds = tsvectorResults.map(r => r.id);
      const semanticResults = await this.semanticSearchOnCandidates(query, candidateIds, limit);
      
      console.log(`[HYBRID SEARCH] Step 2 - semantic re-ranking on ${candidateIds.length} candidates`);

      // Combine and rank results using hybrid scoring
      const combinedResults = this.combineAndRankResults(tsvectorResults, semanticResults, limit);
      
      console.log(`[HYBRID SEARCH] Final results: ${combinedResults.length}`);

      return {
        results: combinedResults,
        searchMethod: 'hybrid',
        stats: {
          tsvectorResults: tsvectorResults.length,
          semanticResults: semanticResults.length,
          finalResults: combinedResults.length
        }
      };
      
    } catch (error) {
      console.error('[HYBRID SEARCH] Error:', error);
      
      // Fallback to tsvector only
      console.log('[HYBRID SEARCH] Error fallback - using tsvector only');
      const fallbackResults = await this.tsvectorSearch(query, limit);
      return {
        results: fallbackResults,
        searchMethod: 'tsvector_only',
        stats: {
          tsvectorResults: fallbackResults.length,
          semanticResults: 0,
          finalResults: fallbackResults.length
        }
      };
    }
  }

  private static async tsvectorSearch(query: string, limit: number): Promise<HybridSearchResult[]> {
    // Clean and prepare the search query for to_tsquery
    const tsQuery = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .trim()
      .split(/\s+/)
      .filter((term) => term.length > 1)
      .join(" | "); // Use OR operator for broader initial filtering

    if (!tsQuery) return [];

    console.log(`[TSVECTOR] Query: "${query}" -> TSQuery: "${tsQuery}"`);

    const results = await prisma.$queryRawUnsafe(`
      SELECT 
        id,
        file_no,
        category,
        title,
        note,
        entry_date_real,
        ts_rank(search_vector, to_tsquery('english', $1)) as ts_rank
      FROM file_list 
      WHERE search_vector @@ to_tsquery('english', $1)
      ORDER BY ts_rank DESC, entry_date_real DESC
      LIMIT $2
    `, tsQuery, limit);

    return results as HybridSearchResult[];
  }

  private static async semanticSearchOnCandidates(
    query: string, 
    candidateIds: number[], 
    limit: number
  ): Promise<HybridSearchResult[]> {
    if (candidateIds.length === 0) return [];

    const queryEmbedding = await SemanticVectorService.generateEmbedding(query);
    
    console.log(`[SEMANTIC] Re-ranking ${candidateIds.length} candidates`);

    const results = await prisma.$queryRawUnsafe(`
      SELECT 
        id,
        file_no,
        category,
        title,
        note,
        entry_date_real,
        1 - (semantic_vector <=> $1::vector) as semantic_similarity
      FROM file_list 
      WHERE id = ANY($2) AND semantic_vector IS NOT NULL
      ORDER BY semantic_vector <=> $1::vector
      LIMIT $3
    `, queryEmbedding, candidateIds, limit);

    return results as HybridSearchResult[];
  }

  private static combineAndRankResults(
    tsvectorResults: HybridSearchResult[],
    semanticResults: HybridSearchResult[],
    limit: number
  ): HybridSearchResult[] {
    // Create a map of results by ID
    const resultMap = new Map<number, HybridSearchResult>();
    
    // Add tsvector results with initial scoring (60% weight)
    tsvectorResults.forEach(result => {
      resultMap.set(result.id, { 
        ...result, 
        combined_score: (result.ts_rank || 0) * 0.6 
      });
    });
    
    // Add semantic results and update scores (40% weight)
    semanticResults.forEach(result => {
      const existing = resultMap.get(result.id);
      if (existing) {
        // Hybrid score: 60% tsvector + 40% semantic
        existing.semantic_similarity = result.semantic_similarity;
        existing.combined_score = (existing.ts_rank || 0) * 0.6 + (result.semantic_similarity || 0) * 0.4;
      } else {
        // Semantic-only result (shouldn't happen in normal flow, but safety net)
        resultMap.set(result.id, { 
          ...result, 
          combined_score: (result.semantic_similarity || 0) * 0.4 
        });
      }
    });
    
    // Sort by combined score and return top results
    const finalResults = Array.from(resultMap.values())
      .sort((a, b) => (b.combined_score || 0) - (a.combined_score || 0))
      .slice(0, limit);

    console.log(`[HYBRID] Combined scoring completed: ${finalResults.length} results`);
    
    return finalResults;
  }
}
```

---

## **Phase 6: Update AI Service**

### 6.1 Update Enhanced AI Service

**File: `src/lib/ai-service-enhanced.ts`**

```typescript
// Import the new services
import { HybridSearchService } from './hybrid-search';
import { SemanticVectorService } from './semantic-vector';

// Update the SearchResult interface to match new schema
export interface SearchResult {
  id: number;
  file_no: string;
  category: string;
  title: string;
  note: string; // Changed from note_plain_text to note
  entry_date_real: Date | null;
  rank?: number;
}

// Replace the existing searchDatabaseEnhanced function:
export async function searchDatabaseEnhanced(
  question: string,
  limit = 20
): Promise<SearchResult[]> {
  devLog(`Starting hybrid database search for query: "${question}"`, { limit });
  
  try {
    const hybridResults = await HybridSearchService.search(question, limit);
    
    console.log(`[AI SERVICE] Search method: ${hybridResults.searchMethod}`);
    console.log(`[AI SERVICE] Stats:`, hybridResults.stats);
    
    // Convert to SearchResult format
    const results = hybridResults.results.map(result => ({
      id: result.id,
      file_no: result.file_no,
      category: result.category,
      title: result.title,
      note: result.note, // Now reading from note column directly (Markdown)
      entry_date_real: result.entry_date_real,
      rank: result.combined_score || result.ts_rank || result.semantic_similarity || 0
    }));

    console.log(`[AI SERVICE] Returning ${results.length} processed results`);
    return results;
    
  } catch (error) {
    console.error('Hybrid database search error:', error);
    
    // Fallback to original search method
    console.log('[AI SERVICE] Falling back to original search method');
    return searchDatabaseFallback(question, limit);
  }
}

// Update the context preparation function:
function prepareContextForAI(records: SearchResult[], question: string): string {
  let context = `DATABASE CONTEXT:\nFound ${records.length} relevant records from the CID database:\n\n`;

  records.forEach((record, index) => {
    context += `[RECORD ${index + 1}] (Relevance: ${((record.rank || 0) * 100).toFixed(1)}%)\n`;
    context += `File: ${record.file_no}\n`;
    context += `Title: ${record.title}\n`;
    context += `Category: ${record.category}\n`;
    if (record.entry_date_real) {
      context += `Date: ${record.entry_date_real.toLocaleDateString()}\n`;
    }
    // Now using note directly (Markdown format)
    context += `Content: ${record.note}\n`;
    context += `---\n\n`;
  });

  context += `USER QUESTION: ${question}\n\n`;
  context += `Please provide a comprehensive answer based on the above records. `;
  context += `The content is in Markdown format, so you can reference structured information like headers, lists, and tables.`;

  return context;
}

// Update the main chat function to include search method info:
export async function processChatMessageEnhanced(
  question: string,
  conversationHistory: ChatMessage[] = [],
  searchLimit: number = 100,
  useEnhancedSearch: boolean = true
): Promise<{
  response: string;
  sources: Array<{
    id: number;
    file_no: string;
    title: string;
    relevance?: number;
  }>;
  searchQuery: string;
  searchMethod: "hybrid" | "semantic_fallback" | "tsvector_only" | "enhanced_tsvector" | "fallback_contains" | "recent_files";
  queryType: string;
  analysisUsed: boolean;
  tokenCount?: {
    input: number;
    output: number;
  };
}> {
  // ... existing code for query analysis and recent files ...

  // Replace the database search section:
  const records = useEnhancedSearch
    ? await searchDatabaseEnhanced(searchQuery, searchLimit)
    : await searchDatabase(searchQuery, searchLimit);

  if (records.length === 0) {
    return {
      response: `I couldn't find any relevant records in the CID database for "${searchQuery}". Please try rephrasing your question or using different keywords.`,
      sources: [],
      searchQuery: searchQuery,
      searchMethod: useEnhancedSearch ? "hybrid" : "enhanced_tsvector",
      queryType: queryAnalysis.queryType,
      analysisUsed: true,
    };
  }

  // ... rest of the function remains the same ...
}
```

---

## **Phase 7: Update File Actions**

### 7.1 Update File Creation Action

**File: `src/app/admin/files/actions.ts`**

```typescript
// Add import
import { SemanticVectorService } from '@/lib/semantic-vector';

// Update the createCompletePlainText function to be removed:
// Remove this function as we're not using note_plain_text anymore

// Update the createFileAction function:
export async function createFileAction(
  formData: FormData
): Promise<ActionResponse> {
  ensureUploadDirExists();

  // ... existing file upload and validation code ...

  // Remove the note_plain_text generation:
  // const notePlainText = createCompletePlainText(...); // Remove this line

  // Update the database insertion (around line 370):
  try {
    const newFile = await prisma.fileList.create({
      data: {
        ...restOfData,
        note: cleanedNote, // Store Markdown content directly
        // Remove note_plain_text: notePlainText, // Remove this line
        doc1: doc1Path,
        entry_date: entry_date,
        entry_date_real: entryDateReal,
      },
    });

    // Update the search vector (tsvector)
    await prisma.$executeRaw`
      UPDATE file_list 
      SET search_vector = to_tsvector('english', 
        COALESCE(file_no, '') || ' ' || 
        COALESCE(category, '') || ' ' || 
        COALESCE(title, '') || ' ' || 
        COALESCE(note, '') || ' ' ||
        COALESCE(entry_date, '') || ' ' ||
        COALESCE(EXTRACT(YEAR FROM entry_date_real)::text, '')
      )
      WHERE id = ${newFile.id}
    `;

    // Generate and update semantic vector
    if (cleanedNote && cleanedNote.trim().length > 0) {
      try {
        await SemanticVectorService.updateSemanticVector(newFile.id, cleanedNote);
      } catch (vectorError) {
        console.error('Semantic vector update failed:', vectorError);
        // Don't fail the entire operation if semantic vector fails
      }
    }

    revalidatePath("/admin/files");
    return { success: true, message: "File created successfully with hybrid search capabilities." };
  } catch (error) {
    console.error("Error creating file:", error);
    return { success: false, error: "Database error: Failed to create file." };
  }
}

// Update the updateFileAction function similarly:
export async function updateFileAction(
  id: number,
  formData: FormData
): Promise<ActionResponse> {
  // ... existing validation code ...

  // Remove note_plain_text generation
  // const notePlainText = createCompletePlainText(...); // Remove this

  const prismaDataForUpdate: any = {
    ...restOfData,
    note: cleanedNote, // Store Markdown directly
    // Remove note_plain_text: notePlainText, // Remove this line
    entry_date: entry_date,
    entry_date_real: entryDateReal,
  };

  // ... file upload handling ...

  try {
    await prisma.fileList.update({
      where: { id },
      data: prismaDataForUpdate,
    });

    // Update search vector (tsvector)
    await prisma.$executeRaw`
      UPDATE file_list 
      SET search_vector = to_tsvector('english', 
        COALESCE(file_no, '') || ' ' || 
        COALESCE(category, '') || ' ' || 
        COALESCE(title, '') || ' ' || 
        COALESCE(note, '') || ' ' ||
        COALESCE(entry_date, '') || ' ' ||
        COALESCE(EXTRACT(YEAR FROM entry_date_real)::text, '')
      )
      WHERE id = ${id}
    `;

    // Update semantic vector
    if (cleanedNote && cleanedNote.trim().length > 0) {
      try {
        await SemanticVectorService.updateSemanticVector(id, cleanedNote);
      } catch (vectorError) {
        console.error('Semantic vector update failed:', vectorError);
      }
    }

    revalidatePath("/admin/files");
    return { success: true, message: "File updated successfully." };
  } catch (error) {
    console.error("Error updating file:", error);
    return { success: false, error: "Database error: Failed to update file." };
  }
}
```

---

## **Phase 8: Migration Scripts**

### 8.1 HTML to Markdown Migration Script

**File: `scripts/migrate-to-markdown.js`**

```javascript
#!/usr/bin/env node

const { PrismaClient } = require("../src/generated/prisma");
const { marked } = require('marked');

const prisma = new PrismaClient();

async function migrateToMarkdown() {
  try {
    console.log("🔄 Starting migration to Markdown format...");

    // Get all records with HTML content
    const records = await prisma.fileList.findMany({
      where: {
        note: {
          not: null
        }
      },
      select: {
        id: true,
        note: true,
        note_plain_text: true
      }
    });

    console.log(`📊 Found ${records.length} records to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const record of records) {
      if (record.note) {
        // Check if content is already in Markdown format
        if (isAlreadyMarkdown(record.note)) {
          console.log(`⏭️  Skipping record ${record.id} - already in Markdown format`);
          skippedCount++;
          continue;
        }

        // Convert HTML to Markdown
        const markdownContent = htmlToMarkdown(record.note);
        
        // Update the record
        await prisma.fileList.update({
          where: { id: record.id },
          data: {
            note: markdownContent,
          }
        });
        
        migratedCount++;
        console.log(`✅ Migrated record ${record.id}`);
      }
    }

    console.log(`\n📈 Migration Summary:`);
    console.log(`   - Records migrated: ${migratedCount}`);
    console.log(`   - Records skipped: ${skippedCount}`);
    console.log(`   - Total processed: ${records.length}`);
    console.log("🎉 Migration completed successfully!");
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function isAlreadyMarkdown(content) {
  // Simple heuristic to detect if content is already Markdown
  const htmlTags = /<\/?[^>]+(>|$)/g;
  const markdownPatterns = /^#{1,6}\s|^\*\s|^\d+\.\s|^\|\s|\*\*|\*|`/gm;
  
  const hasHtmlTags = htmlTags.test(content);
  const hasMarkdownPatterns = markdownPatterns.test(content);
  
  // If it has Markdown patterns and few/no HTML tags, likely already Markdown
  return hasMarkdownPatterns && !hasHtmlTags;
}

function htmlToMarkdown(html) {
  // Simple HTML to Markdown conversion
  let markdown = html
    // Headers
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
    
    // Text formatting
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<u[^>]*>(.*?)<\/u>/gi, '*$1*')
    
    // Lists
    .replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n') + '\n';
    })
    .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
      let counter = 1;
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${counter++}. $1\n`) + '\n';
    })
    
    // Paragraphs and breaks
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n\n')
    
    // Links
    .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    
    // Tables (basic conversion)
    .replace(/<table[^>]*>(.*?)<\/table>/gis, (match, content) => {
      let tableContent = content
        .replace(/<tr[^>]*>(.*?)<\/tr>/gis, (rowMatch, rowContent) => {
          return rowContent.replace(/<t[dh][^>]*>(.*?)<\/t[dh]>/gi, '| $1 ') + '|\n';
        });
      
      // Add table header separator
      const lines = tableContent.split('\n').filter(line => line.trim());
      if (lines.length > 0) {
        const headerSeparator = lines[0].replace(/\|[^|]*\|/g, '| --- |');
        lines.splice(1, 0, headerSeparator);
        tableContent = lines.join('\n') + '\n';
      }
      
      return '\n' + tableContent + '\n';
    })
    
    // Remove remaining HTML tags
    .replace(/<[^>]*>/g, '')
    
    // Clean up whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return markdown;
}

migrateToMarkdown();
```

### 8.2 Semantic Vector Generation Script

**File: `scripts/generate-semantic-vectors.js`**

```javascript
#!/usr/bin/env node

const { SemanticVectorService } = require("../src/lib/semantic-vector");

async function generateSemanticVectors() {
  try {
    console.log("🚀 Starting semantic vector generation...");
    
    await SemanticVectorService.batchUpdateSemanticVectors();
    
    console.log("🎉 Semantic vector generation completed!");
    
  } catch (error) {
    console.error("❌ Semantic vector generation failed:", error);
    process.exit(1);
  }
}

generateSemanticVectors();
```

### 8.3 Update Package.json Scripts

**File: `package.json`**

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start -p 3002",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "prepare": "husky install",
    "import-data": "node scripts/import-data.js",
    "import-data:clear": "node scripts/import-data.js --clear",
    "convert-import": "node scripts/convert-and-import.js",
    "convert-import:clear": "node scripts/convert-and-import.js --clear",
    "migrate-markdown": "node scripts/migrate-to-markdown.js",
    "generate-semantic-vectors": "node scripts/generate-semantic-vectors.js",
    "update-search-vectors": "node scripts/update-search-vectors.js",
    "upgrade-complete": "npm run migrate-markdown && npm run update-search-vectors && npm run generate-semantic-vectors"
  }
}
```

---

## **Phase 9: Implementation Checklist**

### 🔧 **Pre-Implementation Checklist**

- [ ] **Backup Database**
  ```bash
  pg_dump your_database > backup_before_upgrade_$(date +%Y%m%d).sql
  ```

- [ ] **Test Environment Setup**
  - [ ] Create development branch
  - [ ] Test with subset of data first
  - [ ] Verify all dependencies can be installed

### 📦 **Installation Steps**

1. **Install Dependencies**
   ```bash
   npm install mammoth docx-parser xlsx pdf-parse marked @xenova/transformers
   npm install --save-dev @types/marked
   ```

2. **Enable PostgreSQL Extensions**
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

3. **Update Database Schema**
   ```bash
   npx prisma db push
   ```

### 🚀 **Implementation Steps**

1. **Phase 1: Document Parser**
   - [ ] Create `src/lib/document-parser.ts`
   - [ ] Test with sample documents
   - [ ] Verify Markdown conversion quality

2. **Phase 2: Markdown Editor**
   - [ ] Create `src/components/ui/MarkdownEditor.tsx`
   - [ ] Update `src/app/admin/files/FileForm.tsx`
   - [ ] Test upload and auto-population

3. **Phase 3: Semantic Vectors**
   - [ ] Create `src/lib/semantic-vector.ts`
   - [ ] Test embedding generation
   - [ ] Verify pgvector integration

4. **Phase 4: Hybrid Search**
   - [ ] Create `src/lib/hybrid-search.ts`
   - [ ] Update `src/lib/ai-service-enhanced.ts`
   - [ ] Test search performance

5. **Phase 5: File Actions**
   - [ ] Update `src/app/admin/files/actions.ts`
   - [ ] Remove `note_plain_text` dependencies
   - [ ] Test file creation/editing

6. **Phase 6: Migration**
   - [ ] Run HTML to Markdown migration
   - [ ] Generate semantic vectors
   - [ ] Update search vectors

### 🧪 **Testing Checklist**

- [ ] **Document Upload Tests**
  - [ ] Word document (.docx) parsing
  - [ ] Excel document (.xlsx) parsing
  - [ ] PDF document parsing
  - [ ] Error handling for unsupported formats

- [ ] **Markdown Editor Tests**
  - [ ] Edit mode functionality
  - [ ] Preview mode rendering
  - [ ] Auto-population from document upload

- [ ] **Search Tests**
  - [ ] tsvector search still works
  - [ ] Semantic search provides relevant results
  - [ ] Hybrid search combines both effectively
  - [ ] Fallback mechanisms work

- [ ] **AI Response Tests**
  - [ ] AI reads from `note` column correctly
  - [ ] Markdown content is properly interpreted
  - [ ] Response quality maintains or improves

### 📊 **Performance Monitoring**

- [ ] **Search Performance**
  - [ ] Measure search response times
  - [ ] Monitor database query performance
  - [ ] Track semantic vector generation time

- [ ] **Storage Monitoring**
  - [ ] Monitor semantic vector storage usage
  - [ ] Check database performance with new indexes

---

## **Phase 10: Expected Outcomes**

### 🎯 **User Experience Improvements**

1. **Streamlined Workflow**
   - Upload documents instead of copy-paste
   - Automatic content extraction and formatting
   - Consistent Markdown format for all content

2. **Better Search Results**
   - Semantic understanding for more relevant results
   - Hybrid approach combines speed and accuracy
   - Fallback ensures no search failures

3. **Enhanced AI Responses**
   - Better structured content (Markdown)
   - More accurate relevance scoring
   - Faster response times

### 📈 **Technical Benefits**

1. **Performance**
   - Maintained fast tsvector search (10-40x faster than LIKE)
   - Added semantic relevance for better quality
   - Optimized hybrid approach for best of both worlds

2. **Maintainability**
   - Simplified data model (no `note_plain_text`)
   - Standard Markdown format
   - Modern embedding technology

3. **Scalability**
   - pgvector handles large datasets efficiently
   - Batch processing for semantic vectors
   - Incremental updates for new content

### ⚠️ **Risk Mitigation**

1. **Fallback Protection**
   - Multiple search method fallbacks
   - Graceful degradation if semantic search fails
   - Maintains existing functionality during transition

2. **Data Safety**
   - Complete database backup before migration
   - Incremental testing approach
   - Rollback procedures documented

3. **Performance Safeguards**
   - Semantic vector generation is optional/background
   - Search timeouts and error handling
   - Resource usage monitoring

---

## 🏁 **Conclusion**

This upgrade plan is **highly feasible** and will significantly enhance your CID-AI application's capabilities:

✅ **Document parsing replaces manual entry**  
✅ **Markdown format improves content structure**  
✅ **Hybrid search combines speed and relevance**  
✅ **AI processes content more effectively**  
✅ **Maintains backward compatibility**  

The implementation is designed to be:
- **Incremental**: Can be done in phases
- **Safe**: Multiple fallbacks and safety nets
- **Performance-focused**: Improves speed and accuracy
- **Future-proof**: Uses modern, scalable technologies

Your existing infrastructure (PostgreSQL, Prisma, Next.js) is perfectly suited for this upgrade, making it a natural evolution of your current system. 