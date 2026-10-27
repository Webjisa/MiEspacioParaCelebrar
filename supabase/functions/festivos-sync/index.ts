import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const API = 'https://datos.juntadeandalucia.es/api/v0/work-calendar/search';
const LOCAL_PROVINCE = 'CÓRDOBA';
const LOCAL_MUNICIPALITY = 'LUCENA';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

function norm(s: unknown) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parseDate(raw: unknown, year: number, dateformat?: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const v = String(raw).trim();

  // Official API returns dates such as 20260101 as a numeric "long".
  if (/^\d{8}$/.test(v)) {
    const y = Number(v.slice(0, 4));
    const m = Number(v.slice(4, 6));
    const d = Number(v.slice(6, 8));
    if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  if (typeof dateformat === 'string') {
    const f = dateformat.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(f)) return f.slice(0, 10);
  }

  return null;
}

function extractRows(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const p = payload as Record<string, unknown>;

  // The official API uses `hits` as a count and `results` as the actual rows.
  if (Array.isArray(p.results)) return p.results as any[];
  if (Array.isArray(p.data)) return p.data as any[];
  if (Array.isArray(p.items)) return p.items as any[];
  if (Array.isArray(p.records)) return p.records as any[];
  return [];
}

function field(row: any, names: string[]) {
  for (const name of names) {
    if (row && row[name] !== undefined && row[name] !== null) return row[name];
  }
  return '';
}

function scopeForCommon(name: string) {
  const n = norm(name);
  if (n.includes('dia de andalucia') || n.includes('jueves santo')) return 'AUTONOMIC';
  return 'NATIONAL';
}

async function fetchSearch(params: {
  year: number;
  province: string;
  type: 'LABORAL' | 'LOCAL';
  municipality?: string;
}) {
  const url = new URL(API);
  url.searchParams.set('province', params.province);
  url.searchParams.set('type', params.type);
  url.searchParams.set('order_by', 'date');
  url.searchParams.set('mode', 'ASC');
  url.searchParams.set('year', String(params.year));
  url.searchParams.set('format', 'json');
  url.searchParams.set('size', '100');
  if (params.municipality) url.searchParams.set('municipality', params.municipality);

  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'MiEspacioParaCelebrar/1.0',
      'Accept': 'application/json'
    }
  });

  // Local holidays for a municipality/year may not be published yet.
  // A 400 in that case must not stop the national/autonomic update.
  if (!response.ok) {
    if (params.type === 'LOCAL' && response.status === 400) {
      return { url: url.toString(), rows: [], status: 400 };
    }
    throw new Error(`Fuente oficial HTTP ${response.status} (${params.type}, ${params.province}, ${params.year})`);
  }

  const payload = await response.json();
  return { url: url.toString(), rows: extractRows(payload), status: response.status };
}

function mapCommon(rows: any[], year: number, source: string) {
  return rows.map((r) => {
    const date = parseDate(field(r, ['date']), year, field(r, ['dateformat']));
    if (!date) return null;
    const name = String(field(r, ['description', 'name', 'holiday', 'festivity']) || '').trim();
    return {
      year,
      holiday_date: date,
      municipality: null,
      province: null,
      name: name || 'Festivo laboral',
      scope: scopeForCommon(name),
      source,
      source_updated_at: new Date().toISOString()
    };
  }).filter(Boolean);
}

function mapLocal(rows: any[], year: number, source: string) {
  return rows.map((r) => {
    const date = parseDate(field(r, ['date']), year, field(r, ['dateformat']));
    if (!date) return null;
    const municipality = String(field(r, ['municipality', 'municipio', 'locality', 'localidad']) || '').trim();
    const province = String(field(r, ['province', 'provincia']) || '').trim();
    const name = String(field(r, ['description', 'name', 'holiday', 'festivity']) || '').trim();

    if (!municipality || !province) return null;

    return {
      year,
      holiday_date: date,
      municipality,
      province,
      name: name || 'Fiesta local',
      scope: 'LOCAL',
      source,
      source_updated_at: new Date().toISOString()
    };
  }).filter(Boolean);
}

Deno.serve(async (req) => {
  try {
    const auth = req.headers.get('x-cron-secret');
    if (!auth || auth !== Deno.env.get('CRON_SECRET')) {
      return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const years = [now.getUTCFullYear(), now.getUTCFullYear() + 1];
    const diagnostics: any[] = [];
    const allCommon: any[] = [];
    const allLocal: any[] = [];

    for (const year of years) {
      // Only the 12 common national/autonomic holidays are requested here.
      // This avoids downloading the entire Andalucía local-holiday dataset.
      const common = await fetchSearch({
        year,
        province: '-',
        type: 'LABORAL'
      });
      const commonMapped = mapCommon(common.rows, year, common.url);
      allCommon.push(...commonMapped);

      // The application is for Lucena. Query only Lucena's local holidays.
      const local = await fetchSearch({
        year,
        province: LOCAL_PROVINCE,
        type: 'LOCAL',
        municipality: LOCAL_MUNICIPALITY
      });
      const localMapped = mapLocal(local.rows, year, local.url)
        .filter(r => norm(r.municipality) === norm(LOCAL_MUNICIPALITY) && norm(r.province) === norm(LOCAL_PROVINCE));
      allLocal.push(...localMapped);

      diagnostics.push({
        year,
        common_source_rows: common.rows.length,
        common_mapped_rows: commonMapped.length,
        local_source_rows: local.rows.length,
        local_mapped_rows: localMapped.length,
        local_http_status: local.status,
        municipality: LOCAL_MUNICIPALITY,
        province: LOCAL_PROVINCE
      });
    }

    // The common calendar must contain at least 12 entries before replacing it.
    for (const year of years) {
      const commonRows = allCommon.filter(r => r.year === year);
      const localRows = allLocal.filter(r => r.year === year);

      if (commonRows.length >= 12) {
        const { error: delError } = await supabase
          .from('local_holidays')
          .delete()
          .eq('year', year)
          .in('scope', ['NATIONAL', 'AUTONOMIC']);
        if (delError) throw delError;

        const { error: insError } = await supabase
          .from('local_holidays')
          .insert(commonRows);
        if (insError) throw insError;
      }

      // Only replace Lucena's local holidays when the official source returned them.
      if (localRows.length > 0) {
        const { error: delError } = await supabase
          .from('local_holidays')
          .delete()
          .eq('year', year)
          .eq('scope', 'LOCAL')
          .eq('province', LOCAL_PROVINCE)
          .eq('municipality', LOCAL_MUNICIPALITY);
        if (delError) throw delError;

        const { error: insError } = await supabase
          .from('local_holidays')
          .insert(localRows);
        if (insError) throw insError;
      }
    }

    if (!allCommon.length && !allLocal.length) {
      throw new Error(`La fuente oficial no devolvió datos utilizables. Diagnóstico: ${JSON.stringify(diagnostics)}`);
    }

    return Response.json({
      ok: true,
      source: API,
      years,
      common_received: allCommon.length,
      local_received: allLocal.length,
      diagnostics,
      synced: years.map(year => ({
        year,
        common_saved: allCommon.filter(r => r.year === year).length >= 12,
        common_count: allCommon.filter(r => r.year === year).length,
        local_count: allLocal.filter(r => r.year === year).length
      }))
    });
  } catch (e) {
    console.error(e);
    return Response.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e)
    }, { status: 500 });
  }
});
