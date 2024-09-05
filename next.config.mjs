import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@chain': path.resolve(__dirname, 'src/chain.ts'),
      '@walletClient': path.resolve(__dirname, 'src/walletClient.ts') 
    };
    return config;
  },
};

export default nextConfig;
