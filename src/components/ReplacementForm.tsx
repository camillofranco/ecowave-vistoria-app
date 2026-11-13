import CameraInput from './CameraInput';
import type { TrocaEquipamentoItem } from '../db/database';

interface Props {
  subtipo?: string;
  value?: TrocaEquipamentoItem[];
  onChange: (items: TrocaEquipamentoItem[]) => void;
}

export default function ReplacementForm({ subtipo = 'Troca de Medidor - AF', value = [], onChange }: Props) {
  const equipment = subtipo.split(' - ')[0];
  const utilities = (['AF', 'AQ', 'Gás'] as const).filter(u => subtipo.includes(u));
  const change = (utilidade: TrocaEquipamentoItem['utilidade'], field: keyof TrocaEquipamentoItem, input: string) => {
    const item = value.find(row => row.utilidade === utilidade) || { utilidade };
    const next = { ...item, [field]: input };
    onChange([...value.filter(row => row.utilidade !== utilidade), next]);
  };
  return <div className="card">
    <h2>Troca de Equipamento</h2>
    <p>Registre os equipamentos retirados e instalados. As leituras são registros de antes e depois da troca, não um teste de consumo.</p>
    {utilities.map(utilidade => {
      const item = value.find(row => row.utilidade === utilidade) || { utilidade };
      return <section key={utilidade} style={{ marginBottom: '1.5rem' }}>
        <h3>{equipment} — {utilidade}</h3>
        {(['antes', 'depois'] as const).map(etapa => <div key={etapa}>
          <h4>{etapa === 'antes' ? 'Antes da troca' : 'Depois da troca'}</h4>
          {equipment !== 'Troca de Transmissor' && <div className="form-group">
            <label htmlFor={`medidor-${utilidade}-${etapa}`}>Série do medidor {etapa === 'antes' ? 'retirado' : 'instalado'}</label>
            <input id={`medidor-${utilidade}-${etapa}`} value={item[`medidor_${etapa}`] || ''} onChange={e => change(utilidade, `medidor_${etapa}`, e.target.value.toUpperCase())} />
          </div>}
          {equipment !== 'Troca de Medidor' && <div className="form-group">
            <label htmlFor={`transmissor-${utilidade}-${etapa}`}>Série do transmissor {etapa === 'antes' ? 'retirado' : 'instalado'}</label>
            <input id={`transmissor-${utilidade}-${etapa}`} inputMode="numeric" value={item[`transmissor_${etapa}`] || ''} onChange={e => change(utilidade, `transmissor_${etapa}`, e.target.value.replace(/\D/g, ''))} />
          </div>}
          <div className="form-group">
            <label htmlFor={`leitura-${utilidade}-${etapa}`}>Leitura {etapa === 'antes' ? 'antes' : 'depois'} da troca (m³)</label>
            <input id={`leitura-${utilidade}-${etapa}`} inputMode="decimal" value={item[`leitura_${etapa}`] || ''} onChange={e => change(utilidade, `leitura_${etapa}`, e.target.value)} />
          </div>
          <CameraInput label={`Foto ${etapa} da troca (${utilidade}) — opcional`} initialValue={item[`foto_${etapa}`]} onPhotoTaken={photo => change(utilidade, `foto_${etapa}`, photo)} />
        </div>)}
        <div className="form-group">
          <label htmlFor={`obs-${utilidade}`}>Observações da troca ({utilidade})</label>
          <textarea id={`obs-${utilidade}`} value={item.observacao || ''} onChange={e => change(utilidade, 'observacao', e.target.value)} />
        </div>
      </section>;
    })}
  </div>;
}
