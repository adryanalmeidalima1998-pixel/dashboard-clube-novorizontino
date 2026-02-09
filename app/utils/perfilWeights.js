/**
 * Pesos das métricas por Perfil Técnico (Atualizado para o novo CSV)
 * Cada perfil tem um conjunto de métricas e seus respectivos pesos (totalizando 1.0)
 * As métricas correspondem exatamente às colunas do novo CSV
 */

export const PERFIL_WEIGHTS = {
  // ═══════════════════════════════════════════
  // LATERAIS (Exemplo detalhado conforme solicitação)
  // ═══════════════════════════════════════════

  'Lateral Construtor': {
    'Passes progressivos': 0.30,
    'Passa para o terço final': 0.30,
    'Passes chave': 0.20,
    'Passes precisos %': 0.20
  },
  'Lateral Ofensivo': {
    'Dribles': 0.25,
    'Cruzamentos': 0.25,
    '% de precisão nos cruzamentos': 0.15,
    'xA': 0.20,
    'Assistências': 0.15
  },
  'Lateral Defensivo': {
    'Disputas defensivas ganhas, %': 0.30,
    'Disputas na defesa': 0.20,
    'Interceptações': 0.25,
    'Desafios aéreos vencidos, %': 0.25
  },
  'Lateral Equilibrado': {
    'Passes progressivos': 0.20,
    'Cruzamentos': 0.20,
    'Disputas defensivas ganhas, %': 0.20,
    'Interceptações': 0.20,
    'Dribles': 0.20
  },
  'Lateral Físico': {
    'Disputas na defesa': 0.30,
    'Disputas ofensivas ganhas, %': 0.20,
    'Disputas aéreas': 0.20,
    'Minutos jogados': 0.30
  },
  'Lateral Dinâmico': {
    'Partidas jogadas': 0.20,
    'Minutos jogados': 0.20,
    'Passes progressivos': 0.20,
    'Disputas na defesa': 0.20,
    'Bolas recuperadas': 0.20
  },

  // ═══════════════════════════════════════════
  // ZAGUEIROS
  // ═══════════════════════════════════════════

  'Zagueiro Defensor de Área': {
    'Disputas defensivas ganhas, %': 0.35,
    'Desafios aéreos vencidos, %': 0.35,
    'Interceptações': 0.15,
    'Rebotes': 0.15
  },
  'Zagueiro Construtor': {
    'Passes precisos %': 0.30,
    'Passes progressivos': 0.30,
    'Passes longos': 0.20,
    'Passa para o terço final': 0.20
  },
  'Zagueiro Gestor de Espaço': {
    'Interceptações': 0.40,
    'Bolas recuperadas': 0.30,
    'Disputas defensivas ganhas, %': 0.30
  },
  'Zagueiro Veloz': {
    'Bolas recuperadas': 0.35,
    'Bolas recuperadas no campo do adversário': 0.25,
    'Interceptações': 0.20,
    'Desafios aéreos vencidos, %': 0.20
  },
  'Zagueiro Agressivo': {
    'Desarmes': 0.40,
    'Disputas na defesa': 0.30,
    'Interceptações': 0.30
  },
  'Zagueiro Físico': {
    'Desafios aéreos vencidos, %': 0.30,
    'Disputas defensivas ganhas, %': 0.30,
    'Minutos jogados': 0.40
  },

  // ═══════════════════════════════════════════
  // VOLANTES
  // ═══════════════════════════════════════════

  'Volante Defensivo': {
    'Desarmes': 0.30,
    'Interceptações': 0.30,
    'Disputas defensivas ganhas, %': 0.20,
    'Bolas recuperadas': 0.20
  },
  'Volante Construtor': {
    'Passes precisos %': 0.30,
    'Passes progressivos': 0.30,
    'Passa para o terço final': 0.20,
    'Passes chave': 0.20
  },
  'Volante Organizador': {
    'Passes precisos %': 0.40,
    'Passes': 0.30,
    'Passes chave': 0.30
  },
  'Volante Gestor de Espaço': {
    'Interceptações': 0.40,
    'Bolas recuperadas': 0.30,
    'Disputas defensivas ganhas, %': 0.30
  },
  'Volante Dinâmico': {
    'Passes progressivos': 0.25,
    'Disputas na defesa': 0.25,
    'Bolas recuperadas': 0.25,
    'Minutos jogados': 0.25
  },
  'Volante Físico': {
    'Disputas na defesa': 0.30,
    'Disputas aéreas': 0.30,
    'Minutos jogados': 0.40
  },

  // ═══════════════════════════════════════════
  // MEIAS / MÉDIOS
  // ═══════════════════════════════════════════

  'Meia Finalizador': {
    'Gols': 0.40,
    'Chutes': 0.30,
    'Xg': 0.30
  },
  'Meia Criativo': {
    'Chances criadas': 0.30,
    'Passes chave': 0.30,
    'xA': 0.20,
    'Assistências': 0.20
  },
  'Meia Dinâmico': {
    'Passes progressivos': 0.25,
    'Disputas no ataque': 0.25,
    'Dribles': 0.25,
    'Minutos jogados': 0.25
  },

  // ═══════════════════════════════════════════
  // EXTREMOS
  // ═══════════════════════════════════════════

  'Extremo Construtor': {
    'Passes chave': 0.30,
    'Passes progressivos': 0.30,
    'Passes precisos %': 0.20,
    'Chances criadas': 0.20
  },
  'Extremo Vertical': {
    'Dribles no último terço do campo': 0.30,
    'Cruzamentos': 0.30,
    'Chances criadas': 0.20,
    'Passes progressivos': 0.20
  },
  'Extremo Finalizador': {
    'Gols': 0.40,
    'Chutes': 0.30,
    'Xg': 0.30
  },
  'Extremo Driblador': {
    'Dribles': 0.40,
    '% de dribles com sucesso': 0.30,
    'Dribles no último terço do campo': 0.30
  },
  'Extremo Físico': {
    'Disputas ofensivas ganhas, %': 0.30,
    'Dribles': 0.30,
    'Minutos jogados': 0.40
  },
  'Extremo Tático': {
    'Bolas recuperadas': 0.30,
    'Disputas na defesa': 0.30,
    'Passes precisos %': 0.20,
    'Minutos jogados': 0.20
  },

  // ═══════════════════════════════════════════
  // ATACANTES
  // ═══════════════════════════════════════════

  'Centroavante Referência': {
    'Disputas aéreas': 0.40,
    'Desafios aéreos vencidos, %': 0.30,
    'Gols de cabeça': 0.30
  },
  'Centroavante Finalizador': {
    'Gols': 0.40,
    'Xg': 0.30,
    'Chutes no gol, %': 0.30
  },
  'Centroavante Móvel': {
    'Dribles': 0.25,
    'Chances criadas': 0.25,
    'Assistências': 0.25,
    'Disputas no ataque': 0.25
  },
  'Centroavante Físico': {
    'Disputas no ataque': 0.30,
    'Disputas aéreas': 0.30,
    'Minutos jogados': 0.40
  },
  'Segundo Atacante': {
    'Chances criadas': 0.25,
    'Passes chave': 0.25,
    'Gols': 0.25,
    'Assistências': 0.25
  }
};

