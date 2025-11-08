# Test Guide: Hybrid Streaming Implementation

## 🎯 What to Test

You should test both **streaming mode** (small queries) and **chunked mode** (large queries) to ensure they work correctly.

---

## Test Scenario 1: Small Query → Should Use **STREAMING** ⚡

### Query Examples:

```
"Show me details for case ID 123"
"What happened in the murder case in Aizawl on March 12?"
"Find the victim named John"
```

### Expected Behavior:

1. **Initial**: "Analyzing your question and searching database..." (with spinner)
2. **After ~2s**: "Generating response..." (with spinner)
3. **After ~4s**: Text starts appearing **word by word** (streaming)
4. Sources appear below

### What to Check:

- ✅ Loading indicators appear
- ✅ Text streams in gradually (not all at once)
- ✅ Response time: 3-8 seconds
- ✅ Sources are accurate

### Browser Console Should Show:

```
[CHAT PROCESSING] Starting AI response streaming
[CHAT PROCESSING] Starting source extraction
```

---

## Test Scenario 2: Medium Query → Should Use **CHUNKED** 🔄

### Query Examples:

```
"Summarize all POCSO cases in Aizawl"
"List all murder cases with victim details in Lunglei"
"Show me all cases in Champhai district"
```

### Expected Behavior:

1. **Initial**: "Analyzing your question and searching database..." (with spinner)
2. **After ~3s**: "Generating response..." (with spinner)
3. **After ~18-25s**: **Complete response appears at once**
4. Sources appear below

### What to Check:

- ✅ Loading indicators appear
- ✅ Slightly longer wait (~20s) - this is normal
- ✅ Response appears **all at once** (not streaming word-by-word)
- ✅ Response is comprehensive and well-structured
- ✅ No timeout errors

### Browser Console Should Show:

```
[CHAT PROCESSING] Using chunked processing for 45 records (streaming disabled for large analytical queries)
[CHUNKED-PROCESSING] Processing 45 records in 3 chunks with max 3 concurrent requests
[CHUNKED-PROCESSING] Processing batch 1/1 with 3 chunks
[CHUNKED-PROCESSING] Completed chunk 1/3 in 5234ms
[CHUNKED-PROCESSING] Completed chunk 2/3 in 5421ms
[CHUNKED-PROCESSING] Completed chunk 3/3 in 5189ms
[CHUNKED-PROCESSING] All 3 chunks processed in 15844ms, synthesizing final response
[CHUNKED-PROCESSING] Final synthesis completed in 3421ms
[CHUNKED-PROCESSING] Total processing time: 19265ms
[CHAT PROCESSING] Chunked processing completed for 45 records
```

---

## Test Scenario 3: Large Query → Should Use **CHUNKED** 🔄

### Query Examples (NO district filter):

```
"Summarize all victims by age group"
"List all murder cases across all districts"
"Show me patterns in POCSO cases"
"Give me a complete list of all suspects"
```

### Expected Behavior:

1. **Initial**: "Analyzing your question and searching database..." (with spinner)
2. **After ~3s**: "Generating response..." (with spinner)
3. **After ~30-50s**: **Complete response appears at once**
4. Sources appear below

### What to Check:

- ✅ Loading indicators appear
- ✅ Longer wait (30-50s) - this is normal for 80-150 records
- ✅ Response appears **all at once**
- ✅ Response includes data from ALL records (comprehensive)
- ✅ **NO timeout error** (this is the critical fix!)
- ✅ Sources list shows multiple cases

### Browser Console Should Show:

```
[CHAT PROCESSING] Using chunked processing for 80 records (streaming disabled for large analytical queries)
[CHUNKED-PROCESSING] Processing 80 records in 6 chunks with max 3 concurrent requests
[CHUNKED-PROCESSING] Processing batch 1/2 with 3 chunks
[CHUNKED-PROCESSING] Processing batch 2/2 with 3 chunks
[CHUNKED-PROCESSING] All 6 chunks processed in 28734ms, synthesizing final response
[CHUNKED-PROCESSING] Final synthesis completed in 4129ms
[CHUNKED-PROCESSING] Total processing time: 32863ms
[CHAT PROCESSING] Chunked processing completed for 80 records
```

