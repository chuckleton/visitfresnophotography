import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import "dotenv/config";

type Manifest = Record<
  string,
  {
    widths: number[];
    placeholder?: string;
  }
>;

function run(cmd: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit" });
    p.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

function getEnv(name: string, fallback?: string) {
  const v = process.env[name] ?? fallback;
  if (v == null || v === "") throw new Error(`Missing env var: ${name}`);
  return v;
}

async function main() {
  const bucket = getEnv("S3_BUCKET");
  const prefix = (process.env.S3_PREFIX ?? "").replace(/^\/+|\/+$/g, "");
  const cdnBase = getEnv("PUBLIC_IMAGE_CDN_BASE"); // e.g. https://images.visitfresnophotography.com

  const localDir = path.resolve("assets/web");
  const manifestPath = path.join(localDir, "manifest.json");

  // sanity check
  await fs.access(localDir);
  const manifestRaw = await fs.readFile(manifestPath, "utf8");
  const manifest = JSON.parse(manifestRaw) as Manifest;

  const dest = `s3://${bucket}${prefix ? `/${prefix}` : ""}`;

  // Upload everything except manifest.json
  // AWS CLI will generally set Content-Type correctly based on extension.
  await run("aws", [
    "s3",
    "sync",
    localDir,
    dest,
    "--exclude",
    "manifest.json",
    "--cache-control",
    "public,max-age=31536000,immutable",
  ]);

  console.log("\nPublished. Example URLs:");
  const sample = Object.keys(manifest).slice(0, 5);
  for (const slug of sample) {
    const widths = manifest[slug].widths.sort((a, b) => a - b);
    const w = widths.includes(1200) ? 1200 : widths[widths.length - 1];
    console.log(`- ${slug}: ${cdnBase.replace(/\/+$/g, "")}/${slug}/${w}.webp`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
