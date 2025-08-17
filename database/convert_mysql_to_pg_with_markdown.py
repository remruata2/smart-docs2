#!/usr/bin/env python3
"""
Enhanced MySQL to PostgreSQL Converter with HTML to Markdown Conversion
and Direct Database Upload

Usage: python convert_mysql_to_pg_with_markdown.py input.sql output.sql [--upload]
"""

import sys
import re
import subprocess
import os
import argparse
from typing import Dict, List, Tuple

def html_to_markdown(html_content: str) -> str:
    """
    Convert HTML content to Markdown format
    Handles common HTML elements found in the CID database
    """
    if not html_content:
        return html_content
    
    # Remove HTML comments
    html_content = re.sub(r'<!--.*?-->', '', html_content, flags=re.DOTALL)
    
    # Handle headers (h1-h6)
    html_content = re.sub(r'<h1[^>]*>(.*?)</h1>', r'# \1', html_content, flags=re.DOTALL)
    html_content = re.sub(r'<h2[^>]*>(.*?)</h2>', r'## \1', html_content, flags=re.DOTALL)
    html_content = re.sub(r'<h3[^>]*>(.*?)</h3>', r'### \1', html_content, flags=re.DOTALL)
    html_content = re.sub(r'<h4[^>]*>(.*?)</h4>', r'#### \1', html_content, flags=re.DOTALL)
    html_content = re.sub(r'<h5[^>]*>(.*?)</h5>', r'##### \1', html_content, flags=re.DOTALL)
    html_content = re.sub(r'<h6[^>]*>(.*?)</h6>', r'###### \1', html_content, flags=re.DOTALL)
    
    # Handle bold and strong
    html_content = re.sub(r'<(strong|b)[^>]*>(.*?)</(strong|b)>', r'**\2**', html_content, flags=re.DOTALL)
    
    # Handle italic and emphasis
    html_content = re.sub(r'<(em|i)[^>]*>(.*?)</(em|i)>', r'*\2*', html_content, flags=re.DOTALL)
    
    # Handle underline
    html_content = re.sub(r'<u[^>]*>(.*?)</u>', r'__\1__', html_content, flags=re.DOTALL)
    
    # Handle line breaks
    html_content = re.sub(r'<br\s*/?>', '\n', html_content, flags=re.IGNORECASE)
    
    # Handle paragraphs
    html_content = re.sub(r'<p[^>]*>(.*?)</p>', r'\1\n\n', html_content, flags=re.DOTALL)
    
    # Handle spans (remove styling, keep content)
    html_content = re.sub(r'<span[^>]*>(.*?)</span>', r'\1', html_content, flags=re.DOTALL)
    
    # Handle divs
    html_content = re.sub(r'<div[^>]*>(.*?)</div>', r'\1\n', html_content, flags=re.DOTALL)
    
    # Handle tables (convert to Markdown tables)
    html_content = convert_html_tables_to_markdown(html_content)
    
    # Handle lists
    html_content = convert_html_lists_to_markdown(html_content)
    
    # Clean up extra whitespace and newlines
    html_content = re.sub(r'\n\s*\n\s*\n', '\n\n', html_content)
    html_content = html_content.strip()
    
    return html_content

def convert_html_tables_to_markdown(html_content: str) -> str:
    """Convert HTML tables to Markdown format"""
    
    def process_table(match):
        table_html = match.group(0)
        
        # Extract table rows
        rows = re.findall(r'<tr[^>]*>(.*?)</tr>', table_html, flags=re.DOTALL)
        if len(rows) < 2:
            return table_html
        
        markdown_table = []
        
        for i, row in enumerate(rows):
            # Extract cells
            cells = re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', row, flags=re.DOTALL)
            if not cells:
                continue
            
            # Clean cell content
            clean_cells = []
            for cell in cells:
                # Remove HTML tags from cell content
                clean_cell = re.sub(r'<[^>]+>', '', cell)
                clean_cell = clean_cell.strip()
                clean_cells.append(clean_cell)
            
            # Create markdown row
            markdown_row = '| ' + ' | '.join(clean_cells) + ' |'
            markdown_table.append(markdown_row)
            
            # Add separator after header row
            if i == 0:
                separator = '| ' + ' | '.join(['---'] * len(clean_cells)) + ' |'
                markdown_table.append(separator)
        
        return '\n'.join(markdown_table)
    
    # Find and convert tables
    html_content = re.sub(r'<table[^>]*>.*?</table>', process_table, html_content, flags=re.DOTALL)
    
    return html_content

