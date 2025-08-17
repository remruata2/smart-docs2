#!/usr/bin/env python3
"""
Script to convert MySQL dump to PostgreSQL-compatible SQL
Usage: python convert_mysql_to_pg.py input.sql output.sql
"""

import sys
import re

def convert_mysql_to_postgresql(input_file, output_file):
    """Convert MySQL SQL dump to PostgreSQL format"""
    
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
    
    # Add header comment
    postgresql_header = """-- PostgreSQL version of MySQL dump
-- Converted from MySQL dump using convert_mysql_to_pg.py

"""
    
    content = postgresql_header + content
    
    print(f"Converted file size: {len(content)} characters")
    
    # Write the converted content
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Conversion complete! Output written to: {output_file}")
    print("\nTo import into PostgreSQL:")
    print(f"psql -d your_database -f {output_file}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python convert_mysql_to_pg.py input.sql output.sql")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    try:
        convert_mysql_to_postgresql(input_file, output_file)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1) 