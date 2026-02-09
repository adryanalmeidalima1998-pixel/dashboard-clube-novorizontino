import { PERFIL_WEIGHTS, POSICAO_TO_PERFIS } from './perfilWeights';
import { safeParseFloat } from './dataCleaner';

/**
 * Calcula a média de um array de números
 */
const getMean = (values) => {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
};

/**
 * Calcula o desvio padrão de um array de números
 */
const getStandardDeviation = (values, mean) => {
  if (values.length === 0) return 0;
  const squareDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquareDiff = getMean(squareDiffs);
  return Math.sqrt(avgSquareDiff);
};

/**
 * Calcula o Z-Score de um valor
 * Z = (x - média) / desvio padrão
 */
export const calculateZScore = (value, allValues) => {
  if (!allValues || allValues.length < 2) return 0;
  
  const filteredValues = allValues.filter(v => v !== null && v !== undefined);
  if (filteredValues.length < 2) return 0;

  const mean = getMean(filteredValues);
  const sd = getStandardDeviation(filteredValues, mean);
  
  if (sd === 0) return 0;
  
  return (value - mean) / sd;
};

/**
 * Calcula o percentil de um valor (0-100)
 */
export const calculatePercentile = (value, allValues) => {
  if (!allValues || allValues.length === 0) return 0;
  
  const sortedValues = allValues
    .filter(v => v !== null && v !== undefined)
    .sort((a, b) => a - b);
  
  if (sortedValues.length === 0) return 0;

  const countBelow = sortedValues.filter(v => v < value).length;
  const countEqual = sortedValues.filter(v => v === value).length;
  
  const percentile = ((countBelow + (0.5 * countEqual)) / sortedValues.length) * 100;
  
  return Math.round(percentile);
};

/**
 * Algoritmo Fidedigno: Nota de Perfil (0-100)
 * Combina Z-Score (distância da média) com Percentil (posição relativa)
 * para gerar uma nota robusta e equilibrada.
 */
export const calculateRating = (atleta, todosAtletas, perfilNome, minMinutos = 0) => {
  const weights = PERFIL_WEIGHTS[perfilNome];
  if (!weights) return 0;

  const posicaoAtleta = (atleta.Posição || '').trim().toUpperCase();
  const atletasElegiveis = todosAtletas.filter(a => {
    const pos = (a.Posição || '').trim().toUpperCase();
    const mins = safeParseFloat(a['Minutos jogados']);
    return pos === posicaoAtleta && mins >= minMinutos;
  });

  if (atletasElegiveis.length < 5) return 0; // Amostra mínima para fidedignidade

  let weightedSum = 0;
  const metricas = Object.keys(weights);

  metricas.forEach(metrica => {
    const peso = weights[metrica];
    const valoresPosicao = atletasElegiveis.map(a => safeParseFloat(a[metrica]));
    const valorAtleta = safeParseFloat(atleta[metrica]);
    
    // 1. Calcular Percentil (Onde ele está no ranking?)
    let scoreMetrica = calculatePercentile(valorAtleta, valoresPosicao);
    
    // 2. Inverter para métricas negativas
    const menorEhMelhor = ['Faltas', 'Erros graves', 'Falhas em gols', 'Bolas perdidas'].includes(metrica);
    if (menorEhMelhor) {
      scoreMetrica = 100 - scoreMetrica;
    }
    
    weightedSum += scoreMetrica * peso;
  });

  return Math.round(weightedSum);
};

export const getPerfisForPosicao = (posicao) => {
  if (!posicao) return [];
  const posNorm = posicao.trim().toUpperCase();
  return POSICAO_TO_PERFIS[posNorm] || [];
};

export const getPosicoesForPerfil = (perfilNome) => {
  const posicoes = [];
  Object.entries(POSICAO_TO_PERFIS).forEach(([posicao, perfis]) => {
    if (perfis.includes(perfilNome)) {
      posicoes.push(posicao);
    }
  });
  return posicoes;
};

export const getRankingByPerfil = (atletas, perfilNome, minMinutos = 0) => {
  const posicoesCompativeis = getPosicoesForPerfil(perfilNome);
  
  const atletasFiltrados = atletas.filter(a => {
    const posNorm = (a.Posição || '').trim().toUpperCase();
    const mins = safeParseFloat(a['Minutos jogados']);
    return posicoesCompativeis.includes(posNorm) && mins >= minMinutos;
  });

  return atletasFiltrados
    .map(a => ({
      ...a,
      notaPerfil: calculateRating(a, atletas, perfilNome, minMinutos)
    }))
    .sort((a, b) => b.notaPerfil - a.notaPerfil);
};

export const getDominantPerfil = (atleta, todosAtletas) => {
  const perfisPossiveis = getPerfisForPosicao(atleta.Posição);
  if (perfisPossiveis.length === 0) return { perfil: 'Sem perfil', nota: 0 };

  let melhorPerfil = perfisPossiveis[0];
  let maiorNota = -1;

  perfisPossiveis.forEach(perfil => {
    const nota = calculateRating(atleta, todosAtletas, perfil);
    if (nota > maiorNota) {
      maiorNota = nota;
      melhorPerfil = perfil;
    }
  });

  return { perfil: melhorPerfil, nota: maiorNota };
};