def convert_html_lists_to_markdown(html_content: str) -> str:
    """Convert HTML lists to Markdown format"""
    
    # Convert ordered lists
    def process_ol(match):
        list_html = match.group(0)
        items = re.findall(r'<li[^>]*>(.*?)</li>', list_html, flags=re.DOTALL)
        
        markdown_list = []
        for i, item in enumerate(items, 1):
            clean_item = re.sub(r'<[^>]+>', '', item).strip()
            markdown_list.append(f'{i}. {clean_item}')
        
        return '\n'.join(markdown_list)
    
    # Convert unordered lists
    def process_ul(match):
        list_html = match.group(0)
        items = re.findall(r'<li[^>]*>(.*?)</li>', list_html, flags=re.DOTALL)
        
        markdown_list = []
        for item in items:
            clean_item = re.sub(r'<[^>]+>', '', item).strip()
            markdown_list.append(f'- {clean_item}')
        
        return '\n'.join(markdown_list)
    
    # Process lists
    html_content = re.sub(r'<ol[^>]*>.*?</ol>', process_ol, html_content, flags=re.DOTALL)
    html_content = re.sub(r'<ul[^>]*>.*?</ul>', process_ul, html_content, flags=re.DOTALL)
    
    return html_content

def convert_mysql_to_postgresql_with_markdown(input_file: str, output_file: str) -> str:
    """Convert MySQL SQL dump to PostgreSQL format with HTML to Markdown conversion"""
    
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f"Original file size: {len(content)} characters")
    
    # Remove MySQL-specific comments and settings - more targeted approach
    content = re.sub(r'-- phpMyAdmin SQL Dump\n', '', content)
    content = re.sub(r'-- version [^\n]*\n', '', content)
    content = re.sub(r'-- https://www\.phpmyadmin\.net/[^\n]*\n', '', content)
    content = re.sub(r'-- Host: [^\n]*\n', '', content)
    content = re.sub(r'-- Generation Time: [^\n]*\n', '', content)
    content = re.sub(r'-- Server version: [^\n]*\n', '', content)
    content = re.sub(r'-- PHP Version: [^\n]*\n', '', content)
    
    # Remove MySQL-specific SET statements
    content = re.sub(r'SET SQL_MODE[^;]*;\n', '', content)
    content = re.sub(r'SET AUTOCOMMIT[^;]*;\n', '', content)
    content = re.sub(r'START TRANSACTION;\n', '', content)
    content = re.sub(r'SET time_zone[^;]*;\n', '', content)
    content = re.sub(r'SET NAMES[^;]*;\n', '', content)
    content = re.sub(r'/\*!40101[^;]*;\n', '', content)
    
    # Remove character set and collation settings
    content = re.sub(r'/\*!40101 SET @OLD_CHARACTER_SET_CLIENT[^;]*;\n', '', content)
    content = re.sub(r'/\*!40101 SET @OLD_CHARACTER_SET_RESULTS[^;]*;\n', '', content)
    content = re.sub(r'/\*!40101 SET @OLD_COLLATION_CONNECTION[^;]*;\n', '', content)
    content = re.sub(r'/\*!40101 SET NAMES[^;]*;\n', '', content)
    
    # Convert data types
    # int(n) -> INTEGER
    content = re.sub(r'`id` int\(\d+\) NOT NULL', '`id` SERIAL PRIMARY KEY', content)
    content = re.sub(r'int\(\d+\)', 'INTEGER', content)
    
    # Remove ENGINE and CHARSET specifications
    content = re.sub(r' ENGINE=\w+ DEFAULT CHARSET=\w+', '', content)
    
    # Convert backticks to double quotes for identifiers
    content = re.sub(r'`([^`]+)`', r'"\1"', content)
    
    # Add IF NOT EXISTS to CREATE TABLE
    content = re.sub(r'CREATE TABLE "([^"]+)"', r'CREATE TABLE IF NOT EXISTS "\1"', content)
    
    # Remove AUTO_INCREMENT from PRIMARY KEY (already handled by SERIAL)
    content = re.sub(r' AUTO_INCREMENT,', ',', content)
    content = re.sub(r' AUTO_INCREMENT', '', content)
    
    # Remove PRIMARY KEY definition if we're using SERIAL
    content = re.sub(r',\s*PRIMARY KEY \("id"\)', '', content)
    
    # Convert HTML to Markdown in INSERT statements
    print("Converting HTML to Markdown in data fields...")
    content = convert_html_in_inserts_to_markdown(content)
    
    # Add header comment
    postgresql_header = """-- PostgreSQL version of MySQL dump with Markdown conversion
-- Converted from MySQL dump using convert_mysql_to_pg_with_markdown.py
-- HTML content has been converted to Markdown format

"""
    
    content = postgresql_header + content
    
    print(f"Converted file size: {len(content)} characters")
    
    # Write the converted content
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Conversion complete! Output written to: {output_file}")
    return output_file

