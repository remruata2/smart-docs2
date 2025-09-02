module.exports = {
  apps: [
    {
      name: 'cid-ai',
      script: 'pm2-runner.bat',
      args: '', // Arguments are in the script
      interpreter: 'cmd',
      exec_mode: 'fork',
      cwd: 'F:\\cid-ai',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
      },
    },
  ],
};
