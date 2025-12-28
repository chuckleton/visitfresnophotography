import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

type Config = {
  inputDir: string;
  outputDir: string;
  // widths for grid thumbnails
  thumbWidths: number[];
  // widths for detail page (max = 1600 as requested)
  detailWidths: number[];
  webpQuality: number;
};

const config: Config = {
  inputDir: path.resolve("assets/masters"),
  outputDir: path.resolve("assets/web"),
  thumbWidths: [480, 720, 960, 1200],
  detailWidths: [800, 1200, 1600], // max detail = 1600
  webpQuality: 75,
};

const validExt = new Set([".jpg", ".jpeg", ".png", ".tif", ".tiff"]);

function slugFromFilename(filename: string) {
  return path.parse(filename).name;
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

async function listInputFiles(dir: string) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => validExt.has(path.extname(name).toLowerCase()))
    .map((name) => path.join(dir, name));
}

async function buildOneImage(inputPath: string) {
  const filename = path.basename(inputPath);
  const slug = slugFromFilename(filename);
  const outDir = path.join(config.outputDir, slug);
  await ensureDir(outDir);

  // Read metadata once to avoid wasting work + to skip upscaling
  const meta = await sharp(inputPath).metadata();
  const srcWidth = meta.width ?? 0;

  // Combine widths, dedupe, and filter widths that would upscale
  const widths = Array.from(
    new Set([...config.thumbWidths, ...config.detailWidths]),
  )
    .sort((a, b) => a - b)
    .filter((w) => srcWidth === 0 || w <= srcWidth);

  // If metadata width is missing, still generate (sharp will handle),
  // but we keep the configured sizes.
  const generated: string[] = [];

  for (const w of widths) {
    const outPath = path.join(outDir, `${w}.webp`);
    await sharp(inputPath)
      .rotate() // respects EXIF orientation
      .resize({
        width: w,
        withoutEnlargement: true,
      })
      .webp({
        quality: config.webpQuality,
        effort: 5, // good balance of speed/size
      })
      .toFile(outPath);

    generated.push(outPath);
  }

  // Optional: tiny blurred placeholder (useful for LQIP)
  const placeholderPath = path.join(outDir, `placeholder.webp`);
  await sharp(inputPath)
    .rotate()
    .resize({ width: 32, withoutEnlargement: true })
    .webp({ quality: 40, effort: 3 })
    .toFile(placeholderPath);

  generated.push(placeholderPath);

  return {
    slug,
    source: inputPath,
    widths,
    placeholder: placeholderPath,
  };
}

async function main() {
  await ensureDir(config.outputDir);

  const inputs = await listInputFiles(config.inputDir);
  if (inputs.length === 0) {
    console.error(`No images found in: ${config.inputDir}`);
    process.exit(1);
  }

  const manifest: Record<
    string,
    { widths: number[]; placeholder: string }
  > = {};

  // Process sequentially (safer for memory). If you want concurrency, we can add it.
  for (const input of inputs) {
    const result = await buildOneImage(input);
    manifest[result.slug] = {
      widths: result.widths,
      placeholder: path.relative(process.cwd(), result.placeholder),
    };
    console.log(`✔ ${result.slug}: ${result.widths.join(", ")} (+ placeholder)`);
  }

  // Optional: write a manifest you can import/use in tooling
  const manifestPath = path.join(config.outputDir, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`\nWrote manifest: ${manifestPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
