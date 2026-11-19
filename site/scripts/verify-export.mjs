import { existsSync, readFileSync } from "node:fs";

const htmlPath = "out/index.html";
if (!existsSync(htmlPath)) {
  console.error(`missing ${htmlPath}`);
  process.exit(1);
}

const html = readFileSync(htmlPath, "utf8");
const required = [
  "What it does",
  "npm install agora-protocol",
  "Round.propose",
  "castVeto",
  'href="https://github.com/jayblast-spec/agora"',
  'href="https://www.npmjs.com/package/agora-protocol"',
  'src="/agora/banner.svg"',
  "/agora/_next/",
];

for (const needle of required) {
  if (!html.includes(needle)) {
    console.error(`static export is missing: ${needle}`);
    process.exit(1);
  }
}

if (html.includes("/agora/agora/") || html.includes("vercel.app")) {
  console.error("static export has a bad asset path or a leftover Vercel URL");
  process.exit(1);
}

console.log("static export ok");
