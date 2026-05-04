import { createClient } from '@supabase/supabase-js';

const URL = 'https://kybkhnshgrlhrjqbulyq.supabase.co';
const SERVICE = process.env.SB_SERVICE_ROLE_KEY;
if (!SERVICE) throw new Error('SB_SERVICE_ROLE_KEY ausente');

const supabase = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const bucket = 'imagens-whatsapp';
const path = `__lovable-verification__/upload-check/imagem.png`;

async function upload(label, bytes) {
  const file = new Blob([new Uint8Array(bytes)], { type: 'image/png' });
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: 'image/png',
    cacheControl: '0',
  });
  console.log(label, { data, error: error?.message ?? null });
  if (error) throw error;
}

await upload('UPLOAD_1', [0x89,0x50,0x4e,0x47,1,1,1,1]);
await upload('UPLOAD_2_UPSERT', [0x89,0x50,0x4e,0x47,2,2,2,2,2,2,2,2]);

const { data: list, error: listError } = await supabase.storage.from(bucket).list('__lovable-verification__/upload-check');
console.log('LIST', { files: list?.map((f) => ({ name: f.name, size: f.metadata?.size ?? null, mimetype: f.metadata?.mimetype ?? null })), error: listError?.message ?? null });
if (listError) throw listError;

const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
const url = `${pub.publicUrl}?v=${Date.now()}`;
const head = await fetch(url, { method: 'HEAD' });
console.log('PUBLIC_URL_HEAD', { status: head.status, ok: head.ok, urlStartsWith: url.slice(0, 80) });
if (!head.ok) throw new Error(`URL pública não carregou: HTTP ${head.status}`);

const { error: removeError } = await supabase.storage.from(bucket).remove([path]);
console.log('CLEANUP', { error: removeError?.message ?? null });
if (removeError) throw removeError;
