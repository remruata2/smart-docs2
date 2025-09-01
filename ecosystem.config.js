module.exports = {
  apps: [
    {
      name: 'cid-ai',
      script: './node_modules/next/dist/bin/next',
      args: 'start -p 3003',
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
