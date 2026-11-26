import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fromHtml } from "hast-util-from-html";
import {
  getResponsiveImage,
  getSrcSet,
  getImageUrl,
  getOgImageUrl,
} from "../src/lib/cloudinary-core.mjs";
import manifest from "../src/data/cloudinary-images.json" with { type: "json" };
import rehypeCloudinaryPicture from "../src/plugins/rehype-cloudinary-picture.mjs";
import {
  assetFromResponse,
  breakpointRequests,
  requestCloudinary,
  saveAsset,
} from "../scripts/cloudinary-breakpoints.mjs";

const sample = {
  public_id: "blog/test",
  width: 1200,
  height: 800,
  version: 12345,
  responsive_breakpoints: [
    { transformation: "q_auto", breakpoints: [{ width: 320 }, { width: 960 }] },
  ],
};
const failFile = {
  fail(message) {
    throw new Error(message);
  },
};

test("automatic delivery uses a single srcset with aligned responsive crops", () => {
  const picture = getResponsiveImage("folder/photo", {
    width: 1600,
    height: 900,
    widths: [800, 400, 800],
    sizes: "50vw",
  });
  const base = "https://res.cloudinary.com/paulapplegate-com/image/upload/f_auto,q_auto";
  const small = `${base},w_400,h_225,c_fill,g_auto/v1/folder/photo`;
  const large = `${base},w_800,h_450,c_fill,g_auto/v1/folder/photo`;
  assert.equal(picture.srcset, `${small} 400w, ${large} 800w`);
  assert.equal(picture.src, large);
  assert.equal(picture.sizes, "50vw");
  assert.equal(picture.width, 1600);
  assert.equal(picture.height, 900);
  assert.match(getImageUrl("photo"), /f_auto,q_auto\//);
  assert.match(getSrcSet("photo", [400]), /f_auto,q_auto,w_400\/v1\/photo 400w$/);
});

test("IDs are URL-encoded and invalid responsive widths are rejected", () => {
  assert.match(
    getImageUrl("travel/São Paulo, day 1", { cloudName: "demo" }),
    /S%C3%A3o%20Paulo%2C%20day%201/,
  );
  assert.throws(() => getSrcSet("x", [0, 400]), /positive integers/);
  assert.throws(() => getSrcSet("x", [NaN]), /positive integers/);
  assert.throws(() => getResponsiveImage("x"), /width must/);
  assert.throws(() => getImageUrl("https://example.org/photo.jpg"), /public ID/);
});

test("saved breakpoint ceilings, dimensions, sizes and version work without credentials", () => {
  manifest["test-cloud/blog/test"] = assetFromResponse(sample, "test-cloud", "75vw");
  try {
    const picture = getResponsiveImage("blog/test", { cloudName: "test-cloud" });
    assert.equal(picture.width, 1200);
    assert.equal(picture.height, 800);
    assert.equal(picture.sizes, "75vw");
    assert.match(picture.srcset, / 320w, .* 960w$/);
    assert.match(picture.src, /\/v12345\/blog\/test$/);
    assert.throws(() => getResponsiveImage("blog/test", { cloudName: "other-cloud" }), /width must/);
    const override = getResponsiveImage("blog/test", { cloudName: "test-cloud", widths: [400, 800] });
    assert.match(override.srcset, / 400w, .* 800w$/);
  } finally {
    delete manifest["test-cloud/blog/test"];
  }
});

test("wide gaps in the analyzed widths get useful candidates without upscaling a crop", () => {
  const original = {
    publicId: "tall-photo",
    cloudName: "test-cloud",
    width: 900,
    height: 1800,
    version: 12345,
    // An entry from the earlier per-format manifest.
    widths: { webp: [50, 883] },
  };
  manifest["test-cloud/tall-photo"] = original;
  try {
    const options = { cloudName: original.cloudName };
    const natural = getResponsiveImage(original.publicId, { ...options, width: 400 });
    assert.equal(natural.height, 800);
    assert.match(natural.srcset, / 320w, .* 800w, .* 883w$/);
    assert.match(natural.src, /w_400,h_800/);
    assert.ok(natural.srcset.includes(`${natural.src} 400w`));

    const crop = getResponsiveImage(original.publicId, {
      ...options, width: 100, height: 400, widths: [640, 960],
    });
    assert.match(crop.srcset, /w_450,h_1800,.* 450w$/);
    assert.doesNotMatch(crop.srcset, /, https:/);
    assert.match(crop.src, /w_450,h_1800/);
  } finally {
    delete manifest["test-cloud/tall-photo"];
  }
});

test("nearby analyzed widths are reused without skipping a common slot", () => {
  const picture = getResponsiveImage("images/blog/Contesttantform");
  assert.match(picture.srcset, / 949w, .* 1116w,/);
  assert.doesNotMatch(picture.srcset, / 1200w,/);
  assert.match(picture.src, /w_949,h_/);
});

test("scale and pad do not send unsupported auto gravity", () => {
  for (const crop of ["scale", "pad"]) {
    const options = { width: 800, height: 600, widths: [400], crop };
    const picture = getResponsiveImage("photo", options);
    assert.match(picture.src, new RegExp(`,c_${crop}/`));
    assert.throws(() => getResponsiveImage("photo", { ...options, gravity: "auto" }), /Auto gravity requires/);
  }
});

test("Markdown custom tag escapes text, accepts cloud override and leaves code/plain images alone", () => {
  const code = {
    type: "element",
    tagName: "pre",
    properties: {},
    children: [{ type: "text", value: '<cloudinary-picture src="x">' }],
  };
  const tree = {
    type: "root",
    children: [
      {
        type: "raw",
        value:
          '<cloudinary-picture src="photo" cloud-name="demo" alt="A &quot;photo&quot; &amp; view" width="800" height="600" widths="400,800"></cloudinary-picture>',
      },
      ...fromHtml('<img src="/ordinary.jpg" alt="ordinary">', { fragment: true }).children,
      code,
    ],
  };
  rehypeCloudinaryPicture({ cloudName: "custom-cloud" })(tree, failFile);
  assert.equal(tree.children[0].tagName, "img");
  const img = tree.children[0];
  assert.equal(img.properties.alt, 'A "photo" & view');
  assert.match(img.properties.src, /cloudinary.com\/demo\//);
  assert.equal(tree.children[1].tagName, "img");
  assert.equal(tree.children[2], code);
});

test("MDX JSX form of the custom tag is transformed like the HTML form", () => {
  manifest["test-cloud/blog/test"] = assetFromResponse(sample, "test-cloud", "75vw");
  try {
    // This is the node shape remark-mdx produces inside .mdx files.
    const tree = {
      type: "root",
      children: [
        {
          type: "mdxJsxFlowElement",
          name: "cloudinary-picture",
          attributes: [
            { type: "mdxJsxAttribute", name: "src", value: "blog/test" },
            { type: "mdxJsxAttribute", name: "cloud-name", value: "test-cloud" },
            { type: "mdxJsxAttribute", name: "alt", value: "A test photo" },
            { type: "mdxJsxAttribute", name: "grayscale" },
            { type: "mdxJsxAttribute", name: "loading", value: "eager" },
            { type: "mdxJsxAttribute", name: "fetchpriority", value: "high" },
          ],
        },
      ],
    };
    rehypeCloudinaryPicture({ cloudName: "custom-cloud" })(tree, failFile);
    assert.equal(tree.children[0].tagName, "img");
    const img = tree.children[0];
    assert.equal(img.properties.alt, "A test photo");
    assert.match(img.properties.src, /cloudinary.com\/test-cloud\//);
    assert.match(img.properties.src, /e_grayscale/);
    assert.equal(img.properties.loading, "eager");
    assert.equal(img.properties.fetchPriority, "high");
    assert.equal(img.properties.sizes, "75vw");
    assert.deepEqual(img.properties.className, ["cloudinary-picture"]);
  } finally {
    delete manifest["test-cloud/blog/test"];
  }
});

test("Markdown shorthand uses manifest data; missing metadata reports an actionable build error", () => {
  manifest["test-cloud/blog/test"] = assetFromResponse(sample, "test-cloud", "75vw");
  try {
    const tree = fromHtml('<p><img src="cloudinary:blog/test" alt="Test"></p>', { fragment: true });
    rehypeCloudinaryPicture({ cloudName: "test-cloud" })(tree, failFile);
    const img = tree.children[0].children[0];
    assert.equal(img.tagName, "img");
    assert.equal(img.properties.sizes, "auto, 75vw");
    const invalid = fromHtml('<img src="cloudinary:missing" alt="Missing">', { fragment: true });
    assert.throws(
      () => rehypeCloudinaryPicture()(invalid, failFile),
      /Cloudinary picture: Image width/,
    );
  } finally {
    delete manifest["test-cloud/blog/test"];
  }
});

test("Cloudinary analysis requests one width list and refuses incomplete responses", () => {
  const requests = breakpointRequests();
  assert.deepEqual(
    requests.map((r) => r.transformation),
    ["q_auto"],
  );
  assert.ok(requests.every((r) => !r.create_derived && r.max_width === 1920));
  assert.throws(() => breakpointRequests({ minWidth: 2000, maxWidth: 1000 }), /min-width/);
  assert.throws(
    () =>
      assetFromResponse(
        { ...sample, responsive_breakpoints: sample.responsive_breakpoints.slice(0, -1) },
        "test",
        "100vw",
      ),
    /no breakpoints/,
  );
});

test("existing-image analysis signs a form without transmitting the API secret", async () => {
  let called = false;
  const result = await requestCloudinary(
    {
      cloudName: "test-cloud",
      apiKey: "test-key",
      apiSecret: "test-secret",
      publicId: "blog/test",
      requests: breakpointRequests(),
    },
    async (url, options) => {
      called = true;
      assert.equal(url, "https://api.cloudinary.com/v1_1/test-cloud/image/explicit");
      assert.equal(options.method, "POST");
      const params = Object.fromEntries(options.body.entries());
      assert.equal(params.type, "upload");
      assert.equal(params.public_id, "blog/test");
      assert.match(params.signature, /^[a-f0-9]{40}$/);
      assert.equal(params.api_key, "test-key");
      assert.ok(!JSON.stringify(params).includes("test-secret"));
      assert.equal(params.file, undefined);
      assert.equal(JSON.parse(params.responsive_breakpoints).length, 1);
      return { ok: true, json: async () => sample };
    },
  );
  assert.ok(called);
  assert.equal(result, sample);
});

test("simultaneous asset registrations preserve unrelated assets and the newest version", async () => {
  const folder = await mkdtemp(join(tmpdir(), "fieldnotes-manifest-"));
  const path = join(folder, "images.json");
  const first = assetFromResponse(sample, "test-cloud", "75vw");
  const second = { ...first, publicId: "blog/another" };
  try {
    await writeFile(path, "{}");
    await Promise.all([saveAsset(first, path), saveAsset(second, path)]);
    const newer = { ...first, version: first.version + 1, sizes: undefined };
    assert.equal((await saveAsset(newer, path)).sizes, "75vw");
    await assert.rejects(saveAsset(first, path), /A newer upload/);
    const manifestData = JSON.parse(await readFile(path, "utf8"));
    assert.equal(manifestData["test-cloud/blog/test"].version, newer.version);
    assert.equal(manifestData["test-cloud/blog/test"].sizes, "75vw");
    assert.equal(manifestData["test-cloud/blog/another"].publicId, second.publicId);
    assert.deepEqual(await readdir(folder), ["images.json"]);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});

test("social preview URLs use automatic delivery with a 1200 by 630 crop", () => {
  assert.match(getOgImageUrl("photo", { cloudName: "demo" }), /f_auto,q_auto,w_1200,h_630,c_fill,g_auto/);
});
