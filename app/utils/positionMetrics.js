/**
 * ═══════════════════════════════════════════════════════════════
 * MÉTRICAS POR POSIÇÃO — Grêmio Novorizontino Dashboard
 *
 * Define para cada posição:
 * - radarMetrics: 10 métricas do radar (com normalização percentílica)
 * - scatterPlots: 5 gráficos de dispersão estratégicos
 * ═══════════════════════════════════════════════════════════════
 */

// ─── Mapeamento de nomes de posição para chave padrão ────────────────────────
export const POSICAO_MAP = {
  'Goleiro': 'GOLEIRO', 'GK': 'GOLEIRO', 'GL': 'GOLEIRO',
  'Zagueiro': 'ZAGUEIRO', 'ZAG': 'ZAGUEIRO', 'CB': 'ZAGUEIRO', 'Zagueiro Central': 'ZAGUEIRO', 'DC': 'ZAGUEIRO',
  'Lateral': 'LATERAL', 'Lateral Direito': 'LATERAL', 'Lateral Esquerdo': 'LATERAL', 'LD': 'LATERAL', 'LE': 'LATERAL', 'LAT': 'LATERAL', 'RB': 'LATERAL', 'LB': 'LATERAL', 'WB': 'LATERAL', 'ALA DIR.': 'LATERAL', 'ALA ESQ.': 'LATERAL', 'Ala': 'LATERAL',
  'Volante': 'VOLANTE', 'VOL': 'VOLANTE', 'DM': 'VOLANTE', 'CDM': 'VOLANTE', 'Pivô': 'VOLANTE', 'Médio Defensivo': 'VOLANTE',
  'Meia': 'MEIA', 'MEI': 'MEIA', 'MC': 'MEIA', 'CM': 'MEIA', 'Meia Central': 'MEIA', 'Meia Ofensivo': 'MEIA', 'Meia Atacante': 'MEIA', 'CAM': 'MEIA', 'AM': 'MEIA', '10': 'MEIA',
  'Extremo': 'EXTREMO', 'EXT': 'EXTREMO', 'Ponta': 'EXTREMO', 'RW': 'EXTREMO', 'LW': 'EXTREMO', 'Extremo Direito': 'EXTREMO', 'Extremo Esquerdo': 'EXTREMO',
  'Atacante': 'ATACANTE', 'ATK': 'ATACANTE', 'ST': 'ATACANTE', 'CF': 'ATACANTE', 'FW': 'ATACANTE', 'Centroavante': 'ATACANTE', '2º Atacante': 'ATACANTE', 'Segundo Atacante': 'ATACANTE',
};

export function normalizePosicao(posicao) {
  if (!posicao) return null;
  const p = posicao.trim();
  if (POSICAO_MAP[p]) return POSICAO_MAP[p];
  const upper = p.toUpperCase();
  for (const [key, val] of Object.entries(POSICAO_MAP)) {
    if (key.toUpperCase() === upper) return val;
  }
  return null;
}

// ─── CONFIGURAÇÕES POR POSIÇÃO ───────────────────────────────────────────────

