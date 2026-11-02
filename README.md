# Living Life — Fieldnotes

A complete Astro blog based on the supplied Design-led Astro Starter. The original template remains untouched. All ten theme choices and their light/dark controls are preserved. Blog listings use open rows with small thumbnails and Read more links.

## Run locally

Requires Node 22.12+ and pnpm 9+.

```sh
pnpm install
pnpm dev
```

Open http://127.0.0.1:4327. For production validation, run `pnpm build`; use `pnpm preview` to inspect that build.

## Write a post

Add an MDX file in `src/content/post/<slug>/index.mdx`, following an existing post. Add a title, description, publishDate, tags, optional read time, and optional image. New posts automatically appear in the journal, pagination, RSS, and search index after a build. The four journal entries are explicitly marked as sample writing; the three original starter guides remain in the archive.

## Search

OramaJS (`@orama/orama`) powers title, description, tag, and full-text search with typo tolerance. Open Search in the header or press Command/Control K. The index loads on demand. It works without an Orama account or API key. This integrates the open-source engine, not Orama's hosted cloud/AI service. See https://docs.orama.com/docs/orama-js.

## Preserved template elements

- `/elements`: complete component gallery, including buttons, badges, inputs, typography, and icons.
- `/design`: design documentation and all palette references.
- Header: original theme picker and dark/light controls, unchanged; branding/navigation and search action adapted.
- Article layouts, reading progress, table of contents, pagination, RSS, sitemap, optimized image component, and back-to-top control retained.
- Home and About reuse the button, badge, separator, section-heading, browser frame, and accordion components. Blog thumbnails use the original optimized image component.

## Site settings

Edit `src/config/site.js` for title and description. Set PUBLIC_SITE_URL when using another domain, then rebuild. Theme settings are in `src/config/themes.js`; journal layout styles are in `src/styles/journal.css`. Original MIT license is retained. Photos are served locally, sourced from Unsplash image endpoints; template asset files are also retained.

The site is published privately through Sites. `.openai/hosting.json` identifies its hosting project.
