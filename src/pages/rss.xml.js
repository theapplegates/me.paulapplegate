import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { siteConfig } from '../config/site.js';
export async function GET(context){const posts=(await getCollection('post')).sort((a,b)=>b.data.publishDate.valueOf()-a.data.publishDate.valueOf());return rss({title:siteConfig.title,description:siteConfig.meta.description,site:context.site,items:posts.map(post=>({title:post.data.title,pubDate:post.data.publishDate,description:post.data.description,link:`/blog/${post.id}/`}))});}
