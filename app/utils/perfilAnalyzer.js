import { PERFIL_WEIGHTS, POSICAO_TO_PERFIS } from './perfilWeights';

/**
 * Normaliza um valor dentro de um range [min, max] para [0, 1]
 */
function normalizar(valor, min, max) {
  if (max === min) return 0;
  return Math.max(0, Math.min(1, (valor - min) / (max - min)));
}

/**
 * Retorna o valor por 90 minutos de uma métrica para um jogador
 */
function getValorPer90(jogador, key) {
  const min = parseFloat(jogador['Minutos jogados']) || 1;
  const val = parseFloat(jogador[key]);
  if (isNaN(val)) return 0;
  return (val / min) * 90;
}

/**
 * Resolve a posição do atleta para a chave correta do POSICAO_TO_PERFIS
 */
function resolverPosicao(posicaoRaw) {
  if (!posicaoRaw) return null;
  const pos = posicaoRaw.toUpperCase().trim();

  if (POSICAO_TO_PERFIS[pos]) return pos;

  for (const key of Object.keys(POSICAO_TO_PERFIS)) {
    if (pos.includes(key) || key.includes(pos)) return key;
  }

  if (pos.includes('LATERAL')) return pos.includes('ESQUER') ? 'LATERAL ESQUERDO' : 'LATERAL DIREITO';
  if (pos.includes('ZAGUEIRO') || pos.includes('DEFENSOR') || pos.includes('CENTRAL')) return 'ZAGUEIRO';
  if (pos.includes('VOLANTE') || pos.includes('PIVÔ')) return 'VOLANTE';
  if (pos.includes('MEIA') || pos.includes('MÉDIO')) return 'MEIA';
  if (pos.includes('EXTREMO') || pos.includes('PONTA') || pos.includes('ALA')) return 'EXTREMO';
  if (pos.includes('ATACANTE') || pos.includes('AVANTE') || pos.includes('CENTROAVANTE')) return 'ATACANTE';
  if (pos.includes('SEGUNDO')) return 'SEGUNDO ATACANTE';

  return null;
}

/**
 * Calcula e retorna os perfis rankeados por score para um atleta.
 *
 * @param {Object} player     - objeto do atleta com colunas do CSV
 * @param {Array}  populacao  - array de jogadores para calcular min/max de normalização
 * @returns {Array}           - [{ perfil, score, percentual }, ...] ordenado do maior pro menor
 */
export function calcularPerfilSugerido(player, populacao = []) {
  const posicaoRaw = player['POSIÇÃO'] || player['Posição'] || player['posicao'] || '';
  const posicaoKey = resolverPosicao(posicaoRaw);
  const perfisElegiveis = posicaoKey
    ? (POSICAO_TO_PERFIS[posicaoKey] || Object.keys(PERFIL_WEIGHTS))
    : Object.keys(PERFIL_WEIGHTS);

  // Coleta todas as métricas usadas nos perfis elegíveis
  const allMetrics = new Set();
  perfisElegiveis.forEach(perfil => {
    Object.keys(PERFIL_WEIGHTS[perfil] || {}).forEach(m => allMetrics.add(m));
  });

  // Calcula min/max de cada métrica na população (per90)
  const stats = {};
  allMetrics.forEach(metric => {
    const valores = populacao
      .map(j => getValorPer90(j, metric))
      .filter(v => !isNaN(v) && isFinite(v) && v >= 0);

    stats[metric] = valores.length > 0
      ? { min: Math.min(...valores), max: Math.max(...valores) }
      : { min: 0, max: 1 };
  });

  // Calcula score de cada perfil elegível
  const scores = perfisElegiveis.map(perfil => {
    const pesos = PERFIL_WEIGHTS[perfil] || {};
    let score = 0;
    let pesoTotal = 0;

    Object.entries(pesos).forEach(([metric, peso]) => {
      const playerVal = getValorPer90(player, metric);
      const s = stats[metric] || { min: 0, max: 1 };
      score += normalizar(playerVal, s.min, s.max) * peso;
      pesoTotal += peso;
    });

    return { perfil, score: pesoTotal > 0 ? score / pesoTotal : 0 };
  });

  scores.sort((a, b) => b.score - a.score);

  const maxScore = scores[0]?.score || 1;
  return scores.map(s => ({
    ...s,
    percentual: Math.round((s.score / maxScore) * 100),
  }));
}
