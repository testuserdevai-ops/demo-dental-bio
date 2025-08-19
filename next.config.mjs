/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cxqkuqtwrtgvoorxidvn.supabase.co",
        port: "",       // optional, leave empty if default 443
        pathname: "/**" // allow all paths
      },
    ],
  },
};

export default nextConfig;