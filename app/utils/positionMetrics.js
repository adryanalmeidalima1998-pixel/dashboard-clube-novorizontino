/**
 * ═══════════════════════════════════════════════════════════════
 *  MÉTRICAS POR POSIÇÃO — Grêmio Novorizontino Dashboard
 *
 *  Define para cada posição:
 *    - radarMetrics: 10 métricas do radar (com normalização percentílica)
 *    - scatterPlots: 5 gráficos de dispersão estratégicos
 *
 *  xType / yType:
 *    'per90'   → valor bruto da coluna dividido por minutos * 90
 *    'raw'     → valor direto da coluna (já é %, percentual ou valor calculado)
 *    'realPer90' → (volume × % sucesso) / minutos * 90  (requires pctKey)
 * ═══════════════════════════════════════════════════════════════
 */

// ─── Mapeamento de nomes de posição para chave padrão ────────────────────────
export const POSICAO_MAP = {
  // Goleiros
  'Goleiro': 'GOLEIRO', 'GK': 'GOLEIRO', 'GL': 'GOLEIRO',

  // Zagueiros
  'Zagueiro': 'ZAGUEIRO', 'ZAG': 'ZAGUEIRO', 'CB': 'ZAGUEIRO',
  'Zagueiro Central': 'ZAGUEIRO', 'DC': 'ZAGUEIRO',

  // Laterais
  'Lateral': 'LATERAL', 'Lateral Direito': 'LATERAL', 'Lateral Esquerdo': 'LATERAL',
  'LD': 'LATERAL', 'LE': 'LATERAL', 'LAT': 'LATERAL', 'RB': 'LATERAL', 'LB': 'LATERAL',
  'WB': 'LATERAL',

  // Volantes
  'Volante': 'VOLANTE', 'VOL': 'VOLANTE', 'DM': 'VOLANTE', 'CDM': 'VOLANTE',
  'Pivô': 'VOLANTE', 'Médio Defensivo': 'VOLANTE',

  // Meias
  'Meia': 'MEIA', 'MEI': 'MEIA', 'MC': 'MEIA', 'CM': 'MEIA',
  'Meia Central': 'MEIA', 'Meia Ofensivo': 'MEIA', 'Meia Atacante': 'MEIA',
  'CAM': 'MEIA', 'AM': 'MEIA', '10': 'MEIA',

  // Extremos
  'Extremo': 'EXTREMO', 'EXT': 'EXTREMO', 'Ponta': 'EXTREMO',
  'Ala': 'EXTREMO', 'RW': 'EXTREMO', 'LW': 'EXTREMO',
  'Extremo Direito': 'EXTREMO', 'Extremo Esquerdo': 'EXTREMO',

  // Atacantes
  'Atacante': 'ATACANTE', 'ATK': 'ATACANTE', 'ST': 'ATACANTE',
  'CF': 'ATACANTE', 'FW': 'ATACANTE', 'Centroavante': 'ATACANTE',
  '2º Atacante': 'ATACANTE', 'Segundo Atacante': 'ATACANTE',
};

/**
 * Normaliza o nome da posição para a chave padrão.
 * Ex: "Lateral Direito" → "LATERAL"
 */
export function normalizePosicao(posicao) {
  if (!posicao) return null;
  const p = posicao.trim();
  if (POSICAO_MAP[p]) return POSICAO_MAP[p];
  // fallback: busca case-insensitive
  const upper = p.toUpperCase();
  for (const [key, val] of Object.entries(POSICAO_MAP)) {
    if (key.toUpperCase() === upper) return val;
  }
  return null;
}

// ─── CONFIGURAÇÕES POR POSIÇÃO ───────────────────────────────────────────────

