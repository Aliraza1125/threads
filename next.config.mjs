/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['scontent-sin6-3.cdninstagram.com']
  },
  experimental: {
    turbo: {
      rules: {
        '*.woff2': ['raw']
      }
    }
  }
};

export default nextConfig;