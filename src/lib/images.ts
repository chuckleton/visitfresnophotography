const base = () => (import.meta.env.PUBLIC_IMAGE_CDN_BASE ?? "").replace(/\/+$/g, "");

// Matches your bun+sharp outputs
export const THUMB_WIDTHS = [480, 720, 960, 1200] as const;
export const DETAIL_WIDTHS = [800, 1200, 1600] as const; // max detail = 1600

export const GALLERY_SIZES = "(min-width: 900px) 33vw, 100vw"; // 3-col on desktop
export const DETAIL_SIZES = "(min-width: 980px) 980px, 100vw"; // matches your content max-ish

export function imageUrl(slug: string, width: number) {
  return `${base()}/${slug}/${width}.webp`;
}

export function srcset(slug: string, widths: readonly number[]) {
  return widths.map((w) => `${imageUrl(slug, w)} ${w}w`).join(", ");
}
//