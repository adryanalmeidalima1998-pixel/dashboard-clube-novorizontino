/**
 * Pesos das métricas por Perfil Técnico
 * Cada perfil tem um conjunto de métricas e seus respectivos pesos (totalizando 1.0)
 * As métricas correspondem exatamente às colunas do CSV
 */

export const PERFIL_WEIGHTS = {

  // ═══════════════════════════════════════════
  // GOLEIROS
  // ═══════════════════════════════════════════

  'Goleiro Defensor da Meta': {
    'Disputas defensivas ganhas, %': 0.30,
    'Rebotes': 0.25,
    'Bolas recuperadas': 0.25,
    'Ações / com sucesso %': 0.20
  },
  'Goleiro Defensor do Setor': {
    'Disputas aéreas': 0.30,
    'Desafios aéreos vencidos, %': 0.25,
    'Bolas recuperadas': 0.25,
    'Interceptações': 0.20
  },
  'Goleiro Líder': {
    'Ações totais': 0.30,
    'Passes precisos %': 0.25,
    'Minutos jogados': 0.25,
    'Escalações no time titular': 0.20
  },
  'Goleiro Construtor': {
    'Passes precisos %': 0.25,
    'Passes longos': 0.25,
    'Passes longos, precisos, %': 0.25,
    'Passes progressivos': 0.25
  },

  // ═══════════════════════════════════════════
  // LATERAIS
  // ═══════════════════════════════════════════

  'Lateral Construtor': {
    'Passes precisos %': 0.25,
    'Passes progressivos': 0.25,
    'Passa para o terço final': 0.25,
    'Ações / com sucesso %': 0.25
  },
  'Lateral Físico': {
    'Desafios vencidos, %': 0.25,
    'Ações totais': 0.25,
    'Disputas na defesa': 0.25,
    'Minutos jogados': 0.25
  },
  'Lateral Ofensivo': {
    'Cruzamentos': 0.25,
    'Chances criadas': 0.25,
    'Ações na área adv.': 0.25,
    'Assistências': 0.25
  },
  'Lateral Defensivo': {
    'Desarmes': 0.25,
    'Interceptações': 0.25,
    'Disputas defensivas ganhas, %': 0.25,
    'Bolas recuperadas': 0.25
  },
  'Lateral Dinâmico': {
    'Ações totais': 0.20,
    'Ações / com sucesso %': 0.20,
    'Entradas no terço final': 0.20,
    'Passes progressivos': 0.20,
    'Disputas na defesa': 0.20
  },

  // ═══════════════════════════════════════════
  // ZAGUEIROS
  // ═══════════════════════════════════════════

  'Zagueiro Defensor de Área': {
    'Disputas defensivas ganhas, %': 0.30,
    'Desafios aéreos vencidos, %': 0.30,
    'Interceptações': 0.20,
    'Bolas recuperadas': 0.20
  },
  'Zagueiro Construtor': {
    'Passes precisos %': 0.25,
    'Passes longos': 0.25,
    'Passes progressivos': 0.25,
    'Passa para o terço final': 0.25
  },
  'Zagueiro Gestor de Espaço': {
    'Interceptações': 0.30,
    'Bolas recuperadas': 0.30,
    'Disputas defensivas ganhas, %': 0.20,
    'Ações / com sucesso %': 0.20
  },
  'Zagueiro Veloz': {
    'Bolas recuperadas': 0.25,
    'Bolas recuperadas no campo do adversário': 0.25,
    'Interceptações': 0.25,
    'Desafios vencidos, %': 0.25
  },
  'Zagueiro Agressivo': {
    'Desarmes': 0.30,
    'Desafios vencidos, %': 0.25,
    'Disputas na defesa': 0.25,
    'Interceptações': 0.20
  },
  'Zagueiro Físico': {
    'Desafios aéreos vencidos, %': 0.25,
    'Disputas defensivas ganhas, %': 0.25,
    'Desafios vencidos, %': 0.25,
    'Ações totais': 0.25
  },

  // ═══════════════════════════════════════════
  // VOLANTES
  // ═══════════════════════════════════════════

  'Volante Defensivo': {
    'Desarmes': 0.25,
    'Interceptações': 0.25,
    'Disputas defensivas ganhas, %': 0.25,
    'Bolas recuperadas': 0.25
  },
  'Volante Construtor': {
    'Passes precisos %': 0.25,
    'Passes progressivos': 0.25,
    'Passa para o terço final': 0.25,
    'Passes chave': 0.25
  },
  'Volante Organizador': {
    'Passes precisos %': 0.30,
    'Passes': 0.25,
    'Ações / com sucesso %': 0.25,
    'Passes chave': 0.20
  },
  'Volante Gestor de Espaço': {
    'Interceptações': 0.30,
    'Bolas recuperadas': 0.25,
    'Disputas defensivas ganhas, %': 0.25,
    'Ações / com sucesso %': 0.20
  },
  'Volante Dinâmico': {
    'Ações totais': 0.20,
    'Ações / com sucesso %': 0.20,
    'Disputas na defesa': 0.20,
    'Passes progressivos': 0.20,
    'Entradas no terço final': 0.20
  },
  'Volante Físico': {
    'Desafios vencidos, %': 0.25,
    'Disputas na defesa': 0.25,
    'Ações totais': 0.25,
    'Disputas aéreas': 0.25
  },

  // ═══════════════════════════════════════════
  // 2º VOLANTES (MÉDIOS)
  // ═══════════════════════════════════════════

  '2º Volante Construtor': {
    'Passes precisos %': 0.25,
    'Passes progressivos': 0.25,
    'Passa para o terço final': 0.25,
    'Passes chave': 0.25
  },
  '2º Volante Área a Área': {
    'Ações totais': 0.25,
    'Entradas no terço final': 0.25,
    'Disputas na defesa': 0.25,
    'Ações / com sucesso %': 0.25
  },
  '2º Volante de Infiltração': {
    'Ações na área adv.': 0.25,
    'Entradas no terço final': 0.25,
    'Chutes': 0.25,
    'Gols': 0.25
  },
  '2º Volante Defensivo': {
    'Desarmes': 0.25,
    'Interceptações': 0.25,
    'Disputas defensivas ganhas, %': 0.25,
    'Bolas recuperadas': 0.25
  },

  // ═══════════════════════════════════════════
  // MEIAS
  // ═══════════════════════════════════════════

  'Meia Finalizador': {
    'Gols': 0.30,
    'Chutes': 0.25,
    'Xg': 0.25,
    'Ações na área adv.': 0.20
  },
  'Meia Criativo': {
    'Chances criadas': 0.25,
    'Passes chave': 0.25,
    'xA': 0.25,
    'Assistências': 0.25
  },
  'Meia Dinâmico': {
    'Ações totais': 0.20,
    'Ações / com sucesso %': 0.20,
    'Passes progressivos': 0.20,
    'Entradas no terço final': 0.20,
    'Disputas no ataque': 0.20
  },

  // ═══════════════════════════════════════════
  // EXTREMOS
  // ═══════════════════════════════════════════

  'Extremo Construtor': {
    'Passes chave': 0.25,
    'Chances criadas': 0.25,
    'Passes progressivos': 0.25,
    'Ações / com sucesso %': 0.25
  },
  'Extremo Vertical': {
    'Entradas no terço final': 0.25,
    'Cruzamentos': 0.25,
    'Ações na área adv.': 0.25,
    'Chances criadas': 0.25
  },
  'Extremo Finalizador': {
    'Gols': 0.30,
    'Chutes': 0.25,
    'Xg': 0.25,
    'Ações na área adv.': 0.20
  },
  'Extremo Driblador': {
    'Dribles': 0.30,
    '% de dribles com sucesso': 0.25,
    'Dribles no último terço do campo': 0.25,
    'Disputas ofensivas ganhas, %': 0.20
  },
  'Extremo Físico': {
    'Desafios vencidos, %': 0.25,
    'Disputas ofensivas ganhas, %': 0.25,
    'Ações totais': 0.25,
    'Entradas no terço final carregando a bola': 0.25
  },
  'Extremo Tático': {
    'Ações totais': 0.20,
    'Ações / com sucesso %': 0.20,
    'Bolas recuperadas': 0.20,
    'Disputas na defesa': 0.20,
    'Passes precisos %': 0.20
  },

  // ═══════════════════════════════════════════
  // SEGUNDO ATACANTE
  // ═══════════════════════════════════════════

  'Segundo Atacante': {
    'Chances criadas': 0.20,
    'Passes chave': 0.20,
    'Gols': 0.20,
    'Assistências': 0.20,
    'Ações na área adv.': 0.20
  },

  // ═══════════════════════════════════════════
  // CENTROAVANTES (ATACANTES)
  // ═══════════════════════════════════════════

  'Centroavante Referência': {
    'Desafios aéreos vencidos, %': 0.30,
    'Disputas aéreas': 0.25,
    'Header': 0.25,
    'Ações na área adv.': 0.20
  },
  'Centroavante Finalizador': {
    'Gols': 0.30,
    'Xg': 0.25,
    'Chutes no gol, %': 0.25,
    'Ações na área adv.': 0.20
  },
  'Centroavante Móvel': {
    'Ações totais': 0.20,
    'Entradas no terço final': 0.20,
    'Chances criadas': 0.20,
    'Assistências': 0.20,
    'Ações / com sucesso %': 0.20
  },
  'Centroavante Físico': {
    'Desafios vencidos, %': 0.25,
    'Disputas ofensivas ganhas, %': 0.25,
    'Disputas aéreas': 0.25,
    'Ações totais': 0.25
  }
};

