#!/usr/bin/env python3
"""
PostgreSQL Database Upload Script
=================================

This script uploads converted PostgreSQL SQL files (like CID_1_professional.sql) 
to a PostgreSQL database. It handles:
- Database connection management
- SQL file execution
- Error handling and transaction management
- Progress tracking
- Connection pooling

Requirements:
- psycopg2-binary package
- PostgreSQL server running
- Database credentials

Usage:
    python postgresql_uploader.py --file CID_1_professional.sql
    python postgresql_uploader.py --all  # Upload all _professional.sql files
"""

import os
import sys
import argparse
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any
import time
from datetime import datetime

try:
    import psycopg2
    from psycopg2 import sql, Error as PostgreSQLError
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
except ImportError:
    print("❌ Error: psycopg2 is required. Install it with:")
    print("   pip install psycopg2-binary")
    sys.exit(1)

class PostgreSQLUploader:
    """Professional PostgreSQL database uploader with comprehensive error handling"""
    
    def __init__(self, config: Optional[Dict] = None):
        """Initialize the uploader with database configuration"""
        self.project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        # Default database configuration (modify as needed)
        self.config = {
            'host': 'localhost',
            'port': 5432,
            'database': 'cid_database',
            'user': 'postgres',
            'password': 'password',  # Change this!
            'connect_timeout': 30,
            'statement_timeout': 300000,  # 5 minutes for large queries
            'autocommit': False
        }
        
        if config:
            self.config.update(config)
        
        # Setup logging
        self.setup_logging()
        
        # Statistics
        self.stats = {
            'files_processed': 0,
            'files_successful': 0,
            'files_failed': 0,
            'total_statements': 0,
            'successful_statements': 0,
            'failed_statements': 0,
            'start_time': None,
            'end_time': None
        }
    
    def setup_logging(self):
        """Setup comprehensive logging"""
        log_dir = os.path.join(self.project_root, 'logs')
        os.makedirs(log_dir, exist_ok=True)
        
        log_file = os.path.join(log_dir, f'postgresql_upload_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler(sys.stdout)
            ]
        )
        
        self.logger = logging.getLogger(__name__)
        self.logger.info(f"PostgreSQL Uploader initialized. Log file: {log_file}")
    
    def test_connection(self) -> bool:
        """Test the database connection"""
        try:
            self.logger.info("Testing database connection...")
            conn = psycopg2.connect(**self.config)
            
            with conn.cursor() as cursor:
                cursor.execute("SELECT version();")
                version = cursor.fetchone()[0]
                self.logger.info(f"✅ Connected to PostgreSQL: {version}")
            
            conn.close()
            return True
            
        except PostgreSQLError as e:
            self.logger.error(f"❌ Database connection failed: {e}")
            return False
        except Exception as e:
            self.logger.error(f"❌ Unexpected connection error: {e}")
            return False
    
    def create_database_if_not_exists(self) -> bool:
        """Create the target database if it doesn't exist"""
        try:
            # Connect to default postgres database to create target database
            temp_config = self.config.copy()
            target_db = temp_config.pop('database')
            temp_config['database'] = 'postgres'
            
            conn = psycopg2.connect(**temp_config)
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            
            with conn.cursor() as cursor:
                # Check if database exists
                cursor.execute(
                    "SELECT 1 FROM pg_database WHERE datname = %s",
                    (target_db,)
                )
                
                if cursor.fetchone():
                    self.logger.info(f"✅ Database '{target_db}' already exists")
                else:
                    # Create database
                    cursor.execute(sql.SQL("CREATE DATABASE {}").format(
                        sql.Identifier(target_db)
                    ))
                    self.logger.info(f"✅ Database '{target_db}' created successfully")
            
            conn.close()
            return True
            
        except PostgreSQLError as e:
            self.logger.error(f"❌ Failed to create database: {e}")
            return False
        except Exception as e:
            self.logger.error(f"❌ Unexpected error creating database: {e}")
            return False
    
    def split_sql_statements(self, sql_content: str) -> List[str]:
        """Split SQL content into individual statements"""
        # Simple statement splitting - can be enhanced for complex cases
        statements = []
        
        # Split by semicolon but handle cases where semicolons are in strings
        current_statement = ""
        in_string = False
        escape_next = False
        
        for char in sql_content:
            if escape_next:
                current_statement += char
                escape_next = False
                continue
                
            if char == '\\':
                escape_next = True
                current_statement += char
                continue
                
            if char == "'" and not escape_next:
                in_string = not in_string
                current_statement += char
                continue
                
            if char == ';' and not in_string:
                current_statement += char
                if current_statement.strip():
                    statements.append(current_statement.strip())
                current_statement = ""
                continue
                
            current_statement += char
        
        # Add remaining statement if any
        if current_statement.strip():
            statements.append(current_statement.strip())
        
        # Filter out empty statements and comments
        filtered_statements = []
        for stmt in statements:
            stmt = stmt.strip()
            if stmt and not stmt.startswith('--') and stmt != ';':
                filtered_statements.append(stmt)
        
        return filtered_statements
    
    def execute_sql_file(self, file_path: str) -> bool:
        """Execute a SQL file with proper transaction management"""
        try:
            self.logger.info(f"📁 Processing file: {file_path}")
            
            # Read SQL file
            with open(file_path, 'r', encoding='utf-8') as f:
                sql_content = f.read()
            
            if not sql_content.strip():
                self.logger.warning(f"⚠️  File is empty: {file_path}")
                return True
            
            # Split into statements
            statements = self.split_sql_statements(sql_content)
            self.logger.info(f"📊 Found {len(statements)} SQL statements")
            
            if not statements:
                self.logger.warning(f"⚠️  No valid SQL statements found in: {file_path}")
                return True
            
            # Connect and execute
            conn = psycopg2.connect(**self.config)
            
            try:
                with conn.cursor() as cursor:
                    successful_statements = 0
                    failed_statements = 0
                    
                    for i, statement in enumerate(statements, 1):
                        try:
                            self.logger.debug(f"Executing statement {i}/{len(statements)}")
                            cursor.execute(statement)
                            successful_statements += 1
                            
                            # Show progress for large files
                            if i % 100 == 0:
                                self.logger.info(f"Progress: {i}/{len(statements)} statements executed")
                                
                        except PostgreSQLError as e:
                            failed_statements += 1
                            self.logger.error(f"❌ Statement {i} failed: {e}")
                            self.logger.debug(f"Failed statement: {statement[:100]}...")
                            
                            # Decide whether to continue or rollback
                            if "duplicate key value" in str(e).lower():
                                self.logger.warning("Duplicate key - continuing...")
                                continue
                            else:
                                # For other errors, rollback and stop
                                conn.rollback()
                                raise e
                    
                    # Commit transaction
                    conn.commit()
                    self.logger.info(f"✅ Transaction committed successfully")
                    self.logger.info(f"📊 Statements: {successful_statements} successful, {failed_statements} failed")
                    
                    # Update statistics
                    self.stats['total_statements'] += len(statements)
                    self.stats['successful_statements'] += successful_statements
                    self.stats['failed_statements'] += failed_statements
                    
                    return failed_statements == 0
                    
            except PostgreSQLError as e:
                conn.rollback()
                self.logger.error(f"❌ Transaction failed and was rolled back: {e}")
                return False
            finally:
                conn.close()
                
        except FileNotFoundError:
            self.logger.error(f"❌ File not found: {file_path}")
            return False
        except Exception as e:
            self.logger.error(f"❌ Unexpected error processing {file_path}: {e}")
            return False
    
    def upload_file(self, file_path: str) -> bool:
        """Upload a single SQL file to the database"""
        self.stats['files_processed'] += 1
        
        start_time = time.time()
        success = self.execute_sql_file(file_path)
        end_time = time.time()
        
        duration = end_time - start_time
        
        if success:
            self.stats['files_successful'] += 1
            self.logger.info(f"✅ Successfully uploaded {os.path.basename(file_path)} in {duration:.2f}s")
        else:
            self.stats['files_failed'] += 1
            self.logger.error(f"❌ Failed to upload {os.path.basename(file_path)} after {duration:.2f}s")
        
        return success
    
    def upload_all_professional_files(self) -> bool:
        """Upload all _professional.sql files in the database directory"""
        database_dir = os.path.join(self.project_root, 'database')
        
        if not os.path.exists(database_dir):
            self.logger.error(f"❌ Database directory not found: {database_dir}")
            return False
        
        # Find all _professional.sql files
        professional_files = []
        for file in os.listdir(database_dir):
            if file.endswith('_professional.sql'):
                professional_files.append(os.path.join(database_dir, file))
        
        if not professional_files:
            self.logger.error("❌ No _professional.sql files found!")
            return False
        
        self.logger.info(f"📁 Found {len(professional_files)} professional files to upload:")
        for file in professional_files:
            self.logger.info(f"   - {os.path.basename(file)}")
        
        # Upload each file
        all_successful = True
        for file_path in professional_files:
            if not self.upload_file(file_path):
                all_successful = False
        
        return all_successful
    
    def print_summary(self):
        """Print upload summary"""
        duration = 0
        if self.stats['start_time'] and self.stats['end_time']:
            duration = self.stats['end_time'] - self.stats['start_time']
        
        print("\n" + "="*60)
        print("📊 POSTGRESQL UPLOAD SUMMARY")
        print("="*60)
        print(f"📁 Files processed: {self.stats['files_processed']}")
        print(f"✅ Files successful: {self.stats['files_successful']}")
        print(f"❌ Files failed: {self.stats['files_failed']}")
        print(f"📝 Total statements: {self.stats['total_statements']}")
        print(f"✅ Successful statements: {self.stats['successful_statements']}")
        print(f"❌ Failed statements: {self.stats['failed_statements']}")
        print(f"⏱️  Total duration: {duration:.2f} seconds")
        print("="*60)
        
        if self.stats['files_failed'] == 0:
            print("🎉 All files uploaded successfully!")
        else:
            print(f"⚠️  {self.stats['files_failed']} files failed to upload")