export const POSITION_METRICS = {

  // ════════════════════════════════════════════════════════════
  //  ZAGUEIRO
  // ════════════════════════════════════════════════════════════
  ZAGUEIRO: {
    label: 'Zagueiro',
    cor: '#3b82f6',

    radarMetrics: [
      {
        label: 'Desafios Vencidos/90',
        key: 'Desafios vencidos',
        type: 'per90',
        max: 8,
        description: 'Agressividade + eficiência defensiva',
      },
      {
        label: 'Duelos Aéreos/90',
        key: 'Duelos aéreos vencidos',
        type: 'per90',
        max: 6,
        description: 'Domínio aéreo',
      },
      {
        label: 'Desarmes/90',
        key: 'Desarmes bem-sucedidos',
        type: 'per90',
        max: 5,
        description: 'Capacidade de recuperar a bola',
      },
      {
        label: 'Interceptações/90',
        key: 'Interceptações',
        type: 'per90',
        max: 6,
        description: 'Leitura posicional',
      },
      {
        label: 'Bolas Rec./90',
        key: 'Bolas recuperadas',
        type: 'per90',
        max: 10,
        description: 'Recuperação geral de bola',
      },
      {
        label: 'Passes Prog./90',
        key: 'Passes progressivos',
        type: 'per90',
        max: 8,
        description: 'Construção saindo de trás',
      },
      {
        label: 'Passes 1/3 Final/90',
        key: 'Passes para o terço final',
        type: 'per90',
        max: 5,
        description: 'Quebra de linha',
      },
      {
        label: 'Passes Longos/90',
        key: 'Passes longos precisos',
        type: 'per90',
        max: 6,
        description: 'Capacidade de lançamento',
      },
      {
        label: 'xG',
        key: 'xG',
        type: 'raw',
        max: 3,
        description: 'Ameaça ofensiva (bola parada)',
      },
      {
        label: 'Ações Área Adv./90',
        key: 'Ações na área adversária bem-sucedidas',
        type: 'per90',
        max: 2,
        description: 'Impacto ofensivo híbrido',
      },
    ],

    scatterPlots: [
      {
        id: 'zag-fisico',
        titulo: 'Dominância Física',
        subtitulo: 'Desafios vencidos/90 × Duelos aéreos vencidos/90',
        xLabel: 'Desafios Vencidos/90',
        yLabel: 'Duelos Aéreos/90',
        xKey: 'Desafios vencidos',
        yKey: 'Duelos aéreos vencidos',
        xType: 'per90',
        yType: 'per90',
        insight: 'Quadrante ↗ = zagueiro elite físico',
      },
      {
        id: 'zag-posicional',
        titulo: 'Defesa Posicional',
        subtitulo: 'Interceptações/90 × Desarmes/90',
        xLabel: 'Interceptações/90',
        yLabel: 'Desarmes/90',
        xKey: 'Interceptações',
        yKey: 'Desarmes bem-sucedidos',
        xType: 'per90',
        yType: 'per90',
        insight: 'Diferencia reativo vs inteligente posicional',
      },
      {
        id: 'zag-construcao',
        titulo: 'Construção Vertical',
        subtitulo: 'Passes progressivos/90 × Passes 1/3 final/90',
        xLabel: 'Passes Progressivos/90',
        yLabel: 'Passes 1/3 Final/90',
        xKey: 'Passes progressivos',
        yKey: 'Passes para o terço final',
        xType: 'per90',
        yType: 'per90',
        insight: 'Mostra quem realmente quebra linha',
      },
      {
        id: 'zag-lancamento',
        titulo: 'Lançador vs Seguro',
        subtitulo: 'Passes longos precisos/90 × Passes progressivos/90',
        xLabel: 'Passes Longos/90',
        yLabel: 'Passes Progressivos/90',
        xKey: 'Passes longos precisos',
        yKey: 'Passes progressivos',
        xType: 'per90',
        yType: 'per90',
        insight: 'Diferencia zagueiro lançador de zagueiro seguro',
      },
      {
        id: 'zag-seguranca',
        titulo: 'Segurança vs Risco',
        subtitulo: 'Passes precisos % × Bolas perdidas no próprio campo',
        xLabel: 'Passes Precisos %',
        yLabel: 'Bolas Perdidas Próprio Campo',
        xKey: 'Passes precisos,%',
        yKey: 'Bolas perdidas no próprio campo',
        xType: 'raw',
        yType: 'per90',
        insight: 'Quem constrói com segurança vs quem compromete',
      },
    ],
  },

  // ════════════════════════════════════════════════════════════
  //  LATERAL
  // ════════════════════════════════════════════════════════════
  LATERAL: {
    label: 'Lateral',
    cor: '#10b981',

    radarMetrics: [
      {
        label: 'Desafios Vencidos/90',
        key: 'Desafios vencidos',
        type: 'per90',
        max: 7,
        description: 'Duelo defensivo',
      },
      {
        label: 'Disputas Def./90',
        key: 'Disputas defensivas ganhas',
        type: 'per90',
        max: 6,
        description: 'Solidez defensiva',
      },
      {
        label: 'Interceptações/90',
        key: 'Interceptações',
        type: 'per90',
        max: 5,
        description: 'Leitura defensiva',
      },
      {
        label: 'Passes Prog./90',
        key: 'Passes progressivos',
        type: 'per90',
        max: 8,
        description: 'Progressão pelo passe',
      },
      {
        label: 'Entradas 1/3/90',
        key: 'Entradas no terço final',
        type: 'per90',
        max: 6,
        description: 'Penetração no terço final',
      },
      {
        label: 'Condução 1/3/90',
        key: 'Entradas no terço final carregando a bola',
        type: 'per90',
        max: 4,
        description: 'Progressão conduzindo',
      },
      {
        label: 'Cruzamentos/90',
        key: 'Cruzamentos precisos',
        type: 'per90',
        max: 3,
        description: 'Criação pela ala',
      },
      {
        label: 'Chances Criadas/90',
        key: 'Chances criadas',
        type: 'per90',
        max: 3,
        description: 'Impacto criativo',
      },
      {
        label: 'Ações Área Adv./90',
        key: 'Ações na área adversária bem-sucedidas',
        type: 'per90',
        max: 2,
        description: 'Presença ofensiva',
      },
      {
        label: 'xA',
        key: 'xA',
        type: 'raw',
        max: 5,
        description: 'Assistências esperadas',
      },
    ],

    scatterPlots: [
      {
        id: 'lat-agressivo',
        titulo: 'Lateral Agressivo vs Passivo',
        subtitulo: 'Entradas no 1/3 final/90 × Ações na área adversária/90',
        xLabel: 'Entradas 1/3 Final/90',
        yLabel: 'Ações Área Adversária/90',
        xKey: 'Entradas no terço final',
        yKey: 'Ações na área adversária bem-sucedidas',
        xType: 'per90',
        yType: 'per90',
        insight: 'Quadrante ↗ = lateral realmente influente no ataque',
      },
      {
        id: 'lat-progressao',
        titulo: 'Progressão Técnica',
        subtitulo: 'Passes progressivos/90 × Condução 1/3 final/90',
        xLabel: 'Passes Progressivos/90',
        yLabel: 'Condução 1/3 Final/90',
        xKey: 'Passes progressivos',
        yKey: 'Entradas no terço final carregando a bola',
        xType: 'per90',
        yType: 'per90',
        insight: 'Quebra de linha pelo passe vs pela condução',
      },
      {
        id: 'lat-defesa',
        titulo: 'Solidez Defensiva 1x1',
        subtitulo: 'Desafios vencidos/90 × Disputas defensivas/90',
        xLabel: 'Desafios Vencidos/90',
        yLabel: 'Disputas Defensivas/90',
        xKey: 'Desafios vencidos',
        yKey: 'Disputas defensivas ganhas',
        xType: 'per90',
        yType: 'per90',
        insight: 'Lateral sólido defensivamente',
      },
      {
        id: 'lat-criacao',
        titulo: 'Criação pela Ala',
        subtitulo: 'Cruzamentos precisos/90 × Chances criadas/90',
        xLabel: 'Cruzamentos Precisos/90',
        yLabel: 'Chances Criadas/90',
        xKey: 'Cruzamentos precisos',
        yKey: 'Chances criadas',
        xType: 'per90',
        yType: 'per90',
        insight: 'Criador real vs apenas cruzador',
      },
      {
        id: 'lat-seguranca',
        titulo: 'Progressão com Segurança',
        subtitulo: 'Passes progressivos/90 × Bolas perdidas no próprio campo',
        xLabel: 'Passes Progressivos/90',
        yLabel: 'Bolas Perdidas Próprio Campo',
        xKey: 'Passes progressivos',
        yKey: 'Bolas perdidas no próprio campo',
        xType: 'per90',
        yType: 'per90',
        insight: 'Quem progride com segurança vs quem arrisca',
      },
    ],
  },

  // ════════════════════════════════════════════════════════════
  //  VOLANTE
  // ════════════════════════════════════════════════════════════
  VOLANTE: {
    label: 'Volante',
    cor: '#f59e0b',

    radarMetrics: [
      {
        label: 'Desafios Vencidos/90',
        key: 'Desafios vencidos',
        type: 'per90',
        max: 7,
        description: 'Agressividade defensiva',
      },
      {
        label: 'Disputas Def./90',
        key: 'Disputas defensivas ganhas',
        type: 'per90',
        max: 6,
        description: 'Solidez no duelo',
      },
      {
        label: 'Interceptações/90',
        key: 'Interceptações',
        type: 'per90',
        max: 6,
        description: 'Leitura de jogo',
      },
      {
        label: 'Bolas Rec./90',
        key: 'Bolas recuperadas',
        type: 'per90',
        max: 10,
        description: 'Recuperação de bola',
      },
      {
        label: 'Passes Precisos %',
        key: 'Passes precisos,%',
        type: 'raw',
        max: 100,
        description: 'Controle e circulação',
      },
      {
        label: 'Passes Prog./90',
        key: 'Passes progressivos',
        type: 'per90',
        max: 8,
        description: 'Progressão pelo passe',
      },
      {
        label: 'Passes 1/3 Final/90',
        key: 'Passes para o terço final',
        type: 'per90',
        max: 5,
        description: 'Quebra de linha',
      },
      {
        label: 'Passes Abertos/90',
        key: 'Progressive open passes',
        type: 'per90',
        max: 5,
        description: 'Progressão por passes abertos',
      },
      {
        label: 'Entradas 1/3/90',
        key: 'Entradas no terço final',
        type: 'per90',
        max: 4,
        description: 'Chegada ao terço final',
      },
      {
        label: 'Chances Criadas/90',
        key: 'Chances criadas',
        type: 'per90',
        max: 3,
        description: 'Impacto criativo',
      },
    ],

    scatterPlots: [
      {
        id: 'vol-destruidor',
        titulo: 'Destruidor vs Posicional',
        subtitulo: 'Desafios vencidos/90 × Interceptações/90',
        xLabel: 'Desafios Vencidos/90',
        yLabel: 'Interceptações/90',
        xKey: 'Desafios vencidos',
        yKey: 'Interceptações',
        xType: 'per90',
        yType: 'per90',
        insight: 'Agressivo vs inteligente taticamente',
      },
      {
        id: 'vol-recuperacao',
        titulo: 'Domínio Defensivo',
        subtitulo: 'Bolas recuperadas/90 × Disputas defensivas/90',
        xLabel: 'Bolas Recuperadas/90',
        yLabel: 'Disputas Defensivas/90',
        xKey: 'Bolas recuperadas',
        yKey: 'Disputas defensivas ganhas',
        xType: 'per90',
        yType: 'per90',
        insight: 'Volante dominante defensivamente',
      },
      {
        id: 'vol-construcao',
        titulo: 'Construção Segura vs Progressiva',
        subtitulo: 'Passes precisos % × Passes progressivos/90',
        xLabel: 'Passes Precisos %',
        yLabel: 'Passes Progressivos/90',
        xKey: 'Passes precisos,%',
        yKey: 'Passes progressivos',
        xType: 'raw',
        yType: 'per90',
        insight: 'Volante seguro vs volante vertical',
      },
      {
        id: 'vol-quebra-linha',
        titulo: 'Quebra de Linha',
        subtitulo: 'Passes abertos progressivos/90 × Passes 1/3 final/90',
        xLabel: 'Passes Abertos Prog./90',
        yLabel: 'Passes 1/3 Final/90',
        xKey: 'Progressive open passes',
        yKey: 'Passes para o terço final',
        xType: 'per90',
        yType: 'per90',
        insight: 'Quem realmente rompe o bloco adversário',
      },
      {
        id: 'vol-transicao',
        titulo: 'Transição Ofensiva',
        subtitulo: 'Entradas no 1/3 final/90 × Chances criadas/90',
        xLabel: 'Entradas 1/3 Final/90',
        yLabel: 'Chances Criadas/90',
        xKey: 'Entradas no terço final',
        yKey: 'Chances criadas',
        xType: 'per90',
        yType: 'per90',
        insight: 'Box-to-box vs volante posicional',
      },
    ],
  },

  // ════════════════════════════════════════════════════════════
  //  MEIA
  // ════════════════════════════════════════════════════════════
  MEIA: {
    label: 'Meia',
    cor: '#8b5cf6',

    radarMetrics: [
      {
        label: 'Chances Criadas/90',
        key: 'Chances criadas',
        type: 'per90',
        max: 4,
        description: 'Volume de criação',
      },
      {
        label: 'Passes Chave/90',
        key: 'Passes chave',
        type: 'per90',
        max: 4,
        description: 'Passes que geram chance real',
      },
      {
        label: 'xA',
        key: 'xA',
        type: 'raw',
        max: 6,
        description: 'Qualidade das assistências',
      },
      {
        label: 'Passes Prog./90',
        key: 'Passes progressivos',
        type: 'per90',
        max: 10,
        description: 'Progressão pelo passe',
      },
      {
        label: 'Entradas 1/3/90',
        key: 'Entradas no terço final',
        type: 'per90',
        max: 5,
        description: 'Chegada ao terço final',
      },
      {
        label: 'Condução 1/3/90',
        key: 'Entradas no terço final carregando a bola',
        type: 'per90',
        max: 4,
        description: 'Progressão conduzindo',
      },
      {
        label: 'Passes Final./90',
        key: 'Passes para finalização',
        type: 'per90',
        max: 3,
        description: 'Passes que geram finalização',
      },
      {
        label: 'xG',
        key: 'xG',
        type: 'raw',
        max: 8,
        description: 'Ameaça de gol',
      },
      {
        label: 'Dribles/90',
        key: 'Dribles bem sucedidos',
        type: 'per90',
        max: 4,
        description: 'Desequilíbrio individual',
      },
      {
        label: 'Desafios Vencidos/90',
        key: 'Desafios vencidos',
        type: 'per90',
        max: 5,
        description: 'Contribuição defensiva',
      },
    ],

    scatterPlots: [
      {
        id: 'meia-criador',
        titulo: 'Criador Puro',
        subtitulo: 'Chances criadas/90 × xA',
        xLabel: 'Chances Criadas/90',
        yLabel: 'xA',
        xKey: 'Chances criadas',
        yKey: 'xA',
        xType: 'per90',
        yType: 'raw',
        insight: 'Volume de criação vs qualidade real das assistências',
      },
      {
        id: 'meia-progressao',
        titulo: 'Progressão: Passando vs Conduzindo',
        subtitulo: 'Passes progressivos/90 × Condução 1/3 final/90',
        xLabel: 'Passes Progressivos/90',
        yLabel: 'Condução 1/3 Final/90',
        xKey: 'Passes progressivos',
        yKey: 'Entradas no terço final carregando a bola',
        xType: 'per90',
        yType: 'per90',
        insight: 'Meia organizador vs meia condutor',
      },
      {
        id: 'meia-desequilibrio',
        titulo: 'Desequilíbrio Individual',
        subtitulo: 'Dribles bem-sucedidos/90 × Entradas 1/3 final/90',
        xLabel: 'Dribles/90',
        yLabel: 'Entradas 1/3 Final/90',
        xKey: 'Dribles bem sucedidos',
        yKey: 'Entradas no terço final',
        xType: 'per90',
        yType: 'per90',
        insight: 'Meia vertical e agressivo',
      },
      {
        id: 'meia-impacto',
        titulo: 'Impacto Direto',
        subtitulo: 'xG × Passes para finalização/90',
        xLabel: 'xG',
        yLabel: 'Passes para Finalização/90',
        xKey: 'xG',
        yKey: 'Passes para finalização',
        xType: 'raw',
        yType: 'per90',
        insight: 'Meia finalizador vs meia assistente',
      },
      {
        id: 'meia-risco',
        titulo: 'Criatividade vs Segurança',
        subtitulo: 'Passes progressivos/90 × Bolas perdidas',
        xLabel: 'Passes Progressivos/90',
        yLabel: 'Bolas Perdidas',
        xKey: 'Passes progressivos',
        yKey: 'Bolas perdidas',
        xType: 'per90',
        yType: 'per90',
        insight: 'Criativo eficiente vs inconsequente',
      },
    ],
  },

  // ════════════════════════════════════════════════════════════
  //  EXTREMO
  // ════════════════════════════════════════════════════════════
  EXTREMO: {
    label: 'Extremo',
    cor: '#f97316',

    radarMetrics: [
      {
        label: 'Dribles/90',
        key: 'Dribles bem sucedidos',
        type: 'per90',
        max: 6,
        description: 'Desequilíbrio individual',
      },
      {
        label: 'Dribles Últ. Terço/90',
        key: 'Dribles no último terço bem-sucedidos',
        type: 'per90',
        max: 4,
        description: 'Desequilíbrio no setor decisivo',
      },
      {
        label: 'Condução 1/3/90',
        key: 'Entradas no terço final carregando a bola',
        type: 'per90',
        max: 5,
        description: 'Progressão conduzindo',
      },
      {
        label: 'Passes Prog./90',
        key: 'Passes progressivos',
        type: 'per90',
        max: 7,
        description: 'Progressão pelo passe',
      },
      {
        label: 'Chances Criadas/90',
        key: 'Chances criadas',
        type: 'per90',
        max: 4,
        description: 'Volume de criação',
      },
      {
        label: 'xA',
        key: 'xA',
        type: 'raw',
        max: 6,
        description: 'Qualidade das assistências',
      },
      {
        label: 'xG',
        key: 'xG',
        type: 'raw',
        max: 8,
        description: 'Ameaça de gol',
      },
      {
        label: 'Chutes no Gol %',
        key: 'Chutes no alvo,%',
        type: 'raw',
        max: 100,
        description: 'Eficiência de finalização',
      },
      {
        label: 'Ações Área Adv./90',
        key: 'Ações na área adversária bem-sucedidas',
        type: 'per90',
        max: 4,
        description: 'Presença e impacto na área',
      },
      {
        label: 'Rec. Campo Adv./90',
        key: 'Bolas recuperadas no campo do adversário',
        type: 'per90',
        max: 4,
        description: 'Intensidade e pressão alta',
      },
    ],

    scatterPlots: [
      {
        id: 'ext-1x1',
        titulo: '1x1 Puro',
        subtitulo: 'Dribles bem-sucedidos/90 × Dribles último terço/90',
        xLabel: 'Dribles/90',
        yLabel: 'Dribles Último Terço/90',
        xKey: 'Dribles bem sucedidos',
        yKey: 'Dribles no último terço bem-sucedidos',
        xType: 'per90',
        yType: 'per90',
        insight: 'Quadrante ↗ = extremo realmente desequilibrante',
      },
      {
        id: 'ext-conducao-criacao',
        titulo: 'Condução vs Criação',
        subtitulo: 'Condução 1/3 final/90 × Chances criadas/90',
        xLabel: 'Condução 1/3 Final/90',
        yLabel: 'Chances Criadas/90',
        xKey: 'Entradas no terço final carregando a bola',
        yKey: 'Chances criadas',
        xType: 'per90',
        yType: 'per90',
        insight: 'Extremo vertical vs extremo associativo',
      },
      {
        id: 'ext-criacao-finalizacao',
        titulo: 'Criação vs Finalização',
        subtitulo: 'xA × xG',
        xLabel: 'xA',
        yLabel: 'xG',
        xKey: 'xA',
        yKey: 'xG',
        xType: 'raw',
        yType: 'raw',
        insight: 'Perfil assistente vs perfil finalizador',
      },
      {
        id: 'ext-area',
        titulo: 'Eficiência na Área',
        subtitulo: 'Ações na área adversária/90 × Chutes no alvo %',
        xLabel: 'Ações Área Adversária/90',
        yLabel: 'Chutes no Alvo %',
        xKey: 'Ações na área adversária bem-sucedidas',
        yKey: 'Chutes no alvo,%',
        xType: 'per90',
        yType: 'raw',
        insight: 'Quem impacta a área com qualidade',
      },
      {
        id: 'ext-pressao',
        titulo: 'Pressão e Impacto',
        subtitulo: 'Recuperações campo adversário/90 × xG',
        xLabel: 'Rec. Campo Adversário/90',
        yLabel: 'xG',
        xKey: 'Bolas recuperadas no campo do adversário',
        yKey: 'xG',
        xType: 'per90',
        yType: 'raw',
        insight: 'Extremo completo dos dois lados do jogo',
      },
    ],
  },

  // ════════════════════════════════════════════════════════════
  //  ATACANTE
  // ════════════════════════════════════════════════════════════
  ATACANTE: {
    label: 'Atacante',
    cor: '#ef4444',

    radarMetrics: [
      {
        label: 'xG/90',
        key: 'xG',
        type: 'per90',
        max: 1.5,
        description: 'Gols esperados por jogo',
      },
      {
        label: 'Chutes/90',
        key: 'Chutes',
        type: 'per90',
        max: 5,
        description: 'Volume de finalização',
      },
      {
        label: 'Chutes no Gol %',
        key: 'Chutes no alvo,%',
        type: 'raw',
        max: 100,
        description: 'Precisão de finalização',
      },
      {
        label: 'xG Conversão',
        key: 'xG conversão',
        type: 'raw',
        max: 50,
        description: 'Eficiência acima/abaixo do esperado',
      },
      {
        label: 'Ações Área/90',
        key: 'Ações na área adversária bem-sucedidas',
        type: 'per90',
        max: 5,
        description: 'Presença de área',
      },
      {
        label: 'Passes na Área/90',
        key: 'Passes dentro da área precisos',
        type: 'per90',
        max: 3,
        description: 'Associação curta na área',
      },
      {
        label: 'Passes Final./90',
        key: 'Passes para finalização',
        type: 'per90',
        max: 3,
        description: 'Participação criativa',
      },
      {
        label: 'xA',
        key: 'xA',
        type: 'raw',
        max: 5,
        description: 'Assistências esperadas',
      },
      {
        label: 'Duelos Aéreos/90',
        key: 'Duelos aéreos vencidos',
        type: 'per90',
        max: 5,
        description: 'Referência aérea',
      },
      {
        label: 'Rec. Campo Adv./90',
        key: 'Bolas recuperadas no campo do adversário',
        type: 'per90',
        max: 4,
        description: 'Pressão alta',
      },
    ],

    scatterPlots: [
      {
        id: 'atk-volume-eficiencia',
        titulo: 'Volume vs Eficiência',
        subtitulo: 'Chutes/90 × xG Conversão',
        xLabel: 'Chutes/90',
        yLabel: 'xG Conversão',
        xKey: 'Chutes',
        yKey: 'xG conversão',
        xType: 'per90',
        yType: 'raw',
        insight: 'Matador eficiente vs precisa de muito volume',
      },
      {
        id: 'atk-presenca',
        titulo: 'Presença de Área',
        subtitulo: 'Ações na área/90 × xG/90',
        xLabel: 'Ações na Área/90',
        yLabel: 'xG/90',
        xKey: 'Ações na área adversária bem-sucedidas',
        yKey: 'xG',
        xType: 'per90',
        yType: 'per90',
        insight: 'Atacante presente no setor decisivo',
      },
      {
        id: 'atk-perfil',
        titulo: 'Finalizador vs Assistente',
        subtitulo: 'xG × xA',
        xLabel: 'xG',
        yLabel: 'xA',
        xKey: 'xG',
        yKey: 'xA',
        xType: 'raw',
        yType: 'raw',
        insight: '9 puro vs 9 associativo',
      },
      {
        id: 'atk-aereo',
        titulo: 'Jogo Aéreo com Impacto',
        subtitulo: 'Duelos aéreos vencidos/90 × xG',
        xLabel: 'Duelos Aéreos/90',
        yLabel: 'xG',
        xKey: 'Duelos aéreos vencidos',
        yKey: 'xG',
        xType: 'per90',
        yType: 'raw',
        insight: 'Referência aérea com impacto real',
      },
      {
        id: 'atk-pressao',
        titulo: 'Pressão Moderna',
        subtitulo: 'Recuperações campo adversário/90 × xG',
        xLabel: 'Rec. Campo Adversário/90',
        yLabel: 'xG',
        xKey: 'Bolas recuperadas no campo do adversário',
        yKey: 'xG',
        xType: 'per90',
        yType: 'raw',
        insight: 'Atacante que pressiona e decide',
      },
    ],
  },
};

