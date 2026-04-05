/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        // Supabase Storage (project-specific subdomain)
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // Supabase Storage (custom domain variant)
        protocol: "https",
        hostname: "**.supabase.in",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  // Keep compiled pages in memory longer so chunks stay valid after big edits
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000, // 1 hour (default 15s)
    pagesBufferLength: 10,           // keep 10 pages compiled (default 5)
  },
};

export default nextConfig;