def get_database_config() -> Dict[str, Any]:
    """Get database configuration from environment or user input"""
    config = {}
    
    # Try to get from environment variables first
    config['host'] = os.getenv('POSTGRES_HOST', 'localhost')
    config['port'] = int(os.getenv('POSTGRES_PORT', 5432))
    config['database'] = os.getenv('POSTGRES_DATABASE', 'cid_database')
    config['user'] = os.getenv('POSTGRES_USER', 'postgres')
    config['password'] = os.getenv('POSTGRES_PASSWORD')
    
    # If password not in environment, prompt user
    if not config['password']:
        import getpass
        print("Database Configuration:")
        print(f"Host: {config['host']}")
        print(f"Port: {config['port']}")
        print(f"Database: {config['database']}")
        print(f"User: {config['user']}")
        config['password'] = getpass.getpass("Password: ")
    
    return config

def main():
    """Main function"""
    parser = argparse.ArgumentParser(
        description="Upload PostgreSQL SQL files to database",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --file CID_1_professional.sql          # Upload single file
  %(prog)s --all                                   # Upload all _professional.sql files
  %(prog)s --file CID_1_professional.sql --create # Create database if not exists
  
Environment Variables:
  POSTGRES_HOST      - Database host (default: localhost)
  POSTGRES_PORT      - Database port (default: 5432)
  POSTGRES_DATABASE  - Database name (default: cid_database)
  POSTGRES_USER      - Database user (default: postgres)  
  POSTGRES_PASSWORD  - Database password (will prompt if not set)
        """
    )
    
    parser.add_argument(
        '--file', '-f',
        help='SQL file to upload',
        metavar='FILE'
    )
    
    parser.add_argument(
        '--all', '-a',
        action='store_true',
        help='Upload all _professional.sql files'
    )
    
    parser.add_argument(
        '--create',
        action='store_true',
        help='Create database if it doesn\'t exist'
    )
    
    parser.add_argument(
        '--test',
        action='store_true',
        help='Test database connection only'
    )
    
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose logging'
    )
    
    args = parser.parse_args()
    
    if not args.file and not args.all and not args.test:
        parser.error("Must specify either --file, --all, or --test")
    
    try:
        # Get database configuration
        config = get_database_config()
        
        # Initialize uploader
        uploader = PostgreSQLUploader(config)
        
        if args.verbose:
            logging.getLogger().setLevel(logging.DEBUG)
        
        # Test connection
        if not uploader.test_connection():
            print("❌ Cannot connect to database. Please check your configuration.")
            sys.exit(1)
        
        if args.test:
            print("✅ Database connection test successful!")
            sys.exit(0)
        
        # Create database if requested
        if args.create:
            if not uploader.create_database_if_not_exists():
                print("❌ Failed to create database")
                sys.exit(1)
        
        # Start upload process
        uploader.stats['start_time'] = time.time()
        
        success = False
        if args.all:
            success = uploader.upload_all_professional_files()
        elif args.file:
            if not os.path.exists(args.file):
                print(f"❌ File not found: {args.file}")
                sys.exit(1)
            success = uploader.upload_file(args.file)
        
        uploader.stats['end_time'] = time.time()
        
        # Print summary
        uploader.print_summary()
        
        if success:
            print("\n✅ Upload completed successfully!")
            sys.exit(0)
        else:
            print("\n❌ Upload completed with errors!")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⚠️  Upload interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
