/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow WebSocket connections in dev
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize native modules for server-side
      config.externals.push({
        'better-sqlite3': 'commonjs better-sqlite3',
      });
    }
    return config;
  },
  // Environment variables available in the browser
  env: {
    NEXT_PUBLIC_WS_PORT: process.env.WS_PORT || '8080',
    NEXT_PUBLIC_LLM_PROVIDER: process.env.LLM_PROVIDER || 'openai',
  },
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
};

export default nextConfig;
