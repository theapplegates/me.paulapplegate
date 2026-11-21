import manifest from "../data/cloudinary-images.json" with { type: "json" };

export const DEFAULT_CLOUD = "paulapplegate-com";
export const FORMATS = ["jxl", "avif", "webp"];
const AUTO_GRAVITY_CROPS = ["fill", "crop", "thumb"];
export const DEFAULT_WIDTHS = [320, 400, 480, 640, 800, 960, 1120, 1280, 1600, 1920];
// Match the 1200px container and TOC spacing. Approximate the article's font-dependent ch caps in rem.
export const PROSE_SIZES = [
  "(min-width: 80rem) calc(1200px - 18.5rem)",
  "(width > 1024px) min(57rem, calc(100vw - 15rem))",
  "(min-width: 768px) 44rem",
  "calc(100vw - 2rem)",
].join(", ");

export function normalizeWidths(widths) {
  if (
    !Array.isArray(widths) ||
    !widths.length ||
    widths.some((w) => !Number.isSafeInteger(w) || w < 1)
  ) {
    throw new Error("Image widths must be a nonempty list of positive integers.");
  }
  return [...new Set(widths)].sort((a, b) => a - b);
}

function positiveDimension(value, name) {
  if (!Number.isSafeInteger(value) || value < 1)
    throw new Error(`Image ${name} must be a positive integer.`);
  return value;
}

function identity(publicId, cloudName) {
  if (typeof publicId !== "string" || !publicId.trim())
    throw new Error("A Cloudinary public ID is required.");
  const id = publicId.trim().replace(/^cloudinary:/, "").replace(/^\/+/, "");
  if (id.includes("://") || id.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("Use a Cloudinary public ID, not a URL or local file path.");
  }
  const cloud = cloudName?.trim() || DEFAULT_CLOUD;
  if (!/^[a-zA-Z0-9_-]+$/.test(cloud)) throw new Error("Invalid Cloudinary cloud name.");
  const asset = manifest[`${cloud}/${id}`];
  // v1 disambiguates public IDs containing folders when no upload version is saved.
  const version = asset?.version ?? 1;
  const path = id.split("/").map(encodeURIComponent).join("/");
  return { asset, baseUrl: `https://res.cloudinary.com/${cloud}/image/upload`, path: `v${version}/${path}` };
}

function deliveryUrl(image, options) {
  const format = options.format ?? "webp";
  if (![...FORMATS, "jpg"].includes(format)) throw new Error(`Unsupported image format: ${format}`);
  const t = [`f_${format}`, "q_auto"];
  if (options.width !== undefined) t.push(`w_${positiveDimension(options.width, "width")}`);
  if (options.height !== undefined) t.push(`h_${positiveDimension(options.height, "height")}`);
  if (options.crop) {
    if (!["fill", "scale", "crop", "thumb", "pad"].includes(options.crop))
      throw new Error("Unsupported crop mode.");
    t.push(`c_${options.crop}`);
  }
  if (options.gravity) {
    if (!["auto", "face", "center", "north", "south"].includes(options.gravity))
      throw new Error("Unsupported gravity.");
    if (options.gravity === "auto" && !AUTO_GRAVITY_CROPS.includes(options.crop)) {
      throw new Error("Auto gravity requires the fill, crop, or thumb crop mode.");
    }
    t.push(`g_${options.gravity}`);
  }
  if (options.blur !== undefined) {
    if (!Number.isInteger(options.blur) || options.blur < 1 || options.blur > 2000)
      throw new Error("Blur must be between 1 and 2000.");
    t.push(`e_blur:${options.blur}`);
  }
  if (options.grayscale) t.push("e_grayscale");
  return `${image.baseUrl}/${t.join(",")}/${image.path}`;
}

export function getImageUrl(publicId, options = {}) {
  return deliveryUrl(identity(publicId, options.cloudName), options);
}

function candidatesFor(image, widths, options) {
  const ratio = options.width && options.height ? options.height / options.width : undefined;
  return widths.map(width => {
    const height = ratio ? Math.max(1, Math.round(width * ratio)) : undefined;
    return { width, url: deliveryUrl(image, { ...options, width, height }) };
  });
}

function srcSet(candidates) {
  return candidates.map(({ width, url }) => `${url} ${width}w`).join(", ");
}

export function getSrcSet(publicId, widths = DEFAULT_WIDTHS, options = {}) {
  return srcSet(candidatesFor(identity(publicId, options.cloudName), normalizeWidths(widths), options));
}

function pictureWidths(explicitWidths, analyzedWidths, nativeLimit) {
  if (explicitWidths !== undefined) {
    const widths = normalizeWidths(explicitWidths);
    return [...new Set(widths.map(width => Math.min(width, nativeLimit)))];
  }
  const analyzed = analyzedWidths ? normalizeWidths(analyzedWidths) : [];
  const limit = Math.min(nativeLimit, analyzed.at(-1) ?? DEFAULT_WIDTHS.at(-1));
  const targets = DEFAULT_WIDTHS.filter(width => width < limit);

  // Reuse closely matching derivatives, preferring the smaller width when several fit.
  const widths = targets.map(target =>
    analyzed.find(width => width >= target * 0.96 && width <= Math.min(limit, target * 1.04)) ?? target
  );
  return normalizeWidths([...widths, limit]);
}

export function getPictureData(publicId, options = {}) {
  const image = identity(publicId, options.cloudName);
  const { asset } = image;
  const nativeRatio = asset ? asset.height / asset.width : undefined;
  const width = positiveDimension(options.width ?? (
    nativeRatio && options.height ? Math.max(1, Math.round(options.height / nativeRatio)) : asset?.width
  ), "width");
  const height = positiveDimension(options.height ?? (
    nativeRatio ? Math.max(1, Math.round(width * nativeRatio)) : undefined
  ), "height");
  const hint = (options.sizes || asset?.sizes || "").trim().replace(/^auto(?:\s*,\s*|$)/i, "") || PROSE_SIZES;
  const sizes = options.loading === "lazy" ? `auto, ${hint}` : hint;
  const crop = options.crop ?? "fill";
  const gravity = options.gravity ?? (AUTO_GRAVITY_CROPS.includes(crop) ? "auto" : undefined);
  const transforms = { ...options, width, height, crop, gravity };
  const nativeLimit = asset
    ? Math.max(1, Math.min(asset.width, Math.floor(asset.height * width / height)))
    : Infinity;
  const useAnalysis = asset && crop === "fill" && !options.blur && !options.grayscale &&
    (height === Math.round(width * asset.height / asset.width) ||
      width === Math.round(height * asset.width / asset.height));
  const [jxl, avif, webp] = FORMATS.map(format => {
    const widths = pictureWidths(options.widths, useAnalysis ? asset.widths?.[format] : undefined, nativeLimit);
    return candidatesFor(image, widths, { ...transforms, format });
  });
  const fallback = webp.findLast(candidate => candidate.width <= Math.min(width, 960)) ?? webp[0];
  return {
    sources: [
      { type: "image/jxl", srcset: srcSet(jxl), sizes },
      { type: "image/avif", srcset: srcSet(avif), sizes },
    ],
    img: { src: fallback.url, srcset: srcSet(webp), sizes, width, height },
  };
}

// Social metadata is a single JPEG URL for crawlers, outside the page's picture fallback chain.
export function getOgImageUrl(publicId, options = {}) {
  return getImageUrl(publicId, {
    ...options,
    width: 1200,
    height: 630,
    crop: "fill",
    gravity: "auto",
    format: "jpg",
  });
}
