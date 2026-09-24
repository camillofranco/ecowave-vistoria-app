import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Vistoria } from '../db/database';
import { generatePDF } from '../utils/pdfGenerator';
import { generateAuditPDF } from '../utils/auditPdf';
import { auditReadyForReview } from '../components/AuditForm';
import logoImg from '../assets/logo.png';

const url = import.meta.env.VITE_PORTAL_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_PORTAL_SUPABASE_PUBLISHABLE_KEY as string | undefined;

let client: SupabaseClient | null = null;
export function portalConfigured() { return Boolean(url && key); }
export function portalClient(): SupabaseClient {
  if (!url || !key) throw new Error('O Portal Ecowave ainda não foi configurado neste aplicativo.');
  if (!client) client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}

export type PortalCondo = { id: string; name: string };
export type PortalUnit = { id: string; condominium_id: string; block: string; unit_number: string };

export async function listPortalCondominiums(): Promise<PortalCondo[]> {
  const { data, error } = await portalClient().from('condominiums').select('id,name').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function listPortalUnits(condominiumId: string): Promise<PortalUnit[]> {
  // Paginação evita o limite padrão de 1.000 linhas do Supabase.
  const result: PortalUnit[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await portalClient().from('units')
      .select('id,condominium_id,block,unit_number')
      .eq('condominium_id', condominiumId).order('id').range(from, from + 999);
    if (error) throw error;
    result.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return result;
}

function bytesFromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function sha256Hex(bytes: Uint8Array): Promise<string> {
  return crypto.subtle.digest('SHA-256', bytes as BufferSource).then(hash =>
    Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''));
}

function structuredPayload(v: Vistoria): Record<string, unknown> {
  return JSON.parse(JSON.stringify(v, (_key, value: unknown) => {
    if (typeof value === 'string' && (/^data:(image|video|audio)\//i.test(value) || value.length > 100_000)) {
      return '[evidência incorporada ao PDF]';
    }
    return value;
  })) as Record<string, unknown>;
}

export async function submitInspection(v: Vistoria, condominiumId: string, unitId: string) {
  const api = portalClient();
  const { data: auth, error: authError } = await api.auth.getUser();
  if (authError || !auth.user) throw new Error('Entre na sua conta do portal antes de enviar.');
  if (!v.inspection_uid) throw new Error('Identificador da vistoria ausente. Salve-a novamente.');
  if (v.tipo_vistoria === 'Auditoria Ambiental' && !auditReadyForReview(v.auditoria)) {
    throw new Error('Complete a auditoria antes do envio.');
  }
  const { data: previous, error: previousError } = await api.from('inspections')
    .select('id,status,unit_id').eq('inspection_uid', v.inspection_uid).maybeSingle();
  if (previousError) throw previousError;
  if (previous) {
    if (previous.unit_id !== unitId) throw new Error('Esta vistoria já foi vinculada a outra unidade no portal.');
    if (previous.status === 'returned' && v.tipo_vistoria === 'Auditoria Ambiental') {
      return resubmitAudit(v, previous.id as string);
    }
    return { id: previous.id as string, status: previous.status as Vistoria['portal_status'] };
  }

  const base64 = v.tipo_vistoria === 'Auditoria Ambiental' ? await generateAuditPDF(v) : await generatePDF(v, logoImg);
  const bytes = bytesFromBase64(base64);
  if (bytes.byteLength > 20 * 1024 * 1024) throw new Error('O PDF excede 20 MB. Reduza as imagens antes do envio.');
  const hash = await sha256Hex(bytes);
  const path = `${auth.user.id}/${v.inspection_uid}-h${hash.slice(0, 12)}.pdf`;
  const pdf = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const { error: uploadError } = await api.storage.from('inspection-documents').upload(path, pdf, {
    contentType: 'application/pdf', upsert: false,
  });
  // Um reenvio do mesmo PDF encontra o arquivo já recebido e pode continuar.
  if (uploadError && String(uploadError.statusCode) !== '409') throw uploadError;

  const occurredAt = new Date(`${v.data}T${v.hora || '12:00'}:00`);
  if (Number.isNaN(occurredAt.getTime())) throw new Error('Data ou hora da vistoria inválida.');
  const { data, error } = await api.from('inspections').insert({
    inspection_uid: v.inspection_uid, condominium_id: condominiumId, unit_id: unitId,
    kind: v.tipo_vistoria, occurred_at: occurredAt.toISOString(),
    payload_version: 1, payload: structuredPayload(v), document_path: path,
    document_sha256: hash, document_size: bytes.byteLength, created_by: auth.user.id,
  }).select('id,status').single();
  if (error) {
    if (error.code === '23505') {
      const { data: existing } = await api.from('inspections').select('id,status,unit_id')
        .eq('inspection_uid', v.inspection_uid).maybeSingle();
      if (existing?.unit_id === unitId) return { id: existing.id as string, status: existing.status as Vistoria['portal_status'] };
    }
    throw error;
  }
  return { id: data.id as string, status: data.status as Vistoria['portal_status'] };
}

async function resubmitAudit(v: Vistoria, inspectionId: string) {
  if (!auditReadyForReview(v.auditoria)) throw new Error('Complete a auditoria antes do reenvio.');
  const api = portalClient();
  const { data: auth } = await api.auth.getUser();
  if (!auth.user || !v.inspection_uid) throw new Error('Sessão ou identificador da auditoria ausente.');
  const { count, error: countError } = await api.from('audit_review_events')
    .select('id', { head: true, count: 'exact' }).eq('inspection_id', inspectionId);
  if (countError) throw countError;
  const revision = (count ?? 0) + 1;
  const base64 = await generateAuditPDF(v);
  const bytes = bytesFromBase64(base64);
  if (bytes.byteLength > 20 * 1024 * 1024) throw new Error('O PDF excede 20 MB.');
  const hash = await sha256Hex(bytes);
  const path = `${auth.user.id}/${v.inspection_uid}-r${revision}-h${hash.slice(0, 12)}.pdf`;
  const { error: uploadError } = await api.storage.from('inspection-documents').upload(
    path, new Blob([bytes as BlobPart], { type: 'application/pdf' }),
    { contentType: 'application/pdf', upsert: false },
  );
  if (uploadError && String(uploadError.statusCode) !== '409') throw uploadError;
  const { error } = await api.rpc('resubmit_environmental_audit', {
    _inspection_id: inspectionId, _payload: structuredPayload(v), _document_path: path,
    _document_sha256: hash, _document_size: bytes.byteLength,
  });
  if (error) throw error;
  return { id: inspectionId, status: 'submitted' as const };
}
