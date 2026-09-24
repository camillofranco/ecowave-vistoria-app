import CameraInput from './CameraInput';
import type { Auditoria, AuditItem } from '../db/database';

export const AUDIT_CRITERIA = [
  ['identificacao', 'Identificação e correspondência entre unidade, medidores e números de série'],
  ['integridade', 'Integridade física, lacres e acesso aos medidores'],
  ['leituras', 'Coerência entre leituras, período analisado e histórico de consumo'],
  ['telemetria', 'Coerência entre leitura local e dados enviados pelo sistema'],
  ['vazamentos', 'Indícios de vazamento e perdas nos pontos inspecionados'],
  ['agua', 'Condições de uso eficiente da água observáveis na unidade'],
  ['gas', 'Condições observáveis da instalação e do consumo de gás'],
  ['documentos', 'Rastreabilidade de fotos, testes, documentos e informações recebidas'],
] as const;

export const initialAudit = (): Auditoria => ({
  objetivo: '', escopo: '', metodo: '', periodo_analisado: '', documentos_analisados: '',
  limitacoes: '', conclusao: '',
  itens: AUDIT_CRITERIA.map(([id, criterio]) => ({ id, criterio, resultado: 'nao_verificado' }))
});

export const auditReadyForReview = (audit?: Auditoria): boolean => Boolean(
  audit?.objetivo.trim() && audit.escopo.trim() && audit.metodo.trim() &&
  audit.periodo_analisado.trim() && audit.documentos_analisados.trim() &&
  audit.limitacoes.trim() && audit.conclusao.trim() &&
  audit.itens.length > 0 && audit.itens.every(item =>
    item.resultado !== 'nao_verificado' &&
    Boolean(item.observacao?.trim() || item.evidencia) &&
    (item.resultado !== 'nao_conforme' ||
      Boolean(item.observacao?.trim() && item.criticidade && item.acao_corretiva?.trim()))
  )
);

type Props = { value: Auditoria; onChange: (audit: Auditoria) => void };

export default function AuditForm({ value, onChange }: Props) {
  const update = (field: keyof Auditoria, content: string) => onChange({ ...value, [field]: content });
  const updateItem = (index: number, patch: Partial<AuditItem>) => {
    const itens = value.itens.map((item, i) => i === index ? { ...item, ...patch } : item);
    onChange({ ...value, itens });
  };
  return <>
    <div className="card">
      <h2>Auditoria ambiental da medição</h2>
      <p>Registre o escopo, a análise e as evidências. A revisão profissional ocorre após a coleta.</p>
      <div className="form-group"><label>Objetivo da auditoria</label><textarea value={value.objetivo} onChange={e => update('objetivo', e.target.value)} placeholder="Ex.: verificar a rastreabilidade das leituras e possíveis perdas" /></div>
      <div className="form-group"><label>Escopo e limites da inspeção</label><textarea value={value.escopo} onChange={e => update('escopo', e.target.value)} placeholder="Ambientes, sistemas AF/AQ/Gás e acesso disponível" /></div>
      <div className="form-group"><label>Método e instrumentos utilizados</label><textarea value={value.metodo} onChange={e => update('metodo', e.target.value)} placeholder="Procedimentos executados, duração dos testes e instrumentos" /></div>
      <div className="form-group"><label>Período de consumo analisado</label><input value={value.periodo_analisado} onChange={e => update('periodo_analisado', e.target.value)} placeholder="Ex.: janeiro a março de 2026" /></div>
      <div className="form-group"><label>Documentos e dados examinados</label><textarea value={value.documentos_analisados} onChange={e => update('documentos_analisados', e.target.value)} placeholder="Faturas, histórico, fotos, leituras ou registros de manutenção" /></div>
      <div className="form-group"><label>Limitações e áreas sem acesso</label><textarea value={value.limitacoes} onChange={e => update('limitacoes', e.target.value)} /></div>
    </div>
    <div className="card">
      <h2>Critérios e evidências</h2>
      <p>Marque cada critério e registre a justificativa ou uma foto. Não conformidades exigem descrição, criticidade e ação proposta.</p>
      {value.itens.map((item, index) => <div key={item.id} className="audit-item">
        <h3>{index + 1}. {item.criterio}</h3>
        <div className="form-group"><label>Resultado</label><select value={item.resultado} onChange={e => updateItem(index, { resultado: e.target.value as AuditItem['resultado'] })}>
          <option value="nao_verificado">Não verificado</option><option value="conforme">Conforme</option><option value="nao_conforme">Não conforme</option><option value="nao_aplicavel">Não aplicável</option>
        </select></div>
        <div className="form-group"><label>Constatação / justificativa</label><textarea value={item.observacao || ''} onChange={e => updateItem(index, { observacao: e.target.value })} /></div>
        <CameraInput label="Foto de evidência" initialValue={item.evidencia} onPhotoTaken={image => updateItem(index, { evidencia: image })} />
        {item.resultado === 'nao_conforme' && <>
          <div className="form-group"><label>Criticidade</label><select value={item.criticidade || ''} onChange={e => updateItem(index, { criticidade: e.target.value as AuditItem['criticidade'] })}><option value="">Selecione</option><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select></div>
          <div className="form-group"><label>Ação corretiva recomendada</label><textarea value={item.acao_corretiva || ''} onChange={e => updateItem(index, { acao_corretiva: e.target.value })} /></div>
          <div className="grid-2"><div className="form-group"><label>Responsável pela ação</label><input value={item.responsavel_acao || ''} onChange={e => updateItem(index, { responsavel_acao: e.target.value })} /></div><div className="form-group"><label>Prazo recomendado</label><input type="date" value={item.prazo_acao || ''} onChange={e => updateItem(index, { prazo_acao: e.target.value })} /></div></div>
        </>}
      </div>)}
      <div className="form-group"><label>Conclusão fundamentada</label><textarea value={value.conclusao} onChange={e => update('conclusao', e.target.value)} placeholder="Sintetize achados, incertezas e encaminhamentos" /></div>
    </div>
    <div className="card"><h2>Revisão profissional</h2>
      <p>Após o envio, uma engenheira habilitada analisará as evidências no Portal Ecowave. A validação ficará registrada no portal e será exibida ao morador após a publicação.</p>
      <p><strong>Status:</strong> {auditReadyForReview(value) ? 'Pronta para revisão' : 'Coleta incompleta'}</p>
    </div>
  </>;
}
