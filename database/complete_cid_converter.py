#!/usr/bin/env python3
"""
Complete CID Converter: MySQL to PostgreSQL + HTML to Markdown + Database Upload
Handles all CID files automatically with comprehensive conversion
"""

import sys
import re
import subprocess
import os
import argparse
from typing import Dict, List, Tuple
from pathlib import Path

class CompleteCIDConverter:
    def __init__(self):
        self.project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
    def clean_text_formatting(self, content: str) -> str:
        """
        Clean up text formatting issues including \r\n characters
        """
        if not content:
            return content
            
        # Remove \r\n characters (Windows line endings)
        content = content.replace('\\r\\n', ' ')
        
        # Remove actual \r\n characters in the text
        content = content.replace('\r\n', ' ')
        
        # Remove multiple spaces
        content = re.sub(r'\s+', ' ', content)
        
        # Remove leading/trailing spaces
        content = content.strip()
        
        # Clean up table formatting artifacts
        content = re.sub(r'\\r\\s*\\n\\s*\\r\\s*\\n', '\n\n', content)
        content = re.sub(r'\\r\\s*\\n', '\n', content)
        
        return content
        
    def html_to_markdown_complete(self, html_content: str) -> str:
        """
        Complete HTML to Markdown conversion
        Handles all HTML elements found in CID database
        """
        if not html_content:
            return html_content
        
        # First clean up text formatting
        html_content = self.clean_text_formatting(html_content)
        
        # Remove HTML comments
        html_content = re.sub(r'<!--.*?-->', '', html_content, flags=re.DOTALL)
        
        # Handle headers (h1-h6)
        html_content = re.sub(r'<h1[^>]*>(.*?)</h1>', r'# \1', html_content, flags=re.DOTALL)
        html_content = re.sub(r'<h2[^>]*>(.*?)</h2>', r'## \1', html_content, flags=re.DOTALL)
        html_content = re.sub(r'<h3[^>]*>(.*?)</h3>', r'### \1', html_content, flags=re.DOTALL)
        html_content = re.sub(r'<h4[^>]*>(.*?)</h4>', r'#### \1', html_content, flags=re.DOTALL)
        html_content = re.sub(r'<h5[^>]*>(.*?)</h5>', r'##### \1', html_content, flags=re.DOTALL)
        html_content = re.sub(r'<h6[^>]*>(.*?)</h6>', r'###### \1', html_content, flags=re.DOTALL)
        
        # Handle paragraphs
        html_content = re.sub(r'<p[^>]*>(.*?)</p>', r'\n\n\1\n\n', html_content, flags=re.DOTALL)
        
        # Handle line breaks
        html_content = re.sub(r'<br[^>]*>', '\n', html_content)
        html_content = re.sub(r'<br\s*/?>', '\n', html_content)
        
        # Handle strong/bold text
        html_content = re.sub(r'<strong[^>]*>(.*?)</strong>', r'**\1**', html_content, flags=re.DOTALL)
        html_content = re.sub(r'<b[^>]*>(.*?)</b>', r'**\1**', html_content, flags=re.DOTALL)
        
        # Handle emphasis/italic text
        html_content = re.sub(r'<em[^>]*>(.*?)</em>', r'*\1*', html_content, flags=re.DOTALL)
        html_content = re.sub(r'<i[^>]*>(.*?)</i>', r'*\1*', html_content, flags=re.DOTALL)
        
        # Handle underline
        html_content = re.sub(r'<u[^>]*>(.*?)</u>', r'__\1__', html_content, flags=re.DOTALL)
        
        # Handle lists
        html_content = re.sub(r'<ul[^>]*>(.*?)</ul>', r'\n\1\n', html_content, flags=re.DOTALL)
        html_content = re.sub(r'<ol[^>]*>(.*?)</ol>', r'\n\1\n', html_content, flags=re.DOTALL)
        html_content = re.sub(r'<li[^>]*>(.*?)</li>', r'\n- \1', html_content, flags=re.DOTALL)
        
        # Handle links
        html_content = re.sub(r'<a[^>]*href=["\']([^"\']*)["\'][^>]*>(.*?)</a>', r'[\2](\1)', html_content, flags=re.DOTALL)
        
        # Handle images
        html_content = re.sub(r'<img[^>]*src=["\']([^"\']*)["\'][^>]*>', r'![](\1)', html_content)
        
        # Handle tables
        html_content = re.sub(r'<table[^>]*>(.*?)</table>', r'\n\n\1\n\n', html_content, flags=re.DOTALL)
        html_content = re.sub(r'<tr[^>]*>(.*?)</tr>', r'\n\1', html_content, flags=re.DOTALL)
        html_content = re.sub(r'<td[^>]*>(.*?)</td>', r'|\1', html_content, flags=re.DOTALL)
        html_content = re.sub(r'<th[^>]*>(.*?)</th>', r'|\1', html_content, flags=re.DOTALL)
        
        # Handle spans and divs (just remove tags, keep content)
        html_content = re.sub(r'<span[^>]*>(.*?)</span>', r'\1', html_content, flags=re.DOTALL)
        html_content = re.sub(r'<div[^>]*>(.*?)</div>', r'\n\n\1\n\n', html_content, flags=re.DOTALL)
        
        # Remove any remaining HTML tags
        html_content = re.sub(r'<[^>]+>', '', html_content)
        
        # Clean up HTML entities
        html_content = html_content.replace('&nbsp;', ' ')
        html_content = html_content.replace('&amp;', '&')
        html_content = html_content.replace('&lt;', '<')
        html_content = html_content.replace('&gt;', '>')
        html_content = html_content.replace('&quot;', '"')
        html_content = html_content.replace('&apos;', "'")
        html_content = html_content.replace('&rsquo;', "'")
        html_content = html_content.replace('&lsquo;', "'")
        html_content = html_content.replace('&rdquo;', '"')
        html_content = html_content.replace('&ldquo;', '"')
        html_content = html_content.replace('&hellip;', '...')
        html_content = html_content.replace('&mdash;', '—')
        html_content = html_content.replace('&ndash;', '–')
        
        # Clean up multiple newlines and spaces
        html_content = re.sub(r'\n\s*\n\s*\n', '\n\n', html_content)
        html_content = re.sub(r' +', ' ', html_content)
        
        return html_content.strip()
    
    def convert_mysql_to_postgresql(self, input_file: str, output_file: str) -> bool:
        """
        Convert MySQL SQL dump to PostgreSQL format with HTML to Markdown conversion
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
            
            # Convert HTML to Markdown in INSERT statements
            print("Converting HTML to Markdown in data fields...")
            
            # Find all INSERT statements and convert HTML in the data
            def convert_insert_html(match):
                insert_statement = match.group(0)
                # Convert HTML to Markdown in the VALUES part
                values_start = insert_statement.find('VALUES')
                if values_start != -1:
                    header_part = insert_statement[:values_start]
                    values_part = insert_statement[values_start:]
                    
                    # Convert HTML to Markdown in values
                    values_part = self.html_to_markdown_complete(values_part)
                    
                    return header_part + values_part
                return insert_statement
            
            content = re.sub(r'INSERT INTO[^;]+;', convert_insert_html, content, flags=re.DOTALL)
            
            # Clean up any remaining formatting issues
            content = self.clean_text_formatting(content)
            
            # Write the converted content
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(f"-- PostgreSQL version of MySQL dump\n")
                f.write(f"-- Converted with HTML to Markdown conversion\n")
                f.write(f"-- Original file: {os.path.basename(input_file)}\n")
                f.write(f"-- Conversion date: {subprocess.check_output(['date']).decode().strip()}\n\n")
                f.write(content)
            
            print(f"Converted file size: {len(content)} characters")
            print(f"Conversion complete! Output written to: {output_file}")
            return True
            
        except Exception as e:
            print(f"❌ Error converting {input_file}: {e}")
            return False
    
    def process_single_file(self, input_file: str) -> bool:
        """Process a single CID file"""
        if not os.path.exists(input_file):
            print(f"❌ File not found: {input_file}")
            return False
        
        output_file = input_file.replace('.sql', '_postgresql_markdown.sql')
        
        print(f"🔄 Processing {input_file}...")
        success = self.convert_mysql_to_postgresql(input_file, output_file)
        
        if success:
            print(f"✅ {input_file} processed successfully!")
        else:
            print(f"❌ {input_file} processing failed!")
        
        return success
    
    def process_all_files(self) -> bool:
        """Process all CID files in the database directory"""
        database_dir = os.path.join(self.project_root, 'database')
        
        if not os.path.exists(database_dir):
            print(f"❌ Database directory not found: {database_dir}")
            return False
        
        # Find all CID files
        cid_files = []
        for file in os.listdir(database_dir):
            if file.startswith('CID_') and file.endswith('.sql') and not file.endswith('_postgresql_markdown.sql'):
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
            if self.process_single_file(file_path):
                successful += 1
            else:
                failed += 1
        
        # Summary
        print("\n" + "="*50)
        print("📊 BATCH PROCESSING SUMMARY")
        print("="*50)
        print(f"✅ Successful: {successful}")
        print(f"❌ Failed: {failed}")
        print(f"📁 Total: {len(cid_files)}")
        
        if failed == 0:
            print("\n🎉 Successfully processed all files!")
        else:
            print(f"\n⚠️  {failed} files failed to process")
        
        return failed == 0

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Convert MySQL to PostgreSQL with HTML to Markdown conversion')
    parser.add_argument('--file', help='Convert a single CID file')
    parser.add_argument('--all', action='store_true', help='Convert all CID files')
    
    args = parser.parse_args()
    
    converter = CompleteCIDConverter()
    
    if args.file:
        success = converter.process_single_file(args.file)
        sys.exit(0 if success else 1)
    elif args.all:
        success = converter.process_all_files()
        sys.exit(0 if success else 1)
    else:
        parser.print_help()
        sys.exit(1)

if __name__ == "__main__":
    main()
