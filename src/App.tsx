import { useState, useEffect } from 'react';
import Header from './components/Header';
import CameraInput from './components/CameraInput';
import SignatureInput from './components/SignatureInput';
import { db } from './db/database';
import type { Vistoria, TesteLeitura } from './db/database';
import { 
  Plus, 
  ChevronRight, 
  ChevronLeft, 
  FileText, 
  Save,
  MessageSquare, 
  ArrowLeft,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { generatePDF } from './utils/pdfGenerator';
import { format } from 'date-fns';

export const TIPOS_VISTORIA = [
  'Alto Consumo',
  'Geral',
  'Troca de Equipamento',
  'Vazamento'
] as const;

export const SISTEMAS_UTILIDADE = [
  'AF',
  'AQ',
  'Gás',
  'AF e AQ',
  'AF e Gás',
  'AQ e Gás',
  'AF, AQ e Gás'
] as const;

export const TIPOS_TROCA = [
  'Troca de Medidor',
  'Troca de Transmissor',
  'Troca Completa'
] as const;

export const isTipoAF = (v: Partial<Vistoria>) => {
  const subtipo = v.subtipo_vistoria;
  if (!subtipo) {
    return v.tipo_vistoria === 'agua' || v.tipo_vistoria === 'agua_gas' || v.tipo_vistoria === 'ponto_consumo' || !v.tipo_vistoria;
  }
  return subtipo.includes('AF') || subtipo.includes('Água');
};

export const isTipoAQ = (v: Partial<Vistoria>) => {
  const subtipo = v.subtipo_vistoria;
  return subtipo ? subtipo.includes('AQ') : false;
};

export const isTipoGas = (v: Partial<Vistoria>) => {
  const subtipo = v.subtipo_vistoria;
  if (!subtipo) {
    return v.tipo_vistoria === 'gas' || v.tipo_vistoria === 'agua_gas';
  }
  return subtipo.includes('Gás') || subtipo.includes('gas');
};

export const isTipoAgua = (v: Partial<Vistoria>) => {
  return isTipoAF(v) || isTipoAQ(v);
};

const INITIAL_VISTORIA: Partial<Vistoria> = {
  data: format(new Date(), 'yyyy-MM-dd'),
  hora: format(new Date(), 'HH:mm'),
  tipo_vistoria: 'Alto Consumo',
  subtipo_vistoria: 'AF',
  testes: [
    { leitura_antes: '', leitura_depois: '', diferenca: 0, litros_recipiente: '', imagens: {} },
    { leitura_antes: '', leitura_depois: '', diferenca: 0, litros_recipiente: '', imagens: {} }
  ],
  dados_gerais: { 
    sistema_aquecimento: false, 
    relogio_parado_verificado: false, 
    verificacoes_internas: [] 
  },
  parecer_tecnico: ''
};

import logoImg from './assets/logo.png';

export default function App() {
  const [step, setStep] = useState(0);
  const [vistoria, setVistoria] = useState<Partial<Vistoria>>(INITIAL_VISTORIA);
  const [vistoriasSalvas, setVistoriasSalvas] = useState<Vistoria[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const all = await db.vistorias.reverse().toArray();
    setVistoriasSalvas(all);
  };

  const handleUpdate = (field: keyof Vistoria | string, value: any) => {
    setVistoria(prev => {
      const keys = field.split('.');
      if (keys.length > 1) {
        const root = keys[0] as keyof Vistoria;
        return {
          ...prev,
          [root]: { ...(prev[root] as any), [keys[1]]: value }
        };
      }
      return { ...prev, [field]: value };
    });
  };

  const updateTeste = (index: number, field: keyof TesteLeitura | string, value: any) => {
    const novosTestes = [...(vistoria.testes || [])];
    const teste = { ...novosTestes[index] };

    if (field.startsWith('imagens.')) {
      const imgKey = field.split('.')[1];
      teste.imagens = { ...teste.imagens, [imgKey]: value };
    } else {
      (teste as any)[field] = value;
    }

    // Lógica de cálculo automática
    if (field === 'leitura_antes' || field === 'leitura_depois') {
      const antes = parseFloat(teste.leitura_antes.replace(',', '.'));
      const depois = parseFloat(teste.leitura_depois.replace(',', '.'));
      if (!isNaN(antes) && !isNaN(depois)) {
        teste.diferenca = parseFloat((depois - antes).toFixed(3));
      }
    }

    novosTestes[index] = teste;

    // Lógica de continuidade
    if (index < novosTestes.length - 1 && field === 'leitura_depois') {
      novosTestes[index + 1].leitura_antes = value;
    }

    setVistoria({ ...vistoria, testes: novosTestes });
  };

  const addTeste = () => {
    const ultimoTeste = vistoria.testes?.[vistoria.testes.length - 1];
    setVistoria({
      ...vistoria,
      testes: [
        ...(vistoria.testes || []),
        { 
          leitura_antes: ultimoTeste?.leitura_depois || '', 
          leitura_depois: '', 
          diferenca: 0, 
          litros_recipiente: '', 
          imagens: {} 
        }
      ]
    });
  };

  const saveVistoria = async () => {
    try {
      const dataToSave = {
        ...vistoria,
        createdAt: Date.now()
      } as Vistoria;
      
      // Usamos .put para evitar erros de duplicidade
      const id = await db.vistorias.put(dataToSave);
      alert('Vistoria salva localmente com sucesso!');
      setVistoria({ ...INITIAL_VISTORIA, id });
      setStep(0);
      loadHistory();
    } catch (err: any) {
      console.error('Erro detalhado ao salvar:', err);
      // Exibe o erro real para sabermos se é falta de espaço ou outro problema
      alert(`Erro ao salvar vistoria: ${err.message || 'Erro desconhecido'}`);
    }
  };

  const syncToCloud = async (fileName: string, base64: string, mimeType: string) => {
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx65pLFtsRfnbdhtkX_oLYtt3HGEgM41zUo7c-k3Fs25RCKcn2qgeoT28FsXAdn8nOf/exec';
    try {
      // Usamos fetch para enviar os dados para o seu script recepcionista
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Necessário para Google Apps Script
        body: JSON.stringify({
          fileName,
          base64: base64.includes(',') ? base64.split(',')[1] : base64,
          mimeType
        })
      });
      return true;
    } catch (err) {
      console.error('Erro no backup cloud:', err);
      return false;
    }
  };

  const handleGenerateAndSharePDF = async (v: Vistoria) => {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');

      // 1. Gerar e Salvar PDF
      const base64Data = await generatePDF(v, logoImg);
      const safeCondoName = (v.condominio || 'Vistoria').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const pdfFileName = `Relatorio_${safeCondoName}_${v.unidade || 'Unidade'}.pdf`;

      let pdfFileUri = '';
      try {
        const savedPdf = await Filesystem.writeFile({
          path: pdfFileName,
          data: base64Data,
          directory: Directory.Cache
        });
        pdfFileUri = savedPdf.uri;
      } catch (fsErr) {
        console.warn('Erro ao gravar no Directory.Cache:', fsErr);
      }

      // Inicia backup do PDF em background
      try {
        syncToCloud(pdfFileName, base64Data, 'application/pdf');
      } catch (e) {}

      // Backup dos vídeos de prova em background (se existirem)
      if (v.dados_gerais?.video_relogio_parado) {
        syncToCloud(`Video_Estanqueidade_${v.unidade || 'Unidade'}.mp4`, v.dados_gerais.video_relogio_parado, 'video/mp4');
      }

      // 2. Compartilhar via Share nativo do Android
      if (pdfFileUri) {
        try {
          await Share.share({
            title: `Laudo Técnico Ecowave - ${v.condominio || ''}`,
            text: `Relatório Técnico de Vistoria: ${v.condominio || ''} - Bloco ${v.bloco || ''} Unidade ${v.unidade || ''}`,
            files: [pdfFileUri],
            dialogTitle: 'Enviar Laudo Técnico (PDF)'
          });
          return;
        } catch (shareErr: any) {
          if (shareErr?.message?.includes('cancel') || shareErr?.message?.includes('closed') || shareErr?.message?.includes('dismiss')) {
            return;
          }
          console.warn('Share nativo falhou, aplicando download...', shareErr);
        }
      }

      // Fallback: Download direto do PDF no navegador / WebView
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = pdfFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);

    } catch (err: any) {
      console.error('Erro ao compartilhar vistoria:', err);
      alert(`Erro ao processar PDF: ${err?.message || 'Verifique as informações preenchidas.'}`);
    }
  };

  const handleShareWhatsAppInfo = (v: Vistoria) => {
    const numbers = ['5511969162622', '5511988917611'];
    const tipoCompleto = `${v.tipo_vistoria || ''}${v.subtipo_vistoria ? ` - ${v.subtipo_vistoria}` : ''}`;
    const text = `*Vistoria Ecowave*\n\n*Condomínio:* ${v.condominio}\n*Bloco:* ${v.bloco} | *Unidade:* ${v.unidade}\n*Tipo:* ${tipoCompleto}\n*Técnico:* ${v.tecnico}\n*Data:* ${v.data}\n\n_Relatório completo enviado em anexo._`;
    const url = `https://wa.me/${numbers[0]}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (showHistory) {
    return (
      <div className="fade-in">
        <Header />
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <button onClick={() => setShowHistory(false)} className="secondary" style={{ width: 'auto' }}>
            <ArrowLeft size={18} />
          </button>
          <h2 style={{ margin: 0 }}>Histórico</h2>
        </div>
        
        {vistoriasSalvas.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Nenhuma vistoria salva.</p>
        ) : (
          vistoriasSalvas.map(v => (
            <div key={v.id} className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Condomínio
                  </div>
                  <h3 style={{ marginBottom: '0.75rem', fontSize: '1.25rem' }}>{v.condominio}</h3>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>BLOCO</div>
                      <div style={{ fontWeight: '600' }}>{v.bloco}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>UNIDADE</div>
                      <div style={{ fontWeight: '600' }}>{v.unidade}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>DATA</div>
                      <div style={{ fontWeight: '600' }}>{v.data}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>TIPO</div>
                      <div style={{ fontWeight: '600', color: 'var(--primary)' }}>
                        {v.tipo_vistoria}{v.subtipo_vistoria ? ` (${v.subtipo_vistoria})` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid-2" style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button onClick={() => handleGenerateAndSharePDF(v)} style={{ backgroundColor: 'var(--primary)' }}>
                  <FileText size={16} /> Enviar PDF
                </button>
                <button onClick={() => handleShareWhatsAppInfo(v)} className="secondary outline">
                  <MessageSquare size={16} /> Info Zap
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="fade-in">
      <Header />
      
      {step === 0 && (
        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <div className="card">
            <h2>Dados Iniciais</h2>
            <div className="grid-2">
              <div className="form-group">
                <label>Data (Automática)</label>
                <input type="date" value={vistoria.data} disabled style={{ opacity: 0.7 }} />
              </div>
              <div className="form-group">
                <label>Hora (Automática)</label>
                <input type="time" value={vistoria.hora} disabled style={{ opacity: 0.7 }} />
              </div>
            </div>
            <div className="form-group">
              <label>Condomínio</label>
              <input type="text" placeholder="Nome do Condomínio" value={vistoria.condominio} onChange={e => handleUpdate('condominio', e.target.value)} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>Bloco</label>
                <input type="text" placeholder="Ex: A" value={vistoria.bloco} onChange={e => handleUpdate('bloco', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Unidade</label>
                <input type="text" placeholder="Ex: 132" value={vistoria.unidade} onChange={e => handleUpdate('unidade', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>Técnico Responsável</label>
              <input type="text" placeholder="Nome do Técnico" value={vistoria.tecnico} onChange={e => handleUpdate('tecnico', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Responsável Unidade</label>
              <input type="text" placeholder="Nome do Morador/Responsável" value={vistoria.responsavel_unidade} onChange={e => handleUpdate('responsavel_unidade', e.target.value)} />
            </div>
            
            {vistoria.tipo_vistoria === 'Troca de Equipamento' ? (
              <>
                <div className="form-group">
                  <label>Tipo de Vistoria</label>
                  <select 
                    value={vistoria.tipo_vistoria} 
                    onChange={e => {
                      const novoTipo = e.target.value;
                      setVistoria(prev => ({
                        ...prev,
                        tipo_vistoria: novoTipo,
                        subtipo_vistoria: novoTipo === 'Troca de Equipamento' ? 'Troca de Medidor - AF' : 'AF'
                      }));
                    }}
                  >
                    {TIPOS_VISTORIA.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label>Equipamento a Trocar</label>
                    <select 
                      value={vistoria.subtipo_vistoria?.split(' - ')?.[0] || 'Troca de Medidor'} 
                      onChange={e => {
                        const equip = e.target.value;
                        const sistema = vistoria.subtipo_vistoria?.split(' - ')?.[1] || 'AF';
                        handleUpdate('subtipo_vistoria', `${equip} - ${sistema}`);
                      }}
                    >
                      {TIPOS_TROCA.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Sistema / Fluido</label>
                    <select 
                      value={vistoria.subtipo_vistoria?.split(' - ')?.[1] || 'AF'} 
                      onChange={e => {
                        const equip = vistoria.subtipo_vistoria?.split(' - ')?.[0] || 'Troca de Medidor';
                        const sistema = e.target.value;
                        handleUpdate('subtipo_vistoria', `${equip} - ${sistema}`);
                      }}
                    >
                      {SISTEMAS_UTILIDADE.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid-2">
                <div className="form-group">
                  <label>Tipo de Vistoria</label>
                  <select 
                    value={vistoria.tipo_vistoria || 'Alto Consumo'} 
                    onChange={e => {
                      const novoTipo = e.target.value;
                      setVistoria(prev => ({
                        ...prev,
                        tipo_vistoria: novoTipo,
                        subtipo_vistoria: novoTipo === 'Troca de Equipamento' ? 'Troca de Medidor - AF' : 'AF'
                      }));
                    }}
                  >
                    {TIPOS_VISTORIA.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Sistema (Sub-seleção)</label>
                  <select 
                    value={vistoria.subtipo_vistoria || 'AF'} 
                    onChange={e => handleUpdate('subtipo_vistoria', e.target.value)}
                  >
                    {SISTEMAS_UTILIDADE.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <button onClick={() => {
              // Atualiza data/hora no momento exato do início
              handleUpdate('data', format(new Date(), 'yyyy-MM-dd'));
              handleUpdate('hora', format(new Date(), 'HH:mm'));
              setStep(1);
            }}>
              Iniciar Vistoria <ChevronRight size={18} />
            </button>
            <button onClick={() => setShowHistory(true)} className="secondary" style={{ marginTop: '0.75rem' }}>
              Ver Histórico
            </button>
          </div>
        </motion.div>
      )}

      {step === 1 && (
        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <div className="card">
            <h2>Testes de Leitura</h2>
            <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '0.5rem', marginBottom: '1.5rem' }}>
              {vistoria.testes?.map((teste, idx) => (
                <div key={idx} style={{ 
                  borderBottom: idx < (vistoria.testes?.length || 0) - 1 ? '1px solid var(--border)' : 'none',
                  paddingBottom: '1.5rem',
                  marginBottom: '1.5rem'
                }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                    <CheckCircle2 size={18} /> Teste #{idx + 1}
                  </h3>
                  
                  <div className="grid-2">
                    <div className="form-group">
                      <label>Leitura Antes</label>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        disabled={idx > 0} 
                        placeholder="0000,000"
                        value={teste.leitura_antes} 
                        onChange={e => updateTeste(idx, 'leitura_antes', e.target.value)} 
                      />
                    </div>
                    <div className="form-group">
                      <label>Leitura Depois</label>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        placeholder="0000,000"
                        value={teste.leitura_depois} 
                        onChange={e => updateTeste(idx, 'leitura_depois', e.target.value)} 
                      />
                    </div>
                  </div>

                  <div className="grid-2" style={{ marginBottom: '1rem' }}>
                    <div style={{ backgroundColor: 'var(--background)', padding: '0.75rem', borderRadius: '8px' }}>
                      <label style={{ margin: 0 }}>Diferença</label>
                      <div style={{ 
                        fontSize: '1.25rem', 
                        fontWeight: 'bold', 
                        color: teste.diferenca < 0 ? 'var(--error)' : 'var(--success)' 
                      }}>
                        {teste.diferenca.toFixed(3).replace('.', ',')}
                      </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Litros Recipiente</label>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        placeholder="Ex: 5,0"
                        value={teste.litros_recipiente} 
                        onChange={e => updateTeste(idx, 'litros_recipiente', e.target.value)} 
                        style={{ marginBottom: 0 }}
                      />
                    </div>
                  </div>

                  {teste.diferenca < 0 && (
                    <div style={{ color: 'var(--error)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '1rem' }}>
                      <AlertTriangle size={14} /> Erro: Leitura final menor que a inicial.
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <CameraInput label="Foto Antes" onPhotoTaken={(b64) => updateTeste(idx, 'imagens.antes', b64)} initialValue={teste.imagens.antes} />
                    <CameraInput label="Foto Depois" onPhotoTaken={(b64) => updateTeste(idx, 'imagens.depois', b64)} initialValue={teste.imagens.depois} />
                  </div>
                  <CameraInput label="Foto Recipiente" onPhotoTaken={(b64) => updateTeste(idx, 'imagens.recipiente', b64)} initialValue={teste.imagens.recipiente} />
                </div>
              ))}
              
              <button onClick={addTeste} className="secondary outline" style={{ borderStyle: 'dashed' }}>
                <Plus size={18} /> Adicionar Mais Testes
              </button>
            </div>

            <div className="grid-2">
              <button onClick={() => setStep(0)} className="secondary"><ChevronLeft size={18} /> Voltar</button>
              <button onClick={() => setStep(vistoria.tipo_vistoria === 'ponto_consumo' ? 2 : 3)}>Avançar <ChevronRight size={18} /></button>
            </div>
          </div>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <div className="card">
            <h2>Ponto de Consumo</h2>
            <div className="form-group">
              <label>Nome do Ponto</label>
              <input 
                type="text" 
                placeholder="Ex: Chuveiro Suíte" 
                value={vistoria.ponto_consumo?.nome_ponto} 
                onChange={e => handleUpdate('ponto_consumo.nome_ponto', e.target.value)} 
              />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>Tempo (Segundos)</label>
                <input 
                  type="number" 
                  inputMode="numeric"
                  value={vistoria.ponto_consumo?.tempo_segundos} 
                  onChange={e => {
                    const val = e.target.value;
                    const litros = parseFloat(vistoria.ponto_consumo?.litros_medidos || '0');
                    const segs = parseFloat(val);
                    const calc = segs > 0 ? (litros / segs) * 60 : 0;
                    handleUpdate('ponto_consumo', { ...vistoria.ponto_consumo, tempo_segundos: val, resultado_calculado: parseFloat(calc.toFixed(2)) });
                  }} 
                />
              </div>
              <div className="form-group">
                <label>Litros Medidos</label>
                <input 
                  type="text" 
                  inputMode="decimal"
                  value={vistoria.ponto_consumo?.litros_medidos} 
                  onChange={e => {
                    const val = e.target.value.replace(',', '.');
                    const segs = parseFloat(vistoria.ponto_consumo?.tempo_segundos || '0');
                    const litros = parseFloat(val);
                    const calc = segs > 0 ? (litros / segs) * 60 : 0;
                    handleUpdate('ponto_consumo', { ...vistoria.ponto_consumo, litros_medidos: val, resultado_calculado: parseFloat(calc.toFixed(2)) });
                  }} 
                />
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--background)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', textAlign: 'center' }}>
              <label>Consumo Estimado</label>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                {vistoria.ponto_consumo?.resultado_calculado || 0} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>L/min</span>
              </div>
            </div>

            <CameraInput 
              label="Foto do Recipiente / Ponto" 
              onPhotoTaken={(b) => handleUpdate('ponto_consumo.imagem_recipiente', b)} 
              initialValue={vistoria.ponto_consumo?.imagem_recipiente}
            />

            <div className="form-group">
              <label>Marca Ducha/Torneira (Opcional)</label>
              <input 
                type="text" 
                placeholder="Ex: Deca / Lorenzetti" 
                value={vistoria.ponto_consumo?.marca_ducha_ou_torneira} 
                onChange={e => handleUpdate('ponto_consumo.marca_ducha_ou_torneira', e.target.value)} 
              />
            </div>

            <div className="grid-2">
              <button onClick={() => setStep(1)} className="secondary"><ChevronLeft size={18} /> Voltar</button>
              <button onClick={() => setStep(3)}>Avançar <ChevronRight size={18} /></button>
            </div>
          </div>
        </motion.div>
      )}

      {step === 3 && (
        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <div className="card">
            <h2>Verificações Internas (Checklist)</h2>
            
            {isTipoAgua(vistoria) ? (
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Marque o status de cada item inspecionado e anexe foto/vídeo caso seja detectado algum vazamento.
                </p>
                {['Vaso Sanitário', 'Torneira Cozinha', 'Torneira Banheiro', 'Chuveiro', 'Área de Serviço'].map((item, idx) => (
                  <div key={idx} style={{ backgroundColor: 'var(--surface)', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.75rem', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: '600' }}>{item}</span>
                      <select 
                        style={{ width: '130px', marginBottom: 0, padding: '6px', borderRadius: '6px' }}
                        value={vistoria.dados_gerais?.verificacoes_internas?.[idx]?.status || 'ok'}
                        onChange={(e) => {
                          const current = vistoria.dados_gerais?.verificacoes_internas || [];
                          const update = [...current];
                          update[idx] = { ...update[idx], item, status: e.target.value as any };
                          handleUpdate('dados_gerais.verificacoes_internas', update);
                        }}
                      >
                        <option value="ok">✅ OK</option>
                        <option value="vazamento">❌ Vazamento</option>
                      </select>
                    </div>
                    
                    {vistoria.dados_gerais?.verificacoes_internas?.[idx]?.status === 'vazamento' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }} className="fade-in">
                        <CameraInput 
                          label="Foto do Vazamento" 
                          onPhotoTaken={(b) => {
                            const current = vistoria.dados_gerais?.verificacoes_internas || [];
                            const update = [...current];
                            update[idx] = { ...update[idx], item, imagem: b };
                            handleUpdate('dados_gerais.verificacoes_internas', update);
                          }} 
                          initialValue={vistoria.dados_gerais?.verificacoes_internas?.[idx]?.imagem}
                        />
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Vídeo de Prova</label>
                          <input 
                            type="file" 
                            accept="video/*" 
                            capture="environment"
                            style={{ padding: '8px', fontSize: '0.75rem', height: 'auto', backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  const current = vistoria.dados_gerais?.verificacoes_internas || [];
                                  const update = [...current];
                                  update[idx] = { ...update[idx], item, video: reader.result as string };
                                  handleUpdate('dados_gerais.verificacoes_internas', update);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          {vistoria.dados_gerais?.verificacoes_internas?.[idx]?.video && (
                            <div style={{ color: 'var(--success)', fontSize: '0.75rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={12} /> Vídeo Anexado
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={40} style={{ color: 'var(--success)', marginBottom: '1rem', opacity: 0.5 }} />
                <p>O checklist de vazamentos internos só se aplica para vistorias do tipo <strong>Água</strong>.</p>
              </div>
            )}

            <div className="grid-2" style={{ marginTop: '1.5rem' }}>
              <button onClick={() => setStep(vistoria.tipo_vistoria === 'ponto_consumo' ? 2 : 1)} className="secondary">
                <ChevronLeft size={18} /> Voltar
              </button>
              <button onClick={() => setStep(4)}>
                Avançar <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {step === 4 && (
        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <div className="card">
            <h2>Medidores & Sistemas</h2>
            
            {/* Medidor de AF (Água Fria) */}
            {isTipoAF(vistoria) && (
              <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '1rem' }}>Medidor de AF (Água Fria)</h3>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Estado Geral AF</label>
                    <select 
                      value={vistoria.dados_gerais?.estado_medidor_agua || ''} 
                      onChange={e => handleUpdate('dados_gerais.estado_medidor_agua', e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      <option value="otimo">Ótimo</option>
                      <option value="bom">Bom</option>
                      <option value="regular">Regular</option>
                      <option value="ruim">Ruim</option>
                      <option value="critico">Crítico</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Nº Série AF (Opcional)</label>
                    <input 
                      type="text" 
                      placeholder="Ex: H12345"
                      value={vistoria.dados_gerais?.serial_medidor_agua || ''} 
                      onChange={e => handleUpdate('dados_gerais.serial_medidor_agua', e.target.value)} 
                    />
                  </div>
                </div>
                <div className="grid-2">
                  <CameraInput 
                    label="Foto Medidor AF" 
                    onPhotoTaken={b => handleUpdate('dados_gerais.imagem_medidor_agua', b)} 
                    initialValue={vistoria.dados_gerais?.imagem_medidor_agua}
                  />
                  <CameraInput 
                    label="Foto Serial AF" 
                    onPhotoTaken={b => handleUpdate('dados_gerais.imagem_serial_agua', b)} 
                    initialValue={vistoria.dados_gerais?.imagem_serial_agua}
                  />
                </div>

                {/* Teste de Estanqueidade */}
                <div style={{ backgroundColor: 'var(--background)', padding: '1rem', borderRadius: '12px', marginTop: '1rem', border: '1px solid var(--border)' }}>
                  <h4 style={{ fontSize: '0.9rem', margin: '0 0 0.75rem 0' }}>Teste de Estanqueidade (Relógio Parado AF)</h4>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input 
                      type="checkbox" 
                      id="relogio_parado_chk"
                      style={{ width: 'auto', marginBottom: 0 }} 
                      checked={vistoria.dados_gerais?.relogio_parado_verificado || false}
                      onChange={e => handleUpdate('dados_gerais.relogio_parado_verificado', e.target.checked)}
                    />
                    <label htmlFor="relogio_parado_chk" style={{ marginBottom: 0, fontWeight: '500' }}>Confirmo que o medidor está parado</label>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Vídeo de Prova (Máx 10s)</label>
                    <input 
                      type="file" 
                      accept="video/*" 
                      capture="environment"
                      style={{ padding: '8px', fontSize: '0.8rem', height: 'auto', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => handleUpdate('dados_gerais.video_relogio_parado', reader.result);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    {vistoria.dados_gerais?.video_relogio_parado && (
                      <div style={{ color: 'var(--success)', fontSize: '0.75rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={12} /> Vídeo de Estanqueidade Anexado
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Medidor de AQ (Água Quente) */}
            {isTipoAQ(vistoria) && (
              <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '1rem' }}>Medidor de AQ (Água Quente)</h3>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Estado Geral AQ</label>
                    <select 
                      value={vistoria.dados_gerais?.estado_medidor_aq || ''} 
                      onChange={e => handleUpdate('dados_gerais.estado_medidor_aq', e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      <option value="otimo">Ótimo</option>
                      <option value="bom">Bom</option>
                      <option value="regular">Regular</option>
                      <option value="ruim">Ruim</option>
                      <option value="critico">Crítico</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Nº Série AQ (Opcional)</label>
                    <input 
                      type="text" 
                      placeholder="Ex: AQ12345"
                      value={vistoria.dados_gerais?.serial_medidor_aq || ''} 
                      onChange={e => handleUpdate('dados_gerais.serial_medidor_aq', e.target.value)} 
                    />
                  </div>
                </div>
                <div className="grid-2">
                  <CameraInput 
                    label="Foto Medidor AQ" 
                    onPhotoTaken={b => handleUpdate('dados_gerais.imagem_medidor_aq', b)} 
                    initialValue={vistoria.dados_gerais?.imagem_medidor_aq}
                  />
                  <CameraInput 
                    label="Foto Serial AQ" 
                    onPhotoTaken={b => handleUpdate('dados_gerais.imagem_serial_aq', b)} 
                    initialValue={vistoria.dados_gerais?.imagem_serial_aq}
                  />
                </div>
              </div>
            )}

            {/* Medidor de Gás */}
            {isTipoGas(vistoria) && (
              <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '1rem' }}>Medidor de Gás</h3>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Estado Geral Gás</label>
                    <select 
                      value={vistoria.dados_gerais?.estado_medidor_gas || ''}
                      onChange={e => handleUpdate('dados_gerais.estado_medidor_gas', e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      <option value="otimo">Ótimo</option>
                      <option value="bom">Bom</option>
                      <option value="regular">Regular</option>
                      <option value="ruim">Ruim</option>
                      <option value="critico">Crítico</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Nº Série Gás (Opcional)</label>
                    <input 
                      type="text" 
                      placeholder="Ex: G12345"
                      value={vistoria.dados_gerais?.serial_medidor_gas || ''} 
                      onChange={e => handleUpdate('dados_gerais.serial_medidor_gas', e.target.value)} 
                    />
                  </div>
                </div>
                <div className="grid-2">
                  <CameraInput 
                    label="Foto Medidor (Gás)" 
                    onPhotoTaken={b => handleUpdate('dados_gerais.imagem_medidor_gas', b)} 
                    initialValue={vistoria.dados_gerais?.imagem_medidor_gas}
                  />
                  <CameraInput 
                    label="Foto Serial Gás" 
                    onPhotoTaken={b => handleUpdate('dados_gerais.imagem_serial_gas', b)} 
                    initialValue={vistoria.dados_gerais?.imagem_serial_gas}
                  />
                </div>
              </div>
            )}

            {/* Sistema de Aquecimento */}
            {(isTipoAQ(vistoria) || isTipoGas(vistoria) || vistoria.dados_gerais?.sistema_aquecimento) && (
              <div style={{ marginBottom: '1rem' }}>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <input 
                    type="checkbox" 
                    id="sistema_aquecimento_chk"
                    style={{ width: 'auto', marginBottom: 0 }} 
                    checked={vistoria.dados_gerais?.sistema_aquecimento || false}
                    onChange={e => handleUpdate('dados_gerais.sistema_aquecimento', e.target.checked)}
                  />
                  <label htmlFor="sistema_aquecimento_chk" style={{ marginBottom: 0, fontWeight: '500' }}>Possui Sistema de Aquecimento?</label>
                </div>

                {vistoria.dados_gerais?.sistema_aquecimento && (
                  <div className="fade-in" style={{ backgroundColor: 'var(--background)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div className="form-group">
                      <label>Tipo de Aquecimento</label>
                      <select 
                        value={vistoria.dados_gerais.tipo_aquecimento || 'aquecedor'} 
                        onChange={e => handleUpdate('dados_gerais.tipo_aquecimento', e.target.value)}
                      >
                        <option value="aquecedor">Aquecedor de Passagem</option>
                        <option value="boiler">Boiler</option>
                        <option value="caldeira">Caldeira</option>
                      </select>
                    </div>
                    
                    {vistoria.dados_gerais.tipo_aquecimento === 'aquecedor' && (
                      <div className="form-group">
                        <label>Última Manutenção (Mês/Ano)</label>
                        <input 
                          type="text" 
                          placeholder="Ex: 10/2023" 
                          value={vistoria.dados_gerais.ultima_manutencao_aquecedor || ''} 
                          onChange={e => handleUpdate('dados_gerais.ultima_manutencao_aquecedor', e.target.value)} 
                        />
                        <CameraInput 
                          label="Foto da Placa/Manutenção" 
                          onPhotoTaken={b => handleUpdate('dados_gerais.imagem_manutencao', b)} 
                          initialValue={vistoria.dados_gerais.imagem_manutencao}
                        />
                      </div>
                    )}
                    <CameraInput 
                      label="Foto do Equipamento" 
                      onPhotoTaken={b => handleUpdate('dados_gerais.imagem_aquecimento', b)} 
                      initialValue={vistoria.dados_gerais.imagem_aquecimento}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="grid-2" style={{ marginTop: '1.5rem' }}>
              <button onClick={() => setStep(3)} className="secondary">
                <ChevronLeft size={18} /> Voltar
              </button>
              <button onClick={() => setStep(5)}>
                Avançar <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {step === 5 && (
        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <div className="card">
            <h2>Parecer & Assinatura</h2>
            
            <div className="grid-2">
              <div className="form-group">
                <label>Temp. Água Quente (Opcional)</label>
                <input 
                  type="number" 
                  placeholder="Ex: 42" 
                  value={vistoria.dados_gerais?.temperatura_agua_quente || ''}
                  onChange={e => handleUpdate('dados_gerais.temperatura_agua_quente', e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label>Pressão MCA (Opcional)</label>
                <input 
                  type="number" 
                  placeholder="Ex: 5" 
                  value={vistoria.dados_gerais?.pressao_agua || ''}
                  onChange={e => handleUpdate('dados_gerais.pressao_agua', e.target.value)} 
                />
              </div>
            </div>

            <div className="form-group">
              <label>Parecer Técnico Final (Obrigatório)</label>
              <textarea 
                rows={5} 
                placeholder="Descreva detalhadamente as condições observadas e recomendações técnicas..."
                value={vistoria.parecer_tecnico || ''}
                onChange={e => handleUpdate('parecer_tecnico', e.target.value)}
              />
            </div>

            {/* 1. Assinatura do Morador / Cliente */}
            <SignatureInput 
              label={`Assinatura do Morador / Cliente (${vistoria.responsavel_unidade || 'Responsável'})`}
              helperText="O morador ou responsável pela unidade deve assinar abaixo para comprovar a presença e o recebimento da vistoria."
              onSave={b => {
                handleUpdate('assinatura_cliente', b);
                handleUpdate('assinatura', b); // Mantém retrocompatibilidade
              }} 
              initialValue={vistoria.assinatura_cliente || vistoria.assinatura}
            />

            {/* 2. Assinatura do Técnico Ecowave */}
            <SignatureInput 
              label={`Assinatura do Técnico (${vistoria.tecnico || 'Técnico Ecowave'})`}
              helperText="Assinatura técnica do profissional responsável pela execução da vistoria."
              onSave={b => handleUpdate('assinatura_tecnico', b)} 
              initialValue={vistoria.assinatura_tecnico}
            />

            <div className="grid-2" style={{ marginTop: '2rem' }}>
              <button onClick={() => setStep(4)} className="secondary">
                <ChevronLeft size={18} /> Voltar
              </button>
              <button 
                onClick={saveVistoria} 
                style={{ backgroundColor: 'var(--success)' }} 
                disabled={!vistoria.parecer_tecnico}
              >
                <Save size={18} /> Finalizar Vistoria
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
