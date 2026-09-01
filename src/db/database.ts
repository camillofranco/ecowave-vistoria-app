import Dexie, { type Table } from 'dexie';

export interface ImagemVistoria {
  id?: number;
  vistoriaId: number;
  bloco: string;
  tipo: string;
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

// Modelos especializados para Alto Consumo
export interface CaixaAcopladaItem {
  id: string;
  local: string; // Ex: 'W.C. Social', 'Suíte 1', 'Lavabo'
  status: 'ok' | 'vazamento_ladrao' | 'vazamento_borracha' | 'vazamento_ambos' | 'nao_aplicavel';
  observacao?: string;
  imagem?: string;
  video?: string;
}

export interface AfericaoMedidorItem {
  tipo: 'AF' | 'AQ';
  leitura_antes: string;
  leitura_depois: string;
  diferenca_m3: number;
  volume_balde_litros: number; // Padrão: 10
  litros_medidos_hidrometro: number;
  desvio_percentual: number;
  status: 'conforme' | 'divergente';
  imagem_antes?: string;
  imagem_balde?: string;
  imagem_depois?: string;
}

export interface PontoConsumoItem {
  id: string;
  tipo: 'AF' | 'AQ';
  local: string; // Ex: 'Torneira Tanque (Área de Serviço)', 'Torneira Cozinha', 'Torneira Lavabo', 'Torneira W.C. Social', 'Torneira Suíte'
  litros_10s: string; // Coleta em 10 segundos
  vazao_l_min: number; // litros_10s * 6
  imagem?: string;
  observacao?: string;
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
  video?: string;
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
  video_relogio_parado?: string;
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
  
  // Módulos especializados de Alto Consumo
  caixas_acopladas?: CaixaAcopladaItem[];
  afericoes_medidores?: AfericaoMedidorItem[];
  pontos_consumo_itens?: PontoConsumoItem[];

  testes: TesteLeitura[];
  ponto_consumo?: PontoConsumo;
  dados_gerais: DadosGerais;
  parecer_tecnico: string;
  assinatura_cliente?: string;
  assinatura_tecnico?: string;
  assinatura?: string;
  createdAt: number;
}

export class EcowaveDatabase extends Dexie {
  vistorias!: Table<Vistoria>;

  constructor() {
    super('EcowaveDatabase');
    this.version(3).stores({
      vistorias: '++id, data, condominio, tecnico, unidade, createdAt'
    });
  }
}

export const db = new EcowaveDatabase();
