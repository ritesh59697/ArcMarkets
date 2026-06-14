import fs from "fs";
import path from "path";
import WhitepaperClient from "./WhitepaperClient";

export const revalidate = 3600; // Cache-refresh hourly

export default function WhitepaperPage() {
  const docsDir = path.join(process.cwd(), "src", "docs");
  const whitepaper = fs.readFileSync(path.join(docsDir, "WHITEPAPER.md"), "utf-8");
  
  return <WhitepaperClient whitepaper={whitepaper} />;
}
