#!/usr/bin/env node

const { PrismaClient } = require("../src/generated/prisma");
const { marked } = require("marked");

const prisma = new PrismaClient();

async function migrateToMarkdown() {
  try {
    console.log("🔄 Starting migration to Markdown format...");

    // Get all records with HTML content
    const records = await prisma.fileList.findMany({
      where: {
        note: {
          not: null,
        },
      },
      select: {
        id: true,
        note: true,
        note_plain_text: true,
      },
    });

    console.log(`📊 Found ${records.length} records to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const record of records) {
      if (record.note) {
        // Check if content is already in Markdown format
        if (isAlreadyMarkdown(record.note)) {
          console.log(
            `⏭️  Skipping record ${record.id} - already in Markdown format`
          );
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
          },
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
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n")
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n\n")
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, "##### $1\n\n")
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, "###### $1\n\n")

    // Text formatting
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*")
    .replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*")
    .replace(/<u[^>]*>(.*?)<\/u>/gi, "*$1*")

    // Lists
    .replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n") + "\n";
    })
    .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
      let counter = 1;
      return (
        content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${counter++}. $1\n`) +
        "\n"
      );
    })

    // Paragraphs and breaks
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<div[^>]*>(.*?)<\/div>/gi, "$1\n\n")

    // Links
    .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, "[$2]($1)")

    // Tables (basic conversion)
    .replace(/<table[^>]*>(.*?)<\/table>/gis, (match, content) => {
      let tableContent = content.replace(
        /<tr[^>]*>(.*?)<\/tr>/gis,
        (rowMatch, rowContent) => {
          return (
            rowContent.replace(/<t[dh][^>]*>(.*?)<\/t[dh]>/gi, "| $1 ") + "|\n"
          );
        }
      );

      // Add table header separator
      const lines = tableContent.split("\n").filter((line) => line.trim());
      if (lines.length > 0) {
        const headerSeparator = lines[0].replace(/\|[^|]*\|/g, "| --- |");
        lines.splice(1, 0, headerSeparator);
        tableContent = lines.join("\n") + "\n";
      }

      return "\n" + tableContent + "\n";
    })

    // Remove remaining HTML tags
    .replace(/<[^>]*>/g, "")

    // Clean up whitespace
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return markdown;
}

migrateToMarkdown();
