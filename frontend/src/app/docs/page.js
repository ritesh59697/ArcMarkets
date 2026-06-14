import fs from "fs";
import path from "path";
import DocsClient from "./DocsClient";

// Force static rendering or dynamic parsing depending on compilation needs
export const revalidate = 3600; // Cache-refresh hourly

export default function DocsPage() {
  // process.cwd() is /Users/ritesh/Downloads/ArcMarkets/frontend
  const docsDir = path.join(process.cwd(), "src", "docs");
  const howItWorks = fs.readFileSync(path.join(docsDir, "HOW_IT_WORKS.md"), "utf-8");
  const readme = fs.readFileSync(path.join(docsDir, "README.md"), "utf-8");
  
  return <DocsClient howItWorks={howItWorks} readme={readme} />;
}
