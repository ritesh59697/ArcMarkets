import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  },
  turbopack: {
    root: path.resolve(import.meta.dirname, ".."),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.coingecko.com", pathname: "/**" },
      { protocol: "https", hostname: "www.thesportsdb.com", pathname: "/**" },
      { protocol: "https", hostname: "crests.football-data.org", pathname: "/**" },
      { protocol: "https", hostname: "media.api-sports.io", pathname: "/**" },
      { protocol: "https", hostname: "upload.wikimedia.org", pathname: "/**" },
      { protocol: "https", hostname: "api.openligadb.de", pathname: "/**" },
    ],
  },
};

export default nextConfig;