export const POSITION_METRICS = {

  GOLEIRO: {
    label: 'Goleiro',
    cor: '#06b6d4',
    radarMetrics: [
      { label: 'Defesas/90', key: 'Defesas', type: 'per90', max: 6 },
      { label: 'Defesas %', key: 'Defesas, %', type: 'raw', max: 100 },
      { label: 'Gols Sofridos/90', key: 'Gols sofridos', type: 'per90', max: 3 },
      { label: 'Saídas/90', key: 'Saídas do goleiro', type: 'per90', max: 3 },
      { label: 'Duelos Aéreos/90', key: 'Disputas aéreas', type: 'per90', max: 4 },
      { label: 'Passes Longos/90', key: 'Passes longos', type: 'per90', max: 6 },
      { label: 'Passes Precisos %', key: 'Passes precisos %', type: 'raw', max: 100 },
      { label: 'Passes Prog./90', key: 'Passes progressivos', type: 'per90', max: 4 },
      { label: 'xG Concedido/90', key: 'Xg sofridos', type: 'per90', max: 2 },
      { label: 'Prevenção de Gol/90', key: 'Prevenção de gol', type: 'per90', max: 1 },
    ],
    scatterPlots: [
      { id: 'gk-defesas', titulo: 'Volume vs Qualidade', subtitulo: 'Defesas/90 × Defesas %', xLabel: 'Defesas/90', yLabel: 'Defesas %', xKey: 'Defesas', yKey: 'Defesas, %', xType: 'per90', yType: 'raw' },
      { id: 'gk-passes', titulo: 'Jogo com os Pés', subtitulo: 'Passes longos/90 × Passes precisos %', xLabel: 'Passes Longos/90', yLabel: 'Passes Precisos %', xKey: 'Passes longos', yKey: 'Passes precisos %', xType: 'per90', yType: 'raw' },
      { id: 'gk-aereo', titulo: 'Domínio Aéreo', subtitulo: 'Duelos aéreos/90 × Saídas/90', xLabel: 'Duelos Aéreos/90', yLabel: 'Saídas/90', xKey: 'Disputas aéreas', yKey: 'Saídas do goleiro', xType: 'per90', yType: 'per90' },
      { id: 'gk-construcao', titulo: 'Construção do Jogo', subtitulo: 'Passes progressivos/90 × Passes precisos %', xLabel: 'Passes Prog./90', yLabel: 'Passes Precisos %', xKey: 'Passes progressivos', yKey: 'Passes precisos %', xType: 'per90', yType: 'raw' },
      { id: 'gk-prevencao', titulo: 'Prevenção vs xG', subtitulo: 'xG concedido/90 × Gols sofridos/90', xLabel: 'xG Concedido/90', yLabel: 'Gols Sofridos/90', xKey: 'Xg sofridos', yKey: 'Gols sofridos', xType: 'per90', yType: 'per90' },
    ],
  },

  ZAGUEIRO: {
    label: 'Zagueiro',
    cor: '#3b82f6',
    radarMetrics: [
      { label: 'Desafios Vencidos/90', key: 'Desafios vencidos', type: 'per90', max: 8 },
      { label: 'Duelos Aéreos/90', key: 'Disputas de bolas aéreas / com sucesso', type: 'per90', max: 6 },
      { label: 'Desarmes/90', key: 'Desarmes bem sucedidos', type: 'per90', max: 5 },
      { label: 'Interceptações/90', key: 'Interceptações', type: 'per90', max: 6 },
      { label: 'Bolas Rec./90', key: 'Bolas recuperadas', type: 'per90', max: 10 },
      { label: 'Passes Prog./90', key: 'Passes progressivos', type: 'per90', max: 8 },
      { label: 'Passes 1/3 Final/90', key: 'Passa para o terço final', type: 'per90', max: 5 },
      { label: 'Passes Longos/90', key: 'Passes longos', type: 'per90', max: 6 },
      { label: 'Duelos Def./90', key: 'Disputas na defesa / com sucesso', type: 'per90', max: 5 },
      { label: 'Ações Área Adv./90', key: 'Ações na área adversária bem-sucedidas', type: 'per90', max: 2 },
    ],
    scatterPlots: [
      { id: 'zag-fisico', titulo: 'Dominância Física', subtitulo: 'Desafios vencidos/90 × Duelos aéreos vencidos/90', xLabel: 'Desafios Vencidos/90', yLabel: 'Duelos Aéreos/90', xKey: 'Desafios vencidos', yKey: 'Disputas de bolas aéreas / com sucesso', xType: 'per90', yType: 'per90' },
      { id: 'zag-posicional', titulo: 'Defesa Posicional', subtitulo: 'Interceptações/90 × Desarmes/90', xLabel: 'Interceptações/90', yLabel: 'Desarmes/90', xKey: 'Interceptações', yKey: 'Desarmes bem sucedidos', xType: 'per90', yType: 'per90' },
      { id: 'zag-construcao', titulo: 'Construção Vertical', subtitulo: 'Passes progressivos/90 × Passes 1/3 final/90', xLabel: 'Passes Progressivos/90', yLabel: 'Passes 1/3 Final/90', xKey: 'Passes progressivos', yKey: 'Passa para o terço final', xType: 'per90', yType: 'per90' },
      { id: 'zag-lancamento', titulo: 'Lançador vs Seguro', subtitulo: 'Passes longos precisos/90 × Passes progressivos/90', xLabel: 'Passes Longos/90', yLabel: 'Passes Progressivos/90', xKey: 'Passes longos', yKey: 'Passes progressivos', xType: 'per90', yType: 'per90' },
      { id: 'zag-seguranca', titulo: 'Segurança vs Risco', subtitulo: 'Passes precisos % × Bolas perdidas no próprio campo', xLabel: 'Passes Precisos %', yLabel: 'Bolas Perdidas Próprio Campo', xKey: 'Passes precisos %', yKey: 'Bolas perdidas', xType: 'raw', yType: 'per90' },
    ],
  },

  LATERAL: {
    label: 'Lateral / Ala',
    cor: '#10b981',
    radarMetrics: [
      { label: 'Desafios Vencidos/90', key: 'Desafios vencidos', type: 'per90', max: 7 },
      { label: 'Disputas Def./90', key: 'Disputas na defesa', type: 'per90', max: 6 },
      { label: 'Interceptações/90', key: 'Interceptações', type: 'per90', max: 5 },
      { label: 'Passes Prog./90', key: 'Passes progressivos', type: 'per90', max: 8 },
      { label: 'Entradas 1/3/90', key: 'Entradas no terço final', type: 'per90', max: 6 },
      { label: 'Condução 1/3/90', key: 'Entradas no terço final carregando a bola', type: 'per90', max: 4 },
      { label: 'Cruzamentos/90', key: 'Cruzamentos', type: 'per90', max: 3 },
      { label: 'Chances Criadas/90', key: 'Chances criadas', type: 'per90', max: 3 },
      { label: 'Ações Área Adv./90', key: 'Ações na área adversária bem-sucedidas', type: 'per90', max: 2 },
      { label: 'xA/90', key: 'xA', type: 'per90', max: 0.25 },
    ],
    scatterPlots: [
      { id: 'lat-agressivo', titulo: 'Lateral Agressivo vs Passivo', subtitulo: 'Entradas no 1/3 final/90 × Ações na área adversária/90', xLabel: 'Entradas 1/3 Final/90', yLabel: 'Ações Área Adv./90', xKey: 'Entradas no terço final', yKey: 'Ações na área adversária bem-sucedidas', xType: 'per90', yType: 'per90' },
      { id: 'lat-progressao', titulo: 'Progressão Técnica', subtitulo: 'Passes progressivos/90 × Condução 1/3 final/90', xLabel: 'Passes Progressivos/90', yLabel: 'Condução 1/3 Final/90', xKey: 'Passes progressivos', yKey: 'Entradas no terço final carregando a bola', xType: 'per90', yType: 'per90' },
      { id: 'lat-defesa', titulo: 'Solidez Defensiva 1x1', subtitulo: 'Desafios vencidos/90 × Disputas defensivas/90', xLabel: 'Desafios Vencidos/90', yLabel: 'Disputas Defensivas/90', xKey: 'Desafios vencidos', yKey: 'Disputas na defesa', xType: 'per90', yType: 'per90' },
      { id: 'lat-criacao', titulo: 'Criação pela Ala', subtitulo: 'Cruzamentos precisos/90 × Chances criadas/90', xLabel: 'Cruzamentos Precisos/90', yLabel: 'Chances Criadas/90', xKey: 'Cruzamentos', yKey: 'Chances criadas', xType: 'per90', yType: 'per90' },
      { id: 'lat-seguranca', titulo: 'Progressão com Segurança', subtitulo: 'Passes progressivos/90 × Bolas perdidas no próprio campo', xLabel: 'Passes Progressivos/90', yLabel: 'Bolas Perdidas Próprio Campo', xKey: 'Passes progressivos', yKey: 'Bolas perdidas', xType: 'per90', yType: 'per90' },
    ],
  },

  VOLANTE: {
    label: 'Volante',
    cor: '#f59e0b',
    radarMetrics: [
      { label: 'Desafios Vencidos/90', key: 'Desafios vencidos', type: 'per90', max: 7 },
      { label: 'Disputas Def./90', key: 'Disputas na defesa', type: 'per90', max: 6 },
      { label: 'Interceptações/90', key: 'Interceptações', type: 'per90', max: 6 },
      { label: 'Bolas Rec./90', key: 'Bolas recuperadas', type: 'per90', max: 10 },
      { label: 'Passes Precisos %', key: 'Passes precisos %', type: 'raw', max: 100 },
      { label: 'Passes Prog./90', key: 'Passes progressivos', type: 'per90', max: 8 },
      { label: 'Passes 1/3 Final/90', key: 'Passa para o terço final', type: 'per90', max: 5 },
      { label: 'Passes Abertos/90', key: 'Passa para o terço final', type: 'per90', max: 5 },
      { label: 'Entradas 1/3/90', key: 'Entradas no terço final', type: 'per90', max: 4 },
      { label: 'Chances Criadas/90', key: 'Chances criadas', type: 'per90', max: 3 },
    ],
    scatterPlots: [
      { id: 'vol-destruidor', titulo: 'Destruidor vs Posicional', subtitulo: 'Desafios vencidos/90 × Interceptações/90', xLabel: 'Desafios Vencidos/90', yLabel: 'Interceptações/90', xKey: 'Desafios vencidos', yKey: 'Interceptações', xType: 'per90', yType: 'per90' },
      { id: 'vol-recuperacao', titulo: 'Domínio Defensivo', subtitulo: 'Bolas recuperadas/90 × Disputas defensivas/90', xLabel: 'Bolas Recuperadas/90', yLabel: 'Disputas Defensivas/90', xKey: 'Bolas recuperadas', yKey: 'Disputas na defesa', xType: 'per90', yType: 'per90' },
      { id: 'vol-construcao', titulo: 'Construção Segura vs Progressiva', subtitulo: 'Passes precisos % × Passes progressivos/90', xLabel: 'Passes Precisos %', yLabel: 'Passes Progressivos/90', xKey: 'Passes precisos %', yKey: 'Passes progressivos', xType: 'raw', yType: 'per90' },
      { id: 'vol-quebra-linha', titulo: 'Quebra de Linha', subtitulo: 'Passes progressivos/90 × Passes 1/3 final/90', xLabel: 'Passes Progressivos/90', yLabel: 'Passes 1/3 Final/90', xKey: 'Passes progressivos', yKey: 'Passa para o terço final', xType: 'per90', yType: 'per90' },
      { id: 'vol-transicao', titulo: 'Transição Ofensiva', subtitulo: 'Entradas no 1/3 final/90 × Chances criadas/90', xLabel: 'Entradas 1/3 Final/90', yLabel: 'Chances Criadas/90', xKey: 'Entradas no terço final', yKey: 'Chances criadas', xType: 'per90', yType: 'per90' },
    ],
  },

  MEIA: {
    label: 'Meia',
    cor: '#8b5cf6',
    radarMetrics: [
      { label: 'Chances Criadas/90', key: 'Chances criadas', type: 'per90', max: 4 },
      { label: 'Passes Chave/90', key: 'Passes chave', type: 'per90', max: 4 },
      { label: 'xA/90', key: 'xA', type: 'per90', max: 0.4 },
      { label: 'Passes Prog./90', key: 'Passes progressivos', type: 'per90', max: 10 },
      { label: 'Entradas 1/3/90', key: 'Entradas no terço final', type: 'per90', max: 5 },
      { label: 'Condução 1/3/90', key: 'Entradas no terço final carregando a bola', type: 'per90', max: 4 },
      { label: 'Passes Final./90', key: 'Passes chave', type: 'per90', max: 3 },
      { label: 'xG/90', key: 'Xg', type: 'per90', max: 0.35 },
      { label: 'Dribles/90', key: 'Dribles bem sucedidos', type: 'per90', max: 4 },
      { label: 'Desafios Vencidos/90', key: 'Desafios vencidos', type: 'per90', max: 5 },
    ],
    scatterPlots: [
      { id: 'meia-criador', titulo: 'Criador Puro', subtitulo: 'Chances criadas/90 × xA/90', xLabel: 'Chances Criadas/90', yLabel: 'xA/90', xKey: 'Chances criadas', yKey: 'xA', xType: 'per90', yType: 'per90' },
      { id: 'meia-progressao', titulo: 'Progressão: Passando vs Conduzindo', subtitulo: 'Passes progressivos/90 × Condução 1/3 final/90', xLabel: 'Passes Progressivos/90', yLabel: 'Condução 1/3 Final/90', xKey: 'Passes progressivos', yKey: 'Entradas no terço final carregando a bola', xType: 'per90', yType: 'per90' },
      { id: 'meia-desequilibrio', titulo: 'Desequilíbrio Individual', subtitulo: 'Dribles bem-sucedidos/90 × Entradas 1/3 final/90', xLabel: 'Dribles/90', yLabel: 'Entradas 1/3 Final/90', xKey: 'Dribles bem sucedidos', yKey: 'Entradas no terço final', xType: 'per90', yType: 'per90' },
      { id: 'meia-impacto', titulo: 'Impacto Direto', subtitulo: 'xG/90 × Passes para finalização/90', xLabel: 'xG/90', yLabel: 'Passes para Finalização/90', xKey: 'Xg', yKey: 'Passes chave', xType: 'per90', yType: 'per90' },
      { id: 'meia-risco', titulo: 'Criatividade vs Segurança', subtitulo: 'Passes progressivos/90 × Bolas perdidas', xLabel: 'Passes Progressivos/90', yLabel: 'Bolas Perdidas', xKey: 'Passes progressivos', yKey: 'Bolas perdidas', xType: 'per90', yType: 'per90' },
    ],
  },

  EXTREMO: {
    label: 'Extremo',
    cor: '#f97316',
    radarMetrics: [
      { label: 'Dribles/90', key: 'Dribles bem sucedidos', type: 'per90', max: 6 },
      { label: 'Dribles Últ. Terço/90', key: 'Dribles no último terço do campo com sucesso', type: 'per90', max: 4 },
      { label: 'Condução 1/3/90', key: 'Entradas no terço final carregando a bola', type: 'per90', max: 5 },
      { label: 'Passes Prog./90', key: 'Passes progressivos', type: 'per90', max: 7 },
      { label: 'Chances Criadas/90', key: 'Chances criadas', type: 'per90', max: 4 },
      { label: 'xA/90', key: 'xA', type: 'per90', max: 0.35 },
      { label: 'xG/90', key: 'Xg', type: 'per90', max: 0.4 },
      { label: 'Chutes no Gol %', key: 'Chutes no gol, %', type: 'raw', max: 100 }, 
      { label: 'Ações Área Adv./90', key: 'Ações na área adversária bem-sucedidas', type: 'per90', max: 4 },
      { label: 'Rec. Campo Adv./90', key: 'Bolas recuperadas no campo do adversário', type: 'per90', max: 4 },
    ],
    scatterPlots: [
      { id: 'ext-1x1', titulo: '1x1 Puro', subtitulo: 'Dribles bem-sucedidos/90 × Dribles último terço/90', xLabel: 'Dribles/90', yLabel: 'Dribles Últ. Terço/90', xKey: 'Dribles bem sucedidos', yKey: 'Dribles no último terço do campo com sucesso', xType: 'per90', yType: 'per90' },
      { id: 'ext-conducao-criacao', titulo: 'Condução vs Criação', subtitulo: 'Condução 1/3 final/90 × Chances criadas/90', xLabel: 'Condução 1/3 Final/90', yLabel: 'Chances Criadas/90', xKey: 'Entradas no terço final carregando a bola', yKey: 'Chances criadas', xType: 'per90', yType: 'per90' },
      { id: 'ext-criacao-finalizacao', titulo: 'Criação vs Finalização', subtitulo: 'xA/90 × xG/90', xLabel: 'xA/90', yLabel: 'xG/90', xKey: 'xA', yKey: 'Xg', xType: 'per90', yType: 'per90' },
      { id: 'ext-area', titulo: 'Eficiência na Área', subtitulo: 'Ações na área adversária/90 × Chutes no alvo %', xLabel: 'Ações Área Adv./90', yLabel: 'Chutes no Alvo %', xKey: 'Ações na área adversária bem-sucedidas', yKey: 'Chutes no gol, %', xType: 'per90', yType: 'raw' },
      { id: 'ext-pressao', titulo: 'Pressão e Impacto', subtitulo: 'Recuperações campo adversário/90 × xG/90', xLabel: 'Rec. Campo Adv./90', yLabel: 'xG/90', xKey: 'Bolas recuperadas no campo do adversário', yKey: 'Xg', xType: 'per90', yType: 'per90' },
    ],
  },

  ATACANTE: {
    label: 'Atacante',
    cor: '#ef4444',
    radarMetrics: [
      { label: 'xG/90', key: 'Xg', type: 'per90', max: 0.8 },
      { label: 'Chutes/90', key: 'Chutes', type: 'per90', max: 5 },
      { label: 'Chutes no Gol %', key: 'Chutes no gol, %', type: 'raw', max: 100 }, 
      { label: 'xG Conversão', key: 'Chutes/gol', type: 'raw', max: 50 },
      { label: 'Ações Área/90', key: 'Ações na área adversária bem-sucedidas', type: 'per90', max: 5 },
      { label: 'Passes na Área/90', key: 'Passes para a área certos', type: 'per90', max: 3 },
      { label: 'Passes Final./90', key: 'Passes chave', type: 'per90', max: 3 },
      { label: 'xA/90', key: 'xA', type: 'per90', max: 0.3 },
      { label: 'Duelos Aéreos/90', key: 'Disputas aéreas', type: 'per90', max: 5 },
      { label: 'Rec. Campo Adv./90', key: 'Bolas recuperadas no campo do adversário', type: 'per90', max: 4 },
    ],
    scatterPlots: [
      { id: 'atk-volume-eficiencia', titulo: 'Volume vs Eficiência', subtitulo: 'Chutes/90 × xG Conversão', xLabel: 'Chutes/90', yLabel: 'xG Conversão', xKey: 'Chutes', yKey: 'Chutes/gol', xType: 'per90', yType: 'raw' },
      { id: 'atk-presenca', titulo: 'Presença de Área', subtitulo: 'Ações na área/90 × xG/90', xLabel: 'Ações na Área/90', yLabel: 'xG/90', xKey: 'Ações na área adversária bem-sucedidas', yKey: 'Xg', xType: 'per90', yType: 'per90' },
      { id: 'atk-perfil', titulo: 'Finalizador vs Assistente', subtitulo: 'xG/90 × xA/90', xLabel: 'xG/90', yLabel: 'xA/90', xKey: 'Xg', yKey: 'xA', xType: 'per90', yType: 'per90' },
      { id: 'atk-aereo', titulo: 'Jogo Aéreo com Impacto', subtitulo: 'Duelos aéreos vencidos/90 × xG/90', xLabel: 'Duelos Aéreos/90', yLabel: 'xG/90', xKey: 'Duelos aéreos vencidos', yKey: 'Xg', xType: 'per90', yType: 'per90' },
      { id: 'atk-pressao', titulo: 'Pressão Moderna', subtitulo: 'Recuperações campo adversário/90 × xG/90', xLabel: 'Rec. Campo Adv./90', yLabel: 'xG/90', xKey: 'Bolas recuperadas no campo do adversário', yKey: 'Xg', xType: 'per90', yType: 'per90' },
    ],
  },
};

export function getMetricsByPosicao(posicao) {
  const key = normalizePosicao(posicao);
  return key ? POSITION_METRICS[key] : null;
}

export function calcMetricValue(jogador, metric) {
  const minutos = parseFloat(String(jogador['Minutos jogados'] || '0').replace(',', '.')) || 0;
  const rawVal = parseFloat(String(jogador[metric.key] || '0').replace(',', '.').replace('%', '')) || 0;
  if (metric.type === 'per90') {
    return minutos > 0 ? (rawVal / minutos) * 90 : 0;
  }
  return rawVal; 
}

export function calcPercentil(valor, valoresGrupo) {
  if (valoresGrupo.length === 0) return 0;
  const sorted = [...valoresGrupo].sort((a, b) => a - b);
  const idx = sorted.filter(v => v <= valor).length;
  return Math.round((idx / sorted.length) * 100);
}