/**
 * Mapeia o código de posição do CSV para as categorias de perfis disponíveis
 */
export const POSICAO_TO_PERFIS = {
  'LATERAL DIREITO': [
    'Lateral Construtor', 'Lateral Ofensivo', 'Lateral Defensivo', 'Lateral Equilibrado', 'Lateral Físico', 'Lateral Dinâmico'
  ],
  'LATERAL ESQUERDO': [
    'Lateral Construtor', 'Lateral Ofensivo', 'Lateral Defensivo', 'Lateral Equilibrado', 'Lateral Físico', 'Lateral Dinâmico'
  ],
  'ZAGUEIRO': ['Zagueiro Defensor de Área', 'Zagueiro Construtor', 'Zagueiro Gestor de Espaço', 'Zagueiro Veloz', 'Zagueiro Agressivo', 'Zagueiro Físico'],
  'VOLANTE': ['Volante Defensivo', 'Volante Construtor', 'Volante Organizador', 'Volante Gestor de Espaço', 'Volante Dinâmico', 'Volante Físico'],
  'MÉDIO': ['Volante Construtor', 'Volante Organizador', 'Volante Dinâmico', 'Meia Finalizador', 'Meia Criativo', 'Meia Dinâmico'], // Médio pode ter perfis de volante ou meia
  'MEIA': ['Meia Finalizador', 'Meia Criativo', 'Meia Dinâmico'],
  'EXTREMO': ['Extremo Construtor', 'Extremo Vertical', 'Extremo Finalizador', 'Extremo Driblador', 'Extremo Físico', 'Extremo Tático'],
  'SEGUNDO ATACANTE': ['Segundo Atacante', 'Centroavante Móvel'],
  'ATACANTE': ['Centroavante Finalizador', 'Centroavante Referência', 'Centroavante Móvel', 'Centroavante Físico']
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
  'Lateral Equilibrado': 'Combinação equilibrada entre defesa, construção e ataque.',
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
