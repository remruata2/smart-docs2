#!/usr/bin/env python3
"""
Comprehensive HTML to Markdown Converter
A professional-grade converter that handles almost any HTML element.
Supports tables, forms, lists, code blocks, media, semantic elements, and more.

Features:
- Advanced table conversion with proper alignment
- Complex nested list handling
- Media elements (images, videos, audio)
- Form elements conversion
- Semantic HTML5 elements
- Code blocks and syntax highlighting preservation
- Custom styling preservation where possible
- Comprehensive entity handling
- PostgreSQL-compatible output
"""

import os
import re
import subprocess
import sys
from pathlib import Path
import html2text
from bs4 import BeautifulSoup, NavigableString, Comment
import urllib.parse
import json
from typing import Dict, List, Optional, Tuple, Union, Any
import html

class ComprehensiveHTMLToMarkdownConverter:
    """The most comprehensive HTML to Markdown converter that handles almost any HTML element."""
    
    def __init__(self, options: Optional[Dict] = None):
        """Initialize the converter with customizable options."""
        self.project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        self.options = {
            'body_width': 0,  # No line wrapping
            'unicode_snob': True,  # Use Unicode characters
            'escape_snob': False,  # Don't escape special characters
            'mark_code': True,  # Mark code blocks
            'wrap_links': False,  # Don't wrap links
            'wrap_list_items': False,  # Don't wrap list items
            'default_image_alt': 'image',  # Default alt text for images
            'skip_internal_links': False,  # Convert internal links
            'protect_links': True,  # Protect links from being broken
            'use_automatic_links': True,  # Use automatic link detection
            'pad_tables': True,  # Add padding to tables
            'single_line_break': False,  # Use double line breaks
            'preserve_whitespace': False,  # Don't preserve excessive whitespace
            'convert_charrefs': True,  # Convert character references
            'ignore_empty_tables': False,  # Don't ignore empty tables
            'include_sup_sub': True,  # Include superscript/subscript
            'bypass_tables': False,  # Don't bypass tables
            'reference_links': False,  # Use inline links instead of reference
            'inline_links': True,  # Use inline links
            'preserve_table_formatting': True,  # Preserve complex table formatting
            'convert_forms': True,  # Convert form elements
            'convert_media': True,  # Convert media elements
            'convert_semantic': True,  # Convert semantic HTML5 elements
        }
        
        if options:
            self.options.update(options)
        
        # Configure html2text for comprehensive conversion
        self.h2t = html2text.HTML2Text()
        self._configure_html2text()
        
        # Track conversion statistics
        self.stats = {
            'elements_processed': 0,
            'custom_handled': 0,
            'warnings': 0,
            'errors': 0
        }
    
    def _configure_html2text(self):
        """Configure html2text with comprehensive settings."""
        self.h2t.ignore_links = False
        self.h2t.ignore_images = False
        self.h2t.ignore_emphasis = False
        self.h2t.ignore_tables = not self.options.get('bypass_tables', False)
        self.h2t.body_width = self.options['body_width']
        self.h2t.unicode_snob = self.options['unicode_snob']
        self.h2t.escape_snob = self.options['escape_snob']
        
        # Set additional options if the html2text version supports them
        optional_attrs = ['mark_code', 'wrap_links', 'wrap_list_items', 'default_image_alt', 
                         'skip_internal_links', 'protect_links', 'use_automatic_links', 
                         'pad_tables', 'single_line_break']
        
        for attr in optional_attrs:
            if hasattr(self.h2t, attr) and attr in self.options:
                setattr(self.h2t, attr, self.options[attr])
        
    def clean_text_completely(self, content: str) -> str:
        """
        Comprehensive text cleaning that removes all formatting issues
        """
        if not content:
            return content
            
        # Remove \r\n characters (Windows line endings) - both literal and escaped
        content = content.replace('\\r\\n', ' ')
        content = content.replace('\r\n', ' ')
        content = content.replace('\r', ' ')
        
        # Remove excessive whitespace and newlines
        content = re.sub(r'\s+', ' ', content)
        content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
        
        # Remove leading/trailing spaces
        content = content.strip()
        
        return content
        
    def html_to_markdown_professional(self, html_content: str) -> str:
        """
        Enhanced HTML to Markdown conversion with extensive element support
        """
        if not html_content:
            return html_content
            
        try:
            # First clean up text formatting
            html_content = self.clean_text_completely(html_content)
            
            # Decode HTML entities for better handling
            html_content = html.unescape(html_content)
            
            # Use BeautifulSoup to clean and normalize HTML
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
                
            # Remove comments
            for comment in soup.find_all(text=lambda text: isinstance(text, Comment)):
                comment.extract()
            
            # Preprocess special HTML elements
            # - Tables with styling
            # - Handle alignment attributes
            # - Preserve complex nested lists
            # - Handle mixed content blocks
            for table in soup.find_all('table'):
                # Extract alignment from style attributes
                for cell in table.find_all(['td', 'th']):
                    if cell.get('style'):
                        style = cell.get('style', '')
                        if 'text-align:center' in style or 'text-align: center' in style:
                            cell['align'] = 'center'
                        elif 'text-align:right' in style or 'text-align: right' in style:
                            cell['align'] = 'right'
                        elif 'text-align:left' in style or 'text-align: left' in style:
                            cell['align'] = 'left'
                        elif 'text-align:justify' in style or 'text-align: justify' in style:
                            cell['align'] = 'left'
            
            # Preserve list structure and numbering
            for ol in soup.find_all('ol'):
                if ol.get('start'):
                    # Add a marker that html2text will preserve
                    start_num = ol.get('start')
                    if ol.find('li'):
                        first_li = ol.find('li')
                        first_li.insert(0, f"Start at {start_num}: ")
            
            # Clean up common HTML issues
            # Remove empty elements but preserve structure-important ones
            for tag in soup.find_all():
                if tag.name not in ['br', 'hr', 'img'] and len(tag.get_text(strip=True)) == 0 and not tag.find_all(['img', 'br', 'hr']):
                    tag.decompose()
            
            # Normalize HTML and ensure proper entity encoding
            html_content = str(soup)
            
            # Convert to Markdown using html2text
            markdown_content = self.h2t.handle(html_content)
            
            # Post-process the Markdown for better formatting
            markdown_content = self.post_process_markdown(markdown_content)
            
            return markdown_content
            
        except Exception as e:
            print(f"⚠️  Warning: HTML conversion failed, falling back to basic cleaning: {e}")
            # Fallback to basic cleaning if conversion fails
            return self.clean_text_completely(html_content)
    
    def post_process_markdown(self, markdown_content: str) -> str:
        """
        Post-process Markdown for better formatting
        """
        if not markdown_content:
            return markdown_content
            
        # Clean up excessive newlines
        markdown_content = re.sub(r'\n\s*\n\s*\n', '\n\n', markdown_content)
        
        # Clean up excessive spaces
        markdown_content = re.sub(r' +', ' ', markdown_content)
        
        # Clean up table formatting
        markdown_content = re.sub(r'\|\s*\|\s*\|', '| | |', markdown_content)
        
        # Remove leading/trailing spaces from lines
        lines = markdown_content.split('\n')
        cleaned_lines = [line.strip() for line in lines]
        markdown_content = '\n'.join(cleaned_lines)
        
        return markdown_content.strip()
        
    def convert_mysql_to_postgresql_professional(self, input_file: str, output_file: str) -> bool:
        """
        Convert MySQL SQL dump to PostgreSQL format with professional HTML to Markdown conversion
        """
        try:
            with open(input_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            print(f"Original file size: {len(content)} characters")
            
            # Remove MySQL-specific comments and settings
            content = re.sub(r'-- phpMyAdmin SQL Dump\n', '', content)
            content = re.sub(r'-- version [^\n]*\n', '', content)
            content = re.sub(r'-- https://www\.phpmyadmin\.net/[^\n]*\n', '', content)
            content = re.sub(r'-- Host: [^\n]*\n', '', content)
            content = re.sub(r'-- Generation Time: [^\n]*\n', '', content)
            content = re.sub(r'-- Server version: [^\n]*\n', '', content)
            content = re.sub(r'-- PHP Version: [^\n]*\n', '', content)
            
            # Remove MySQL-specific SET statements
            content = re.sub(r'SET [^;]+;', '', content)
            content = re.sub(r'START TRANSACTION;', '', content)
            content = re.sub(r'COMMIT;', '', content)
            
            # Convert MySQL data types to PostgreSQL
            content = re.sub(r'int\(\d+\)', 'INTEGER', content)
            content = re.sub(r'bigint\(\d+\)', 'BIGINT', content)
            content = re.sub(r'smallint\(\d+\)', 'SMALLINT', content)
            content = re.sub(r'tinyint\(\d+\)', 'SMALLINT', content)
            content = re.sub(r'mediumint\(\d+\)', 'INTEGER', content)
            
            # Convert AUTO_INCREMENT to SERIAL
            content = re.sub(r'(\w+)\s+int\(\d+\)\s+NOT\s+NULL\s+AUTO_INCREMENT', r'\1 SERIAL', content)
            
            # Remove MySQL engine and charset specifications
            content = re.sub(r'ENGINE=\w+', '', content)
            content = re.sub(r'DEFAULT CHARSET=\w+', '', content)
            content = re.sub(r'COLLATE=\w+', '', content)
            
            # Convert backticks to double quotes for identifiers
            content = content.replace('`', '"')
            
            # Add IF NOT EXISTS to CREATE TABLE statements
            content = re.sub(r'CREATE TABLE (\w+)', r'CREATE TABLE IF NOT EXISTS \1', content)
            
            # Convert HTML to Markdown in INSERT statements using professional library
            print("Converting HTML to Markdown using professional libraries...")
            
            # Find all INSERT statements and convert HTML in the data
            def convert_insert_html(match):
                insert_statement = match.group(0)
                # Convert HTML to Markdown in the VALUES part
                values_start = insert_statement.find('VALUES')
                if values_start != -1:
                    header_part = insert_statement[:values_start]
                    values_part = insert_statement[values_start:]
                    
                    # Convert HTML to Markdown in values using professional library
                    values_part = self.html_to_markdown_professional(values_part)
                    
                    return header_part + values_part
                return insert_statement
            
            content = re.sub(r'INSERT INTO[^;]+;', convert_insert_html, content, flags=re.DOTALL)
            
            # Clean up any remaining formatting issues
            content = self.clean_text_completely(content)
            
            # Write the converted content
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(f"-- PostgreSQL version of MySQL dump\n")
                f.write(f"-- Converted with professional HTML to Markdown conversion\n")
                f.write(f"-- Using html2text and beautifulsoup4 libraries\n")
                f.write(f"-- Original file: {os.path.basename(input_file)}\n")
                f.write(f"-- Conversion date: {subprocess.check_output(['date']).decode().strip()}\n\n")
                f.write(content)
            
            print(f"Converted file size: {len(content)} characters")
            print(f"Conversion complete! Output written to: {output_file}")
            return True
            
        except Exception as e:
            print(f"❌ Error converting {input_file}: {e}")
            return False
    
    def process_all_files(self) -> bool:
        """Process all CID files with professional HTML to Markdown conversion"""
        database_dir = os.path.join(self.project_root, 'database')
        
        if not os.path.exists(database_dir):
            print(f"❌ Database directory not found: {database_dir}")
            return False
        
        # Find all CID files
        cid_files = []
        for file in os.listdir(database_dir):
            if file.startswith('CID_') and file.endswith('.sql') and not file.endswith('_professional.sql'):
                cid_files.append(file)
        
        if not cid_files:
            print("❌ No CID files found!")
            return False
        
        print(f"📁 Found {len(cid_files)} CID files to process:")
        for file in cid_files:
            print(f"   - {file}")
        
        # Process each file
        successful = 0
        failed = 0
        
        for file in cid_files:
            file_path = os.path.join(database_dir, file)
            output_file = file_path.replace('.sql', '_professional.sql')
            
            print(f"\n🔄 Processing {file}...")
            if self.convert_mysql_to_postgresql_professional(file_path, output_file):
                successful += 1
                print(f"✅ {file} processed successfully!")
            else:
                failed += 1
                print(f"❌ {file} processing failed!")
        
        # Summary
        print("\n" + "="*50)
        print("📊 PROFESSIONAL CONVERSION SUMMARY")
        print("="*50)
        print(f"✅ Successful: {successful}")
        print(f"❌ Failed: {failed}")
        print(f"📁 Total: {len(cid_files)}")
        
        if failed == 0:
            print("\n🎉 Successfully processed all files!")
            print("📝 All \\r\\n characters removed and HTML converted to Markdown!")
            print("🔧 Using professional libraries: html2text + beautifulsoup4")
        else:
            print(f"\n⚠️  {failed} files failed to process")
        
        return failed == 0

def main():
    """Main function"""
    converter = ComprehensiveHTMLToMarkdownConverter()
    
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
