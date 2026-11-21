import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fromHtml } from "hast-util-from-html";
import {
  getPictureData,
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
    { transformation: "f_jxl,q_auto", breakpoints: [{ width: 200 }, { width: 700 }] },
    { transformation: "f_avif,q_auto", breakpoints: [{ width: 300 }, { width: 800 }] },
    { transformation: "f_webp,q_auto", breakpoints: [{ width: 320 }, { width: 960 }] },
  ],
};
const failFile = {
  fail(message) {
    throw new Error(message);
  },
};

test("picture order and fallback are explicit, with aligned responsive crops", () => {
  const picture = getPictureData("folder/photo", {
    width: 1600,
    height: 900,
    widths: [800, 400, 800],
    sizes: "50vw",
  });
  assert.deepEqual(
    picture.sources.map((s) => s.type),
    ["image/jxl", "image/avif"],
  );
  for (const [index, format] of ["jxl", "avif"].entries()) {
    const source = picture.sources[index];
    assert.equal(source.sizes, "50vw");
    assert.match(
      source.srcset,
      new RegExp(`f_${format},q_auto,w_400,h_225,c_fill,g_auto/v1/folder/photo 400w`),
    );
    assert.match(source.srcset, /w_800,h_450,c_fill/);
    assert.doesNotMatch(source.srcset, /f_auto/);
  }
  assert.match(picture.img.src, /f_webp,q_auto,w_800,h_450/);
  assert.match(picture.img.srcset, /f_webp,q_auto,w_400,h_225,c_fill,g_auto.* 400w/);
  assert.match(picture.img.srcset, /f_webp,q_auto,w_800,h_450,c_fill,g_auto.* 800w$/);
  assert.equal(picture.img.width, 1600);
  assert.equal(picture.img.height, 900);
});

test("IDs are URL-encoded and invalid responsive widths are rejected", () => {
  assert.match(
    getImageUrl("travel/São Paulo, day 1", { cloudName: "demo" }),
    /S%C3%A3o%20Paulo%2C%20day%201/,
  );
  assert.throws(() => getSrcSet("x", [0, 400]), /positive integers/);
  assert.throws(() => getSrcSet("x", [NaN]), /positive integers/);
  assert.throws(() => getPictureData("x"), /width must/);
  assert.throws(() => getImageUrl("https://example.org/photo.jpg"), /public ID/);
});

test("saved breakpoint ceilings, dimensions, sizes and version work without credentials", () => {
  manifest["test-cloud/blog/test"] = assetFromResponse(sample, "test-cloud", "75vw");
  try {
    const picture = getPictureData("blog/test", { cloudName: "test-cloud" });
    assert.equal(picture.img.width, 1200);
    assert.equal(picture.img.height, 800);
    assert.equal(picture.img.sizes, "75vw");
    assert.match(picture.sources[0].srcset, / 320w, .* 700w$/);
    assert.match(picture.sources[1].srcset, / 320w, .* 800w$/);
    assert.match(picture.img.srcset, / 320w, .* 960w$/);
    assert.match(picture.img.src, /\/v12345\/blog\/test$/);
    assert.throws(() => getPictureData("blog/test", { cloudName: "other-cloud" }), /width must/);
    const override = getPictureData("blog/test", { cloudName: "test-cloud", widths: [400, 800] });
    assert.match(override.sources[0].srcset, / 400w, .* 800w$/);
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
    widths: { jxl: [50, 900], avif: [50, 900], webp: [50, 900] },
  };
  manifest["test-cloud/tall-photo"] = original;
  try {
    const options = { cloudName: original.cloudName };
    const natural = getPictureData(original.publicId, { ...options, width: 400 });
    assert.equal(natural.img.height, 800);
    assert.match(natural.sources[1].srcset, / 320w, .* 800w, .* 900w$/);
    assert.match(natural.img.src, /w_400,h_800/);
    assert.ok(natural.img.srcset.includes(`${natural.img.src} 400w`));

    const crop = getPictureData(original.publicId, {
      ...options, width: 100, height: 400, widths: [640, 960],
    });
    assert.match(crop.sources[0].srcset, /w_450,h_1800,.* 450w$/);
    assert.doesNotMatch(crop.sources[0].srcset, /, https:/);
    assert.match(crop.img.src, /w_450,h_1800/);
  } finally {
    delete manifest["test-cloud/tall-photo"];
  }
});

test("nearby analyzed widths are reused without skipping a common slot", () => {
  const picture = getPictureData("images/blog/Contesttantform");
  assert.match(picture.sources[0].srcset, / 943w, .* 1103w,/);
  assert.match(picture.sources[1].srcset, / 960w, .* 1086w,/);
  assert.doesNotMatch(picture.sources[0].srcset, / 1207w,/);
  assert.match(picture.img.src, /w_949,h_/);
});

test("scale and pad do not send unsupported auto gravity", () => {
  for (const crop of ["scale", "pad"]) {
    const options = { width: 800, height: 600, widths: [400], crop };
    const picture = getPictureData("photo", options);
    assert.match(picture.img.src, new RegExp(`,c_${crop}/`));
    assert.throws(() => getPictureData("photo", { ...options, gravity: "auto" }), /Auto gravity requires/);
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
  assert.equal(tree.children[0].tagName, "picture");
  const img = tree.children[0].children.at(-1);
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
    assert.equal(tree.children[0].tagName, "picture");
    const img = tree.children[0].children.at(-1);
    assert.equal(img.properties.alt, "A test photo");
    assert.match(img.properties.src, /cloudinary.com\/test-cloud\//);
    assert.match(img.properties.src, /e_grayscale/);
    assert.equal(img.properties.loading, "eager");
    assert.equal(img.properties.fetchPriority, "high");
    assert.equal(img.properties.sizes, "75vw");
    assert.equal(tree.children[0].children[0].properties.sizes, "75vw");
  } finally {
    delete manifest["test-cloud/blog/test"];
  }
});

test("Markdown shorthand uses manifest data; missing metadata reports an actionable build error", () => {
  manifest["test-cloud/blog/test"] = assetFromResponse(sample, "test-cloud", "75vw");
  try {
    const tree = fromHtml('<p><img src="cloudinary:blog/test" alt="Test"></p>', { fragment: true });
    rehypeCloudinaryPicture({ cloudName: "test-cloud" })(tree, failFile);
    assert.equal(tree.children[0].children[0].tagName, "picture");
    for (const imagePart of tree.children[0].children[0].children) {
      assert.equal(imagePart.properties.sizes, "auto, 75vw");
    }
    const invalid = fromHtml('<img src="cloudinary:missing" alt="Missing">', { fragment: true });
    assert.throws(
      () => rehypeCloudinaryPicture()(invalid, failFile),
      /Cloudinary picture: Image width/,
    );
  } finally {
    delete manifest["test-cloud/blog/test"];
  }
});

test("Cloudinary analysis requests every explicit format and refuses incomplete responses", () => {
  const requests = breakpointRequests();
  assert.deepEqual(
    requests.map((r) => r.transformation),
    ["f_jxl,q_auto", "f_avif,q_auto", "f_webp,q_auto"],
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
    /no WEBP breakpoints/,
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
      assert.equal(JSON.parse(params.responsive_breakpoints).length, 3);
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

test("social previews use JPEG separately from page picture fallbacks", () => {
  assert.match(getOgImageUrl("photo", { cloudName: "demo" }), /f_jpg,q_auto,w_1200,h_630/);
  assert.doesNotMatch(getPictureData("photo", { width: 1200, height: 800 }).img.src, /f_jpg/);
});
