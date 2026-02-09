import { PERFIL_WEIGHTS, POSICAO_TO_PERFIS } from './perfilWeights';
import { safeParseFloat } from './dataCleaner';

/**
 * Calcula o percentil de um valor em relação a uma lista de valores
 * @param {number} value - Valor do atleta
 * @param {Array} allValues - Lista de todos os valores da mesma posição
 * @returns {number} Percentil (0-100)
 */
export const calculatePercentile = (value, allValues) => {
  if (!allValues || allValues.length === 0) return 0;
  
  // Filtrar valores nulos/indefinidos e ordenar
  const sortedValues = allValues
    .filter(v => v !== null && v !== undefined)
    .sort((a, b) => a - b);
  
  if (sortedValues.length === 0) return 0;

  // Encontrar quantos valores são menores que o valor do atleta
  const countBelow = sortedValues.filter(v => v < value).length;
  const countEqual = sortedValues.filter(v => v === value).length;
  
  // Fórmula de percentil: (L + 0.5S) / N * 100
  // L = countBelow, S = countEqual, N = total
  const percentile = ((countBelow + (0.5 * countEqual)) / sortedValues.length) * 100;
  
  return Math.round(percentile);
};

/**
 * Calcula a nota (0-100) de um atleta para um perfil específico usando PERCENTIS
 * @param {Object} atleta - Objeto do atleta com suas métricas
 * @param {Array} todosAtletas - Lista de todos os atletas para cálculo do percentil
 * @param {string} perfilNome - Nome do perfil técnico
 * @param {number} minMinutos - Corte de minutos para elegibilidade (opcional)
 */
export const calculateRating = (atleta, todosAtletas, perfilNome, minMinutos = 0) => {
  const weights = PERFIL_WEIGHTS[perfilNome];
  if (!weights) return 0;

  // Filtrar atletas elegíveis para o cálculo do percentil (mesma posição e minutos mínimos)
  const posicaoAtleta = (atleta.Posição || '').trim().toUpperCase();
  const atletasElegiveis = todosAtletas.filter(a => {
    const pos = (a.Posição || '').trim().toUpperCase();
    const mins = safeParseFloat(a['Minutos jogados']);
    return pos === posicaoAtleta && mins >= minMinutos;
  });

  if (atletasElegiveis.length === 0) return 0;

  let totalScore = 0;
  const metricas = Object.keys(weights);

  metricas.forEach(metrica => {
    const peso = weights[metrica];
    
    // Pegar valores de todos os atletas elegíveis para esta métrica
    const valoresPosicao = atletasElegiveis.map(a => safeParseFloat(a[metrica]));
    const valorAtleta = safeParseFloat(atleta[metrica]);
    
    // Calcular percentil da métrica
    let percentil = calculatePercentile(valorAtleta, valoresPosicao);
    
    // Tratamento para métricas "menor é melhor" (ex: Faltas, Erros graves)
    const menorEhMelhor = ['Faltas', 'Erros graves', 'Falhas em gols', 'Bolas perdidas', 'Bolas perdidas / no próprio campo', 'Controle de bola ruim'].includes(metrica);
    if (menorEhMelhor) {
      percentil = 100 - percentil;
    }
    
    totalScore += percentil * peso;
  });

  return Math.round(totalScore);
};

/**
 * Retorna os perfis sugeridos para uma posição (código do CSV)
 */
export const getPerfisForPosicao = (posicao) => {
  if (!posicao) return [];
  const posNorm = posicao.trim().toUpperCase();
  return POSICAO_TO_PERFIS[posNorm] || [];
};

/**
 * Retorna todas as posições que podem usar um determinado perfil
 */
export const getPosicoesForPerfil = (perfilNome) => {
  const posicoes = [];
  Object.entries(POSICAO_TO_PERFIS).forEach(([posicao, perfis]) => {
    if (perfis.includes(perfilNome)) {
      posicoes.push(posicao);
    }
  });
  return posicoes;
};

/**
 * Gera o ranking de atletas por perfil usando PERCENTIL
 */
export const getRankingByPerfil = (atletas, perfilNome, minMinutos = 0) => {
  const posicoesCompativeis = getPosicoesForPerfil(perfilNome);
  
  // Primeiro, filtrar apenas os atletas das posições compatíveis e com minutos mínimos
  const atletasFiltrados = atletas.filter(a => {
    const posNorm = (a.Posição || '').trim().toUpperCase();
    const mins = safeParseFloat(a['Minutos jogados']);
    return posicoesCompativeis.includes(posNorm) && mins >= minMinutos;
  });

  // Calcular a nota para cada um usando o universo total de atletas daquela posição para o percentil
  return atletasFiltrados
    .map(a => ({
      ...a,
      notaPerfil: calculateRating(a, atletas, perfilNome, minMinutos)
    }))
    .sort((a, b) => b.notaPerfil - a.notaPerfil);
};