---

## Test Scenario 4: Edge Case - Exactly 20 Records

### Query Example:

```
"Show me cases from March 2024 in Aizawl"
(Assuming this returns exactly 20 records)
```

### Expected Behavior:

- Should use **STREAMING** (threshold is >20, not >=20)

---

## 🚨 What Would Indicate a Problem

| Issue                           | What You'd See                 | Likely Cause                      |
| ------------------------------- | ------------------------------ | --------------------------------- |
| **Timeout on large query**      | Error after 120s               | Chunked processing not activating |
| **No streaming on small query** | Text appears all at once       | Wrong mode selected               |
| **Incomplete response**         | Missing data from some records | Chunking issue                    |
| **Blank response**              | Empty chat bubble              | API error, check console          |
| **Wrong sources**               | Sources don't match response   | Citation algorithm issue          |

---

## ⚡ Quick Test Matrix

| Query              | Records | Expected Mode | Expected Time | Key Check      |
| ------------------ | ------- | ------------- | ------------- | -------------- |
| "Case ID 123"      | 1       | Streaming     | 3-5s          | Word-by-word   |
| "Aizawl murders"   | 15      | Streaming     | 6-8s          | Word-by-word   |
| "Aizawl all cases" | 45      | **Chunked**   | 18-22s        | All at once    |
| "All POCSO cases"  | 80      | **Chunked**   | 28-35s        | **No timeout** |
| "All cases"        | 150     | **Chunked**   | 45-55s        | **No timeout** |

---

## 📊 Performance Benchmarks (For Reference)

### With Gemini 1.5 Pro (Current):

- 15 records (streaming): ~7s
- 45 records (chunked): ~22s
- 80 records (chunked): ~35s
- 150 records (chunked): ~55s

### With Gemini Flash (Recommended):

- 15 records (streaming): ~4s
- 45 records (chunked): ~15s
- 80 records (chunked): ~25s
- 150 records (chunked): ~40s

---

## 🧪 How to Run Tests

1. **Open the admin chat interface**

   ```
   http://localhost:3000/admin/chat
   ```

2. **Open browser console** (F12 or Cmd+Option+I)

   - Watch for the `[CHUNKED-PROCESSING]` logs

3. **Test each scenario above**

   - Small queries → Verify streaming
   - Large queries → Verify chunked processing
   - Very large queries → Verify NO timeout

4. **Document any issues**
   - Which query?
   - How many records?
   - What went wrong?
   - Console errors?

---

## ✅ Success Criteria

- ✅ Small queries (1-20 records) stream word-by-word in <10s
- ✅ Large queries (21+ records) complete without timeout
- ✅ Very large queries (100+ records) complete in <60s
- ✅ No "504 Gateway Timeout" errors
- ✅ Responses are comprehensive and accurate
- ✅ Sources are correctly cited

---

## 🐛 If Something Goes Wrong

1. **Check console logs**:

   - Look for `[CHAT PROCESSING]` and `[CHUNKED-PROCESSING]` messages
   - Any error messages?

2. **Check network tab**:

   - Is the request hanging?
   - What's the response status?

3. **Check server logs**:

   - Any API errors?
   - Timeout messages?

4. **Try with smaller dataset**:
   - Add district filter to reduce records
   - Does it work then?

---

## 📞 Report Format (If Issues Found)

```
Query: "Summarize all victims"
Records: 80
Expected: Chunked processing, ~35s
Actual: [Describe what happened]
Error: [Any error messages]
Console logs: [Paste relevant logs]
```

---

**Ready to test!** Start with Scenario 1 (small query) to verify streaming works, then move to Scenario 3 (large query) to verify the critical timeout fix.
