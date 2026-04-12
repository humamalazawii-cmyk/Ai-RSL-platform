/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: { serverComponentsExternalPackages: ["@prisma/client"] },
  i18n: { locales: ["en", "ar"], defaultLocale: "en", localeDetection: true },
};
module.exports = nextConfig;
