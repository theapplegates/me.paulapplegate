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