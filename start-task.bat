@echo off
REM Starts the Next.js app and logs output. Uses local Next binary to avoid PATH issues.
mkdir F:\cid-ai\logs 2>nul
cd /d F:\cid-ai
REM If you prefer npm, replace the next.cmd line with: "C:\Program Files\nodejs\npm.cmd" start
F:\cid-ai\node_modules\.bin\next.cmd start -p 3003 >> F:\cid-ai\logs\next.log 2>&1
