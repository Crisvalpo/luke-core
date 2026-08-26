module.exports = {
  apps: [
    {
      name: 'luke-core',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3080
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3080
      }
    }
  ]
};