/**
 * Mapeia a posição do CSV (novos nomes) para as categorias de perfis disponíveis
 */
export const POSICAO_TO_PERFIS = {
  'LATERAL DIREITO': [
    'Lateral Construtor', 'Lateral Físico', 'Lateral Ofensivo',
    'Lateral Defensivo', 'Lateral Dinâmico'
  ],
  'LATERAL ESQUERDO': [
    'Lateral Construtor', 'Lateral Físico', 'Lateral Ofensivo',
    'Lateral Defensivo', 'Lateral Dinâmico'
  ],
  'ZAGUEIRO': [
    'Zagueiro Defensor de Área', 'Zagueiro Construtor', 'Zagueiro Gestor de Espaço',
    'Zagueiro Veloz', 'Zagueiro Agressivo', 'Zagueiro Físico'
  ],
  'VOLANTE': [
    'Volante Defensivo', 'Volante Construtor', 'Volante Organizador',
    'Volante Gestor de Espaço', 'Volante Dinâmico', 'Volante Físico'
  ],
  'MÉDIO': [
    '2º Volante Construtor', '2º Volante Área a Área',
    '2º Volante de Infiltração', '2º Volante Defensivo'
  ],
  'MEIA': [
    'Meia Finalizador', 'Meia Criativo', 'Meia Dinâmico'
  ],
  'EXTREMO': [
    'Extremo Construtor', 'Extremo Vertical', 'Extremo Finalizador',
    'Extremo Driblador', 'Extremo Físico', 'Extremo Tático'
  ],
  'SEGUNDO ATACANTE': [
    'Segundo Atacante', 'Meia Finalizador', 'Meia Criativo'
  ],
  'ATACANTE': [
    'Centroavante Finalizador', 'Centroavante Referência',
    'Centroavante Móvel', 'Centroavante Físico'
  ]
};

