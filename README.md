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

Cloudinary chooses the format and quality with `f_auto,q_auto`. Each image has a responsive `srcset` so the browser can choose a width for its spot on the page. The default cloud is `paulapplegate-com`.

**Add a photo to a post**

1. Upload the photo to your Cloudinary Media Library and copy its public ID and pixel dimensions.
2. Paste the tag below into your Markdown or MDX post. Replace the ID, description, width, and height with your photo’s details.

```html
<cloudinary-picture src="images/blog/my-photo" alt="Describe the photo" width="1600" height="900"></cloudinary-picture>
```

Once a photo is registered in `src/data/cloudinary-images.json`, you can omit the dimensions or use Markdown shorthand. For example, this displays an existing photo from “The Game Show”.

```md
![Paul and his mother on the game-show set](cloudinary:images/blog/Mom-me)
```

Use `coverImage` with the public ID and `coverAlt` for a post thumbnail. Use `coverCloudName` for a different cloud. Local thumbnails use `img: "/assets/journal/photo.jpg"` and `img_alt`, with the file under `public/`.

**Optional upload and breakpoint command**

To save the dimensions, version and suggested widths automatically, set `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` in your local `.env.local`. Run one of these commands.

```sh
pnpm cloudinary:breakpoints src/images/blog/photo.jpg --alt="A description of the photo"
pnpm cloudinary:breakpoints images/blog/photo --existing --alt="A description of the photo"
```

Commit the updated `src/data/cloudinary-images.json` and paste the printed tag into your post. The command requests one set of suggested widths. The site builds without API credentials and uses the saved widths and dimensions for registered photos.

Images load lazily by default. On a post’s main above-the-fold photo, use `loading="eager" fetchpriority="high"`. Set both `width` and `height` to choose a crop. For different crops by screen size, see the `CloudinaryImage` example at the end of `src/content/post/the-game-show/index.mdx`.

Verify image changes with `pnpm test` and `pnpm build`.

## Search

OramaJS (`@orama/orama`) powers title, description, tag, and full-text search with typo tolerance. Open Search in the header or press Command/Control K. The index loads on demand. It works without an Orama account or API key. This integrates the open-source engine, not Orama's hosted cloud/AI service. See https://docs.orama.com/docs/orama-js.

## Preserved template elements

- `/elements`: complete component gallery, including buttons, badges, inputs, typography, and icons.
- `/design`: design documentation and all palette references.
- Header: original theme picker and dark/light controls, unchanged; branding/navigation and search action adapted.
- Article layouts, reading progress, table of contents, pagination, RSS, sitemap, optimized image component, and back-to-top control retained.
- Home and About reuse the button, badge, separator, section-heading, browser frame, and accordion components. Blog thumbnails use the original optimized image component.

## Site settings

Edit `src/config/site.js` for title and description. Set PUBLIC_SITE_URL when using another domain, then rebuild. Theme settings are in `src/config/themes.js`; journal layout styles are in `src/styles/journal.css`. Original MIT license is retained. The journal uses local and Cloudinary-hosted photos. The original template assets are retained.

The site is published privately through Sites. `.openai/hosting.json` identifies its hosting project.