def convert_html_in_inserts_to_markdown(content: str) -> str:
    """Convert HTML to Markdown specifically in INSERT statement VALUES"""
    
    def process_insert_values(match):
        insert_statement = match.group(0)
        
        # Find VALUES clause
        values_match = re.search(r'VALUES\s*\((.*?)\);', insert_statement, re.DOTALL)
        if not values_match:
            return insert_statement
        
        values_content = values_match.group(1)
        
        # Split values by comma, but be careful with quoted strings
        values = split_values_safely(values_content)
        
        # Process each value for HTML conversion
        processed_values = []
        for value in values:
            if value and value.strip() and value.strip() != "''":
                # Check if this value contains HTML
                if '<' in value and '>' in value:
                    # Extract the actual content from quotes
                    if value.startswith("'") and value.endswith("'"):
                        inner_content = value[1:-1]
                        # Convert HTML to Markdown
                        markdown_content = html_to_markdown(inner_content)
                        # Escape single quotes for SQL
                        markdown_content = markdown_content.replace("'", "''")
                        processed_values.append(f"'{markdown_content}'")
                    else:
                        processed_values.append(value)
                else:
                    processed_values.append(value)
            else:
                processed_values.append(value)
        
        # Reconstruct the INSERT statement
        new_values_content = ', '.join(processed_values)
        new_insert = re.sub(r'VALUES\s*\(.*?\);', f'VALUES ({new_values_content});', insert_statement, flags=re.DOTALL)
        
        return new_insert
    
    # Find and process all INSERT statements
    content = re.sub(r'INSERT INTO "[^"]+"[^;]*VALUES\s*\([^;]*\);', process_insert_values, content, flags=re.DOTALL)
    
    return content

def split_values_safely(values_str: str) -> List[str]:
    """Safely split VALUES content by comma, respecting quoted strings"""
    values = []
    current_value = ""
    in_quotes = False
    quote_char = None
    escape_next = False
    
    for char in values_str:
        if escape_next:
            current_value += char
            escape_next = False
            continue
            
        if char == '\\' and in_quotes:
            current_value += char
            escape_next = True
            continue
            
        if not in_quotes:
            if char in ("'", '"'):
                in_quotes = True
                quote_char = char
                current_value += char
            elif char == ',':
                values.append(current_value.strip())
                current_value = ""
                continue
            else:
                current_value += char
        else:
            if char == quote_char:
                in_quotes = False
                quote_char = None
            current_value += char
    
    # Add the last value
    if current_value.strip():
        values.append(current_value.strip())
    
    return values

def upload_to_database(sql_file: str) -> bool:
    """Upload the converted SQL file to PostgreSQL database using Prisma"""
    try:
        print("Uploading to database using Prisma...")
        
        # Change to the project root directory
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        os.chdir(project_root)
        
        # Use Prisma to execute the SQL file
        result = subprocess.run([
            'npx', 'prisma', 'db', 'execute', 
            '--file', sql_file,
            '--schema', 'prisma/schema.prisma'
        ], capture_output=True, text=True, check=True)
        
        print("✅ Data uploaded successfully via Prisma!")
        print(f"Output: {result.stdout}")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Error uploading data: {e}")
        print(f"Output: {e.stdout}")
        print(f"Error: {e.stderr}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Convert MySQL to PostgreSQL with HTML to Markdown conversion')
    parser.add_argument('input_file', help='Input MySQL SQL file')
    parser.add_argument('output_file', help='Output PostgreSQL SQL file')
    parser.add_argument('--upload', action='store_true', help='Upload to database after conversion')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.input_file):
        print(f"Error: {args.input_file} not found!")
        sys.exit(1)
    
    try:
        # Convert the file
        output_file = convert_mysql_to_postgresql_with_markdown(args.input_file, args.output_file)
        
        # Upload to database if requested
        if args.upload:
            success = upload_to_database(output_file)
            if success:
                print("🎉 MySQL data successfully converted and uploaded to PostgreSQL!")
            else:
                print("💥 Upload failed!")
                sys.exit(1)
        else:
            print("\nTo import into PostgreSQL:")
            print(f"psql -d your_database -f {args.output_file}")
            print("\nOr use --upload flag to upload directly to database")
            
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
