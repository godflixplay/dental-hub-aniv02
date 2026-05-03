const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://kybkhnshgrlhrjqbulyq.supabase.co';
const SERVICE_ROLE = process.env.SB_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false, autoRefreshToken: false } });

const phones = ['5521981089100', '5521974628131'];
const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

function redact(row) {
  if (!row || typeof row !== 'object') return row;
  const out = { ...row };
  for (const k of Object.keys(out)) {
    if (/token|key|secret|password/i.test(k)) out[k] = '***';
  }
  return out;
}
async function q(label, promise) {
  const { data, error } = await promise;
  if (error) return { label, error: error.message, data: null };
  return { label, data };
}
async function head(url) {
  if (!url) return null;
  try {
    const r = await fetch(url, { method: 'HEAD' });
    return {
      ok: r.ok,
      status: r.status,
      contentType: r.headers.get('content-type'),
      contentLength: r.headers.get('content-length'),
      lastModified: r.headers.get('last-modified')
    };
  } catch (e) { return { error: e.message || String(e) }; }
}

(async () => {
  const enviosByPhone = {};
  for (const phone of phones) {
    const { data, error } = await supabase
      .from('envios_whatsapp')
      .select('*')
      .eq('telefone', phone)
      .order('created_at', { ascending: false })
      .limit(10);
    enviosByPhone[phone] = error ? { error: error.message } : data.map(redact);
  }

  const { data: recentEnvios, error: recentEnviosError } = await supabase
    .from('envios_whatsapp')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(30);

  const userIds = new Set();
  for (const rows of Object.values(enviosByPhone)) {
    if (Array.isArray(rows)) rows.forEach(r => r.user_id && userIds.add(r.user_id));
  }
  if (Array.isArray(recentEnvios)) recentEnvios.forEach(r => r.user_id && userIds.add(r.user_id));

  let latestInstanceAny = null;
  const latestAny = await q('latest_whatsapp_instances_any', supabase
    .from('whatsapp_instances')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(10));
  if (latestAny.data?.length) latestAny.data.forEach(r => r.user_id && userIds.add(r.user_id));

  const perUser = [];
  for (const userId of userIds) {
    const [instanceR, configR, webhookR, contatosR] = await Promise.all([
      q('whatsapp_instances', supabase.from('whatsapp_instances').select('*').eq('user_id', userId).order('updated_at', { ascending: false }).limit(5)),
      q('config_mensagem', supabase.from('config_mensagem').select('*').eq('user_id', userId).order('updated_at', { ascending: false }).limit(5)),
      q('config_webhook', supabase.from('config_webhook').select('*').eq('user_id', userId).order('updated_at', { ascending: false }).limit(5)),
      q('contatos_matching_phones', supabase.from('contatos').select('*').eq('user_id', userId).in('telefone', phones).limit(20)),
    ]);
    const instances = (instanceR.data || []).map(redact);
    const configs = (configR.data || []).map(redact);
    const webhookConfigs = (webhookR.data || []).map(redact);
    const contatos = (contatosR.data || []).map(redact);
    const firstInstance = instances[0] || null;
    const firstConfig = configs[0] || null;
    const imageUrl = (firstInstance?.imagem_url || firstConfig?.imagem_url || '').trim();
    let storageFiles = null;
    if (firstInstance?.instance_name) {
      const { data, error } = await supabase.storage
        .from('imagens-whatsapp')
        .list(`${userId}/${firstInstance.instance_name}`, { limit: 100, sortBy: { column: 'updated_at', order: 'desc' }});
      storageFiles = error ? { error: error.message } : data;
    }
    perUser.push({
      user_id: userId,
      whatsapp_instances: instances,
      config_mensagem: configs,
      config_webhook: webhookConfigs,
      contatos_matching_phones: contatos,
      resolved_image_url: imageUrl || null,
      resolved_image_head: await head(imageUrl),
      storage_folder: firstInstance?.instance_name ? `${userId}/${firstInstance.instance_name}` : null,
      storage_files: storageFiles,
      payload_if_triggered_for_each_phone: phones.map(phone => ({
        phone,
        nome: contatos.find(c => c.telefone === phone)?.nome || '(nome digitado no teste)',
        telefone: phone,
        mensagem_source: firstConfig?.mensagem ? 'config_mensagem.mensagem' : 'fallback/UI',
        mensagem_template: firstConfig?.mensagem || null,
        nome_instancia: firstInstance?.instance_name || null,
        user_id: userId,
        imagem_url: firstInstance?.imagem_url || null,
        instancia_id: firstInstance?.instance_id || '',
        api_url_present: Boolean(process.env.EVOLUTION_API_URL),
        token_present: Boolean(process.env.EVOLUTION_API_KEY)
      }))
    });
  }

  const output = {
    checked_at: new Date().toISOString(),
    lookback_since: since,
    searched_phones: phones,
    envios_by_phone: enviosByPhone,
    recent_envios_whatsapp_last_6h: recentEnviosError ? { error: recentEnviosError.message } : recentEnvios.map(redact),
    latest_whatsapp_instances_any: latestAny.error ? { error: latestAny.error } : latestAny.data.map(redact),
    per_user_sources_and_would_be_payloads: perUser,
  };
  console.log(JSON.stringify(output, null, 2));
})();