/**
 * Retorna a config de métricas para uma posição.
 * @param {string} posicao - nome da posição (ex: "Lateral Direito")
 * @returns {object|null}
 */
export function getMetricsByPosicao(posicao) {
  const key = normalizePosicao(posicao);
  return key ? POSITION_METRICS[key] : null;
}

/**
 * Calcula o valor de uma métrica para um jogador,
 * aplicando a normalização correta (per90 / raw).
 */
export function calcMetricValue(jogador, metric) {
  const minutos = parseFloat(String(jogador['Minutos jogados'] || '0').replace(',', '.')) || 0;
  const rawVal = parseFloat(String(jogador[metric.key] || '0').replace(',', '.').replace('%', '')) || 0;

  if (metric.type === 'per90') {
    return minutos > 0 ? (rawVal / minutos) * 90 : 0;
  }
  return rawVal; // raw ou percentual
}

/**
 * Normaliza um valor para percentil dentro de um grupo (0-100).
 * Usado para o radar percentílico por posição.
 */
export function calcPercentil(valor, valoresGrupo) {
  if (valoresGrupo.length === 0) return 0;
  const sorted = [...valoresGrupo].sort((a, b) => a - b);
  const idx = sorted.filter(v => v <= valor).length;
  return Math.round((idx / sorted.length) * 100);
}
