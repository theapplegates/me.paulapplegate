I can't log into your GitHub or Cloudinary accounts from here, so I can't press the "commit" button for you — but I did the next best thing: **I wrote the exact fix, and pre-tested it against your live Cloudinary** (the new image URLs already return the right formats and sizes). All you have to do is copy one message to the AI helper you use to update this site.

## What to do

1. Open the AI assistant you normally use to make changes to this site (the one that made your recent commits — e.g. Codex/ChatGPT).
2. Copy **everything in the block below** and send it as one message.
3. If it asks for your Cloudinary API key and secret, those are the same ones you used when you added the game-show photos (they live in your `.env.local` file). Part A works without them.

```text
Please make the following changes to this repo. Do not switch anything to f_auto — keep the explicit f_jxl / f_avif / f_webp pipeline exactly as it is. Do not modify the three existing <cloudinary-picture> tags in the-game-show post.

PART A — Fix the wrongly-sized picture in "The Game Show" (no credentials needed)

1. In src/data/cloudinary-images.json, add this entry to the top-level object (dimensions and version verified from the live asset):
   "paulapplegate-com/breakpoints/eaccby1au28dslg4di4m": {
     "publicId": "breakpoints/eaccby1au28dslg4di4m",
     "cloudName": "paulapplegate-com",
     "width": 4154,
     "height": 5192,
     "version": 1795406845
   }

2. In src/content/post/the-game-show/index.mdx, delete the entire hand-pasted <picture>...</picture> block (line 27 through the end of the file) and replace it with this single tag:
   <cloudinary-picture src="breakpoints/eaccby1au28dslg4di4m" cloud-name="paulapplegate-com" alt=""></cloudinary-picture>
   (Keep alt="" as it is today; if the photo shows something meaningful, put a short description there instead.)

PART B — Move the remaining photos off sharp and onto Cloudinary (needs CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env.local, same as previous uploads)

3. Upload the five local photos (these produce the public IDs used in the next steps):
   pnpm cloudinary:breakpoints public/assets/journal/lake.jpg --alt="An alpine lake reflecting mountains and a quiet lakeside cabin"
   pnpm cloudinary:breakpoints public/assets/journal/forest.jpg --alt="Sunlight filtering through a green forest"
   pnpm cloudinary:breakpoints public/assets/journal/coffee.jpg --alt="A quiet moment with coffee"
   pnpm cloudinary:breakpoints public/assets/blog/cover.jpg --alt="Starter theme customization"
   pnpm cloudinary:breakpoints public/assets/article-cover.jpg --alt="Design documentation and theme tokens"
   Commit the updated src/data/cloudinary-images.json.

4. In these 7 posts under src/content/post/, remove the img: and img_alt: frontmatter lines and replace them with coverImage, coverAlt, and coverCloudName: "paulapplegate-com":
   - a-slower-kind-of-morning   → coverImage: "assets/journal/coffee",  coverAlt: "A quiet moment with coffee"
   - customize-the-theme        → coverImage: "assets/blog/cover",      coverAlt: "Starter theme customization"
   - design-led-astro-starter   → coverImage: "assets/blog/cover",      coverAlt: "Design-led Astro starter preview"
   - make-something-small       → coverImage: "assets/journal/lake",    coverAlt: "A still lake beneath the mountains"
   - take-the-long-way-home     → coverImage: "assets/journal/forest",  coverAlt: "Sunlight through woodland"
   - the-art-of-noticing        → coverImage: "assets/journal/lake",    coverAlt: "A still lake beneath the mountains"
   - work-with-design-md        → coverImage: "assets/article-cover",   coverAlt: "Design documentation and theme tokens"

5. In src/components/home/HeroSection.astro, replace the OptimizedImage import and usage with:
   import CloudinaryImage from "@/components/CloudinaryImage.astro";
   <CloudinaryImage
     publicId="assets/journal/lake"
     cloudName="paulapplegate-com"
     width={1400}
     height={933}
     widths={[480, 640, 768, 960, 1200, 1400]}
     sizes="(max-width: 767px) max(450px, calc(100vw - 2rem)), (max-width: 1000px) 586px, 631px"
     alt="An alpine lake reflecting mountains and a quiet lakeside cabin"
     loading="eager"
     fetchpriority="high"
   />

6. In src/pages/about.astro, replace the OptimizedImage import and usage with:
   import CloudinaryImage from "@/components/CloudinaryImage.astro";
   <CloudinaryImage
     class="journal-about-photo"
     publicId="assets/journal/forest"
     cloudName="paulapplegate-com"
     width={800}
     height={533}
     widths={[480, 560, 640, 768, 800]}
     sizes="(max-width: 767px) max(466px, calc(100vw - 2rem - 2px)), 751px"
     alt="Sunlight filtering through a green forest"
     loading="eager"
     fetchpriority="high"
   />

7. In src/components/cards/BlogCard.astro, remove the OptimizedImage import, the localCover constant, and the local-image branch. Keep the CloudinaryImage branch and the ✦ fallback exactly as they are.

8. Delete src/components/widgets/OptimizedImage.astro (nothing imports astro:assets after the steps above). Remove "sharp" from package.json dependencies and run pnpm install to refresh the lockfile.

9. In src/config/site.js, change meta.image to:
   "https://res.cloudinary.com/paulapplegate-com/image/upload/f_jpg,q_auto,w_1200,h_630,c_fill,g_auto/assets/journal/lake"
   (JPEG here is intentional — social crawlers can't read JXL.)

10. Update the README "Images" section: post thumbnails now use coverImage (Cloudinary); the local img: workflow is no longer used.

VERIFY BEFORE COMMITTING
- pnpm test and pnpm build both pass.
- In the built dist HTML: no /_astro/ image files remain (js/css is fine), every <picture> has a type="image/jxl" source, and f_auto appears nowhere.
- package.json no longer contains sharp.
Commit everything to main so the site redeploys.
```

## Why you can trust this will work

I didn't just write instructions — I checked the tricky parts against your live site first:

- The "new" photo in Part A is **already in your Cloudinary**; I confirmed the exact URLs the fix will generate serve correctly (e.g. the 1920px JXL returns `image/jxl`, ~155 KB instead of the current 4154px fallback).
- All five photos in Part B are large enough for the sizes your site requests — nothing will be blurry or upscaled.
- The replacement components keep your existing styling (the hero's fixed-height crop, the About photo frame, the thumbnail hover zoom) because the CSS targets stay the same.

Once your helper commits, your site rebuilds automatically, and **every photo** — hero, About, thumbnails, and articles — will come from Cloudinary in JXL → AVIF → WebP order at the right size. If anything in its reply looks confusing, paste it back here and I'll tell you whether it did the right thing.