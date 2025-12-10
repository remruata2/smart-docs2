module.exports=[138957,a=>a.a(async(b,c)=>{try{var d=a.i(761469),e=a.i(934304),f=b([e]);[e]=f.then?(await f)():f;class g{static async search(a,b=20,c){try{let f;if(console.log(`[HYBRID RRF] Starting search for: "${a}"`,c),!c.boardId)throw Error("boardId is required for search");let g=!a||!a.trim(),h=c.subjectId||c.chapterId;if(g&&!h)return{results:[],searchMethod:"tsvector_only",stats:{tsvectorResults:0,semanticResults:0,finalResults:0}};let i=g?await e.SemanticVectorService.generateEmbedding("dummy"):await e.SemanticVectorService.generateEmbedding(a),j=c.boardId,k=c.subjectId||null,l=c.chapterId||null,m=l?BigInt(l):null;if(g&&h)console.log("[HYBRID RRF] Empty query with filters - returning all matching chunks"),console.log(`[HYBRID RRF] Filters: boardId=${j}, subjectId=${k}, chapterId=${l} (type: ${typeof l})`),m?(console.log("[HYBRID RRF] chapterId provided - skipping board filter, returning all chunks for chapter"),f=await d.db.$queryRawUnsafe(`
						SELECT 
							cc.id as chunk_id,
							c.id as chapter_id,
							c.id as id,
							c.title,
							s.name as subject_name,
							s.name as subject,
							cc.content as chunk_content,
							cc.content as content,
							cc.page_number,
							cc.bbox,
							c.created_at,
							cp.image_url,
							1.0 as rrf_score,
							1 as semantic_rank,
							1 as keyword_rank
						FROM chapter_chunks cc
						JOIN chapters c ON cc.chapter_id = c.id
						JOIN subjects s ON c.subject_id = s.id
						LEFT JOIN chapter_pages cp ON c.id = cp.chapter_id AND cc.page_number = cp.page_number
						WHERE c.id = $1
						  AND ($2::int IS NULL OR c.subject_id = $2)
						  AND c.is_active = true
						  AND c.processing_status = 'COMPLETED'
						ORDER BY cc.chunk_index ASC
						LIMIT $3
						`,m,k,b)):f=await d.db.$queryRawUnsafe(`
						SELECT 
							cc.id as chunk_id,
							c.id as chapter_id,
							c.id as id,
							c.title,
							s.name as subject_name,
							s.name as subject,
							cc.content as chunk_content,
							cc.content as content,
							cc.page_number,
							cc.bbox,
							c.created_at,
							cp.image_url,
							1.0 as rrf_score,
							1 as semantic_rank,
							1 as keyword_rank
						FROM chapter_chunks cc
						JOIN chapters c ON cc.chapter_id = c.id
						JOIN subjects s ON c.subject_id = s.id
						LEFT JOIN chapter_chunk_boards ccb ON cc.id = ccb.chunk_id AND ccb.board_id = $1
						LEFT JOIN chapter_pages cp ON c.id = cp.chapter_id AND cc.page_number = cp.page_number
						WHERE (c.is_global = true OR ccb.chunk_id IS NOT NULL)
						  AND ($2::int IS NULL OR c.subject_id = $2)
						  AND c.is_active = true
						  AND c.processing_status = 'COMPLETED'
						ORDER BY cc.chunk_index ASC
						LIMIT $3
						`,j,k,b),console.log(`[HYBRID RRF] Query returned ${f.length} results`);else{let c=l?BigInt(l):null;c?(console.log("[HYBRID RRF] chapterId provided - skipping board filter in search query"),f=await d.db.$queryRawUnsafe(`
        WITH semantic_search AS (
            SELECT 
                cc.id as chunk_id, 
                c.id as chapter_id, 
                c.title, 
                s.name as subject_name,
                cc.content as chunk_content,
                cc.page_number,
                cc.bbox,
                c.created_at,
                cp.image_url,
                RANK() OVER (ORDER BY cc.semantic_vector <=> $1::vector) as rank
            FROM chapter_chunks cc
            JOIN chapters c ON cc.chapter_id = c.id
            JOIN subjects s ON c.subject_id = s.id
            LEFT JOIN chapter_pages cp ON c.id = cp.chapter_id AND cc.page_number = cp.page_number
            WHERE cc.semantic_vector IS NOT NULL
              AND c.id = $2
              AND ($3::int IS NULL OR c.subject_id = $3)
              AND c.is_active = true
              AND c.processing_status = 'COMPLETED'
            ORDER BY cc.semantic_vector <=> $1::vector
            LIMIT 50
        ),
        keyword_search AS (
            SELECT 
                cc.id as chunk_id, 
                c.id as chapter_id, 
                c.title, 
                s.name as subject_name,
                cc.content as chunk_content,
                cc.page_number,
                cc.bbox,
                c.created_at,
                cp.image_url,
                ts_rank_cd(cc.search_vector, websearch_to_tsquery('english', $4)) as search_rank,
                RANK() OVER (ORDER BY ts_rank_cd(cc.search_vector, websearch_to_tsquery('english', $4)) DESC) as rank
            FROM chapter_chunks cc
            JOIN chapters c ON cc.chapter_id = c.id
            JOIN subjects s ON c.subject_id = s.id
            LEFT JOIN chapter_pages cp ON c.id = cp.chapter_id AND cc.page_number = cp.page_number
            WHERE cc.search_vector @@ websearch_to_tsquery('english', $4)
              AND c.id = $2
              AND ($3::int IS NULL OR c.subject_id = $3)
              AND c.is_active = true
              AND c.processing_status = 'COMPLETED'
            ORDER BY search_rank DESC
            LIMIT 50
        )
        SELECT 
            COALESCE(s.chapter_id, k.chapter_id) as id,
            COALESCE(s.subject_name, k.subject_name) as subject,
            COALESCE(s.title, k.title) as title,
            COALESCE(s.chunk_content, k.chunk_content) as content,
            COALESCE(s.created_at, k.created_at) as created_at,
            
            (COALESCE(1.0 / (60 + s.rank), 0.0) + COALESCE(1.0 / (60 + k.rank), 0.0)) as rrf_score,
            
            s.rank as semantic_rank,
            k.rank as keyword_rank,
            
            COALESCE(s.page_number, k.page_number) as page_number,
            COALESCE(s.bbox, k.bbox) as bbox,
            COALESCE(s.image_url, k.image_url) as image_url
        FROM semantic_search s
        FULL OUTER JOIN keyword_search k ON s.chunk_id = k.chunk_id
        ORDER BY rrf_score DESC
        LIMIT $5
			`,`[${i.join(",")}]`,c,k,a,b)):f=await d.db.$queryRawUnsafe(`
        WITH semantic_search AS (
            SELECT 
                cc.id as chunk_id, 
                c.id as chapter_id, 
                c.title, 
                s.name as subject_name,
                cc.content as chunk_content,
                cc.page_number,
                cc.bbox,
                c.created_at,
                cp.image_url,
                RANK() OVER (ORDER BY cc.semantic_vector <=> $1::vector) as rank
            FROM chapter_chunks cc
            JOIN chapters c ON cc.chapter_id = c.id
            JOIN subjects s ON c.subject_id = s.id
            LEFT JOIN chapter_chunk_boards ccb ON cc.id = ccb.chunk_id AND ccb.board_id = $2
            LEFT JOIN chapter_pages cp ON c.id = cp.chapter_id AND cc.page_number = cp.page_number
            WHERE cc.semantic_vector IS NOT NULL
              AND (c.is_global = true OR ccb.chunk_id IS NOT NULL)
              AND ($3::int IS NULL OR c.subject_id = $3)
              AND c.is_active = true
              AND c.processing_status = 'COMPLETED'
            ORDER BY cc.semantic_vector <=> $1::vector
            LIMIT 50
        ),
        keyword_search AS (
            SELECT 
                cc.id as chunk_id, 
                c.id as chapter_id, 
                c.title, 
                s.name as subject_name,
                cc.content as chunk_content,
                cc.page_number,
                cc.bbox,
                c.created_at,
                cp.image_url,
                ts_rank_cd(cc.search_vector, websearch_to_tsquery('english', $4)) as search_rank,
                RANK() OVER (ORDER BY ts_rank_cd(cc.search_vector, websearch_to_tsquery('english', $4)) DESC) as rank
            FROM chapter_chunks cc
            JOIN chapters c ON cc.chapter_id = c.id
            JOIN subjects s ON c.subject_id = s.id
            LEFT JOIN chapter_chunk_boards ccb ON cc.id = ccb.chunk_id AND ccb.board_id = $2
            LEFT JOIN chapter_pages cp ON c.id = cp.chapter_id AND cc.page_number = cp.page_number
            WHERE cc.search_vector @@ websearch_to_tsquery('english', $4)
              AND (c.is_global = true OR ccb.chunk_id IS NOT NULL)
              AND ($3::int IS NULL OR c.subject_id = $3)
              AND c.is_active = true
              AND c.processing_status = 'COMPLETED'
            ORDER BY search_rank DESC
            LIMIT 50
        )
        SELECT 
            COALESCE(s.chapter_id, k.chapter_id) as id,
            COALESCE(s.subject_name, k.subject_name) as subject,
            COALESCE(s.title, k.title) as title,
            COALESCE(s.chunk_content, k.chunk_content) as content,
            COALESCE(s.created_at, k.created_at) as created_at,
            
            (COALESCE(1.0 / (60 + s.rank), 0.0) + COALESCE(1.0 / (60 + k.rank), 0.0)) as rrf_score,
            
            s.rank as semantic_rank,
            k.rank as keyword_rank,
            
            COALESCE(s.page_number, k.page_number) as page_number,
            COALESCE(s.bbox, k.bbox) as bbox,
            COALESCE(s.image_url, k.image_url) as image_url
        FROM semantic_search s
        FULL OUTER JOIN keyword_search k ON s.chunk_id = k.chunk_id
        ORDER BY rrf_score DESC
        LIMIT $5
			`,`[${i.join(",")}]`,j,k,a,b)}console.log(`[HYBRID RRF] Found ${f.length} results.`);let n=f.filter(a=>a.semantic_rank).length,o=f.filter(a=>a.keyword_rank).length,p="hybrid";return n>0&&0===o?p="vector_only":o>0&&0===n&&(p="keyword_only"),{results:f.map(a=>{let b,c=a.bbox;if("string"==typeof a.bbox)try{c=JSON.parse(a.bbox)}catch(a){c=null}return c&&Array.isArray(c)&&c.length>0&&("object"==typeof c[0]&&c[0].bbox?b=c[0].bbox:"number"==typeof c[0]&&(b=c)),{id:a.id.toString(),subject:a.subject,title:a.title,content:a.content,created_at:a.created_at,rrf_score:a.rrf_score,semantic_rank:a.semantic_rank,keyword_rank:a.keyword_rank,citation:a.page_number?{pageNumber:a.page_number,imageUrl:a.image_url||"",boundingBox:b||[0,0,1,1],chunkContent:a.content||"",title:a.title}:void 0}}),searchMethod:p,stats:{tsvectorResults:o,semanticResults:n,finalResults:f.length}}}catch(a){return console.error("[HYBRID RRF] Error:",a),{results:[],searchMethod:"keyword_only",stats:{tsvectorResults:0,semanticResults:0,finalResults:0}}}}}a.s(["HybridSearchService",()=>g]),c()}catch(a){c(a)}},!1),830109,a=>{"use strict";var b=a.i(766518);let c=null;async function d(){return c||(c=(async()=>{try{await b.default.$executeRawUnsafe("SELECT pg_advisory_lock(hashtext('cid_ai_app_settings_ddl_lock'));");try{await b.default.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );`),await b.default.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION set_updated_at()
           RETURNS TRIGGER AS $$
           BEGIN
             NEW.updated_at = NOW();
             RETURN NEW;
           END;
           $$ LANGUAGE plpgsql;`),await b.default.$executeRawUnsafe(`DO $$
           BEGIN
             IF NOT EXISTS (
               SELECT 1 FROM pg_trigger WHERE tgname = 'app_settings_set_updated_at'
             ) THEN
               CREATE TRIGGER app_settings_set_updated_at
               BEFORE UPDATE ON app_settings
               FOR EACH ROW EXECUTE FUNCTION set_updated_at();
             END IF;
           END $$;`)}finally{await b.default.$executeRawUnsafe("SELECT pg_advisory_unlock(hashtext('cid_ai_app_settings_ddl_lock'));")}}catch(a){console.warn("[APP-SETTINGS] ensureTable failed (non-fatal)",a)}})())}async function e(a){try{await d();let c=await b.default.$queryRawUnsafe("SELECT value FROM app_settings WHERE key = $1 LIMIT 1",a);if(c&&c.length>0)return c[0].value;return null}catch(a){return console.warn("[APP-SETTINGS] getSetting failed",a),null}}async function f(a,b){let c=await e(a);if(null==c)return b;let d=Number(c);return!Number.isFinite(d)||d<=0?b:Math.floor(d)}a.s(["getSettingInt",()=>f])},304613,a=>a.a(async(b,c)=>{try{a.s(["processChunkedAnalyticalQuery",()=>h]);var d=a.i(742150),e=b([d]);async function f(a,b,c,d){let e=[];for(let f=0;f<a.length;f+=3){let h=a.slice(f,f+3),i=h.map((d,e)=>g(d,f+e,a.length,b,c)),j=Math.floor(f/3)+1,k=Math.ceil(a.length/3);if(console.log(`[CHUNKED-PROCESSING] Processing batch ${j}/${k} with ${h.length} chunks`),d){let b=f,c=a.length;d(`Processing chunks ${b+1}-${Math.min(b+h.length,c)} of ${c}...`)}let l=await Promise.all(i);e.push(...l)}return e}async function g(a,b,c,e,f){console.log(`[CHUNKED-PROCESSING] Starting chunk ${b+1}/${c} with ${a.length} records`);let g=Date.now();try{let h=function(a){if(0===a.length)return"No records in this chunk.";let b=`CHUNK CONTEXT (${a.length} records):

`;return b+="RECORD INDEX:\n",a.forEach((a,c)=>{b+=`[${c+1}] Title: ${a.title} | Subject: ${a.subject||"Uncategorized"} | Date: ${a.entry_date_real?.toLocaleDateString()||"Unknown date"}
`}),b+="\nDETAILED RECORDS:\n",a.forEach((a,c)=>{let d=a.note||"No content available";b+=`
[RECORD ${c+1}]
Title: ${a.title}
Subject: ${a.subject||"Uncategorized"}
Date: ${a.entry_date_real?.toLocaleDateString()||"Unknown date"}
Content: ${d}
---
`}),b}(a),i=await (0,d.generateAIResponse)(e,h,f,"analytical_query"),j=Date.now()-g;return console.log(`[CHUNKED-PROCESSING] Completed chunk ${b+1}/${c} in ${j}ms (tokens: ${i.inputTokens} in, ${i.outputTokens} out)`),{text:i.text,inputTokens:i.inputTokens||0,outputTokens:i.outputTokens||0,error:!1}}catch(d){let a=d instanceof Error?d.message:"Unknown error";return console.error(`[CHUNKED-PROCESSING] ❌ Error processing chunk ${b+1}/${c}:`,a),{text:"",inputTokens:0,outputTokens:0,error:!0,errorMessage:a}}}async function h(a,b,c=[],e){let g,i=[],j=b.length;for(let a=0;a<j;a+=15)i.push(b.slice(a,a+15));console.log(`[CHUNKED-PROCESSING] Processing ${j} records in ${i.length} chunks with max 3 concurrent requests`),e&&e(`Processing ${j} records in ${i.length} chunks...`);let k=(g=a.toLowerCase()).match(/\b(count|how many|number of|total)\b/)?`From these records, extract ONLY: Case ID and Category.
Format each as: "ID: [id], Category: [category]"
One line per record. No additional text or narrative.`:g.match(/\b(list|show all|give me all|display)\b/)?`From these records, extract ONLY: ID, Title, Date.
Format as: "ID: [id] | Title: [title] | Date: [date]"
One line per record. Be concise. No narrative.`:g.match(/\b(age|years old|victim.*age|suspect.*age)\b/)?`From these records, extract ONLY names and ages of victims/suspects.
Format as: "Name (Age: X)" or "Name (Age: Unknown)" if not found.
One per line. Omit entries without names. No other text.`:g.match(/\b(victim|suspect)\b.*\b(name|who|person)/)?`From these records, extract ONLY victim and suspect information.
Format as:
- Victim: [name], Age: [age]
- Suspect: [name], Age: [age]
One set per record. Mark as "Unknown" if not found. Keep it concise.`:g.match(/\b(location|place|where|address)\b/)?`From these records, extract ONLY locations/places mentioned.
Format as: "Case ID: [id] | Location: [location]"
One line per record. Be specific. No narrative.`:g.match(/\b(summar|pattern|trend|distribution|analysis)\b/)?`From these records, extract key data points relevant to: "${a}"
Format as concise bullet points. Include:
- Case IDs
- Relevant categories/attributes
- Key numbers or facts
Raw data only - analysis will come later. Be concise.`:g.match(/\b(group by|grouped by|organize by|by category)\b/)?`From these records, extract: ID, relevant grouping field (category), and title.
Format as: "[grouping]: ID [id] - [title]"
One line per record. Keep it structured and concise.`:`From these records, extract information relevant to: "${a}"
Format as structured bullet points. Include case IDs for reference.
Be concise - extract key data only. Analysis comes later.
Keep responses short - aim for 2-3 lines per record max.`;console.log(`[CHUNKED-PROCESSING] Using extraction strategy: ${k.split("\n")[0].substring(0,80)}...`);let l=0,m=0,n=Date.now(),o=await f(i,k,c,e),p=Date.now()-n;o.forEach(a=>{l+=a.inputTokens,m+=a.outputTokens});let q=o.filter(a=>a.error),r=o.filter(a=>!a.error);q.length>0&&(console.warn(`[CHUNKED-PROCESSING] ⚠️ ${q.length}/${i.length} chunks failed. Results may be incomplete.`),q.forEach((a,b)=>{console.warn(`[CHUNKED-PROCESSING] Failed chunk ${b+1}: ${a.errorMessage}`)}));let s=r.map(a=>a.text);console.log(`[CHUNKED-PROCESSING] All chunks processed in ${p}ms (${r.length}/${i.length} successful). Total tokens from chunks: ${l} in, ${m} out`);let t=`Here is data extracted from ${r.length}/${i.length} chunks (${j} total records):`;q.length>0&&(t+=`

⚠️ WARNING: ${q.length} chunk(s) failed to process due to errors. The analysis below is based on ${r.length} successful chunks and may be incomplete.
`),t+=`

${s.join("\n\n=== NEXT CHUNK ===\n\n")}

Based on all the extracted information above, provide a complete, organized answer to the user's question: "${a}"`,q.length>0&&(t+=`

Note: Some data chunks failed to process. Please acknowledge in your response that the results may be incomplete (e.g., "Based on available data..." or "From the processed records...").`);let u=t.length;console.log(`[CHUNKED-PROCESSING] Final context size: ${u} characters (~${Math.round(u/4)} tokens)`),u>8e3&&console.warn(`[CHUNKED-PROCESSING] ⚠️ Large final context detected (${u} chars). This may slow down synthesis or cause timeouts. Consider refining extraction prompts for more concise output.`),e&&e(`Synthesizing final response from ${r.length} chunks...`);let v=Date.now(),w=await (0,d.generateAIResponse)(a,t,c,"analytical_query"),x=Date.now()-v;return l+=w.inputTokens||0,m+=w.outputTokens||0,console.log(`[CHUNKED-PROCESSING] Final synthesis completed in ${x}ms (tokens: ${w.inputTokens} in, ${w.outputTokens} out)`),console.log(`[CHUNKED-PROCESSING] ✅ Total processing time: ${p+x}ms`),console.log(`[CHUNKED-PROCESSING] ✅ Total token usage: ${l} input + ${m} output = ${l+m} tokens`),{text:w.text,inputTokens:l,outputTokens:m}}[d]=e.then?(await e)():e,c()}catch(a){c(a)}},!1),15917,a=>{"use strict";var b=a.i(983111);let c=b.z.object({title:b.z.string().describe("A short, descriptive title for the chart"),type:b.z.enum(["bar","line","pie","area"]).describe("The type of chart to render"),description:b.z.string().describe("A 1-sentence insight about this data"),xAxisKey:b.z.string().describe("The JSON key to use for the X-axis (e.g., 'month', 'category')"),seriesKeys:b.z.array(b.z.string()).describe("List of JSON keys to plot as data series (e.g., ['revenue', 'cost'])"),data:b.z.union([b.z.string(),b.z.array(b.z.record(b.z.any()))]).describe("The raw data points as a JSON string or array of objects")});a.s(["ChartSchema",0,c])},742150,a=>a.a(async(b,c)=>{try{a.s(["generateAIResponse",()=>n,"generateBatchQuestions",()=>o,"generateQuiz",()=>p,"generateStudyMaterials",()=>r,"gradeQuiz",()=>q]),a.i(766518);var d=a.i(133477),e=a.i(138957);a.i(830109);var f=a.i(304613),g=a.i(15917),h=a.i(975523),i=a.i(799633),j=a.i(983111),k=b([e,f]);async function l(a,b=9e4,c="AI API call"){let d=new Promise((a,d)=>{setTimeout(()=>{d(Error(`${c} timed out after ${b/1e3} seconds`))},b)});return Promise.race([a,d])}function m(a){return Math.ceil(a.length/4)}async function n(a,b,c=[],e="specific_search",f={}){["specific_search","analytical_query","follow_up","elaboration","general","recent_files","visualization"].includes(e)||(e="specific_search");let{client:j,keyId:k}=await (0,d.getGeminiClient)({provider:"gemini",keyId:f.keyId}),o=await (0,d.getActiveModelNames)("gemini"),p=Array.from(new Set([f.model,...o].filter(Boolean)));if(0===p.length){let a=process.env.GEMINI_DEFAULT_MODEL||"gemini-2.0-flash";p.push(a)}let q=c.slice(-4),r=q.length>0?`
CONVERSATION HISTORY:
${q.map(a=>`${a.role.toUpperCase()}: ${a.content}`).join("\n")}
`:"",s="";switch(e){case"analytical_query":s=`
- **Goal:** Provide a clear, comprehensive explanation that helps students understand the topic.
- **Structure:**
  1. **Simple Overview:** Start with a 2-3 sentence explanation in plain language that answers the core question.
  2. **Main Concepts:** Break down the topic into key concepts, explaining each one simply with examples.
  3. **Organized Information:** Group related information by themes (e.g., "Key Points", "How It Works", "Examples", "Important Details").
  4. **Visual Aids:** If numbers/dates are involved, create a Markdown table to make comparisons easy to understand.
  5. **Summary:** End with a brief recap that reinforces the main points.
- **Remember:** Use analogies, real-world examples, and step-by-step explanations to make complex topics easy to grasp.
`;break;case"follow_up":s=`
- This is a follow-up question referring to previous conversation.
- Use both the conversation history and database records to answer.
- Connect the current question to what was discussed before, building on previous explanations.
- If the student is asking for clarification, provide a simpler explanation or use a different analogy.
`;break;case"elaboration":s=`
- The student wants more detailed information or a deeper explanation.
- Provide comprehensive details from the study materials, but keep explanations simple and clear.
- Expand on the information with additional context, examples, and analogies.
- Break down complex details into smaller, understandable pieces.
`;break;case"recent_files":s=`
- The student asked for recent/latest chapters or materials.
- Present the information in a clear, organized manner.
- Include chapter titles, subjects, and dates.
- Mention they are sorted by most recent first.
`;break;default:s=`
- Answer the student's specific question using the provided study materials.
- Explain concepts in simple terms with examples and analogies.
- Be factual and cite relevant information by referencing chapter titles.
- Provide clear, organized information that's easy to follow.
- If explaining a concept, start with the basics and build up to more complex ideas.
`}let t=`You are a friendly and patient AI tutor helping students learn from their educational materials.
Your task is to explain concepts in simple, easy-to-understand terms using *only* the provided Database Context.

=== DATABASE CONTEXT ===
${b}

=== CONVERSATION HISTORY ===
${r}

=== USER QUESTION ===
"${a}"

=== SYSTEM INSTRUCTIONS ===
1. **Student-Friendly Explanations (MOST IMPORTANT):**
   - Explain everything in simple, clear language that students can easily understand.
   - Break down complex concepts into smaller, digestible parts.
   - Use everyday analogies and examples to help students relate to the material.
   - Avoid jargon unless necessary, and always explain technical terms when you use them.
   - Use a conversational, encouraging tone - like a helpful teacher explaining to a student.
   - If explaining a process, use step-by-step instructions with clear numbering or bullet points.
   - Relate concepts to real-world examples that students can visualize.

2. **Strict Citations:** You MUST support every factual claim with a reference to the source chapter/title.
   - Format: Use the chapter title/name directly, or (Source: Chapter Title).
   - Example: "According to the chapter on Introduction (Source: Introduction), the concept works like this..."
   - Always use the exact chapter title as shown in the context.

3. **Hybrid Synthesis:** The context contains both "Keyword Matches" (exact words) and "Semantic Matches" (related concepts).
   - If the user asks about a specific topic, synthesize information from multiple relevant pages.
   - Connect related concepts across different parts of the material.
   - Always cite chapters by their title/name.

4. **Formatting:**
   - Use Markdown tables for structured data (comparisons, lists, key points).
   - Use bullet points for lists and step-by-step explanations.
   - **Bold** key terms, important concepts, and definitions.
   - Use numbered lists for processes or sequences.
   - Break up long explanations into short paragraphs for easy reading.

5. **Data Visualization:**
   - You have the capability to generate charts (bar, line, pie, area).
   - If the user asks to "visualize", "chart", "plot", or "graph" data, acknowledge the request.
   - The system will automatically detect this intent and generate the chart for you.
   - You do not need to generate ASCII charts; a real interactive chart will be rendered.

6. **Honesty:**
   - If the provided records do not contain the answer, state: "I cannot find information about [X] in the current study materials."
   - Do not invent information.
   - If you're not sure, say so and suggest what the student might look for.

${s}

Remember: Your goal is to help students understand, not just to provide information. Make learning easy and enjoyable!

Answer:`;if("visualization"===e)try{console.log("[AI-GEN] Generating structured chart configuration...");let c=await (0,d.getActiveModelNames)("gemini"),e=process.env.GEMINI_DEFAULT_MODEL||"gemini-2.0-flash",j=f.model||c[0]||e,{apiKey:k}=await (0,d.getProviderApiKey)({provider:"gemini"}),l=k||process.env.GEMINI_API_KEY;if(!l)throw Error("No Gemini API key configured for chart generation");let m=(0,i.createGoogleGenerativeAI)({apiKey:l}),{object:n}=await (0,h.generateObject)({model:m(j),schema:g.ChartSchema,prompt:`
You are a data visualization expert.
Context:
${b}

Conversation History:
${r}

User Query: ${a}

Generate a chart configuration based on the user's query and the provided context.
If the data is not sufficient to create a chart, create a chart with empty data and a title indicating "Insufficient Data".
Ensure the data is cleaned (remove currency symbols, handle missing values).
`}),o=n.data;if("string"==typeof n.data)try{o=JSON.parse(n.data)}catch(a){console.error("Failed to parse chart data string:",a),o=[]}let p={...n,data:o};return console.log("[CHART] Generated chart config:",JSON.stringify(p,null,2)),{text:`Here is the ${n.type} chart you requested based on the data.`,inputTokens:0,outputTokens:0,chartData:p}}catch(a){console.error("[CHART] Failed to generate chart:",a),console.error("[CHART] Error details:",a instanceof Error?a.message:String(a)),console.log("[CHART] Falling back to text generation...")}let u=null;for(let a of p)try{var v;console.log(`[AI-GEN] Sending request to Gemini API, model=${a}, prompt size: ${t.length} characters`);let b=function(a){let b=`${a}_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;return console.time(`[TIMING] ${b}`),console.log(`[TIMING-START] ${a}`),{startTime:Date.now(),uniqueLabel:b}}("Gemini API Call"),c=j.getGenerativeModel({model:a}),e=0;try{let a=await c.countTokens({contents:[{role:"user",parts:[{text:t}]}]});e=a?.totalTokens??a?.totalTokenCount??0}catch(a){e=m(t),console.warn("[AI-GEN] countTokens failed; using heuristic",a)}let f=await l(c.generateContent(t),9e4,`AI response generation (${a})`),g=await f.response,h=g.text();!function(a,b){let c=Date.now()-b.startTime;console.timeEnd(`[TIMING] ${b.uniqueLabel}`),console.log(`[TIMING-END] ${a} took ${c}ms`)}("Gemini API Call",b);let i=g?.usageMetadata,n=i?.candidatesTokenCount??i?.totalTokenCount??m(h);return v={inputTokens:e,outputTokens:n,modelName:a},console.log("[AI-SERVICE-DEV] AI response generated successfully"),void 0!==v&&console.log(v),console.log("---"),k&&await (0,d.recordKeyUsage)(k,!0),{text:h,inputTokens:e,outputTokens:n}}catch(b){u=b,k&&await (0,d.recordKeyUsage)(k,!1),(b?.message||String(b)).includes("timed out")?console.warn(`[AI-GEN] Response generation timeout after 90s with model: ${a}`):console.warn(`[AI-GEN] model attempt failed: ${a}`,b);continue}if(console.error("AI response generation error (all models failed):",u),u?.message&&u.message.includes("429"))throw Error("RATE_LIMIT_EXCEEDED");let w=u?`: ${u.message||String(u)}`:" (no models available or configured)";throw Error(`Failed to generate AI response${w}`)}[e,f]=k.then?(await k)():k;let s=j.z.object({question_text:j.z.string(),question_type:j.z.enum(["MCQ","TRUE_FALSE","FILL_IN_BLANK","SHORT_ANSWER","LONG_ANSWER"]),options:j.z.array(j.z.string()).optional().describe("Array of options for MCQ/TF. Null for others."),correct_answer:j.z.union([j.z.string(),j.z.number(),j.z.array(j.z.string())]).describe("The correct answer. MUST be the exact string from the options array for MCQ/TrueFalse."),points:j.z.number().default(1),explanation:j.z.string().describe("Explanation of why the answer is correct")}),t=j.z.object({title:j.z.string(),description:j.z.string(),questions:j.z.array(s)}),u=j.z.object({questions:j.z.array(j.z.object({question_text:j.z.string().describe("The question text"),question_type:j.z.enum(["MCQ","TRUE_FALSE","FILL_IN_BLANK","SHORT_ANSWER","LONG_ANSWER"]),difficulty:j.z.enum(["easy","medium","hard"]),options:j.z.array(j.z.string()).optional().describe("Options for MCQ (4 options) or TRUE_FALSE (2 options)"),correct_answer:j.z.any().describe("The correct answer. For MCQ/TF/FIB: string. For Short/Long: model answer string."),explanation:j.z.string().describe("Detailed explanation of why the answer is correct"),points:j.z.number().describe("Points value: Easy=1, Medium=3, Hard=5")}))});async function o(a){let{context:b,chapterTitle:c,config:e}=a,f=[],g=0;if(["easy","medium","hard"].forEach(a=>{Object.entries(e[a]).forEach(([b,c])=>{c&&c>0&&(f.push(`${c} ${a.toUpperCase()} ${b} questions`),g+=c)})}),0===g)return[];let j=`You are an expert educational content creator.
Your task is to generate exactly ${g} questions for the chapter section: "${c}".

=== SOURCE MATERIAL ===
${b}
=== END SOURCE MATERIAL ===

REQUIREMENTS:
Generate the following mix of questions based STRICTLY on the source material above:
${f.map(a=>`• ${a}`).join("\n")}

RULES:
1. Questions must be high-quality, clear, and unambiguous.
2. COVERAGE: Ensure questions cover different parts of the text, not just the first paragraph.
3. DIFFICULTY:
   - EASY: Recall facts, definitions, simple concepts.
   - MEDIUM: Apply concepts, compare/contrast, explain "why".
   - HARD: Analyze, synthesize, evaluate, complex scenarios.
4. TYPES:
   - MCQ: Provide 4 distinct options. One correct.
   - TRUE_FALSE: Provide "True" and "False" as options.
   - FILL_IN_BLANK: The answer should be a specific word or short phrase from the text.
   - SHORT_ANSWER: Model answer should be 1-3 sentences.
   - LONG_ANSWER: Model answer should be a detailed paragraph.
5. EXPLANATION: Provide a helpful explanation for the correct answer.
6. SELF-CONTAINED QUESTIONS:
   - DO NOT reference external materials like "the provided algorithm", "the given diagram", "the figure", "the table", "Case 1/2/3", "the image", "the flowchart", etc.
   - Questions must be fully self-contained and understandable without any visual aids or external references.
   - Include all necessary context within the question itself.
7. PHRASING:
   - AVOID: "According to the text, ..." or "The text states that ..."
   - PREFER: Direct questions (e.g., "What is the time complexity of...?") OR "According to the chapter, ..." if needed.
   - Questions should sound natural and professional, as if from an exam paper.
8. NO META-QUESTIONS: Do not ask "What does the text say about...", just ask the question directly.

Output a JSON object with a "questions" array.`;try{let{apiKey:a}=await (0,d.getProviderApiKey)({provider:"gemini"}),b=a||process.env.GEMINI_API_KEY;if(!b)throw Error("No Gemini API key found");let c=(0,i.createGoogleGenerativeAI)({apiKey:b}),e=[],f=await (0,d.getActiveModelNames)("gemini");e.push(...f);let g=process.env.GEMINI_DEFAULT_MODEL||"gemini-2.0-flash";for(let a of(e.push(g),[...new Set(e)]))try{return console.log(`[AI-BATCH] Attempting to generate questions with model: ${a}`),(await (0,h.generateObject)({model:c(a),schema:u,prompt:j,mode:"json"})).object.questions.map(a=>{let b=1;switch(a.question_type){case"MCQ":case"TRUE_FALSE":case"FILL_IN_BLANK":b=1;break;case"SHORT_ANSWER":b=3;break;case"LONG_ANSWER":b=5}return a.points!==b&&console.log(`[AI-BATCH] Correcting points for ${a.question_type}: ${a.points} → ${b}`),{...a,points:b}})}catch(b){console.warn(`[AI-BATCH] Failed with model ${a}: ${b.message}`)}throw Error("All models failed to generate questions")}catch(a){return console.error("[AI-SERVICE] Batch question generation failed:",a),[]}}async function p(a,b={}){try{let c,{client:e,keyId:f}=await (0,d.getGeminiClient)({provider:"gemini",keyId:b.keyId}),{apiKey:g}=await (0,d.getProviderApiKey)({provider:"gemini",keyId:b.keyId}),j=g||process.env.GEMINI_API_KEY;if(!j)throw Error("No Gemini API key found. Add a key in admin settings or set GEMINI_API_KEY.");let k=(0,i.createGoogleGenerativeAI)({apiKey:j}),l=a.questionTypes.map((b,c)=>{let d=Math.floor(a.questionCount/a.questionTypes.length)+ +(c<a.questionCount%a.questionTypes.length);return`${d}x ${b}`}).join(", "),m=b.board?`You are an expert ${b.board} question setter.`:"",n=b.level?`The target audience is ${b.level} students.`:"",o=`${m} ${n}
You are creating a ${a.difficulty}-level educational quiz for students studying "${a.subject}: ${a.topic}".

**Subject**: ${a.subject}
**Chapter**: ${a.topic}
**Difficulty**: ${a.difficulty}

=== EDUCATIONAL MATERIAL ===
The following is the study material from the textbook chapter on this topic. Use this to create meaningful questions that test students' understanding of the concepts, facts, and knowledge they should learn from this chapter.

${a.context}

=== END OF EDUCATIONAL MATERIAL ===

QUIZ REQUIREMENTS:
• Total: ${a.questionCount} questions (${l})
• Types: ONLY ${a.questionTypes.join(", ")}
• ALL questions must test understanding of concepts and knowledge from the educational material above
• MCQ: 4 options, correct_answer = exact option text, 1 point
  ${"hard"===a.difficulty?'• **HARD DIFFICULTY MCQs**: For hard difficulty, include 20-30% multi-select MCQs where multiple options are correct. Format: correct_answer = array of exact option texts (e.g., ["A. option1", "B. option2"]). Question text MUST include keywords like "correct reason(s)", "correct options are", or use pattern (i), (ii), (iii), (iv) to indicate multi-select.':""}
• TRUE_FALSE: 2 options ("True", "False"), correct_answer = exact text, 1 point  
• FILL_IN_BLANK: correct_answer = missing word/phrase, 1 point
• SHORT_ANSWER: correct_answer = 2-3 sentence model answer, 2 points
• LONG_ANSWER: correct_answer = 5+ sentence detailed answer, 5 points

CRITICAL RULES - QUESTIONS MUST:
✓ Test actual subject knowledge and concepts
✓ Be completely self-contained and understandable without any visual aids
✓ Be answerable using the knowledge from the educational material
✓ Focus on "what", "why", and "how" of the subject matter
✓ Include all necessary context within the question itself

STRICTLY PROHIBITED - DO NOT CREATE:
✗ Questions referencing unavailable materials: "the provided algorithm", "the given diagram", "the figure", "the table", "Case 1/2/3", "the image", "the flowchart", "the graph"
✗ Questions about document structure (e.g., "what number appears in the content")
✗ Questions referencing "Activity X.X", "Figure X.X", "Table X.X", or "Box X.X" numbers
✗ Questions using phrases like "According to the text", "The text states", "the provided text", "the content above", "the material shown"
✗ Questions about formatting, layout, or visual presentation
✗ Questions that reference section numbers, page numbers, or document organization
✗ Meta-questions about the text itself rather than the subject matter

PHRASING GUIDELINES:
✓ GOOD: Direct questions (e.g., "What is the time complexity of binary search?")
✓ ACCEPTABLE: "According to the chapter, what is..."
✗ AVOID: "According to the text, what is..."
✗ AVOID: "The text states that..."

EXAMPLES:
❌ BAD: "In the provided 'Remove' algorithm, which case is executed when...?"
✅ GOOD: "In a linked list removal operation, what happens when the list contains only one node that matches the value to be removed?"

❌ BAD: "Which of the following numbers is shown in the provided content?"
✅ GOOD: "What is the boiling point of water in Celsius?"

❌ BAD: "According to the text, which data structure is used for BFS?"
✅ GOOD: "Which data structure is traditionally used in the implementation of breadth-first traversal?"

❌ BAD: "According to Figure 2.1, what process is shown?"
✅ GOOD: "What is the process by which water vapor turns into liquid water?"

❌ BAD: "In Activity 1.3, what was demonstrated?"
✅ GOOD: "What happens when you mix an acid with a base?"

Remember: You are testing students' knowledge of ${a.subject}, not their ability to read the textbook layout! Questions should be professional exam-style questions that stand alone without any external references.`,p=[];b.model&&p.push(b.model);let q=await (0,d.getActiveModelNames)("gemini");p.push(...q);let r=process.env.GEMINI_DEFAULT_MODEL||"gemini-2.0-flash";for(let a of(p.push(r),[...new Set(p)]))try{console.log(`[AI-QUIZ] Attempting to generate quiz with model: ${a}`);let b=(0,h.generateObject)({model:k(a),schema:t,prompt:o}),c=await Promise.race([b,new Promise((a,b)=>setTimeout(()=>b(Error("Quiz generation timed out after 90 seconds")),9e4))]);return console.log(`[AI-QUIZ] Successfully generated quiz with ${c.object.questions.length} questions`),c.object.questions=c.object.questions.map(a=>{let b=1;switch(a.question_type){case"MCQ":case"TRUE_FALSE":case"FILL_IN_BLANK":b=1;break;case"SHORT_ANSWER":b=2;break;case"LONG_ANSWER":b=5}return a.points!==b&&console.log(`[AI-QUIZ] Correcting points for ${a.question_type}: ${a.points} → ${b}`),{...a,points:b}}),f&&await (0,d.recordKeyUsage)(f,!0),c.object}catch(d){if(console.warn(`[AI-QUIZ] Failed with model ${a}: ${d.message}`),c=d,!(d.message.includes("429")||d.message.includes("404")||d.message.includes("quota")||d.message.includes("not found")||d.message.includes("overloaded"))&&b.model)throw d}throw c||Error("Failed to generate quiz with all available models")}catch(a){throw console.error("Error generating quiz:",a),Error(`Failed to generate quiz: ${a.message||String(a)}`)}}async function q(a,b={}){try{let c=a.filter(a=>["SHORT_ANSWER","LONG_ANSWER"].includes(a.type));if(0===c.length)return[];let{client:e,keyId:f}=await (0,d.getGeminiClient)({provider:"gemini",keyId:b.keyId}),g=await (0,d.getActiveModelNames)("gemini"),k=process.env.GEMINI_DEFAULT_MODEL||"gemini-2.0-flash",l=b.model||g[0]||k,{apiKey:m}=await (0,d.getProviderApiKey)({provider:"gemini",keyId:b.keyId}),n=m||process.env.GEMINI_API_KEY;if(!n)throw Error("No Gemini API key found. Add a key in admin settings or set GEMINI_API_KEY.");let o=(0,i.createGoogleGenerativeAI)({apiKey:n}),p=j.z.object({grades:j.z.array(j.z.object({question_text:j.z.string(),is_correct:j.z.boolean(),score_percentage:j.z.number().min(0).max(100),feedback:j.z.string()}))}),q=`Grade the following student answers based on the model answer.
        
        Questions:
        ${JSON.stringify(c,null,2)}
        
        Provide a score (0-100) and feedback for each. Be lenient on phrasing but strict on factual accuracy.`,r=await (0,h.generateObject)({model:o(l),schema:p,prompt:q});return f&&await (0,d.recordKeyUsage)(f,!0),r.object.grades}catch(a){throw console.error("Error grading quiz:",a),Error("Failed to grade quiz")}}let v=j.z.object({summary_markdown:j.z.string().describe("A comprehensive 5-minute read summary of the chapter in markdown format"),key_terms:j.z.array(j.z.object({term:j.z.string(),definition:j.z.string()})).describe("Glossary of important terms and concepts with clear definitions"),flashcards:j.z.array(j.z.object({front:j.z.string().describe("Question or term"),back:j.z.string().describe("Answer or definition")})).min(10).max(20).describe("10-20 flashcard pairs for quick revision"),youtube_search_queries:j.z.array(j.z.string()).length(3).describe("3 precise search terms to find the best educational videos for this topic"),mind_map_mermaid:j.z.string().describe("Mermaid.js flowchart syntax representing the chapter's concept hierarchy"),important_formulas:j.z.array(j.z.object({name:j.z.string(),formula:j.z.string(),explanation:j.z.string()})).optional().describe("Key formulas if this is a math/science chapter")});async function r(a,b={}){try{let{client:c,keyId:e}=await (0,d.getGeminiClient)({provider:"gemini",keyId:b.keyId}),f=await (0,d.getActiveModelNames)("gemini"),g=process.env.GEMINI_DEFAULT_MODEL||"gemini-2.0-flash	",j=b.model||f[0]||g,{apiKey:k}=await (0,d.getProviderApiKey)({provider:"gemini",keyId:b.keyId});if(!k)throw Error("No Gemini API key found");let l=(0,i.createGoogleGenerativeAI)({apiKey:k}),m=a.content.substring(0,4e4),n=`Generate comprehensive study materials for the following chapter.

Chapter: ${a.subject} - ${a.chapterTitle}

Content:
${m}

Generate the following study materials:
1. A comprehensive summary (5-minute read) formatted in **Markdown**.
   - **Formatting:**
   - Use **bold** for key terms.
   - Use bullet points for lists.
   - Use \`code blocks\` for code.
   - **NO TABLES:** Do not use Markdown tables. They do not render well on mobile devices. Use bulleted lists or clear text structures instead.
   - **Newlines:** Use double newlines between paragraphs for better readability.
   - Use bullet points for lists.
   - Use **bold** for key concepts.
2. A glossary of important terms and definitions.
3. 10-20 flashcard pairs (front: question/term, back: answer/definition).
4. 3 specific YouTube search queries to find the best educational videos.
5. A Mermaid.js **flowchart** diagram to visualize the concepts.
   - Start with "graph TD" (Top-Down).
   - Use simple node labels like [Main Topic] --> [Subtopic].
   - AVOID special characters like (), {}, or quotes inside the node text.
   - Example:
     graph TD
       A[Main Topic] --> B[Subtopic 1]
       A --> C[Subtopic 2]
       B --> D[Detail 1]
6. If applicable, list important formulas with explanations.

Make the materials student-friendly, clear, and focused on exam preparation.`,o=await (0,h.generateObject)({model:l(j),schema:v,prompt:n});return e&&await (0,d.recordKeyUsage)(e,!0),o.object}catch(a){throw console.error("Error generating study materials:",a),Error("Failed to generate study materials")}}let w=j.z.object({question_text:j.z.string().describe("The full text of the question"),question_type:j.z.enum(["MCQ","SHORT_ANSWER","LONG_ANSWER","TRUE_FALSE","FILL_IN_THE_BLANK"]).describe("The type of question inferred from format"),points:j.z.number().optional().describe("Marks allocated to this question if specified"),options:j.z.array(j.z.string()).optional().describe("For MCQs, the list of options"),question_number:j.z.string().optional().describe("The question number as it appears in the paper (e.g. '1', '2(a)')")});j.z.object({questions:j.z.array(w).describe("List of all extracted questions")}),j.z.object({correct_answer:j.z.string().describe("The correct answer to the question"),explanation:j.z.string().describe("Detailed explanation of why this is the correct answer")}),j.z.object({answers:j.z.array(j.z.object({question_number:j.z.string().optional(),question_text_snippet:j.z.string().describe("First few words of question to identify it"),correct_answer:j.z.union([j.z.string(),j.z.array(j.z.string())]),explanation:j.z.string()}))}),c()}catch(a){c(a)}},!1)];

//# sourceMappingURL=src_lib_d4b09388._.js.map