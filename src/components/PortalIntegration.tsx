import { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { db, type Vistoria } from '../db/database';
import {
  listPortalCondominiums, listPortalUnits, portalClient, portalConfigured,
  submitInspection, type PortalCondo, type PortalUnit,
} from '../services/portal';

export function PortalAccount({ user, onUser }: { user: User | null; onUser: (user: User | null) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!portalConfigured()) return;
    const api = portalClient();
    void api.auth.getUser().then(({ data }) => onUser(data.user));
    const { data } = api.auth.onAuthStateChange((_event, session) => onUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, [onUser]);

  async function signIn() {
    setBusy(true); setError('');
    const { error } = await portalClient().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    setPassword('');
    if (error) setError('Não foi possível entrar. Confira e-mail, senha e autorização no portal.');
  }

  if (!portalConfigured()) return <div className="card"><h3>Portal Ecowave</h3><p>Integração indisponível nesta versão do aplicativo.</p></div>;
  return <div className="card" aria-label="Conexão com Portal Ecowave">
    <h3>Portal Ecowave</h3>
    {user ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
      <span>Conectado como {user.email}</span>
      <button className="secondary" style={{ width: 'auto' }} onClick={() => void portalClient().auth.signOut()}>Sair</button>
    </div> : <div className="grid-2">
      <div className="form-group"><label>E-mail da equipe</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div className="form-group"><label>Senha</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} /></div>
      <button disabled={busy || !email || !password} onClick={() => void signIn()}>Entrar para enviar vistorias</button>
    </div>}
    {error && <p role="alert" style={{ color: 'var(--error)' }}>{error}</p>}
  </div>;
}

function normalized(value: string | undefined) {
  return (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().replace(/\s+/g, ' ').toLocaleUpperCase('pt-BR');
}

export function PortalSend({ v, user, onSynced }: {
  v: Vistoria; user: User | null; onSynced: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [condos, setCondos] = useState<PortalCondo[]>([]);
  const [units, setUnits] = useState<PortalUnit[]>([]);
  const [condoId, setCondoId] = useState('');
  const [block, setBlock] = useState('');
  const [unitId, setUnitId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState('');

  useEffect(() => {
    if (!open || !user) return;
    let active = true;
    void listPortalCondominiums().then(rows => {
      if (!active) return;
      setCondos(rows);
      setCondoId(v.portal_unit_id ? '' : rows.find(c => normalized(c.name) === normalized(v.condominio))?.id ?? '');
    }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'Falha na consulta de condomínios.'); });
    return () => { active = false; };
  }, [open, user, v.condominio, v.portal_unit_id]);

  useEffect(() => {
    if (!condoId || !open) { setUnits([]); return; }
    let active = true;
    void listPortalUnits(condoId).then(rows => {
      if (!active) return;
      setUnits(rows);
      const match = rows.find(u => normalized(u.block) === normalized(v.bloco) && normalized(u.unit_number) === normalized(v.unidade));
      setBlock(match?.block ?? '');
      setUnitId(match?.id ?? '');
    }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'Falha na consulta de unidades.'); });
    return () => { active = false; };
  }, [condoId, open, v.bloco, v.unidade]);

  const blocks = useMemo(() => [...new Set(units.map(u => u.block))].sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true })), [units]);
  const selectedCondo = condos.find(c => c.id === condoId);
  const selectedUnit = units.find(u => u.id === unitId);

  async function send() {
    if (!v.id || !selectedCondo || !selectedUnit || !confirmed) return;
    setBusy(true); setError(''); setReceipt('');
    try {
      const canonical: Vistoria = {
        ...v, condominio: selectedCondo.name, bloco: selectedUnit.block,
        unidade: selectedUnit.unit_number, portal_unit_id: selectedUnit.id,
        inspection_uid: v.inspection_uid || crypto.randomUUID(),
      };
      const result = await submitInspection(canonical, selectedCondo.id, selectedUnit.id);
      await db.vistorias.put({ ...canonical, portal_inspection_id: result.id,
        portal_status: result.status, portal_synced_at: new Date().toISOString() });
      setReceipt(`Recebido no portal: ${result.id}. Estado: ${result.status}.`);
      await onSynced();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no envio. A vistoria continua salva no aparelho.');
    } finally { setBusy(false); }
  }

  if (!user || !portalConfigured()) return null;
  return <div style={{ marginTop: '0.75rem' }}>
    {v.portal_inspection_id && <p style={{ fontSize: '0.8rem' }}>Portal: {v.portal_status} · Recibo {v.portal_inspection_id}</p>}
    {v.portal_status && v.portal_status !== 'returned' ? null : <>
    <button className="secondary" onClick={() => { setOpen(!open); setError(''); }}>
      {v.portal_status === 'returned' ? 'Corrigir vínculo e reenviar auditoria' : 'Vincular e enviar ao Portal Ecowave'}
    </button>
    {open && <div className="card" style={{ marginTop: '0.75rem' }}>
      <p>Confira o condomínio, bloco e unidade do portal antes do envio.</p>
      <div className="form-group"><label>Condomínio do portal</label>
        <select value={condoId} onChange={e => { setCondoId(e.target.value); setBlock(''); setUnitId(''); setConfirmed(false); }}>
          <option value="">Selecione</option>{condos.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select></div>
      <div className="grid-2">
        <div className="form-group"><label>Bloco</label><select value={block} onChange={e => { setBlock(e.target.value); setUnitId(''); setConfirmed(false); }}>
          <option value="">Selecione</option>{blocks.map(b => <option key={b} value={b}>{b}</option>)}
        </select></div>
        <div className="form-group"><label>Unidade</label><select value={unitId} onChange={e => { setUnitId(e.target.value); setConfirmed(false); }}>
          <option value="">Selecione</option>{units.filter(u => u.block === block).map(u => <option key={u.id} value={u.id}>{u.unit_number}</option>)}
        </select></div>
      </div>
      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
        <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} style={{ width: 'auto' }} />
        Confirmei o vínculo. O PDF e os dados da vistoria serão enviados à unidade selecionada.
      </label>
      <button disabled={busy || !unitId || !confirmed} onClick={() => void send()} style={{ marginTop: '0.75rem' }}>
        {busy ? 'Enviando...' : 'Enviar e obter recibo'}
      </button>
      {error && <p role="alert" style={{ color: 'var(--error)' }}>{error}</p>}
      {receipt && <p role="status">{receipt}</p>}
    </div>}
    </>}
  </div>;
}
