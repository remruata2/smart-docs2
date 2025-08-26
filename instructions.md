Windows fresh setup and auto-run (cid-ai)

1) Install prerequisites
PowerShell (Admin):
winget install -e --id OpenJS.NodeJS.LTS
winget install -e --id Git.Git
winget install -e --id PostgreSQL.PostgreSQL

2) Clone repository
mkdir C:\Users\<you>\projects
cd C:\Users\<you>\projects
git clone https://github.com/remruata2/cid-ai.git
cd cid-ai

3) Environment file
Create `.env` in project root:
NEXTAUTH_SECRET="PLhSxCYU1j141uEOdIuBhotSN2Y1iWc4VBDbe3q8w30="
NEXTAUTH_URL="http://localhost:3003"
GEMINI_API_KEY=AIzaSyC2oJnzug2z_iU2atrSrhW8Jvv_Hg1O5_4
NODE_ENV=production
LLAMAPARSE_API_KEY=llx-X2eQ7Yq25SrTZCchgwft0NHEOKfaxR3keT7yBFEBFRBOzFi1
API_KEYS_ENCRYPTION_KEY="iNzG0q1JJB9J3E1NK7pcMRnsa4b3sSrCJA3KqBfo4RY="
DATABASE_URL="postgresql://cid_user:change_me@localhost:5432/cid_ai"

4) PostgreSQL: restore required backup
psql -U postgres -c "CREATE USER cid_user WITH PASSWORD 'change_me';"
psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='cid_ai';"
psql -U postgres -c "DROP DATABASE IF EXISTS cid_ai;"
psql -U postgres -c "CREATE DATABASE cid_ai OWNER cid_user;"
pg_restore -U postgres -d cid_ai --no-owner --no-privileges -1 "C:\\Users\\<you>\\projects\\cid-ai\\backups\\pre_reset_full.dump"

5) Install dependencies and build
npm install
npm run build

6) Database migrations (skip after full dump; run only if needed)
npx prisma migrate deploy

7) (Optional) Load initial content
npm run import-data
npm run migrate-markdown
npm run update-search-vectors
npm run generate-semantic-vectors

8) PM2 as Windows service (auto-start on boot)
npm install -g pm2 pm2-windows-service
pm2-service-install -n "PM2 for cid-ai"

9) PM2 process
Create `ecosystem.config.js` in project root:
module.exports = {
  apps: [
    {
      name: "cid-ai",
      cwd: "C:/Users/<you>/projects/cid-ai",
      script: "npm",
      args: "run start",
      env: { NODE_ENV: "production" },
      max_memory_restart: "500M",
      autorestart: true
    }
  ]
}
Start and persist:
pm2 start ecosystem.config.js --only cid-ai
pm2 save

11) Update & restart after code changes
git pull
npm install
npm run build
pm2 restart cid-ai
pm2 save