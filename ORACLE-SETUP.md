# Oracle Linux Server Setup Guide for CID-AI

This guide provides step-by-step instructions for setting up the CID-AI Next.js application on an Oracle Linux server with PostgreSQL database.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [PostgreSQL Database Setup](#postgresql-database-setup)
3. [Application Configuration](#application-configuration)
4. [Database Schema Migration](#database-schema-migration)
5. [Application Deployment](#application-deployment)
6. [Post-Deployment Steps](#post-deployment-steps)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### 1. System Requirements

- **Oracle Linux 8/9** or compatible Linux distribution
- **Node.js 18.0.0 or later** (20.x LTS recommended)
- **PostgreSQL 18** (latest, recommended) or PostgreSQL 15+ (minimum)
- **Minimum 4GB RAM** (8GB+ recommended)
- **20GB+ free disk space**

### 2. System Packages

**CRITICAL:** Install build tools BEFORE running `npm install`. Native Node.js modules require these tools to compile.

```bash
# Update system packages
sudo yum update -y

# Install Development Tools group (includes gcc, g++, make, etc.)
sudo yum groupinstall -y "Development Tools"

# Install additional required packages
sudo yum install -y \
    curl \
    wget \
    git \
    unzip \
    python3 \
    python3-devel \
    nodejs-devel

# For ARM64 (aarch64) architecture, ensure all build tools are available
# Verify g++ is installed
g++ --version
# If not found, install explicitly:
sudo yum install -y gcc-c++

# Verify make is installed
make --version
```

**Note:** If you encounter "g++: Command not found" during `npm install`, ensure the Development Tools group is installed.

### 3. Install Node.js

```bash
# Install Node.js 20 LTS using NodeSource repository
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Verify installation
node --version
npm --version
```

---

## PostgreSQL Database Setup

### 1. Install PostgreSQL

```bash
# Install PostgreSQL repository (for Oracle Linux 8)
sudo yum install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-8-x86_64/pgdg-redhat-repo-latest.noarch.rpm

# For Oracle Linux 9
# sudo yum install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-x86_64/pgdg-redhat-repo-latest.noarch.rpm

# Install PostgreSQL 18 (latest version)
sudo yum install -y postgresql18-server postgresql18

# Initialize PostgreSQL database
sudo /usr/pgsql-18/bin/postgresql-18-setup initdb

# Enable and start PostgreSQL service
sudo systemctl enable postgresql-18
sudo systemctl start postgresql-18

# Verify PostgreSQL is running
sudo systemctl status postgresql-18
```

**Note:** If PostgreSQL 18 packages are not yet available in the repository, you can use PostgreSQL 16 or 17 instead. Replace `18` with `16` or `17` in the commands above. PostgreSQL 15+ is the minimum required version.

### 2. Configure PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt, set password for postgres user
ALTER USER postgres WITH PASSWORD 'YourSecurePostgresPassword123!';

# Exit PostgreSQL
\q
```

**Configure PostgreSQL for remote/local connections:**

```bash
# Edit PostgreSQL configuration
sudo nano /var/lib/pgsql/18/data/postgresql.conf

# Find and update (or add) these lines:
listen_addresses = 'localhost'  # or '*' for remote access
port = 5432

# Edit pg_hba.conf for authentication
sudo nano /var/lib/pgsql/18/data/pg_hba.conf

# Add or modify these lines (for local connections):
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5

# Restart PostgreSQL
sudo systemctl restart postgresql-18
```

**Note:** Replace `18` with your PostgreSQL version number if using a different version (e.g., `16`, `17`, `15`).

### 3. Install pgvector Extension

The application requires the `pgvector` extension for semantic search functionality.

```bash
# Install PostgreSQL development packages
sudo yum install -y postgresql18-devel

# Install git if not already installed
sudo yum install -y git

# Clone pgvector repository (use latest version compatible with PostgreSQL 18)
cd /tmp
git clone --branch v0.8.1 https://github.com/pgvector/pgvector.git
cd pgvector

# Build and install pgvector
make
sudo make install

# Verify installation
ls -la /usr/pgsql-18/share/extension/ | grep vector
```

**Note:** Replace `18` with your PostgreSQL version number if using a different version. pgvector v0.8.1+ supports PostgreSQL 11+ including PostgreSQL 18.

**Enable pgvector in your database:**

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database for the application
CREATE DATABASE cid_ai;

# Connect to the database
\c cid_ai

# Create pgvector extension
CREATE EXTENSION vector;

# Verify extension is installed
\dx

# Exit PostgreSQL
\q
```

### 4. Create Database User

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create application user
CREATE USER cid_user WITH PASSWORD 'YourSecurePassword123!';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE cid_ai TO cid_user;

# Connect to cid_ai database
\c cid_ai

# Grant schema privileges
GRANT ALL ON SCHEMA public TO cid_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO cid_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO cid_user;

# Exit PostgreSQL
\q
```

### 5. Verify PostgreSQL Setup

```bash
# Test connection with new user
psql -U cid_user -d cid_ai -h localhost

# In PostgreSQL prompt, verify pgvector extension
SELECT * FROM pg_extension WHERE extname = 'vector';

# Exit
\q
```

---

## Application Configuration

### 1. Clone and Prepare Application

```bash
# Navigate to application directory (e.g., /var/www or /opt)
cd /var/www
# or
cd /opt

# Clone repository
sudo git clone https://github.com/remruata2/cid-ai.git
sudo chown -R $USER:$USER cid-ai
cd cid-ai
```

### 2. Environment Variables

Create `.env` file in project root:

```bash
nano .env
```

Add the following configuration:

```env
# PostgreSQL Database Connection
DATABASE_URL="postgresql://cid_user:YourSecurePassword123!@localhost:5432/cid_ai?schema=public"

# NextAuth Configuration
NEXTAUTH_SECRET="PLhSxCYU1j141uEOdIuBhotSN2Y1iWc4VBDbe3q8w30="
NEXTAUTH_URL="http://your-server-ip:3003"

# AI API Keys
GEMINI_API_KEY="your-gemini-api-key"
LLAMAPARSE_API_KEY="your-llamaparse-api-key"
API_KEYS_ENCRYPTION_KEY="iNzG0q1JJB9J3E1NK7pcMRnsa4b3sSrCJA3KqBfo4RY="

# Application
NODE_ENV=production
PORT=3003
```

**Important:** Replace:

- `YourSecurePassword123!` with your actual database password
- `your-server-ip` with your server's IP address or domain
- API keys with your actual keys

### 3. Install Dependencies

```bash
# Install npm dependencies
npm install

# If you encounter g++ errors, ensure build tools are installed (see Prerequisites)
```

### 4. Generate Prisma Client

```bash
# Generate Prisma Client
npx prisma generate
```

---

## Database Schema Migration

### Option A: Using Prisma Migrations (Fresh Database)

```bash
# Run migrations
npx prisma migrate deploy

# Or for development
npx prisma migrate dev --name init
```

### Option B: Restore from Backup (If you have a backup)

```bash
# If you have a PostgreSQL backup file
pg_restore -U cid_user -d cid_ai --no-owner --no-privileges -1 /path/to/backup.dump

# Or using psql for SQL dump
psql -U cid_user -d cid_ai < /path/to/backup.sql
```

### Verify Database Schema

```bash
# Connect to database
psql -U cid_user -d cid_ai -h localhost

# Check tables
\dt

# Verify pgvector extension
SELECT * FROM pg_extension WHERE extname = 'vector';

# Check if vector columns exist
\d file_list

# Exit
\q
```

---

## Application Deployment

### Option 1: Using PM2 (Recommended)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Build the application
npm run build

# Start application with PM2
pm2 start npm --name "cid-ai" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command above

# View logs
pm2 logs cid-ai

# Monitor application
pm2 monit
```

### Option 2: Using Systemd Service

Create systemd service file:

```bash
sudo nano /etc/systemd/system/cid-ai.service
```

Add the following:

```ini
[Unit]
Description=CID-AI Next.js Application
After=network.target postgresql-18.service

[Service]
Type=simple
User=your-username
WorkingDirectory=/var/www/cid-ai
Environment="NODE_ENV=production"
Environment="PORT=3003"
EnvironmentFile=/var/www/cid-ai/.env
ExecStart=/usr/bin/node /var/www/cid-ai/node_modules/.bin/next start -p 3003
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start service:

```bash
# Replace 'your-username' with actual username in the service file first
sudo systemctl daemon-reload
sudo systemctl enable cid-ai
sudo systemctl start cid-ai
sudo systemctl status cid-ai
```

### Option 3: Using Docker Compose

If you prefer Docker:

```bash
# Ensure Docker and Docker Compose are installed
sudo yum install -y docker docker-compose
sudo systemctl enable docker
sudo systemctl start docker

# Update docker-compose.yml with your DATABASE_URL
# Then run:
docker-compose up -d
```

### Configure Firewall

```bash
# Allow port 3003
sudo firewall-cmd --permanent --add-port=3003/tcp
sudo firewall-cmd --reload

# Or for Oracle Linux with iptables
sudo iptables -A INPUT -p tcp --dport 3003 -j ACCEPT
sudo service iptables save
```

### Configure Reverse Proxy (Optional but Recommended)

Install and configure Nginx:

```bash
sudo yum install -y nginx
```

Create Nginx configuration:

```bash
sudo nano /etc/nginx/conf.d/cid-ai.conf
```

Add:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Start Nginx:

```bash
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## Post-Deployment Steps

### 1. Verify Application

```bash
# Check application logs
pm2 logs cid-ai
# or
sudo journalctl -u cid-ai -f

# Test application
curl http://localhost:3003/api/health
```

### 2. Create Admin User

```bash
# Connect to database
psql -U cid_user -d cid_ai -h localhost

# Insert admin user (password hash for "admin123" - replace with your own hash)
# Use bcrypt to hash your password first, then insert:
INSERT INTO "user" (username, password_hash, role, is_active, created_at)
VALUES ('admin', '$2a$10$hashed_password_here', 'admin', true, NOW());

# Exit
\q
```

**To generate password hash:**

```bash
# Using Node.js
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('yourpassword', 10).then(hash => console.log(hash));"
```

### 3. Initialize Data (Optional)

```bash
cd /var/www/cid-ai

# Import initial data
npm run import-data

# Migrate to markdown format
npm run migrate-markdown

# Update search vectors
npm run update-search-vectors

# Generate semantic vectors
npm run generate-semantic-vectors
```

### 4. Monitor Application

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs cid-ai --lines 100

# Check database connections
psql -U cid_user -d cid_ai -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'cid_ai';"
```

---

## Troubleshooting

### Common Issues

#### 1. npm install Fails with "g++: Command not found"

**Error:**

```
npm error make: g++: Command not found
npm error make: *** [tree_sitter_runtime_binding.target.mk:126: Release/obj.target/tree_sitter_runtime_binding/src/binding.o] Error 127
```

**Solution:**

```bash
# Install Development Tools group (includes gcc, g++, make, and other build tools)
sudo yum groupinstall -y "Development Tools"

# Or install individually if groupinstall doesn't work
sudo yum install -y gcc gcc-c++ make

# Verify installation
g++ --version
make --version
gcc --version

# Clean npm cache and retry
cd /var/www/cid-ai
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**Note:** This error occurs because `llamaindex` package requires `tree-sitter` which needs native compilation. The build tools are required.

#### 2. PostgreSQL Connection Errors

**Error:** `FATAL: password authentication failed for user "cid_user"`

**Solution:**

```bash
# Verify user exists and password is correct
sudo -u postgres psql -c "\du"

# Reset password
sudo -u postgres psql -c "ALTER USER cid_user WITH PASSWORD 'newpassword';"

# Update .env file with correct password
```

**Error:** `FATAL: database "cid_ai" does not exist`

**Solution:**

```bash
# Create database
sudo -u postgres psql -c "CREATE DATABASE cid_ai OWNER cid_user;"
```

#### 3. pgvector Extension Not Found

**Error:** `ERROR: extension "vector" does not exist`

**Solution:**

```bash
# Verify pgvector is installed
ls -la /usr/pgsql-18/share/extension/ | grep vector

# If not found, install pgvector (see PostgreSQL Setup section)

# Connect to database and create extension
psql -U cid_user -d cid_ai -c "CREATE EXTENSION vector;"
```

#### 4. Prisma Migration Fails

**Error:** `Error: P3005: Database schema is not empty`

**Solution:**

```bash
# If you have existing data, use db push instead
npx prisma db push

# Or reset database (WARNING: This will delete all data)
npx prisma migrate reset
```

#### 5. Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3003`

**Solution:**

```bash
# Find process using port
sudo lsof -i :3003

# Kill process or change PORT in .env
```

#### 6. Application Won't Start

**Check logs:**

```bash
# PM2 logs
pm2 logs cid-ai

# Systemd logs
sudo journalctl -u cid-ai -f

# Check environment variables
pm2 env cid-ai
```

**Common causes:**

- Missing environment variables
- Database connection issues
- Port conflicts
- Missing dependencies

---

## Backup and Recovery

### Database Backup

```bash
# Create backup
pg_dump -U cid_user -d cid_ai -F c -f cid_ai_backup_$(date +%Y%m%d).dump

# Or SQL format
pg_dump -U cid_user -d cid_ai > cid_ai_backup_$(date +%Y%m%d).sql

# Restore backup
pg_restore -U cid_user -d cid_ai -c cid_ai_backup_YYYYMMDD.dump

# Or SQL format
psql -U cid_user -d cid_ai < cid_ai_backup_YYYYMMDD.sql
```

### Application Backup

```bash
# Backup application files
tar -czf cid-ai-backup-$(date +%Y%m%d).tar.gz /var/www/cid-ai

# Backup environment
cp /var/www/cid-ai/.env /var/www/cid-ai/.env.backup
```

### Automated Backup Script

Create a backup script:

```bash
sudo nano /usr/local/bin/backup-cid-ai.sh
```

Add:

```bash
#!/bin/bash
BACKUP_DIR="/backups/cid-ai"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -U cid_user -d cid_ai -F c -f $BACKUP_DIR/db_$DATE.dump

# Application backup
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /var/www/cid-ai

# Keep only last 7 days of backups
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

Make executable:

```bash
sudo chmod +x /usr/local/bin/backup-cid-ai.sh
```

Add to crontab:

```bash
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-cid-ai.sh
```

---

## Performance Optimization

### PostgreSQL Tuning

Edit PostgreSQL configuration:

```bash
sudo nano /var/lib/pgsql/18/data/postgresql.conf
```

Recommended settings for production:

```conf
# Memory settings (adjust based on available RAM)
shared_buffers = 256MB          # 25% of RAM for small servers
effective_cache_size = 1GB      # 50-75% of RAM
work_mem = 16MB
maintenance_work_mem = 128MB

# Connection settings
max_connections = 100

# Query performance
random_page_cost = 1.1
effective_io_concurrency = 200
```

Restart PostgreSQL:

```bash
sudo systemctl restart postgresql-18
```

**Note:** Replace `18` with your PostgreSQL version number if using a different version.

### Application Monitoring

```bash
# PM2 monitoring
pm2 monit

# Check database performance
psql -U cid_user -d cid_ai -c "SELECT * FROM pg_stat_activity;"

# Check slow queries
psql -U cid_user -d cid_ai -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

---

## Security Considerations

1. **Database Security:**

   - Use strong passwords
   - Limit database user privileges
   - Enable PostgreSQL logging
   - Use encrypted connections (SSL)

2. **Application Security:**

   - Keep dependencies updated (`npm audit`)
   - Use environment variables for secrets
   - Enable HTTPS (use reverse proxy with SSL)
   - Regular security audits

3. **Server Security:**
   - Configure firewall rules
   - Keep system updated (`sudo yum update`)
   - Use SSH keys instead of passwords
   - Regular backups

---

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

## Quick Reference

### Common Commands

```bash
# Start application
pm2 start cid-ai
# or
sudo systemctl start cid-ai

# Stop application
pm2 stop cid-ai
# or
sudo systemctl stop cid-ai

# Restart application
pm2 restart cid-ai
# or
sudo systemctl restart cid-ai

# View logs
pm2 logs cid-ai
# or
sudo journalctl -u cid-ai -f

# Database connection
psql -U cid_user -d cid_ai -h localhost

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Build application
npm run build
```

---

**Last Updated:** 2025-01-XX
**Version:** 2.0 (PostgreSQL Edition)
