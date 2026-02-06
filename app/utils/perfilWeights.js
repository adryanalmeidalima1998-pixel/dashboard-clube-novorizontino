/**
 * Pesos das métricas por Perfil Técnico
 * Cada perfil tem um conjunto de métricas e seus respectivos pesos (totalizando 1.0)
 */

export const PERFIL_WEIGHTS = {
  // --- LATERAIS ---
  'Lateral Construtor': {
    'Passes precisos %': 0.3,
    'Passes progressivos': 0.25,
    'Passa para o terço final': 0.25,
    'Ações / com sucesso %': 0.2
  },
  'Lateral Físico': {
    'Desafios vencidos, %': 0.3,
    'Ações totais': 0.3,
    'Disputas na defesa': 0.2,
    'Minutos jogados': 0.2
  },
  'Lateral Ofensivo': {
    'Cruzamentos': 0.3,
    'Chances criadas': 0.25,
    'Ações na área adv.': 0.25,
    'Assistências': 0.2
  },
  'Lateral Defensivo': {
    'Desarmes': 0.3,
    'Interceptações': 0.3,
    'Disputas defensivas ganhas, %': 0.2,
    'Bolas recuperadas': 0.2
  },

  // --- ZAGUEIROS ---
  'Zagueiro Defensor de Área': {
    'Disputas defensivas ganhas, %': 0.35,
    'Desafios aéreos vencidos, %': 0.35,
    'Interceptações': 0.15,
    'Bolas recuperadas': 0.15
  },
  'Zagueiro Construtor': {
    'Passes precisos %': 0.3,
    'Passes longos': 0.3,
    'Passes progressivos': 0.2,
    'Passa para o terço final': 0.2
  },
  'Zagueiro Veloz': {
    'Bolas recuperadas': 0.3,
    'Desafios vencidos, %': 0.3,
    'Interceptações': 0.2,
    'Ações totais': 0.2
  },

  // --- VOLANTES / MEIAS ---
  'Volante Construtor': {
    'Passes precisos %': 0.3,
    'Passes progressivos': 0.3,
    'Passa para o terço final': 0.2,
    'Passes chave': 0.2
  },
  'Meia Criativo': {
    'Chances criadas': 0.3,
    'Passes chave': 0.3,
    'xA': 0.2,
    'Ações na área adv.': 0.2
  },
  'Meia Finalizador': {
    'Gols': 0.4,
    'Chutes': 0.3,
    'Xg': 0.2,
    'Ações na área adv.': 0.1
  },

  // --- EXTREMOS ---
  'Extremo Driblador': {
    'Dribles': 0.4,
    '% de dribles com sucesso': 0.3,
    'Desafios vencidos, %': 0.2,
    'Ações na área adv.': 0.1
  },
  'Extremo Vertical': {
    'Entradas no terço final': 0.3,
    'Cruzamentos': 0.3,
    'Ações na área adv.': 0.2,
    'Chances criadas': 0.2
  },

  // --- ATACANTES ---
  'Centroavante Finalizador': {
    'Gols': 0.4,
    'Xg': 0.3,
    'Chutes no gol, %': 0.2,
    'Ações na área adv.': 0.1
  },
  'Centroavante Referência': {
    'Desafios aéreos vencidos, %': 0.4,
    'Disputas de bolas aéreas / com sucesso': 0.3,
    'Ações na área adv.': 0.2,
    'Gols': 0.1
  }
};

/**
 * Mapeia a posição do CSV para as categorias de perfis disponíveis
 */
export const POSICAO_TO_PERFIS = {
  'GK': ['Goleiro Defensor da Meta', 'Goleiro Construtor'],
  'LD': ['Lateral Ofensivo', 'Lateral Construtor', 'Lateral Físico', 'Lateral Defensivo'],
  'LE': ['Lateral Ofensivo', 'Lateral Construtor', 'Lateral Físico', 'Lateral Defensivo'],
  'RD': ['Lateral Ofensivo', 'Lateral Construtor', 'Lateral Físico', 'Lateral Defensivo'],
  'ZAG': ['Zagueiro Defensor de Área', 'Zagueiro Construtor', 'Zagueiro Veloz', 'Zagueiro Físico'],
  'DC': ['Zagueiro Defensor de Área', 'Zagueiro Construtor', 'Zagueiro Veloz'],
  'VOL': ['Volante Defensivo', 'Volante Construtor', 'Volante Organizador', 'Volante Dinâmico'],
  'MC': ['Volante Construtor', '2º Volante Área a Área', '2º Volante de Infiltração'],
  'MEI': ['Meia Criativo', 'Meia Finalizador', 'Meia Dinâmico'],
  'ATA': ['Centroavante Finalizador', 'Centroavante Referência', 'Centroavante Móvel'],
  'EXT': ['Extremo Driblador', 'Extremo Vertical', 'Extremo Finalizador', 'Extremo Construtor'],
  'SA': ['Segundo Atacante', 'Meia Finalizador']
};
