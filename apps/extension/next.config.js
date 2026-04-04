/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  distDir: "out",
  images: { unoptimized: true },
  transpilePackages: ["@repo/recorder"],
};

export default nextConfig;