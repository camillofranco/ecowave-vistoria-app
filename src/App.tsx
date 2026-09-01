import { useState, useEffect } from 'react';
import Header from './components/Header';
import CameraInput from './components/CameraInput';
import SignatureInput from './components/SignatureInput';
import StopwatchTimer from './components/StopwatchTimer';
import { db } from './db/database';
import type { 
  Vistoria, 
  TesteLeitura, 
  CaixaAcopladaItem, 
  AfericaoMedidorItem, 
  PontoConsumoItem,
  CategoriaPonto 
} from './db/database';
import { 
  Plus, 
  Trash2,
  ChevronRight, 
  ChevronLeft, 
  Save,
  MessageSquare, 
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Droplets,
  Gauge,
  Video,
  Eye,
  Share2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { generatePDF } from './utils/pdfGenerator';
import { format } from 'date-fns';
import logoImg from './assets/logo.png';

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

export const getQualificacaoVazao = (categoria: CategoriaPonto, vazao: number) => {
  if (vazao <= 0) return { label: 'Aguardando Medição', color: 'var(--text-muted)' };
  
  if (categoria === 'ducha_gas') {
    if (vazao <= 8.0) return { label: '🟢 Econômica (0 a 8 L/min)', color: 'var(--success)' };
    if (vazao <= 13.0) return { label: '🔵 Normal (9 a 13 L/min)', color: 'var(--primary)' };
    return { label: '🔴 Alto Consumo (> 13 L/min)', color: 'var(--error)' };
  } else {
    // Torneira, Chuveiro Elétrico e Ducha Higiênica
    if (vazao <= 5.0) return { label: '🟢 Econômico (0 a 5 L/min)', color: 'var(--success)' };
    if (vazao <= 7.0) return { label: '🔵 Normal (5 a 7 L/min)', color: 'var(--primary)' };
    return { label: '🔴 Alto Consumo (> 7 L/min)', color: 'var(--error)' };
  }
};

const DEFAULT_CAIXAS_ACOPLADAS: CaixaAcopladaItem[] = [
  { id: '1', local: 'Banheiro Social', status: 'ok' },
  { id: '2', local: 'Banheiro Suíte 1', status: 'ok' },
  { id: '3', local: 'Lavabo', status: 'nao_aplicavel' }
];

const DEFAULT_AFERICAO_AF: AfericaoMedidorItem = {
  tipo: 'AF',
  leitura_antes: '',
  leitura_depois: '',
  diferenca_m3: 0,
  volume_balde_litros: 10,
  litros_medidos_hidrometro: 0,
  desvio_percentual: 0,
  status: 'conforme'
};

const DEFAULT_AFERICAO_AQ: AfericaoMedidorItem = {
  tipo: 'AQ',
  leitura_antes: '',
  leitura_depois: '',
  diferenca_m3: 0,
  volume_balde_litros: 10,
  litros_medidos_hidrometro: 0,
  desvio_percentual: 0,
  status: 'conforme'
};

const DEFAULT_PONTOS_CONSUMO: PontoConsumoItem[] = [
  { id: '1', tipo: 'AF', categoria: 'torneira', local: 'Torneira do Tanque (Área de Serviço)', litros_10s: '', vazao_l_min: 0 },
  { id: '2', tipo: 'AF', categoria: 'torneira', local: 'Torneira da Cozinha', litros_10s: '', vazao_l_min: 0 },
  { id: '3', tipo: 'AF', categoria: 'ducha_gas', local: 'Ducha ou Chuveiro do Banheiro Social', litros_10s: '', vazao_l_min: 0 },
  { id: '4', tipo: 'AF', categoria: 'torneira', local: 'Torneira do Banheiro Social', litros_10s: '', vazao_l_min: 0 },
  { id: '5', tipo: 'AF', categoria: 'ducha_gas', local: 'Ducha ou Chuveiro da Suíte', litros_10s: '', vazao_l_min: 0 },
  { id: '6', tipo: 'AF', categoria: 'torneira', local: 'Torneira da Suíte', litros_10s: '', vazao_l_min: 0 },
  { id: '7', tipo: 'AF', categoria: 'torneira', local: 'Torneira do Lavabo', litros_10s: '', vazao_l_min: 0, nao_se_aplica: true }
];

const INITIAL_VISTORIA: Partial<Vistoria> = {
  data: format(new Date(), 'yyyy-MM-dd'),
  hora: format(new Date(), 'HH:mm'),
  tipo_vistoria: 'Alto Consumo',
  subtipo_vistoria: 'AF',
  caixas_acopladas: DEFAULT_CAIXAS_ACOPLADAS,
  afericoes_medidores: [DEFAULT_AFERICAO_AF],
  pontos_consumo_itens: DEFAULT_PONTOS_CONSUMO,
  testes: [
    { leitura_antes: '', leitura_depois: '', diferenca: 0, litros_recipiente: '10,0', imagens: {} },
    { leitura_antes: '', leitura_depois: '', diferenca: 0, litros_recipiente: '10,0', imagens: {} }
  ],
  dados_gerais: { 
    sistema_aquecimento: false, 
    relogio_parado_verificado: false, 
    verificacoes_internas: [] 
  },
  parecer_tecnico: ''
};

export default function App() {
  const [step, setStep] = useState(0);
  const [vistoria, setVistoria] = useState<Partial<Vistoria>>(INITIAL_VISTORIA);
  const [vistoriasSalvas, setVistoriasSalvas] = useState<Vistoria[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

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

  // Funções para Vistoria de Alto Consumo:
  const updateCaixaAcoplada = (index: number, field: string, value: any) => {
    const list = [...(vistoria.caixas_acopladas || DEFAULT_CAIXAS_ACOPLADAS)];
    list[index] = { ...list[index], [field]: value };
    handleUpdate('caixas_acopladas', list);
  };

  const addCaixaAcoplada = () => {
    const list = [...(vistoria.caixas_acopladas || DEFAULT_CAIXAS_ACOPLADAS)];
    const count = list.length + 1;
    list.push({
      id: String(Date.now()),
      local: `Suíte ${count - 1 > 1 ? count - 1 : 2}`,
      status: 'ok'
    });
    handleUpdate('caixas_acopladas', list);
  };

  const removeCaixaAcoplada = (index: number) => {
    const list = [...(vistoria.caixas_acopladas || DEFAULT_CAIXAS_ACOPLADAS)];
    list.splice(index, 1);
    handleUpdate('caixas_acopladas', list);
  };

  const updateAfericao = (tipo: 'AF' | 'AQ', field: string, value: any) => {
    const list = [...(vistoria.afericoes_medidores || [DEFAULT_AFERICAO_AF])];
    let itemIdx = list.findIndex(a => a.tipo === tipo);
    if (itemIdx === -1) {
      list.push(tipo === 'AF' ? { ...DEFAULT_AFERICAO_AF } : { ...DEFAULT_AFERICAO_AQ });
      itemIdx = list.length - 1;
    }
    
    const item = { ...list[itemIdx], [field]: value };

    const antesStr = field === 'leitura_antes' ? value : item.leitura_antes;
    const depoisStr = field === 'leitura_depois' ? value : item.leitura_depois;
    const baldeVal = field === 'volume_balde_litros' ? parseFloat(value) : (item.volume_balde_litros || 10);

    const antes = parseFloat(String(antesStr || '').replace(',', '.'));
    const depois = parseFloat(String(depoisStr || '').replace(',', '.'));
    const balde = !isNaN(baldeVal) && baldeVal > 0 ? baldeVal : 10;

    if (!isNaN(antes) && !isNaN(depois)) {
      const diffM3 = parseFloat((depois - antes).toFixed(4));
      const litrosMedidos = parseFloat((diffM3 * 1000).toFixed(2));
      const desvio = parseFloat((((litrosMedidos - balde) / balde) * 100).toFixed(1));
      
      item.diferenca_m3 = diffM3;
      item.litros_medidos_hidrometro = litrosMedidos;
      item.desvio_percentual = desvio;
      item.status = Math.abs(desvio) <= 5 ? 'conforme' : 'divergente';
    }

    list[itemIdx] = item;
    handleUpdate('afericoes_medidores', list);
  };

  const updatePontoConsumo = (index: number, field: string, value: any) => {
    const list = [...(vistoria.pontos_consumo_itens || DEFAULT_PONTOS_CONSUMO)];
    const item = { ...list[index], [field]: value };

    if (field === 'litros_10s') {
      const l10 = parseFloat(String(value).replace(',', '.'));
      if (!isNaN(l10) && l10 >= 0) {
        item.vazao_l_min = parseFloat((l10 * 6).toFixed(2));
      } else {
        item.vazao_l_min = 0;
      }
    }

    list[index] = item;
    handleUpdate('pontos_consumo_itens', list);
  };

  const addPontoConsumo = () => {
    const list = [...(vistoria.pontos_consumo_itens || DEFAULT_PONTOS_CONSUMO)];
    list.push({
      id: String(Date.now()),
      tipo: 'AF',
      categoria: 'ducha_gas',
      local: `Novo Ponto #${list.length + 1}`,
      litros_10s: '',
      vazao_l_min: 0
    });
    handleUpdate('pontos_consumo_itens', list);
  };

  const removePontoConsumo = (index: number) => {
    const list = [...(vistoria.pontos_consumo_itens || DEFAULT_PONTOS_CONSUMO)];
    list.splice(index, 1);
    handleUpdate('pontos_consumo_itens', list);
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

    if (field === 'leitura_antes' || field === 'leitura_depois') {
      const antes = parseFloat(teste.leitura_antes.replace(',', '.'));
      const depois = parseFloat(teste.leitura_depois.replace(',', '.'));
      if (!isNaN(antes) && !isNaN(depois)) {
        teste.diferenca = parseFloat((depois - antes).toFixed(3));
      }
    }

    novosTestes[index] = teste;
    handleUpdate('testes', novosTestes);
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
          litros_recipiente: '10,0', 
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
      
      const id = await db.vistorias.put(dataToSave);
      alert('Vistoria salva localmente com sucesso!');
      setVistoria({ ...INITIAL_VISTORIA, id });
      setStep(0);
      loadHistory();
    } catch (err: any) {
      console.error('Erro detalhado ao salvar:', err);
      alert(`Erro ao salvar vistoria: ${err.message || 'Erro desconhecido'}`);
    }
  };

  const syncToCloud = async (fileName: string, base64: string, mimeType: string) => {
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx65pLFtsRfnbdhtkX_oLYtt3HGEgM41zUo7c-k3Fs25RCKcn2qgeoT28FsXAdn8nOf/exec';
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
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

  // Função para VISUALIZAR o Relatório em PDF com o leitor nativo do celular
  const handlePreviewPDF = async (v: Partial<Vistoria>) => {
    try {
      setIsLoadingPreview(true);
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');

      const base64Data = await generatePDF(v as Vistoria, logoImg);
      const safeCondoName = (v.condominio || 'Vistoria').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const pdfFileName = `Laudo_${safeCondoName}_${v.unidade || 'Unidade'}.pdf`;

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

      if (pdfFileUri) {
        try {
          await Share.share({
            title: `Laudo Técnico Ecowave - ${v.condominio || ''}`,
            files: [pdfFileUri],
            dialogTitle: 'Visualizar / Abrir Laudo (PDF)'
          });
          return;
        } catch (shareErr: any) {
          if (shareErr?.message?.includes('cancel') || shareErr?.message?.includes('closed') || shareErr?.message?.includes('dismiss')) {
            return;
          }
          console.warn('Share nativo falhou, aplicando fallback...', shareErr);
        }
      }

      // Fallback para Web / Navegador desktop
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
      console.error('Erro ao abrir PDF:', err);
      alert(`Erro ao visualizar laudo: ${err?.message || 'Verifique as informações preenchidas.'}`);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleGenerateAndSharePDF = async (v: Vistoria) => {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');

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

      try {
        syncToCloud(pdfFileName, base64Data, 'application/pdf');
      } catch (e) {}

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

  const isAltoConsumo = vistoria.tipo_vistoria === 'Alto Consumo';

  if (showHistory) {
    return (
      <div className="fade-in">
        <Header />
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <button onClick={() => setShowHistory(false)} className="secondary" style={{ width: 'auto' }}>
            <ArrowLeft size={18} />
          </button>
          <h2 style={{ margin: 0 }}>Histórico de Vistorias</h2>
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

              {/* Botões de Ação do Histórico: Visualizar, Enviar e Zap */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1.2fr 1fr 0.8fr', 
                gap: '0.5rem', 
                marginTop: '1.25rem', 
                paddingTop: '1rem', 
                borderTop: '1px solid var(--border)' 
              }}>
                <button 
                  onClick={() => handlePreviewPDF(v)} 
                  className="secondary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.8rem', padding: '8px 4px' }}
                >
                  <Eye size={15} /> Visualizar
                </button>
                <button 
                  onClick={() => handleGenerateAndSharePDF(v)} 
                  style={{ backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.8rem', padding: '8px 4px' }}
                >
                  <Share2 size={15} /> Enviar
                </button>
                <button 
                  onClick={() => handleShareWhatsAppInfo(v)} 
                  className="secondary outline"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.8rem', padding: '8px 4px' }}
                >
                  <MessageSquare size={15} /> Zap
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
      
      {/* PASSO 0: DADOS INICIAIS */}
      {step === 0 && (
        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <div className="card">
            <h2>Dados Iniciais da Vistoria</h2>
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
              <label>Responsável / Morador da Unidade</label>
              <input type="text" placeholder="Nome do Morador que Acompanhou" value={vistoria.responsavel_unidade} onChange={e => handleUpdate('responsavel_unidade', e.target.value)} />
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
                        subtipo_vistoria: 'AF'
                      }));
                    }}
                  >
                    {TIPOS_VISTORIA.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Utilidades / Sistemas</label>
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

      {/* PASSO 1: INSPEÇÃO DE CAIXAS ACOPLADAS (ALTO CONSUMO) OU TESTES LEITURA (GERAL) */}
      {step === 1 && (
        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          {isAltoConsumo ? (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🚽</span>
                <h2 style={{ margin: 0 }}>1. Inspeção de Caixas Acopladas</h2>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Retire a tampa da caixa acoplada e inspecione se há vazamento pelo tubo extravasor (ladrão) ou pela borracha de vedação inferior.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                {(vistoria.caixas_acopladas || DEFAULT_CAIXAS_ACOPLADAS).map((caixa, idx) => (
                  <div key={caixa.id || idx} style={{
                    backgroundColor: caixa.status === 'nao_aplicavel' ? 'rgba(100, 116, 139, 0.08)' : 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '1rem',
                    opacity: caixa.status === 'nao_aplicavel' ? 0.75 : 1
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <input 
                        type="text"
                        value={caixa.local}
                        onChange={e => updateCaixaAcoplada(idx, 'local', e.target.value)}
                        style={{ fontWeight: 'bold', fontSize: '1rem', width: 'auto', marginBottom: 0, padding: '4px 8px' }}
                      />
                      {(vistoria.caixas_acopladas?.length || 0) > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCaixaAcoplada(idx)}
                          className="secondary"
                          style={{ padding: '4px 8px', width: 'auto', margin: 0, color: 'var(--error)' }}
                          title="Remover Caixa"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      Status da Vedação e Nível do Ladrão:
                    </label>
                    <select
                      value={caixa.status}
                      onChange={e => updateCaixaAcoplada(idx, 'status', e.target.value)}
                      style={{ 
                        fontWeight: '600',
                        borderColor: caixa.status === 'ok' ? 'var(--success)' : caixa.status === 'nao_aplicavel' ? 'var(--border)' : 'var(--error)',
                        color: caixa.status === 'ok' ? 'var(--success)' : caixa.status === 'nao_aplicavel' ? 'var(--text-muted)' : 'var(--error)'
                      }}
                    >
                      <option value="ok">🟢 Em Conformidade (Sem Vazamento)</option>
                      <option value="vazamento_ladrao">🔴 Vazamento pelo Ladrão (Nível Alto)</option>
                      <option value="vazamento_borracha">🔴 Vazamento pela Borracha Inferior</option>
                      <option value="vazamento_ambos">🔴 Vazamento Duplo (Ladrão e Borracha)</option>
                      <option value="nao_aplicavel">⚪ Não se Aplica (Inexistente neste imóvel)</option>
                    </select>

                    {caixa.status !== 'ok' && caixa.status !== 'nao_aplicavel' && (
                      <div className="fade-in" style={{ marginTop: '0.75rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <CameraInput 
                            label="Foto da Caixa Acoplada" 
                            onPhotoTaken={(b64) => updateCaixaAcoplada(idx, 'imagem', b64)} 
                            initialValue={caixa.imagem}
                          />
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: '600' }}>
                              <Video size={14} color="var(--primary)" />
                              <span>Vídeo de Prova (10s)</span>
                            </label>
                            <input 
                              type="file" 
                              accept="video/*" 
                              capture="environment"
                              style={{ padding: '8px', fontSize: '0.75rem', height: 'auto', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    updateCaixaAcoplada(idx, 'video', reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            {caixa.video && (
                              <div style={{ color: 'var(--success)', fontSize: '0.75rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={12} /> Vídeo Anexado
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Observação Técnica</label>
                          <input 
                            type="text" 
                            placeholder="Ex: Regulagem da bóia necessária ou troca do obturador"
                            value={caixa.observacao || ''}
                            onChange={e => updateCaixaAcoplada(idx, 'observacao', e.target.value)}
                            style={{ marginBottom: 0 }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addCaixaAcoplada}
                  className="secondary outline"
                  style={{ borderStyle: 'dashed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Plus size={16} /> Adicionar Outro Vaso Sanitário / Suíte
                </button>
              </div>

              <div className="grid-2">
                <button onClick={() => setStep(0)} className="secondary"><ChevronLeft size={18} /> Voltar</button>
                <button onClick={() => setStep(2)}>Avançar para Aferição <ChevronRight size={18} /></button>
              </div>
            </div>
          ) : (
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
                          placeholder="Ex: 10,0"
                          value={teste.litros_recipiente} 
                          onChange={e => updateTeste(idx, 'litros_recipiente', e.target.value)} 
                          style={{ marginBottom: 0 }}
                        />
                      </div>
                    </div>

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
                <button onClick={() => setStep(2)}>Avançar <ChevronRight size={18} /></button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* PASSO 2: AFERIÇÃO DO HIDRÔMETRO (BALDE 10L) */}
      {step === 2 && (
        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          {isAltoConsumo ? (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🪣</span>
                <h2 style={{ margin: 0 }}>2. Aferição do Medidor (Balde 10L)</h2>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Verificação de precisão volumétrica: colete 10 litros em balde graduado e compare com o hidrômetro.
              </p>

              {/* Bloco AF */}
              {isTipoAF(vistoria) && (() => {
                const afericaoAF = vistoria.afericoes_medidores?.find(a => a.tipo === 'AF') || DEFAULT_AFERICAO_AF;
                return (
                  <div style={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    marginBottom: '1.5rem'
                  }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.1rem' }}>
                      <Droplets size={18} /> Aferição do Hidrômetro AF (Água Fria)
                    </h3>

                    {/* 1. Foto Antes + Leitura Inicial */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                      <CameraInput 
                        label="1. Foto Medidor Antes" 
                        onPhotoTaken={(b) => updateAfericao('AF', 'imagem_antes', b)} 
                        initialValue={afericaoAF.imagem_antes}
                      />
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontWeight: 'bold' }}>Leitura Inicial (m³)</label>
                        <input 
                          type="text" 
                          inputMode="decimal"
                          placeholder="0000,000"
                          value={afericaoAF.leitura_antes}
                          onChange={e => updateAfericao('AF', 'leitura_antes', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* 2. Coleta 10L + Foto Balde */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                      <CameraInput 
                        label="2. Foto Balde (10L)" 
                        onPhotoTaken={(b) => updateAfericao('AF', 'imagem_balde', b)} 
                        initialValue={afericaoAF.imagem_balde}
                      />
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontWeight: 'bold' }}>Volume Balde (Litros)</label>
                        <input 
                          type="number" 
                          inputMode="decimal"
                          value={afericaoAF.volume_balde_litros || 10}
                          onChange={e => updateAfericao('AF', 'volume_balde_litros', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* 3. Foto Depois + Leitura Final */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                      <CameraInput 
                        label="3. Foto Medidor Depois" 
                        onPhotoTaken={(b) => updateAfericao('AF', 'imagem_depois', b)} 
                        initialValue={afericaoAF.imagem_depois}
                      />
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontWeight: 'bold' }}>Leitura Final (m³)</label>
                        <input 
                          type="text" 
                          inputMode="decimal"
                          placeholder="0000,010"
                          value={afericaoAF.leitura_depois}
                          onChange={e => updateAfericao('AF', 'leitura_depois', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Painel de Cálculo e Conformidade */}
                    <div style={{
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span>Diferença no Medidor:</span>
                        <strong>{(afericaoAF.diferenca_m3 || 0).toFixed(4).replace('.', ',')} m³ ({(afericaoAF.litros_medidos_hidrometro || 0).toFixed(1)} L)</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span>Desvio Calculado:</span>
                        <strong style={{ color: afericaoAF.status === 'conforme' ? 'var(--success)' : 'var(--error)' }}>
                          {(afericaoAF.desvio_percentual || 0) > 0 ? '+' : ''}{(afericaoAF.desvio_percentual || 0).toFixed(1)}%
                        </strong>
                      </div>

                      <div style={{
                        marginTop: '0.5rem',
                        padding: '0.6rem',
                        borderRadius: '8px',
                        backgroundColor: afericaoAF.status === 'conforme' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: afericaoAF.status === 'conforme' ? 'var(--success)' : 'var(--error)',
                        fontWeight: 'bold',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        {afericaoAF.status === 'conforme' ? (
                          <>
                            <CheckCircle2 size={16} />
                            <span>Hidrômetro Aferido (Leitura Conforme com Balde)</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={16} />
                            <span>Divergência de Leitura Detectada</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Bloco AQ */}
              {isTipoAQ(vistoria) && (() => {
                const afericaoAQ = vistoria.afericoes_medidores?.find(a => a.tipo === 'AQ') || DEFAULT_AFERICAO_AQ;
                return (
                  <div style={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    marginBottom: '1.5rem'
                  }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.1rem' }}>
                      <Gauge size={18} /> Aferição do Hidrômetro AQ (Água Quente)
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                      <CameraInput 
                        label="1. Foto Medidor AQ Antes" 
                        onPhotoTaken={(b) => updateAfericao('AQ', 'imagem_antes', b)} 
                        initialValue={afericaoAQ.imagem_antes}
                      />
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontWeight: 'bold' }}>Leitura Inicial AQ (m³)</label>
                        <input 
                          type="text" 
                          inputMode="decimal"
                          placeholder="0000,000"
                          value={afericaoAQ.leitura_antes}
                          onChange={e => updateAfericao('AQ', 'leitura_antes', e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                      <CameraInput 
                        label="2. Foto Balde AQ (10L)" 
                        onPhotoTaken={(b) => updateAfericao('AQ', 'imagem_balde', b)} 
                        initialValue={afericaoAQ.imagem_balde}
                      />
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontWeight: 'bold' }}>Volume Balde (Litros)</label>
                        <input 
                          type="number" 
                          inputMode="decimal"
                          value={afericaoAQ.volume_balde_litros || 10}
                          onChange={e => updateAfericao('AQ', 'volume_balde_litros', e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                      <CameraInput 
                        label="3. Foto Medidor AQ Depois" 
                        onPhotoTaken={(b) => updateAfericao('AQ', 'imagem_depois', b)} 
                        initialValue={afericaoAQ.imagem_depois}
                      />
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontWeight: 'bold' }}>Leitura Final AQ (m³)</label>
                        <input 
                          type="text" 
                          inputMode="decimal"
                          placeholder="0000,010"
                          value={afericaoAQ.leitura_depois}
                          onChange={e => updateAfericao('AQ', 'leitura_depois', e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span>Diferença Medidor AQ:</span>
                        <strong>{(afericaoAQ.diferenca_m3 || 0).toFixed(4).replace('.', ',')} m³ ({(afericaoAQ.litros_medidos_hidrometro || 0).toFixed(1)} L)</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span>Desvio Calculado AQ:</span>
                        <strong style={{ color: afericaoAQ.status === 'conforme' ? 'var(--success)' : 'var(--error)' }}>
                          {(afericaoAQ.desvio_percentual || 0) > 0 ? '+' : ''}{(afericaoAQ.desvio_percentual || 0).toFixed(1)}%
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="grid-2">
                <button onClick={() => setStep(1)} className="secondary"><ChevronLeft size={18} /> Voltar</button>
                <button onClick={() => setStep(3)}>Avançar para Pontos <ChevronRight size={18} /></button>
              </div>
            </div>
          ) : (
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

              <div className="grid-2">
                <button onClick={() => setStep(1)} className="secondary"><ChevronLeft size={18} /> Voltar</button>
                <button onClick={() => setStep(3)}>Avançar <ChevronRight size={18} /></button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* PASSO 3: MAPEAMENTO DE VAZÃO DOS PONTOS DE CONSUMO (10s) */}
      {step === 3 && (
        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          {isAltoConsumo ? (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🚰</span>
                <h2 style={{ margin: 0 }}>3. Vazão dos Pontos de Consumo</h2>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                Abra a torneira ou ducha e colete a água durante <strong>10 segundos</strong>. O aplicativo calculará a vazão por minuto (L/min) e a qualificação de consumo.
              </p>

              {/* Cronômetro Regressivo de 10 segundos */}
              <StopwatchTimer initialSeconds={10} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                {(vistoria.pontos_consumo_itens || DEFAULT_PONTOS_CONSUMO).map((ponto, idx) => {
                  const qual = getQualificacaoVazao(ponto.categoria, ponto.vazao_l_min || 0);
                  const isNaoAplica = ponto.nao_se_aplica || false;

                  return (
                    <div key={ponto.id || idx} style={{
                      backgroundColor: isNaoAplica ? 'rgba(100, 116, 139, 0.08)' : 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '1rem',
                      opacity: isNaoAplica ? 0.65 : 1
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <input 
                          type="text"
                          value={ponto.local}
                          onChange={e => updatePontoConsumo(idx, 'local', e.target.value)}
                          style={{ fontWeight: 'bold', fontSize: '0.95rem', width: 'auto', marginBottom: 0, padding: '4px 8px' }}
                          disabled={isNaoAplica}
                        />
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer', margin: 0 }}>
                            <input 
                              type="checkbox"
                              checked={isNaoAplica}
                              onChange={e => updatePontoConsumo(idx, 'nao_se_aplica', e.target.checked)}
                              style={{ width: '16px', height: '16px', margin: 0 }}
                            />
                            <span>Não se aplica</span>
                          </label>

                          {(vistoria.pontos_consumo_itens?.length || 0) > 1 && (
                            <button
                              type="button"
                              onClick={() => removePontoConsumo(idx)}
                              className="secondary"
                              style={{ padding: '4px 8px', width: 'auto', margin: 0, color: 'var(--error)' }}
                              title="Remover Ponto"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {!isNaoAplica && (
                        <>
                          <div className="grid-2" style={{ marginBottom: '0.75rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Categoria do Ponto</label>
                              <select
                                value={ponto.categoria || 'torneira'}
                                onChange={e => updatePontoConsumo(idx, 'categoria', e.target.value)}
                                style={{ marginBottom: 0 }}
                              >
                                <option value="torneira">🚰 Torneira</option>
                                <option value="ducha_gas">🚿 Ducha / Chuveiro a Gás</option>
                                <option value="chuveiro_eletrico">⚡ Chuveiro Elétrico</option>
                                <option value="ducha_higienica">🚽 Ducha Higiênica</option>
                              </select>
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Coleta em 10s (Litros)</label>
                              <input 
                                type="text"
                                inputMode="decimal"
                                placeholder="Ex: 1,0"
                                value={ponto.litros_10s}
                                onChange={e => updatePontoConsumo(idx, 'litros_10s', e.target.value)}
                                style={{ marginBottom: 0 }}
                              />
                            </div>
                          </div>

                          <div style={{
                            backgroundColor: 'var(--surface)',
                            border: '1px solid var(--border)',
                            padding: '0.75rem',
                            borderRadius: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '0.75rem'
                          }}>
                            <div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                Vazão Projetada
                              </div>
                              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text)' }}>
                                {(ponto.vazao_l_min || 0).toFixed(1).replace('.', ',')} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>L/min</span>
                              </div>
                            </div>

                            <div style={{
                              fontWeight: 'bold',
                              fontSize: '0.8rem',
                              color: qual.color,
                              textAlign: 'right'
                            }}>
                              {qual.label}
                            </div>
                          </div>

                          <CameraInput 
                            label="Foto do Ponto / Teste (Opcional)" 
                            onPhotoTaken={(b64) => updatePontoConsumo(idx, 'imagem', b64)} 
                            initialValue={ponto.imagem}
                          />
                        </>
                      )}
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={addPontoConsumo}
                  className="secondary outline"
                  style={{ borderStyle: 'dashed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Plus size={16} /> Adicionar Outro Ponto de Consumo
                </button>
              </div>

              <div className="grid-2">
                <button onClick={() => setStep(2)} className="secondary"><ChevronLeft size={18} /> Voltar</button>
                <button onClick={() => setStep(4)}>Avançar para Medidores <ChevronRight size={18} /></button>
              </div>
            </div>
          ) : (
            <div className="card">
              <h2>Verificações Internas (Checklist)</h2>
              <div style={{ marginBottom: '1.5rem' }}>
                {['Vaso Sanitário', 'Torneira Cozinha', 'Torneira Banheiro', 'Chuveiro', 'Área de Serviço'].map((item, idx) => (
                  <div key={idx} style={{ backgroundColor: 'var(--surface)', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.75rem', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                  </div>
                ))}
              </div>

              <div className="grid-2">
                <button onClick={() => setStep(2)} className="secondary"><ChevronLeft size={18} /> Voltar</button>
                <button onClick={() => setStep(4)}>Avançar <ChevronRight size={18} /></button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* PASSO 4: MEDIDORES & SISTEMAS */}
      {step === 4 && (
        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <div className="card">
            <h2>Medidores & Sistemas</h2>
            
            {/* Hidrômetro AF */}
            {isTipoAF(vistoria) && (
              <div style={{ backgroundColor: 'var(--background)', padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem', border: '1px solid var(--border)' }}>
                <h3 style={{ margin: '0 0 0.75rem 0', color: 'var(--primary)', fontSize: '1rem' }}>
                  💧 Hidrômetro AF (Água Fria)
                </h3>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Estado do Medidor AF</label>
                    <select 
                      value={vistoria.dados_gerais?.estado_medidor_agua || 'bom'} 
                      onChange={e => handleUpdate('dados_gerais.estado_medidor_agua', e.target.value)}
                    >
                      <option value="bom">Bom</option>
                      <option value="ruim">Ruim</option>
                      <option value="violado">Violado</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Nº Série / Serial AF</label>
                    <input 
                      type="text" 
                      placeholder="Ex: AF-123456" 
                      value={vistoria.dados_gerais?.serial_medidor_agua || ''} 
                      onChange={e => handleUpdate('dados_gerais.serial_medidor_agua', e.target.value)} 
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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
              </div>
            )}

            {/* Hidrômetro AQ */}
            {isTipoAQ(vistoria) && (
              <div style={{ backgroundColor: 'var(--background)', padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem', border: '1px solid var(--border)' }}>
                <h3 style={{ margin: '0 0 0.75rem 0', color: '#f59e0b', fontSize: '1rem' }}>
                  🔥 Hidrômetro AQ (Água Quente)
                </h3>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Estado do Medidor AQ</label>
                    <select 
                      value={vistoria.dados_gerais?.estado_medidor_aq || 'bom'} 
                      onChange={e => handleUpdate('dados_gerais.estado_medidor_aq', e.target.value)}
                    >
                      <option value="bom">Bom</option>
                      <option value="ruim">Ruim</option>
                      <option value="violado">Violado</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Nº Série / Serial AQ</label>
                    <input 
                      type="text" 
                      placeholder="Ex: AQ-987654" 
                      value={vistoria.dados_gerais?.serial_medidor_aq || ''} 
                      onChange={e => handleUpdate('dados_gerais.serial_medidor_aq', e.target.value)} 
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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

            {/* Estanqueidade */}
            <div style={{ backgroundColor: 'var(--background)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="chkEstanqueidade"
                  checked={vistoria.dados_gerais?.relogio_parado_verificado || false}
                  onChange={e => handleUpdate('dados_gerais.relogio_parado_verificado', e.target.checked)}
                  style={{ width: '20px', height: '20px', margin: 0 }}
                />
                <label htmlFor="chkEstanqueidade" style={{ margin: 0, fontWeight: '600', cursor: 'pointer' }}>
                  Estanqueidade Verificada (Relógio 100% Parado sem Consumo)
                </label>
              </div>
            </div>

            <div className="grid-2">
              <button onClick={() => setStep(3)} className="secondary"><ChevronLeft size={18} /> Voltar</button>
              <button onClick={() => setStep(5)}>Avançar para Parecer <ChevronRight size={18} /></button>
            </div>
          </div>
        </motion.div>
      )}

      {/* PASSO 5: PARECER TÉCNICO & ASSINATURAS */}
      {step === 5 && (
        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <div className="card">
            <h2>Parecer Técnico & Assinaturas</h2>
            
            <div className="form-group">
              <label>Parecer Técnico Final (Obrigatório)</label>
              <textarea 
                rows={5} 
                placeholder="Descreva detalhadamente as condições observadas, resultados dos testes de alto consumo e orientações técnicas..."
                value={vistoria.parecer_tecnico || ''}
                onChange={e => handleUpdate('parecer_tecnico', e.target.value)}
              />
            </div>

            {/* 1. Assinatura do Morador / Responsável */}
            <div style={{ backgroundColor: 'var(--background)', padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem', border: '1px solid var(--border)' }}>
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontWeight: '600' }}>Nome do Morador / Responsável pelo Acompanhamento</label>
                <input 
                  type="text" 
                  placeholder="Ex: João da Silva" 
                  value={vistoria.responsavel_unidade || ''} 
                  onChange={e => handleUpdate('responsavel_unidade', e.target.value)}
                  style={{ marginBottom: '0.25rem' }}
                />
              </div>
              <SignatureInput 
                label="Assinatura do Morador / Responsável"
                helperText="Declaro que acompanhei a vistoria técnica e recebi este laudo."
                onSave={b => {
                  handleUpdate('assinatura_cliente', b);
                  handleUpdate('assinatura', b);
                }} 
                initialValue={vistoria.assinatura_cliente || vistoria.assinatura}
              />
            </div>

            {/* 2. Assinatura do Técnico Responsável Ecowave */}
            <div style={{ backgroundColor: 'var(--background)', padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem', border: '1px solid var(--border)' }}>
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontWeight: '600' }}>Nome do Técnico Responsável</label>
                <input 
                  type="text" 
                  placeholder="Ex: Carlos Oliveira" 
                  value={vistoria.tecnico || ''} 
                  onChange={e => handleUpdate('tecnico', e.target.value)}
                  style={{ marginBottom: '0.25rem' }}
                />
              </div>
              <SignatureInput 
                label="Assinatura do Técnico Responsável"
                helperText="Atesto a execução técnica de todos os testes e análises descritos neste laudo."
                onSave={b => handleUpdate('assinatura_tecnico', b)} 
                initialValue={vistoria.assinatura_tecnico}
              />
            </div>

            {/* Botões do Passo 5: Visualizar Laudo, Voltar e Salvar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button 
                type="button"
                onClick={() => handlePreviewPDF(vistoria)} 
                className="secondary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                disabled={isLoadingPreview}
              >
                <Eye size={18} /> {isLoadingPreview ? 'Gerando...' : 'Visualizar Laudo'}
              </button>
              <button 
                onClick={saveVistoria} 
                style={{ backgroundColor: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} 
                disabled={!vistoria.parecer_tecnico}
              >
                <Save size={18} /> Finalizar Vistoria
              </button>
            </div>

            <button 
              onClick={() => setStep(4)} 
              className="secondary outline"
              style={{ marginTop: '0.75rem' }}
            >
              <ChevronLeft size={18} /> Voltar ao Passo Anterior
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
