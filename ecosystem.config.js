module.exports = {
  apps: [
    {
      name: "cid-ai",
      script: "npm",
      args: "start",
      cwd: "/var/www/cid-ai",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "2G", // Increased from 1G for file processing
      env: {
        NODE_ENV: "production",
        NODE_OPTIONS: "--max_old_space_size=2048", // Increased from 1024 for file processing
        PORT: 3003, // Updated to match your dev port
      },
      error_file: "/var/www/cid-ai/logs/error.log",
      out_file: "/var/www/cid-ai/logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
      time: true,
    },
  ],
};
