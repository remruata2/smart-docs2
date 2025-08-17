# Database Update Scripts for Markdown Conversion

This directory contains scripts to automatically update your database with the converted markdown content from HTML files.

## 📁 Files

- **`enhanced-html-converter.js`** - Converts HTML files to enhanced markdown
- **`update-database-with-markdown.js`** - Basic database update script
- **`update-database-advanced.js`** - Advanced database update script with dry-run mode

## 🚀 Quick Start

### 1. Convert HTML to Markdown

First, convert your HTML files to markdown:

```bash
node enhanced-html-converter.js
```

This will create files like:

- `1186-enhanced.md`
- `1974-enhanced.md`
- `3722-enhanced.md`
- etc.

### 2. Update Database with Markdown

Then update your database with the converted content:

#### Basic Script (Immediate Updates)

```bash
node update-database-with-markdown.js
```

#### Advanced Script (Safe with Dry-Run)

```bash
node update-database-advanced.js
```

## ⚙️ Configuration

### Advanced Script Configuration

Edit the `CONFIG` object in `update-database-advanced.js`:

```javascript
const CONFIG = {
	// Set to false to actually update the database
	dryRun: true,

	// Log level: 'verbose', 'normal', 'minimal'
	logLevel: "normal",

	// Backup original content before updating
	backupOriginal: true,

	// Maximum content length (1MB default)
	maxContentLength: 1000000,
};
```

## 🔍 How It Works

### File Matching Strategy

The scripts use multiple strategies to match markdown files to database records:

1. **Exact file_no match** - Highest confidence
2. **Contains file_no match** - Medium confidence
3. **Numeric ID match** - High confidence
4. **Fuzzy match** - Low confidence

### Example Matching

- `3722-enhanced.md` → Looks for record with `file_no` containing "3722"
- `494-enhanced.md` → Looks for record with `file_no` containing "494"

### Database Updates

For each successful match, the script:

1. **Backs up** original content (if enabled)
2. **Updates** the `note` column with markdown content
3. **Sets** `content_format` to 'markdown'
4. **Updates** `updated_at` timestamp

## 🛡️ Safety Features

### Dry-Run Mode (Advanced Script)

- **Default**: `dryRun: true` - Shows what would be updated without making changes
- **Production**: Set `dryRun: false` to actually update the database

### Content Validation

- Checks content length (prevents extremely long updates)
- Validates database connections
- Error handling for failed updates

### Backup System

- Creates backup files before updating
- Preserves original content and format
- Timestamped backup files

## 📊 Output Examples

### Successful Update

```
✅ Found record: ID 123, File No: "3722", Title: "Special Report"
✅ Successfully updated record 123
```

### Dry-Run Mode

```
🔄 DRY RUN: Would update record 123 with 2,856 characters
```

### Failed Match

```
⚠️  No database record found for file number: 9999
```

## 🚨 Prerequisites

1. **Database Connection**: Ensure your database is running and accessible
2. **Prisma Setup**: Database schema must be migrated and up-to-date
3. **Environment Variables**: `DATABASE_URL` must be configured
4. **Dependencies**: `@prisma/client` must be installed

## 🔧 Troubleshooting

### Common Issues

1. **"No matching record found"**

   - Check if the file number exists in your database
   - Verify the `file_no` column values
   - Use verbose logging to see search strategies

2. **"Prisma client not found"**

   - Run `npm install @prisma/client`
   - Ensure Prisma is properly generated

3. **"Database connection failed"**
   - Check your `DATABASE_URL` environment variable
   - Verify database is running and accessible

### Debug Mode

Set log level to verbose for detailed debugging:

```javascript
logLevel: "verbose";
```

## 📈 Workflow

1. **Convert**: HTML → Enhanced Markdown
2. **Test**: Run advanced script in dry-run mode
3. **Review**: Check which records would be updated
4. **Execute**: Set `dryRun: false` and run again
5. **Verify**: Check database for updated records

## 🎯 Use Cases

- **Document Migration**: Convert HTML archives to markdown
- **Content Updates**: Bulk update document content
- **Format Standardization**: Ensure consistent content format
- **Database Maintenance**: Update content format tracking

## 🔄 Automation

You can chain these scripts together:

```bash
# Convert and update in one go
node enhanced-html-converter.js && node update-database-advanced.js
```

Or add to your package.json scripts:

```json
{
	"scripts": {
		"convert-html": "node enhanced-html-converter.js",
		"update-db": "node update-database-advanced.js",
		"convert-and-update": "npm run convert-html && npm run update-db"
	}
}
```
