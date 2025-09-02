



I’ve created [start-task.bat](cci:7://file:///Users/remruata/projects/cid-ai/start-task.bat:0:0-0:0) for you at [F:\cid-ai\start-task.bat](cci:7://file:///Users/remruata/projects/cid-ai/start-task.bat:0:0-0:0). It uses the local Next.js binary and logs output to `F:\cid-ai\logs\next.log`.

# Run via Task Scheduler (no admin)

Option A — CLI (no escaping headaches)
```cmd
schtasks /Create /TN "CID-AI" /SC ONLOGON /RL LIMITED /RU "%USERNAME%" /TR "F:\cid-ai\start-task.bat"
schtasks /Run /TN "CID-AI"
```

Option B — GUI
- Open Task Scheduler → Create Task…
- General: Name “CID AI”, Run only when user is logged on
- Triggers: At log on (your user)
- Actions: Start a program
  - Program/script: F:\cid-ai\start-task.bat
  - Start in: F:\cid-ai
- Settings: Allow task to be run on demand
- Save, then Run

# Verify
- Stop PM2 so port 3003 is free: `pm2 delete cid-ai`
- Check logs: `F:\cid-ai\logs\next.log`
- Browse: http://localhost:3003

Notes
- [start-task.bat](cci:7://file:///Users/remruata/projects/cid-ai/start-task.bat:0:0-0:0) uses `F:\cid-ai\node_modules\.bin\next.cmd start -p 3003`, so it doesn’t depend on global npm PATH.
- Ensure you’ve run `npm run build` on that machine.