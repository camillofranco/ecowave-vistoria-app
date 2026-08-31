import Dexie, { type Table } from 'dexie';

export interface ImagemVistoria {
  id?: number;
  vistoriaId: number;
  bloco: string; // ex: 'teste_1', 'medidor', 'ponto_consumo'
  tipo: string; // ex: 'antes', 'depois', 'recipiente'
  dataUrl: string;
  timestamp: string;
}

export interface TesteLeitura {
  leitura_antes: string;
  leitura_depois: string;
  diferenca: number;
  litros_recipiente: string;
  imagens: {
    antes?: string;
    depois?: string;
    recipiente?: string;
  };
}

export interface PontoConsumo {
  nome_ponto: string;
  tempo_segundos: string;
  litros_medidos: string;
  resultado_calculado: number;
  imagem_recipiente?: string;
  marca_ducha_ou_torneira?: string;
}

export interface VerificacaoInterna {
  item: string;
  status: 'ok' | 'vazamento';
  imagem?: string;
  video?: string; // Base64 do vídeo de evidência
}

export interface DadosGerais {
  estado_medidor_agua?: string; // Medidor AF
  imagem_medidor_agua?: string;
  serial_medidor_agua?: string;
  imagem_serial_agua?: string;
  estado_medidor_aq?: string; // Medidor AQ
  imagem_medidor_aq?: string;
  serial_medidor_aq?: string;
  imagem_serial_aq?: string;
  estado_medidor_gas?: string;
  imagem_medidor_gas?: string;
  serial_medidor_gas?: string;
  imagem_serial_gas?: string;
  relogio_parado_verificado: boolean;
  video_relogio_parado?: string; // Base64 do vídeo curto
  verificacoes_internas: VerificacaoInterna[];
  sistema_aquecimento: boolean;
  tipo_aquecimento?: 'aquecedor' | 'boiler' | 'caldeira';
  imagem_aquecimento?: string;
  ultima_manutencao_aquecedor?: string;
  imagem_manutencao?: string;
  temperatura_agua_quente?: string;
  temperatura_agua_fria?: string;
  pressao_agua?: string;
}

export interface Vistoria {
  id?: number;
  data: string;
  hora: string;
  condominio: string;
  bloco: string;
  unidade: string;
  tecnico: string;
  responsavel_unidade: string;
  tipo_vistoria: string;
  subtipo_vistoria?: string;
  testes: TesteLeitura[];
  ponto_consumo?: PontoConsumo;
  dados_gerais: DadosGerais;
  parecer_tecnico: string;
  assinatura?: string;
  createdAt: number;
}

export class EcoWaveDatabase extends Dexie {
  vistorias!: Table<Vistoria>;

  constructor() {
    super('EcoWaveDatabase');
    this.version(2).stores({
      vistorias: '++id, data, condominio, tecnico, unidade, createdAt'
    });
  }
}

export const db = new EcoWaveDatabase();
