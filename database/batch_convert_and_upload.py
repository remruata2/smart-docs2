#!/usr/bin/env python3
"""
Batch Converter and Uploader for all CID files
Converts MySQL to PostgreSQL, HTML to Markdown, and uploads to database
"""

import os
import subprocess
import sys
from pathlib import Path

def get_cid_files():
    """Get all CID_*.sql files in the current directory"""
    cid_files = []
    for file in os.listdir('.'):
        if file.startswith('CID_') and file.endswith('.sql') and not file.endswith('_postgresql.sql'):
            cid_files.append(file)
    return sorted(cid_files)

def convert_and_upload_file(input_file: str, upload: bool = False) -> bool:
    """Convert a single CID file and optionally upload it"""
    output_file = input_file.replace('.sql', '_postgresql_markdown.sql')
    
    print(f"\n🔄 Processing {input_file}...")
    
    # Build the command
    cmd = [
        'python3', 'convert_mysql_to_pg_with_markdown.py',
        input_file, output_file
    ]
    
    if upload:
        cmd.append('--upload')
    
    try:
        # Run the conversion
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print(f"✅ {input_file} processed successfully!")
        print(f"Output: {output_file}")
        
        if upload:
            print("✅ File uploaded to database!")
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Error processing {input_file}: {e}")
        print(f"Error output: {e.stderr}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error with {input_file}: {e}")
        return False

def main():
    print("🚀 Batch CID File Converter and Uploader")
    print("=" * 50)
    
    # Check if the enhanced converter exists
    if not os.path.exists('convert_mysql_to_pg_with_markdown.py'):
        print("❌ Error: convert_mysql_to_pg_with_markdown.py not found!")
        print("Please run this script from the database directory.")
        sys.exit(1)
    
    # Get all CID files
    cid_files = get_cid_files()
    
    if not cid_files:
        print("❌ No CID_*.sql files found in current directory!")
        sys.exit(1)
    
    print(f"📁 Found {len(cid_files)} CID files to process:")
    for file in cid_files:
        print(f"   - {file}")
    
    # Ask user for upload preference
    print("\n" + "=" * 50)
    upload_choice = input("Do you want to upload files to database after conversion? (y/n): ").lower().strip()
    upload = upload_choice in ['y', 'yes']
    
    if upload:
        print("📤 Files will be uploaded to database after conversion.")
    else:
        print("💾 Files will be converted only (no database upload).")
    
    # Confirm before proceeding
    print("\n" + "=" * 50)
    confirm = input(f"Proceed with processing {len(cid_files)} files? (y/n): ").lower().strip()
    if confirm not in ['y', 'yes']:
        print("❌ Operation cancelled.")
        sys.exit(0)
    
    # Process all files
    print(f"\n🚀 Starting batch processing of {len(cid_files)} files...")
    
    successful = 0
    failed = 0
    
    for cid_file in cid_files:
        if convert_and_upload_file(cid_file, upload):
            successful += 1
        else:
            failed += 1
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 BATCH PROCESSING SUMMARY")
    print("=" * 50)
    print(f"✅ Successful: {successful}")
    print(f"❌ Failed: {failed}")
    print(f"📁 Total: {len(cid_files)}")
    
    if successful > 0:
        print(f"\n🎉 Successfully processed {successful} files!")
        if upload:
            print("📤 All successful files have been uploaded to the database.")
        else:
            print("💾 Converted files are ready for manual database import.")
    
    if failed > 0:
        print(f"\n⚠️  {failed} files failed to process.")
        print("Check the error messages above for details.")
    
    print("\n" + "=" * 50)
    print("✨ Batch processing complete!")

if __name__ == "__main__":
    main()
