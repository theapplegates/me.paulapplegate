import {getCollection} from 'astro:content';
export async function GET() {
  const posts=(await getCollection('post')).sort((a,b)=>b.data.publishDate.valueOf()-a.data.publishDate.valueOf());
  const documents=posts.map(post=>({id:post.id,title:post.data.title,description:post.data.description,tags:(post.data.tags || []).join(' '),body:(post.body || '').replace(/^import\s.*$/gm,'').replace(/<[^>]*>/g,' ').replace(/!\[[^\]]*\]\([^)]*\)/g,' ').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[#*`_>]/g,' ').replace(/\s+/g,' ').trim(),url:`/blog/${post.id}`,date:post.data.publishDate.toISOString(),read:post.data.read || 1}));
  return new Response(JSON.stringify(documents),{headers:{'Content-Type':'application/json'}});
}
