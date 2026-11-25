/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    agentUpgrade: "security",
  },
};

export default nextConfig;
