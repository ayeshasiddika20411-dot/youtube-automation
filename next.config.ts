import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "cdn.pixabay.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
  serverExternalPackages: [
    "msedge-tts",
    "fluent-ffmpeg",
    "ffmpeg-static",
    "googleapis",
  ],
};

export default nextConfig;
