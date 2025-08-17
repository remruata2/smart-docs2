# PostgreSQL Database Upload Tool

This directory contains tools to convert MySQL database dumps to PostgreSQL format and upload them to a PostgreSQL database.

## Files

- `postgresql_uploader.py` - Main upload script for PostgreSQL databases
- `professional_html_converter.py` - Converts MySQL dumps to PostgreSQL format with HTML to Markdown conversion
- `requirements.txt` - Python dependencies
- `CID_*_professional.sql` - Converted PostgreSQL-compatible SQL files

## Prerequisites

1. **PostgreSQL Server**: You need a running PostgreSQL server
2. **Python 3.7+**: The scripts require Python 3.7 or higher
3. **Dependencies**: Install required Python packages

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Ensure PostgreSQL is installed and running:
```bash
# On macOS with Homebrew
brew install postgresql
brew services start postgresql

# On Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql

# On CentOS/RHEL
sudo yum install postgresql postgresql-server
sudo systemctl start postgresql
```

## Configuration

### Method 1: Environment Variables (Recommended)
Set the following environment variables:

```bash
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_DATABASE=cid_database
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=your_password
```

### Method 2: Interactive Input
If environment variables are not set, the script will prompt you for database credentials.

## Usage

### 1. Test Database Connection
```bash
python postgresql_uploader.py --test
```

### 2. Create Database (if it doesn't exist)
```bash
python postgresql_uploader.py --create --test
```

### 3. Upload a Single File
```bash
python postgresql_uploader.py --file CID_1_professional.sql
```

### 4. Upload All Professional Files
```bash
python postgresql_uploader.py --all
```

### 5. Create Database and Upload All Files
```bash
python postgresql_uploader.py --all --create
```

### 6. Verbose Output
```bash
python postgresql_uploader.py --all --verbose
```

## Command Line Options

- `--file, -f FILE` - Upload a specific SQL file
- `--all, -a` - Upload all `*_professional.sql` files
- `--create` - Create the database if it doesn't exist
- `--test` - Test database connection only
- `--verbose, -v` - Enable verbose logging

## Examples

### Basic Upload
```bash
# Upload a single file
python postgresql_uploader.py --file CID_1_professional.sql

# Upload all converted files
python postgresql_uploader.py --all
```

### With Database Creation
```bash
# Create database and upload all files
python postgresql_uploader.py --all --create
```

### Full Setup from Scratch
```bash
# 1. Test connection
python postgresql_uploader.py --test

# 2. Create database
python postgresql_uploader.py --create --test

# 3. Upload all files with verbose output
python postgresql_uploader.py --all --verbose
```

## File Structure

After successful upload, your PostgreSQL database will contain:

- `file_list` table with converted data
- All HTML content converted to Markdown format
- PostgreSQL-compatible data types and constraints

## Logging

The script creates detailed logs in the `logs/` directory:
- Connection attempts
- SQL execution progress  
- Error details
- Performance statistics

## Troubleshooting

### Connection Issues
```bash
# Test basic connection
python postgresql_uploader.py --test

# Check PostgreSQL service
sudo systemctl status postgresql

# Check if database exists
psql -h localhost -U postgres -c "\l"
```

### Permission Issues
```bash
# Grant permissions to user
psql -h localhost -U postgres -c "ALTER USER your_user CREATEDB;"
```

### Large File Issues
For large SQL files, the script:
- Uses transactions for data integrity
- Shows progress for long operations
- Handles timeouts gracefully
- Provides detailed error reporting

### Common Errors

1. **`psycopg2` not found**:
   ```bash
   pip install psycopg2-binary
   ```

2. **Connection refused**:
   - Ensure PostgreSQL is running
   - Check host/port configuration
   - Verify firewall settings

3. **Authentication failed**:
   - Check username/password
   - Verify `pg_hba.conf` settings
   - Ensure user has necessary permissions

4. **Database does not exist**:
   ```bash
   python postgresql_uploader.py --create --test
   ```

## Security Notes

- Store database passwords in environment variables, not in code
- Use dedicated database users with minimal required permissions
- Consider using connection pooling for production environments
- Enable SSL connections in production

## Performance Tips

- Upload during off-peak hours for large datasets
- Monitor PostgreSQL logs during upload
- Consider increasing `statement_timeout` for very large operations
- Use `--verbose` to monitor progress

## Support

For issues:
1. Check the logs in the `logs/` directory
2. Run with `--verbose` for detailed output
3. Test connection with `--test` option
4. Verify PostgreSQL server is running and accessible
