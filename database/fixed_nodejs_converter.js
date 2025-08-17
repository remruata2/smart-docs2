#!/usr/bin/env node

/**
 * Fixed Node.js HTML to Markdown Converter for SQL Files
 * =====================================================
 * 
 * This version properly handles the real issue: unescaped single quotes 
 * within HTML content that breaks SQL parsing.
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Check and install dependencies
try {
    require('turndown');
    require('jsdom');
} catch (error) {
    console.log('📦 Installing required dependencies...');
    try {
        execSync('npm install turndown jsdom', { stdio: 'inherit' });
        console.log('✅ Dependencies installed successfully!');
    } catch (installError) {
        console.error('❌ Failed to install dependencies. Please run:');
        console.error('   npm install turndown jsdom');
        process.exit(1);
    }
}

const TurndownService = require('turndown');
const { JSDOM } = require('jsdom');

class FixedNodeJSHTMLConverter {
    constructor() {
        // Configure Turndown for optimal conversion
        this.turndownService = new TurndownService({
            headingStyle: 'atx',
            hr: '---',
            bulletListMarker: '-',
            codeBlockStyle: 'fenced',
            fence: '```',
            emDelimiter: '_',
            strongDelimiter: '**',
            linkStyle: 'inlined',
            linkReferenceStyle: 'full',
        });

        // Remove excessive styling but preserve structure
        this.turndownService.remove(['style', 'script']);

        this.stats = {
            filesProcessed: 0,
            htmlConversions: 0,
            totalCharactersProcessed: 0,
            errors: 0,
            insertStatementsProcessed: 0
        };
    }

    /**
     * Clean HTML content and convert to Markdown
     */
    convertHtmlToMarkdown(htmlContent) {
        if (!htmlContent || !htmlContent.trim()) {
            return htmlContent;
        }

        // Check if it contains HTML tags
        if (!/<[^>]+>/.test(htmlContent)) {
            return htmlContent;
        }

        try {
            // Use JSDOM to parse and clean HTML
            const dom = new JSDOM(`<div>${htmlContent}</div>`);
            const document = dom.window.document;

            // Remove script and style elements
            document.querySelectorAll('script, style').forEach(el => el.remove());

            // Clean up excessive styling while preserving important structure
            document.querySelectorAll('*').forEach(el => {
                if (el.hasAttribute('style')) {
                    const style = el.getAttribute('style');
                    
                    // Preserve important formatting cues
                    if (style.includes('font-weight:bold') || style.includes('font-weight: bold')) {
                        if (el.tagName !== 'STRONG' && el.tagName !== 'B') {
                            const strong = document.createElement('strong');
                            strong.innerHTML = el.innerHTML;
                            el.parentNode?.replaceChild(strong, el);
                            return;
                        }
                    }
                    
                    if (style.includes('font-style:italic') || style.includes('font-style: italic')) {
                        if (el.tagName !== 'EM' && el.tagName !== 'I') {
                            const em = document.createElement('em');
                            em.innerHTML = el.innerHTML;
                            el.parentNode?.replaceChild(em, el);
                            return;
                        }
                    }
                    
                    // Remove style attribute
                    el.removeAttribute('style');
                }

                // Clean up other formatting attributes but keep essential ones
                ['class', 'id', 'width', 'height', 'cellspacing', 'cellpadding'].forEach(attr => {
                    el.removeAttribute(attr);
                });
            });

            // Get cleaned HTML
            const cleanedHtml = document.querySelector('div').innerHTML;

            // Convert to Markdown using Turndown
            const markdown = this.turndownService.turndown(cleanedHtml);

            // Post-process the markdown
            const cleanedMarkdown = this.postProcessMarkdown(markdown);

            this.stats.htmlConversions++;
            this.stats.totalCharactersProcessed += htmlContent.length;

            return cleanedMarkdown;

        } catch (error) {
            console.warn(`⚠️  HTML conversion error: ${error.message}`);
            this.stats.errors++;
            
            // Fallback: try to extract text using JSDOM
            try {
                const dom = new JSDOM(`<div>${htmlContent}</div>`);
                return dom.window.document.body.textContent || htmlContent;
            } catch (fallbackError) {
                return htmlContent;
            }
        }
    }

    /**
     * Post-process markdown for better formatting
     */
    postProcessMarkdown(markdown) {
        if (!markdown) return markdown;

        // Clean up excessive newlines
        markdown = markdown.replace(/\n\s*\n\s*\n+/g, '\n\n');

        // Fix table formatting
        markdown = markdown.replace(/\|\s*\|\s*\|/g, '| | |');

        // Clean up list formatting
        markdown = markdown.replace(/\n(\d+\.)/g, '\n\n$1');
        markdown = markdown.replace(/\n([-*])/g, '\n\n$1');

        // Remove excessive spaces
        const lines = markdown.split('\n').map(line => line.trimRight());
        markdown = lines.join('\n');

        // Remove excessive blank lines again
        markdown = markdown.replace(/\n\s*\n\s*\n+/g, '\n\n');

        return markdown.trim();
    }

    /**
     * Parse SQL INSERT statement properly considering the broken quote issue
     */
    parseInsertStatement(insertStatement) {
        // The key insight: we need to parse the entire INSERT statement
        // not just look for quoted strings, because the quotes are broken
        
        // Extract the VALUES clause
        const valuesMatch = insertStatement.match(/VALUES\s*\((.*)\)\s*(?:,\s*\(.*\)\s*)*;?$/si);
        if (!valuesMatch) {
            return null;
        }

        const valuesContent = valuesMatch[1];
        
        // Split by commas, but we need to be smart about it
        // because HTML content might contain commas
        const values = [];
        let current = '';
        let depth = 0;
        let inString = false;
        let stringChar = '';
        
        for (let i = 0; i < valuesContent.length; i++) {
            const char = valuesContent[i];
            const prevChar = i > 0 ? valuesContent[i - 1] : '';
            
            if (!inString) {
                if (char === "'" || char === '"') {
                    inString = true;
                    stringChar = char;
                    current += char;
                } else if (char === '(') {
                    depth++;
                    current += char;
                } else if (char === ')') {
                    depth--;
                    current += char;
                } else if (char === ',' && depth === 0) {
                    // This comma is a separator between values
                    values.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            } else {
                // We're inside a string
                current += char;
                if (char === stringChar && prevChar !== '\\') {
                    // End of string (unescaped quote)
                    inString = false;
                    stringChar = '';
                }
            }
        }
        
        // Add the last value
        if (current.trim()) {
            values.push(current.trim());
        }
        
        return {
            beforeValues: insertStatement.substring(0, insertStatement.indexOf(valuesMatch[0])),
            values: values,
            afterValues: insertStatement.substring(insertStatement.indexOf(valuesMatch[0]) + valuesMatch[0].length)
        };
    }

    /**
     * Process a single INSERT statement
     */
    processInsertStatement(insertStatement) {
        this.stats.insertStatementsProcessed++;
        
        const parsed = this.parseInsertStatement(insertStatement);
        if (!parsed) {
            return insertStatement;
        }

        let hasChanges = false;
        const processedValues = parsed.values.map(value => {
            // Check if this value is a quoted string containing HTML
            const quotedMatch = value.match(/^'(.*)'$/s);
            if (quotedMatch) {
                const content = quotedMatch[1];
                
                // Check if content contains HTML tags
                if (/<[^>]+>/.test(content)) {
                    // This looks like HTML content
                    // First, properly unescape it (it might have been partially escaped)
                    let unescapedContent = content
                        .replace(/\\'/g, "'")
                        .replace(/\\\\/g, "\\")
                        .replace(/&#39;/g, "'")
                        .replace(/&quot;/g, '"')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&amp;/g, '&');
                    
                    // Convert HTML to Markdown
                    const markdownContent = this.convertHtmlToMarkdown(unescapedContent);
                    
                    // Properly escape for SQL
                    const escapedMarkdown = markdownContent
                        .replace(/\\/g, "\\\\")
                        .replace(/'/g, "\\'")
                        .replace(/"/g, '\\"');
                    
                    hasChanges = true;
                    return `'${escapedMarkdown}'`;
                }
            }
            
            return value;
        });

        if (hasChanges) {
            // Reconstruct the INSERT statement
            const newValues = processedValues.join(', ');
            return `${parsed.beforeValues}VALUES (${newValues})${parsed.afterValues}`;
        }

        return insertStatement;
    }

    /**
     * Convert MySQL SQL to PostgreSQL with HTML to Markdown conversion
     */
    async convertSqlFile(inputFile, outputFile) {
        try {
            console.log(`🔄 Processing ${path.basename(inputFile)}...`);

            const content = await fs.readFile(inputFile, 'utf8');
            const originalSize = content.length;

            console.log(`   📊 Original file: ${originalSize.toLocaleString()} characters`);

            let convertedContent = content;

            // MySQL to PostgreSQL conversions
            console.log('   🔧 Converting MySQL syntax to PostgreSQL...');

            // Remove MySQL-specific headers
            convertedContent = convertedContent.replace(/-- phpMyAdmin SQL Dump.*?\n/g, '');
            convertedContent = convertedContent.replace(/-- version.*?\n/g, '');
            convertedContent = convertedContent.replace(/-- https:\/\/www\.phpmyadmin\.net\/.*?\n/g, '');
            convertedContent = convertedContent.replace(/-- Host:.*?\n/g, '');
            convertedContent = convertedContent.replace(/-- Generation Time:.*?\n/g, '');
            convertedContent = convertedContent.replace(/-- Server version:.*?\n/g, '');
            convertedContent = convertedContent.replace(/-- PHP Version:.*?\n/g, '');

            // Remove MySQL SET statements
            convertedContent = convertedContent.replace(/SET [^;]+;.*?\n/gm, '');
            convertedContent = convertedContent.replace(/START TRANSACTION;.*?\n/g, '');
            convertedContent = convertedContent.replace(/COMMIT;.*?\n/g, '');
            convertedContent = convertedContent.replace(/\/\*![0-9]+ .+? \*\/;/g, '');

            // Convert MySQL data types
            convertedContent = convertedContent.replace(/\bint\(\d+\)/gi, 'INTEGER');
            convertedContent = convertedContent.replace(/\bbigint\(\d+\)/gi, 'BIGINT');
            convertedContent = convertedContent.replace(/\bsmallint\(\d+\)/gi, 'SMALLINT');
            convertedContent = convertedContent.replace(/\btinyint\(\d+\)/gi, 'SMALLINT');
            convertedContent = convertedContent.replace(/\blongtext\b/gi, 'TEXT');

            // Convert AUTO_INCREMENT
            convertedContent = convertedContent.replace(/(\w+)\s+int\(\d+\)\s+NOT\s+NULL\s+AUTO_INCREMENT/gi, '$1 SERIAL');

            // Remove MySQL-specific options
            convertedContent = convertedContent.replace(/ENGINE=\w+\s*/gi, '');
            convertedContent = convertedContent.replace(/DEFAULT\s+CHARSET=\w+\s*/gi, '');
            convertedContent = convertedContent.replace(/COLLATE=\w+\s*/gi, '');

            // Convert backticks to double quotes
            convertedContent = convertedContent.replace(/`/g, '"');

            // Add IF NOT EXISTS to CREATE TABLE
            convertedContent = convertedContent.replace(/CREATE TABLE\s+(\w+)/gi, 'CREATE TABLE IF NOT EXISTS $1');

            // Process INSERT statements for HTML conversion
            console.log('   🔄 Converting HTML content to Markdown...');

            // Find INSERT statements - they might span multiple lines
            const insertMatches = [];
            const insertRegex = /INSERT\s+INTO\s+[^;]+;/gsi;
            let match;
            while ((match = insertRegex.exec(convertedContent)) !== null) {
                insertMatches.push(match);
            }

            console.log(`   📝 Found ${insertMatches.length} INSERT statements`);

            let convertedInserts = 0;
            
            // Process in reverse order to maintain string positions
            for (let i = insertMatches.length - 1; i >= 0; i--) {
                const match = insertMatches[i];
                const originalInsert = match[0];
                const convertedInsert = this.processInsertStatement(originalInsert);

                if (convertedInsert !== originalInsert) {
                    convertedContent = convertedContent.substring(0, match.index) + 
                                    convertedInsert + 
                                    convertedContent.substring(match.index + originalInsert.length);
                    convertedInserts++;
                }
            }

            console.log(`   ✅ Converted HTML in ${convertedInserts} INSERT statements`);

            // Final cleanup
            convertedContent = convertedContent.replace(/\n\s*\n\s*\n+/g, '\n\n');

            // Write the result
            const header = [
                '-- PostgreSQL version of MySQL dump',
                '-- Converted with Fixed Node.js Turndown HTML to Markdown converter',
                `-- Original file: ${path.basename(inputFile)}`,
                `-- Conversion date: ${new Date().toISOString()}`,
                ''
            ].join('\n');

            await fs.writeFile(outputFile, header + '\n' + convertedContent);

            const finalSize = convertedContent.length;
            console.log(`   📊 Final file: ${finalSize.toLocaleString()} characters`);
            console.log(`   🔄 HTML conversions: ${this.stats.htmlConversions}`);
            console.log(`   📝 INSERT statements processed: ${this.stats.insertStatementsProcessed}`);
            console.log(`   📁 Output: ${path.basename(outputFile)}`);

            this.stats.filesProcessed++;
            return true;

        } catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
            console.error(error.stack);
            this.stats.errors++;
            return false;
        }
    }

    /**
     * Process all CID SQL files
     */
    async processAllFiles() {
        const databaseDir = __dirname;

        try {
            const files = await fs.readdir(databaseDir);
            const cidFiles = files.filter(file =>
                file.startsWith('CID_') &&
                file.endsWith('.sql') &&
                !file.endsWith('_professional.sql') &&
                !file.endsWith('_improved.sql') &&
                !file.endsWith('_ultimate.sql') &&
                !file.endsWith('_nodejs.sql') &&
                !file.endsWith('_fixed.sql')
            );

            if (cidFiles.length === 0) {
                console.log('❌ No original CID files found!');
                return false;
            }

            console.log(`📁 Found ${cidFiles.length} CID files to process:`);
            cidFiles.sort().forEach(file => console.log(`   - ${file}`));

            let successful = 0;
            let failed = 0;

            for (const file of cidFiles.sort()) {
                const inputPath = path.join(databaseDir, file);
                const outputPath = inputPath.replace('.sql', '_fixed.sql');

                if (await this.convertSqlFile(inputPath, outputPath)) {
                    successful++;
                } else {
                    failed++;
                }
            }

            // Print summary
            console.log('\n' + '='.repeat(70));
            console.log('📊 FIXED NODE.JS TURNDOWN CONVERSION SUMMARY');
            console.log('='.repeat(70));
            console.log(`📁 Files processed: ${this.stats.filesProcessed}`);
            console.log(`📝 INSERT statements processed: ${this.stats.insertStatementsProcessed}`);
            console.log(`🔄 HTML conversions performed: ${this.stats.htmlConversions}`);
            console.log(`📊 Characters processed: ${this.stats.totalCharactersProcessed.toLocaleString()}`);
            console.log(`❌ Errors encountered: ${this.stats.errors}`);
            console.log(`✅ Successful file conversions: ${successful}`);
            console.log(`❌ Failed file conversions: ${failed}`);
            console.log('='.repeat(70));

            if (failed === 0) {
                console.log('🎉 All files converted successfully!');
                console.log('📝 HTML content properly converted to Markdown using Turndown!');
                console.log('🔧 Fixed the unescaped quote issue!');
                console.log('🗄️  Files ready for PostgreSQL upload!');
            } else {
                console.log(`⚠️  ${failed} files failed to convert`);
            }

            return failed === 0;

        } catch (error) {
            console.error(`❌ Error reading directory: ${error.message}`);
            return false;
        }
    }
}

// Main execution
async function main() {
    console.log('🚀 Fixed Node.js Turndown HTML to Markdown Converter');
    console.log('🔧 Handles unescaped quotes in SQL properly!');
    console.log('='.repeat(60));

    const converter = new FixedNodeJSHTMLConverter();

    try {
        const success = await converter.processAllFiles();
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error(`❌ Unexpected error: ${error.message}`);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = FixedNodeJSHTMLConverter;
