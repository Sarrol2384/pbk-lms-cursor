/** @type {import('next').NextConfig} */
const nextConfig = {
  // Certificate routes read the emblem from public/ at runtime.
  experimental: {
    outputFileTracingIncludes: {
      '/api/certificates/[id]/pdf': ['./public/brand/pbk-emblem.png'],
      '/api/admin/certificate-preview': ['./public/brand/pbk-emblem.png'],
    },
  },
};

export default nextConfig;
