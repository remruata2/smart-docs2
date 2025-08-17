#!/usr/bin/env python3
"""
Example Usage Script for PostgreSQL Uploader
============================================

This script demonstrates how to use the PostgreSQL uploader programmatically.
It shows different ways to upload data and handle various scenarios.
"""

import os
import sys
from postgresql_uploader import PostgreSQLUploader

def example_basic_upload():
    """Example 1: Basic file upload with default configuration"""
    print("=" * 50)
    print("EXAMPLE 1: Basic Upload")
    print("=" * 50)
    
    # Initialize uploader with default configuration
    uploader = PostgreSQLUploader()
    
    # Test connection first
    if not uploader.test_connection():
        print("❌ Connection failed. Please check your database configuration.")
        return False
    
    # Upload a single file
    file_path = "CID_1_professional.sql"
    if os.path.exists(file_path):
        success = uploader.upload_file(file_path)
        if success:
            print(f"✅ Successfully uploaded {file_path}")
        else:
            print(f"❌ Failed to upload {file_path}")
        return success
    else:
        print(f"⚠️  File not found: {file_path}")
        return False

def example_custom_config():
    """Example 2: Upload with custom database configuration"""
    print("\n" + "=" * 50)
    print("EXAMPLE 2: Custom Configuration")
    print("=" * 50)
    
    # Custom database configuration
    custom_config = {
        'host': 'localhost',
        'port': 5432,
        'database': 'my_custom_db',
        'user': 'myuser',
        'password': 'mypassword',
        'connect_timeout': 60,
        'statement_timeout': 600000  # 10 minutes
    }
    
    uploader = PostgreSQLUploader(custom_config)
    
    # Test connection with custom config
    if not uploader.test_connection():
        print("❌ Connection failed with custom configuration.")
        return False
    
    # Create database if it doesn't exist
    if not uploader.create_database_if_not_exists():
        print("❌ Failed to create database")
        return False
    
    print("✅ Custom configuration working!")
    return True

def example_bulk_upload():
    """Example 3: Upload all professional files"""
    print("\n" + "=" * 50)
    print("EXAMPLE 3: Bulk Upload")
    print("=" * 50)
    
    uploader = PostgreSQLUploader()
    
    # Test connection
    if not uploader.test_connection():
        print("❌ Connection failed.")
        return False
    
    # Upload all professional files
    success = uploader.upload_all_professional_files()
    
    # Print detailed statistics
    uploader.print_summary()
    
    return success

def example_with_error_handling():
    """Example 4: Comprehensive error handling"""
    print("\n" + "=" * 50)
    print("EXAMPLE 4: Error Handling")
    print("=" * 50)
    
    try:
        uploader = PostgreSQLUploader()
        
        # Test connection with retry logic
        max_retries = 3
        for attempt in range(max_retries):
            if uploader.test_connection():
                print(f"✅ Connected on attempt {attempt + 1}")
                break
            else:
                print(f"⚠️  Connection attempt {attempt + 1} failed")
                if attempt < max_retries - 1:
                    print("   Retrying in 5 seconds...")
                    import time
                    time.sleep(5)
        else:
            print("❌ All connection attempts failed")
            return False
        
        # Try to upload files with individual error handling
        database_dir = "."
        professional_files = [f for f in os.listdir(database_dir) if f.endswith('_professional.sql')]
        
        successful_uploads = 0
        failed_uploads = 0
        
        for file in professional_files:
            print(f"\n🔄 Processing {file}...")
            try:
                if uploader.upload_file(file):
                    successful_uploads += 1
                    print(f"✅ {file} uploaded successfully")
                else:
                    failed_uploads += 1
                    print(f"❌ {file} upload failed")
            except Exception as e:
                failed_uploads += 1
                print(f"❌ Exception uploading {file}: {e}")
        
        print(f"\n📊 Results: {successful_uploads} successful, {failed_uploads} failed")
        return failed_uploads == 0
        
    except KeyboardInterrupt:
        print("\n⚠️  Upload interrupted by user")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def example_environment_variables():
    """Example 5: Using environment variables for configuration"""
    print("\n" + "=" * 50)
    print("EXAMPLE 5: Environment Variables")
    print("=" * 50)
    
    # Show current environment variables
    env_vars = ['POSTGRES_HOST', 'POSTGRES_PORT', 'POSTGRES_DATABASE', 'POSTGRES_USER']
    
    print("Current PostgreSQL environment variables:")
    for var in env_vars:
        value = os.getenv(var, 'Not set')
        # Don't show password for security
        if var == 'POSTGRES_PASSWORD':
            value = '***' if os.getenv(var) else 'Not set'
        print(f"  {var}: {value}")
    
    # Set some example environment variables (you would do this in your shell)
    print("\nTo use environment variables, run these commands in your shell:")
    print("export POSTGRES_HOST=localhost")
    print("export POSTGRES_PORT=5432")
    print("export POSTGRES_DATABASE=cid_database")
    print("export POSTGRES_USER=postgres")
    print("export POSTGRES_PASSWORD=your_password")
    print("\nThen run: python postgresql_uploader.py --all")
    
    return True

def main():
    """Run all examples"""
    print("🚀 PostgreSQL Uploader Examples")
    print("="*60)
    
    examples = [
        ("Basic Upload", example_basic_upload),
        ("Custom Configuration", example_custom_config),
        ("Bulk Upload", example_bulk_upload),
        ("Error Handling", example_with_error_handling),
        ("Environment Variables", example_environment_variables)
    ]
    
    results = {}
    
    for name, example_func in examples:
        try:
            print(f"\n🔄 Running example: {name}")
            results[name] = example_func()
        except KeyboardInterrupt:
            print(f"\n⚠️  Example '{name}' interrupted by user")
            results[name] = False
            break
        except Exception as e:
            print(f"❌ Example '{name}' failed with error: {e}")
            results[name] = False
    
    # Summary
    print("\n" + "="*60)
    print("📊 EXAMPLES SUMMARY")
    print("="*60)
    
    for name, success in results.items():
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{name:.<30} {status}")
    
    successful = sum(results.values())
    total = len(results)
    print(f"\nTotal: {successful}/{total} examples passed")
    
    if successful == total:
        print("🎉 All examples completed successfully!")
    else:
        print(f"⚠️  {total - successful} examples had issues")

if __name__ == "__main__":
    main()
