/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep pure-ESM / native packages out of the webpack bundle so Next.js
  // doesn't try to re-compile them (which fails for ESM-only modules).
  serverExternalPackages: ['duckdb'],

  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push('duckdb')
    }
    return config
  },
}

export default nextConfig