/**
 * Descrições dos perfis técnicos
 */
export const PERFIL_DESCRICOES = {
  'Goleiro Defensor da Meta': 'Se destaca por sua capacidade de defender a meta.',
  'Goleiro Defensor do Setor': 'Se destaca por sua capacidade de defender a área (saídas aéreas, coberturas). Proativo.',
  'Goleiro Líder': 'Se destaca por sua capacidade de comunicação e liderança.',
  'Goleiro Construtor': 'Se destaca por sua capacidade de jogo com os pés.',
  'Lateral Construtor': 'Se destaca pelo jogo associativo. Mais combinação, menos ultrapassagem.',
  'Lateral Físico': 'Se destaca por capacidades físicas. Volume, intensidade e sucesso em duelos.',
  'Lateral Ofensivo': 'Se destaca por ser influente no ataque.',
  'Lateral Defensivo': 'Se destaca pelas características defensivas.',
  'Lateral Dinâmico': 'Se destaca pela adaptação a diferentes cenários. Boa mobilidade.',
  'Zagueiro Defensor de Área': 'Se destaca pela capacidade de defender a área, vencendo duelos e protegendo a meta.',
  'Zagueiro Construtor': 'Se destaca pela capacidade de construção, ativo para verticalizar com passes.',
  'Zagueiro Gestor de Espaço': 'Se destaca pelo posicionamento, interceptações e boas leituras.',
  'Zagueiro Veloz': 'Se destaca pela velocidade, capaz de jogar em linha alta com boas coberturas.',
  'Zagueiro Agressivo': 'Se destaca pela abordagem agressiva, tende a saltar da linha e antecipar.',
  'Zagueiro Físico': 'Se destaca pelos atributos físicos (força, velocidade, potência).',
  'Volante Defensivo': 'Se destaca pelas qualidades defensivas, pouco influente com bola.',
  'Volante Construtor': 'Se destaca pela capacidade de construção e verticalidade no passe.',
  'Volante Organizador': 'Se destaca pela capacidade associativa, participativo e joga curto.',
  'Volante Gestor de Espaço': 'Se destaca pela capacidade posicional. Menos móvel, guarda a posição.',
  'Volante Dinâmico': 'Se destaca pela adaptação a diferentes cenários. Boa mobilidade.',
  'Volante Físico': 'Se destaca pelos atributos físicos (força, velocidade, potência).',
  '2º Volante Construtor': 'Se destaca pela capacidade de construção e verticalidade no passe.',
  '2º Volante Área a Área': 'Se destaca por atuar entre intermediária ofensiva e defensiva. Bom volume.',
  '2º Volante de Infiltração': 'Se destaca pela capacidade de atacar a última linha e entrar na área.',
  '2º Volante Defensivo': 'Se destaca pelas qualidades defensivas.',
  'Meia Finalizador': 'Se destaca pela alta influência com finalizações. Chega bem na área.',
  'Meia Criativo': 'Se destaca pela influência no último terço. Técnico e inteligente.',
  'Meia Dinâmico': 'Se destaca pela mobilidade e capacidade associativa. Versátil.',
  'Extremo Construtor': 'Se destaca por atuar entrelinhas, móvel. Característica de meia.',
  'Extremo Vertical': 'Se destaca pela verticalidade. Boa capacidade de progredir e gerar volume.',
  'Extremo Finalizador': 'Se destaca pelo volume de finalizações. Chega na área.',
  'Extremo Driblador': 'Se destaca por gerar desequilíbrio no 1x1 ofensivo.',
  'Extremo Físico': 'Se destaca pelos atributos físicos (velocidade, potência, força).',
  'Extremo Tático': 'Se destaca pela taxa de trabalho e comprometimento tático.',
  'Segundo Atacante': 'Se destaca pela atuação complementar ao centroavante. Influente fora da área.',
  'Centroavante Referência': 'Se destaca por atuar fixo entre zagueiros. Alvo em bolas longas.',
  'Centroavante Finalizador': 'Se destaca pela capacidade de finalização. Bom posicionamento.',
  'Centroavante Móvel': 'Se destaca pela boa mobilidade. Bons movimentos de apoio e ruptura.',
  'Centroavante Físico': 'Se destaca pelos atributos físicos. Vencedor nas disputas.'
};
