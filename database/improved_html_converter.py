#!/usr/bin/env python3
"""
Improved HTML to Markdown Converter for SQL Files
=================================================

This script properly converts HTML content within SQL INSERT statements to Markdown.
It specifically targets HTML content within quoted strings in SQL VALUES clauses.

Key improvements:
- Properly parses SQL INSERT statements  
- Correctly identifies HTML content within quoted values
- Uses robust HTML to Markdown conversion
- Handles escaped quotes and special characters
- Preserves SQL structure while converting HTML content
"""

import os
import re
import sys
import html
import subprocess
from pathlib import Path
from typing import List, Tuple, Optional

try:
    import html2text
    from bs4 import BeautifulSoup, Comment
except ImportError:
    print("❌ Required packages not found. Install with:")
    print("   pip install html2text beautifulsoup4")
    sys.exit(1)

class ImprovedHTMLConverter:
    """Improved HTML to Markdown converter specifically for SQL files"""
    
    def __init__(self):
        """Initialize the converter"""
        self.project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        # Configure html2text for optimal conversion
        self.h2t = html2text.HTML2Text()
        self.h2t.ignore_links = False
        self.h2t.ignore_images = False
        self.h2t.ignore_emphasis = False
        self.h2t.ignore_tables = False
        self.h2t.body_width = 0  # No line wrapping
        self.h2t.unicode_snob = True
        self.h2t.escape_snob = False
        self.h2t.mark_code = False  # Don't add code blocks
        self.h2t.wrap_links = False
        self.h2t.single_line_break = True  # Use single line breaks
        
        # Statistics
        self.stats = {
            'files_processed': 0,
            'html_blocks_converted': 0,
            'insert_statements_processed': 0,
            'errors': 0
        }
    
    def clean_html_content(self, html_content: str) -> str:
        """Clean and prepare HTML content for conversion"""
        if not html_content or not html_content.strip():
            return html_content
        
        try:
            # Decode HTML entities first
            html_content = html.unescape(html_content)
            
            # Use BeautifulSoup to clean and normalize HTML
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
            
            # Remove comments
            for comment in soup.find_all(text=lambda text: isinstance(text, Comment)):
                comment.extract()
            
            # Handle common HTML formatting issues
            # Fix nested spans with styling
            for span in soup.find_all('span'):
                if span.get('style'):
                    style = span.get('style', '')
                    # Convert font styling to simple formatting
                    if 'font-weight:bold' in style or 'font-weight: bold' in style:
                        # Wrap content in strong tags
                        if span.string:
                            span.name = 'strong'
                            del span['style']
                    elif 'font-style:italic' in style or 'font-style: italic' in style:
                        # Wrap content in em tags
                        if span.string:
                            span.name = 'em'
                            del span['style']
            
            # Clean up empty elements but preserve structure
            for tag in soup.find_all():
                if tag.name not in ['br', 'hr', 'img'] and len(tag.get_text(strip=True)) == 0:
                    if not tag.find_all(['img', 'br', 'hr']):
                        tag.decompose()
            
            return str(soup)
            
        except Exception as e:
            print(f"⚠️  HTML cleaning failed: {e}")
            return html_content
    
    def html_to_markdown(self, html_content: str) -> str:
        """Convert HTML content to Markdown"""
        if not html_content or not html_content.strip():
            return html_content
        
        # Check if this actually contains HTML tags
        if not re.search(r'<[^>]+>', html_content):
            return html_content
        
        try:
            # Clean the HTML first
            cleaned_html = self.clean_html_content(html_content)
            
            # Convert to Markdown
            markdown_content = self.h2t.handle(cleaned_html)
            
            # Post-process the Markdown
            markdown_content = self.post_process_markdown(markdown_content)
            
            self.stats['html_blocks_converted'] += 1
            return markdown_content
            
        except Exception as e:
            print(f"⚠️  HTML to Markdown conversion failed: {e}")
            self.stats['errors'] += 1
            # Return cleaned text as fallback
            try:
                soup = BeautifulSoup(html_content, 'html.parser')
                return soup.get_text()
            except:
                return html_content
    
    def post_process_markdown(self, markdown_content: str) -> str:
        """Post-process Markdown content for better formatting"""
        if not markdown_content:
            return markdown_content
        
        # Clean up excessive newlines
        markdown_content = re.sub(r'\n\s*\n\s*\n', '\n\n', markdown_content)
        
        # Clean up excessive spaces
        markdown_content = re.sub(r' +', ' ', markdown_content)
        
        # Remove leading/trailing whitespace from lines
        lines = markdown_content.split('\n')
        cleaned_lines = [line.strip() for line in lines]
        markdown_content = '\n'.join(cleaned_lines)
        
        # Remove excessive newlines at start and end
        markdown_content = markdown_content.strip()
        
        # Fix common markdown issues
        # Fix broken table formatting
        markdown_content = re.sub(r'\|\s*\|\s*\|', '| | |', markdown_content)
        
        # Ensure proper spacing around list items
        markdown_content = re.sub(r'\n(\d+\.)', r'\n\n\1', markdown_content)
        markdown_content = re.sub(r'\n(\*|\-)', r'\n\n\1', markdown_content)
        
        return markdown_content
    
    def extract_quoted_strings_from_values(self, values_part: str) -> List[Tuple[str, str]]:
        """Extract quoted strings from SQL VALUES clause and identify which contain HTML"""
        quoted_strings = []
        
        # Find all quoted strings (both single and double quotes)
        # This regex handles escaped quotes within strings
        pattern = r"'((?:[^'\\]|\\.)*)'"
        matches = re.finditer(pattern, values_part)
        
        for match in matches:
            original_quoted = match.group(0)  # Including quotes
            content = match.group(1)  # Just the content
            
            # Unescape SQL escaped characters
            unescaped_content = content.replace("\\'", "'").replace("\\\\", "\\")
            
            # Check if this content contains HTML tags
            if re.search(r'<[^>]+>', unescaped_content):
                quoted_strings.append((original_quoted, unescaped_content))
        
        return quoted_strings
    
    def process_insert_statement(self, insert_statement: str) -> str:
        """Process a single INSERT statement and convert HTML in its VALUES"""
        self.stats['insert_statements_processed'] += 1
        
        # Find the VALUES part of the INSERT statement
        values_match = re.search(r'VALUES\s*\((.*)\);?', insert_statement, re.DOTALL | re.IGNORECASE)
        if not values_match:
            return insert_statement
        
        values_part = values_match.group(1)
        
        # Extract quoted strings that contain HTML
        html_strings = self.extract_quoted_strings_from_values(values_part)
        
        if not html_strings:
            return insert_statement
        
        # Convert each HTML string to Markdown
        modified_statement = insert_statement
        
        for original_quoted, html_content in html_strings:
            # Convert HTML to Markdown
            markdown_content = self.html_to_markdown(html_content)
            
            # Re-escape for SQL (escape single quotes and backslashes)
            escaped_markdown = markdown_content.replace("\\", "\\\\").replace("'", "\\'")
            
            # Create the new quoted string
            new_quoted = f"'{escaped_markdown}'"
            
            # Replace in the statement
            modified_statement = modified_statement.replace(original_quoted, new_quoted)
        
        return modified_statement
    
    def convert_sql_file(self, input_file: str, output_file: str) -> bool:
        """Convert a single SQL file from MySQL to PostgreSQL with HTML to Markdown conversion"""
        try:
            print(f"🔄 Processing {os.path.basename(input_file)}...")
            
            with open(input_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            print(f"   Original file size: {len(content)} characters")
            
            # Remove MySQL-specific comments and settings
            content = re.sub(r'-- phpMyAdmin SQL Dump.*?\n', '', content)
            content = re.sub(r'-- version.*?\n', '', content)
            content = re.sub(r'-- https://www\.phpmyadmin\.net/.*?\n', '', content)
            content = re.sub(r'-- Host:.*?\n', '', content)
            content = re.sub(r'-- Generation Time:.*?\n', '', content)
            content = re.sub(r'-- Server version:.*?\n', '', content)
            content = re.sub(r'-- PHP Version:.*?\n', '', content)
            
            # Remove MySQL-specific SET statements
            content = re.sub(r'SET [^;]+;', '', content)
            content = re.sub(r'START TRANSACTION;', '', content)
            content = re.sub(r'COMMIT;', '', content)
            
            # Convert MySQL-specific syntax to PostgreSQL
            # Data types
            content = re.sub(r'\bint\(\d+\)', 'INTEGER', content, flags=re.IGNORECASE)
            content = re.sub(r'\bbigint\(\d+\)', 'BIGINT', content, flags=re.IGNORECASE)
            content = re.sub(r'\bsmallint\(\d+\)', 'SMALLINT', content, flags=re.IGNORECASE)
            content = re.sub(r'\btinyint\(\d+\)', 'SMALLINT', content, flags=re.IGNORECASE)
            content = re.sub(r'\bmediumint\(\d+\)', 'INTEGER', content, flags=re.IGNORECASE)
            content = re.sub(r'\blongtext\b', 'TEXT', content, flags=re.IGNORECASE)
            
            # AUTO_INCREMENT to SERIAL
            content = re.sub(r'(\w+)\s+int\(\d+\)\s+NOT\s+NULL\s+AUTO_INCREMENT', r'\1 SERIAL', content, flags=re.IGNORECASE)
            
            # Remove MySQL engine and charset specifications
            content = re.sub(r'ENGINE=\w+', '', content, flags=re.IGNORECASE)
            content = re.sub(r'DEFAULT CHARSET=\w+', '', content, flags=re.IGNORECASE)
            content = re.sub(r'COLLATE=\w+', '', content, flags=re.IGNORECASE)
            
            # Convert backticks to double quotes for identifiers
            content = content.replace('`', '"')
            
            # Add IF NOT EXISTS to CREATE TABLE statements
            content = re.sub(r'CREATE TABLE\s+(\w+)', r'CREATE TABLE IF NOT EXISTS \1', content, flags=re.IGNORECASE)
            
            # Process INSERT statements to convert HTML to Markdown
            print("   Converting HTML to Markdown in INSERT statements...")
            
            # Find all INSERT statements
            insert_pattern = r'(INSERT INTO[^;]+;)'
            insert_matches = list(re.finditer(insert_pattern, content, re.DOTALL | re.IGNORECASE))
            
            print(f"   Found {len(insert_matches)} INSERT statements")
            
            # Process each INSERT statement
            for match in reversed(insert_matches):  # Reverse to preserve positions
                original_insert = match.group(1)
                converted_insert = self.process_insert_statement(original_insert)
                
                # Replace in content
                start_pos = match.start()
                end_pos = match.end()
                content = content[:start_pos] + converted_insert + content[end_pos:]
            
            # Clean up any remaining formatting issues
            content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)  # Remove excessive blank lines
            
            # Write the converted content
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(f"-- PostgreSQL version of MySQL dump\n")
                f.write(f"-- Converted with improved HTML to Markdown conversion\n")
                f.write(f"-- Original file: {os.path.basename(input_file)}\n")
                f.write(f"-- Conversion date: {subprocess.check_output(['date']).decode().strip()}\n\n")
                f.write(content)
            
            print(f"   ✅ Converted! HTML blocks converted: {self.stats['html_blocks_converted']}")
            print(f"   📁 Output: {os.path.basename(output_file)}")
            
            self.stats['files_processed'] += 1
            return True
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
            self.stats['errors'] += 1
            return False
    
    def process_all_files(self) -> bool:
        """Process all CID SQL files"""
        database_dir = os.path.join(self.project_root, 'database')
        
        if not os.path.exists(database_dir):
            print(f"❌ Database directory not found: {database_dir}")
            return False
        
        # Find all original CID files (not the _professional ones)
        cid_files = []
        for file in os.listdir(database_dir):
            if file.startswith('CID_') and file.endswith('.sql') and not file.endswith('_professional.sql'):
                cid_files.append(file)
        
        if not cid_files:
            print("❌ No CID files found!")
            return False
        
        print(f"📁 Found {len(cid_files)} CID files to process:")
        for file in sorted(cid_files):
            print(f"   - {file}")
        
        # Process each file
        successful = 0
        failed = 0
        
        for file in sorted(cid_files):
            input_path = os.path.join(database_dir, file)
            output_path = input_path.replace('.sql', '_improved.sql')
            
            if self.convert_sql_file(input_path, output_path):
                successful += 1
            else:
                failed += 1
        
        # Print summary
        print("\n" + "="*60)
        print("📊 IMPROVED CONVERSION SUMMARY")
        print("="*60)
        print(f"📁 Files processed: {self.stats['files_processed']}")
        print(f"📝 INSERT statements processed: {self.stats['insert_statements_processed']}")
        print(f"🔄 HTML blocks converted: {self.stats['html_blocks_converted']}")
        print(f"❌ Errors encountered: {self.stats['errors']}")
        print(f"✅ Successful conversions: {successful}")
        print(f"❌ Failed conversions: {failed}")
        
        if failed == 0:
            print("\n🎉 All files converted successfully!")
            print("📝 HTML content has been properly converted to Markdown!")
        else:
            print(f"\n⚠️  {failed} files failed to convert")
        
        return failed == 0

def main():
    """Main function"""
    converter = ImprovedHTMLConverter()
    
    try:
        success = converter.process_all_files()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⚠️  Processing interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
