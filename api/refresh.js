import { put } from '@vercel/blob';
export const config = { runtime: 'edge' };


function mapRow(r, map) {
const pick = (obj, arr) => {
for (const k of arr) if (k in obj && obj[k] != null) return obj[k];
return null;
};
return {
data: pick(r, map.data),
colaborador_id: pick(r, map.colaborador_id),
colaborador: pick(r, map.colaborador),
equipe: pick(r, map.equipe),
horas_extras: Number(pick(r, map.horas_extras) ?? 0),
horas_devidas: Number(pick(r, map.horas_devidas) ?? 0),
saldo_dia: Number(pick(r, map.saldo_dia) ?? 0),
saldo_acumulado: Number(pick(r, map.saldo_acumulado) ?? 0)
};
}


export default async function handler(req) {
if (req.method !== 'POST') {
return new Response('Use POST', { status: 405 });
}
try {
const EXCEL_URL = process.env.EXCEL_URL; // link público com &download=1
const EXCEL_SHEET = process.env.EXCEL_SHEET || '';
const COLMAP = JSON.parse(process.env.EXCEL_COLMAP || '{}');


if (!EXCEL_URL) throw new Error('EXCEL_URL não configurada');


const resp = await fetch(EXCEL_URL, { cache: 'no-store' });
if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
const buf = await resp.arrayBuffer();


// defesa: SharePoint pode devolver HTML (login/erro)
const head = new TextDecoder().decode(new Uint8Array(buf.slice(0,64)));
if (/^\s*</.test(head)) throw new Error('Recebi HTML no lugar do XLSX (verifique &download=1 e permissões do link)');


const wb = XLSX.read(buf, { type: 'array' });
const sheetName = EXCEL_SHEET && wb.SheetNames.includes(EXCEL_SHEET)
? EXCEL_SHEET
: wb.SheetNames[0];


const raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null });
const rows = raw.map(r => mapRow(r, {
data: COLMAP.data || ["data","Data","DATA"],
colaborador_id: COLMAP.colaborador_id || ["matricula","Matricula","colaborador_id","PIS","pis","id","ID"],
colaborador: COLMAP.colaborador || ["colaborador","Colaborador","nome","Nome"],
equipe: COLMAP.equipe || ["equipe","Equipe","setor","Setor"],
horas_extras: COLMAP.horas_extras || ["horas_extras","HorasExtras","Extras"],
horas_devidas: COLMAP.horas_devidas || ["horas_devidas","HorasDevidas","Devidas"],
saldo_dia: COLMAP.saldo_dia || ["saldo_dia","SaldoDia","Saldo"],
saldo_acumulado: COLMAP.saldo_acumulado || ["saldo_acumulado","SaldoAcumulado","Acumulado"]
}));


const payload = { rows, updatedAt: new Date().toISOString() };
const key = `bh/banco_horas.json`;
const { url } = await put(key, JSON.stringify(payload), { contentType: 'application/json', access: 'public' });


return new Response(JSON.stringify({ ok:true, url, rows: rows.length }), {
headers: { 'content-type': 'application/json' }
});
} catch (e) {
return new Response(JSON.stringify({ ok:false, error:String(e) }), { status: 500, headers: { 'content-type': 'application/json' } });
}
}