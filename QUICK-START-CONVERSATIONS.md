# Conversation History - Quick Start Guide

## 🚀 GET STARTED IN 3 STEPS

### Step 1: Run Database Migration (2 minutes)

**Open your terminal and run:**

```bash
# Navigate to project
cd /Users/remruata/projects/cid-ai

# Run migration (enter your PostgreSQL password when prompted)
psql -h localhost -U your_username -d ipcs -f add-conversations.sql
```

**Or manually in pgAdmin/TablePlus:**

1. Open `add-conversations.sql`
2. Copy all SQL
3. Execute in your PostgreSQL client

**Verify it worked:**

```sql
-- Run this query to check
SELECT * FROM conversations LIMIT 1;
SELECT * FROM conversation_messages LIMIT 1;

-- Should return empty tables (no error)
```

---

### Step 2: Restart Dev Server (30 seconds)

```bash
# Stop current server (Ctrl+C)
# Start again
npm run dev
```

---

### Step 3: Test It! (2 minutes)

1. Go to `http://localhost:3000/admin/chat`
2. Send a message: "Show me all cases"
3. **✅ Check:** Sidebar appears on left
4. **✅ Check:** "New Conversation" appears in sidebar
5. Send another message: "Show suspects"
6. **✅ Check:** Title changes to something descriptive (after ~2s)
7. Click "New Chat" button
8. **✅ Check:** Chat clears, new conversation starts
9. Click first conversation in sidebar
10. **✅ Check:** Previous messages load back!

---

## 🎉 YOU'RE DONE!

If all checks passed ✅, your conversation history is working!

---

## 🔍 WHAT TO LOOK FOR

### Sidebar (Left Side):

- [+ New Chat] button at top
- Search box
- Conversations grouped by date
- Hover over conversation → Actions menu (⋮)

### Chat Area (Right Side):

- Same as before, but now messages are saved
- Current conversation title at top
- Everything auto-saves

### Behind the Scenes:

- First message → Creates conversation
- Second message → Generates AI title
- Every message → Saved to database
- Click conversation → Loads from database

---

## 💡 TRY THESE FEATURES

### Search:

1. Create 3-4 conversations
2. Type in search box
3. Watch sidebar filter in real-time

### Pin:

1. Hover over a conversation
2. Click ⋮ (three dots)
3. Click "Pin"
4. Watch it move to "Pinned" section

### Rename:

1. Hover over a conversation
2. Click ⋮ → "Rename"
3. Type new name → Press Enter
4. Check sidebar updates

### Delete:

1. Hover over a conversation
2. Click ⋮ → "Delete"
3. Confirm deletion
4. Watch it disappear

---

## ⚠️ TROUBLESHOOTING

### "No conversations showing"

- Send at least one message first
- Check browser console for errors
- Verify database migration ran

### "Title not generating"

- Wait 2-3 seconds after 2nd message
- Check if Gemini API key is configured
- Look for errors in server logs

### "Sidebar layout broken"

- Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+F5)
- Clear browser cache
- Check for console errors

### "Can't load conversation"

- Check server logs for API errors
- Verify conversation exists in database:
  ```sql
  SELECT * FROM conversations;
  ```

---

## 📞 NEED HELP?

Check these files for details:

- `CONVERSATION-HISTORY-COMPLETE.md` - Full documentation
- `CONVERSATION-HISTORY-IMPLEMENTATION.md` - Technical details
- `add-conversations.sql` - Database migration

---

## 🎊 ENJOY YOUR NEW FEATURE!

You now have ChatGPT-style conversation history in your AI chat system!

Every conversation is:

- ✅ Automatically saved
- ✅ Organized by date
- ✅ Searchable
- ✅ Accessible anytime

**No more lost conversations!** 🎉
