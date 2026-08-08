/** @type {import('next').NextConfig} */
const isApkExport = process.env.APK_EXPORT === 'true';

const nextConfig = {
  reactStrictMode: true,
  output: isApkExport ? 'export' : 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  ...(isApkExport
    ? {
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;