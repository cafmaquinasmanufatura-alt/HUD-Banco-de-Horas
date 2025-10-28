import { list } from '@vercel/blob';


export const config = { runtime: 'edge' };


export default async function handler(req) {
try {
const { blobs } = await list({ prefix: 'bh/banco_horas.json' });
if (!blobs.length) {
return new Response(JSON.stringify({ rows: [], updatedAt: null }), {
headers: { 'content-type': 'application/json' }
});
}
const last = blobs.sort((a,b)=> new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
const res = await fetch(last.url, { cache: 'no-store' });
const json = await res.json();
return new Response(JSON.stringify(json), {
headers: { 'content-type': 'application/json' }
});
} catch (e) {
return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'content-type': 'application/json' } });
}
}