import { PERFIL_WEIGHTS, POSICAO_TO_PERFIS } from './perfilWeights';
import { safeParseFloat } from './dataCleaner';

/**
 * Calcula a nota (0-10) de um atleta para um perfil específico
 * @param {Object} atleta - Objeto do atleta com suas métricas
 * @param {Array} todosAtletas - Lista de todos os atletas para cálculo da média/desvio
 * @param {string} perfilNome - Nome do perfil técnico (ex: 'Lateral Ofensivo')
 */
export const calculateRating = (atleta, todosAtletas, perfilNome) => {
  const weights = PERFIL_WEIGHTS[perfilNome];
  if (!weights) return 0;

  let totalScore = 0;
  const metricas = Object.keys(weights);

  metricas.forEach(metrica => {
    const peso = weights[metrica];
    
    // Pegar valores de todos os atletas da MESMA POSIÇÃO para normalizar
    const valoresPosicao = todosAtletas
      .filter(a => a.Posição === atleta.Posição)
      .map(a => safeParseFloat(a[metrica]));

    if (valoresPosicao.length === 0) return;

    const media = valoresPosicao.reduce((a, b) => a + b, 0) / valoresPosicao.length;
    const variancia = valoresPosicao.reduce((a, b) => a + Math.pow(b - media, 2), 0) / valoresPosicao.length;
    const desvioPadrao = Math.sqrt(variancia) || 1;

    const valorAtleta = safeParseFloat(atleta[metrica]);
    
    // Z-Score: (Valor - Média) / Desvio Padrão
    const zScore = (valorAtleta - media) / desvioPadrao;

    // Converter Z-Score para escala 0-10
    // Média (z=0) vira 5.0. Cada desvio padrão (z=1) soma ~1.5 pontos.
    let notaMetrica = 5 + (zScore * 1.5);
    
    // Limitar entre 0 e 10
    notaMetrica = Math.min(Math.max(notaMetrica, 0), 10);
    
    totalScore += notaMetrica * peso;
  });

  return parseFloat(totalScore.toFixed(1));
};

/**
 * Retorna os perfis sugeridos para uma posição
 */
export const getPerfisForPosicao = (posicao) => {
  // Tenta match exato ou parcial (ex: "LD" em "Lateral Direito")
  const key = Object.keys(POSICAO_TO_PERFIS).find(k => 
    posicao?.toUpperCase().includes(k) || k.includes(posicao?.toUpperCase())
  );
  return POSICAO_TO_PERFIS[key] || ['Geral'];
};

/**
 * Gera o ranking de atletas por perfil
 */
export const getRankingByPerfil = (atletas, perfilNome) => {
  return atletas
    .map(a => ({
      ...a,
      notaPerfil: calculateRating(a, atletas, perfilNome)
    }))
    .sort((a, b) => b.notaPerfil - a.notaPerfil);
};
