# Living Life — Fieldnotes

A complete Astro blog based on the supplied Design-led Astro Starter. The original template remains untouched. All ten theme choices and their light/dark controls are preserved. Blog listings use open rows with small thumbnails and Read more links.

## Run locally

Requires Node 22.23.4+ and pnpm 9+. Netlify uses Node 24.

```sh
pnpm install
pnpm dev
```

Open http://127.0.0.1:4327. For production validation, run `pnpm build`; use `pnpm preview` to inspect that build.

## Write a post

Add an MDX file in `src/content/post/<slug>/index.mdx`, following an existing post. Add a title, description, publishDate, tags, optional read time, and optional image. New posts automatically appear in the journal, pagination, RSS, and search index after a build. The four journal entries are explicitly marked as sample writing; the three original starter guides remain in the archive.

## Images

Post thumbnails use Cloudinary. Set `coverImage` to the asset's public ID, `coverAlt` to a short description, and `coverCloudName` to `"paulapplegate-com"`. The local `img:` / `img_alt:` workflow is no longer used.

```yaml
coverImage: "assets/journal/lake"
coverAlt: "A still lake beneath the mountains"
coverCloudName: "paulapplegate-com"
```

To register a Cloudinary asset, set `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` in your local `.env.local`. Run one of these commands:

```sh
pnpm cloudinary:breakpoints src/images/blog/photo.jpg --alt="A description of the photo"
pnpm cloudinary:breakpoints public/assets/journal/photo.jpg --alt="A description of the photo"
pnpm cloudinary:breakpoints images/blog/photo --existing --alt="A description of the photo"
```

The upload command derives the public ID by removing the leading `src/` or `public/` and the file extension. Commit the updated `src/data/cloudinary-images.json` and use the printed cover fields for a thumbnail or paste the printed tag into the post body. For a registered image, you can also write `![A description](cloudinary:images/blog/photo)`. The Astro build reads the manifest without Cloudinary credentials.

Cloudinary's analysis supplies suggested widths by format. For article photos, the renderer fills gaps near common display widths. Custom crops use widths suited to their placement and stay within the pixels available in the original. Versions, crops, widths, and formats are encoded in delivery URLs. The analysis command discards its temporary derivatives. Cloudinary generates the delivered variants on request.

Use both `width` and `height` to set a custom crop. Use `loading="eager" fetchpriority="high"` on an article's likely LCP image. Other article images lazy-load by default. The HTML prefers JPEG XL, followed by AVIF and a responsive WebP fallback.

Verify image changes with `pnpm test` and `pnpm build`.

## Search

OramaJS (`@orama/orama`) powers title, description, tag, and full-text search with typo tolerance. Open Search in the header or press Command/Control K. The index loads on demand. It works without an Orama account or API key. This integrates the open-source engine, not Orama's hosted cloud/AI service. See https://docs.orama.com/docs/orama-js.

## Preserved template elements

- `/elements`: complete component gallery, including buttons, badges, inputs, typography, and icons.
- `/design`: design documentation and all palette references.
- Header: original theme picker and dark/light controls, unchanged; branding/navigation and search action adapted.
- Article layouts, reading progress, table of contents, pagination, RSS, sitemap, and back-to-top control retained.
- Home and About reuse the button, badge, separator, section-heading, browser frame, and accordion components. Their photos and blog thumbnails use the shared `CloudinaryImage` component.

## Site settings

Edit `src/config/site.js` for title and description. Set PUBLIC_SITE_URL when using another domain, then rebuild. Theme settings are in `src/config/themes.js`; journal layout styles are in `src/styles/journal.css`. Original MIT license is retained. The journal uses Cloudinary-hosted photos. The original template assets are retained.

The site is published privately through Sites. `.openai/hosting.json` identifies its hosting project.
