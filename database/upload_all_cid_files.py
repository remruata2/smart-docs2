#!/usr/bin/env python3
"""
Upload all converted CID files to PostgreSQL database
This script imports all the converted MySQL to PostgreSQL + Markdown files
"""

import os
import subprocess
import sys
import psycopg2
from pathlib import Path
import time
import urllib.parse
import re

class CIDDatabaseUploader:
    def __init__(self):
        self.project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.db_config = self.get_db_config()
        
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
        
    def get_db_config(self):
        """Get database configuration from environment or .env file"""
        # Try to read from .env file
        env_file = os.path.join(self.project_root, '.env')
        db_url = None
        
        if os.path.exists(env_file):
            with open(env_file, 'r') as f:
                for line in f:
                    if line.startswith('DATABASE_URL='):
                        db_url = line.split('=', 1)[1].strip().strip('"')
                        break
        
        if not db_url:
            print("❌ No DATABASE_URL found in .env file")
            sys.exit(1)
            
        # Parse connection string using urllib
        try:
            parsed = urllib.parse.urlparse(db_url)
            
            # Extract components
            username = parsed.username
            password = parsed.password
            host = parsed.hostname
            port = parsed.port or 5432
            database = parsed.path.lstrip('/')
            
            # Handle URL encoding in password
            if password:
                password = urllib.parse.unquote(password)
            
            return {
                'host': host,
                'port': port,
                'database': database,
                'user': username,  # psycopg2 uses 'user' not 'username'
                'password': password
            }
        except Exception as e:
            print(f"❌ Error parsing DATABASE_URL: {e}")
            sys.exit(1)
    
    def test_connection(self):
        """Test database connection"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            cursor.execute("SELECT version();")
            version = cursor.fetchone()
            print(f"✅ Connected to PostgreSQL: {version[0]}")
            cursor.close()
            conn.close()
            return True
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            return False
    
    def get_converted_files(self):
        """Get all converted CID files"""
        database_dir = os.path.join(self.project_root, 'database')
        converted_files = []
        
        for file in os.listdir(database_dir):
            if file.startswith('CID_') and file.endswith('_postgresql_markdown.sql') and not file.endswith('_postgresql_markdown_postgresql_markdown.sql'):
                converted_files.append(os.path.join(database_dir, file))
        
        return sorted(converted_files)
    
    def clean_file_before_upload(self, file_path: str) -> str:
        """Clean up the file content before uploading to remove any remaining formatting issues"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Clean up any remaining \r\n characters or formatting issues
            cleaned_content = self.clean_text_formatting(content)
            
            # Create a temporary cleaned file
            temp_file = file_path.replace('.sql', '_cleaned.sql')
            with open(temp_file, 'w', encoding='utf-8') as f:
                f.write(cleaned_content)
            
            return temp_file
            
        except Exception as e:
            print(f"⚠️  Warning: Could not clean file {file_path}: {e}")
            return file_path
    
    def upload_file(self, file_path: str) -> bool:
        """Upload a single converted file to the database"""
        print(f"🔄 Uploading {os.path.basename(file_path)}...")
        
        try:
            # Clean the file before upload
            cleaned_file = self.clean_file_before_upload(file_path)
            
            # Use psql command line tool for large file imports
            # This is more efficient than Python for large SQL files
            
            # Build psql command
            psql_cmd = [
                'psql',
                '-h', self.db_config['host'],
                '-p', str(self.db_config['port']),
                '-U', self.db_config['user'],
                '-d', self.db_config['database'],
                '-f', cleaned_file
            ]
            
            # Set password environment variable
            env = os.environ.copy()
            env['PGPASSWORD'] = self.db_config['password']
            
            # Run psql command
            result = subprocess.run(
                psql_cmd,
                env=env,
                capture_output=True,
                text=True,
                cwd=self.project_root
            )
            
            # Clean up temporary file if it was created
            if cleaned_file != file_path and os.path.exists(cleaned_file):
                os.remove(cleaned_file)
            
            if result.returncode == 0:
                print(f"✅ Successfully uploaded {os.path.basename(file_path)}")
                return True
            else:
                print(f"❌ Failed to upload {os.path.basename(file_path)}")
                print(f"Error: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"❌ Error uploading {os.path.basename(file_path)}: {e}")
            return False
    
    def upload_all_files(self):
        """Upload all converted files to the database"""
        print("🚀 Starting database upload of all converted CID files...")
        
        # Test connection first
        if not self.test_connection():
            return False
        
        # Get all converted files
        converted_files = self.get_converted_files()
        
        if not converted_files:
            print("❌ No converted files found!")
            return False
        
        print(f"📁 Found {len(converted_files)} converted files to upload:")
        for file in converted_files:
            print(f"   - {os.path.basename(file)}")
        
        # Upload each file
        successful = 0
        failed = 0
        
        for file_path in converted_files:
            if self.upload_file(file_path):
                successful += 1
            else:
                failed += 1
            
            # Small delay between uploads
            time.sleep(1)
        
        # Summary
        print("\n" + "="*50)
        print("📊 UPLOAD SUMMARY")
        print("="*50)
        print(f"✅ Successful: {successful}")
        print(f"❌ Failed: {failed}")
        print(f"📁 Total: {len(converted_files)}")
        
        if failed == 0:
            print("\n🎉 All files uploaded successfully!")
        else:
            print(f"\n⚠️  {failed} files failed to upload")
        
        return failed == 0

def main():
    """Main function"""
    uploader = CIDDatabaseUploader()
    
    try:
        success = uploader.upload_all_files()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⚠️  Upload interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
