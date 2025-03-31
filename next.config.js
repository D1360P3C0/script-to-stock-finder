/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  api: {
    externalResolver: true,
  },
}

module.exports = nextConfig
