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

/**
 * Calcula um vetor de percentis para um atleta em todas as métricas relevantes.
 * Usado para comparação de similaridade.
 */
export const calculatePlayerProfileVector = (atleta, todosAtletas, minMinutos = 0) => {
  const posicaoAtleta = (atleta.Posição || '').trim().toUpperCase();
  const atletasElegiveis = todosAtletas.filter(a => {
    const pos = (a.Posição || '').trim().toUpperCase();
    const mins = safeParseFloat(a['Minutos jogados']);
    return pos === posicaoAtleta && mins >= minMinutos;
  });

  if (atletasElegiveis.length < 5) return {}; // Amostra mínima

  const profileVector = {};
  const allMetrics = [...new Set(Object.values(PERFIL_WEIGHTS).flatMap(weights => Object.keys(weights)))];

  allMetrics.forEach(metrica => {
    const valoresPosicao = atletasElegiveis.map(a => safeParseFloat(a[metrica]));
    const valorAtleta = safeParseFloat(atleta[metrica]);
    let scoreMetrica = calculatePercentile(valorAtleta, valoresPosicao);

    const menorEhMelhor = ['Faltas', 'Erros graves', 'Falhas em gols', 'Bolas perdidas'].includes(metrica);
    if (menorEhMelhor) {
      scoreMetrica = 100 - scoreMetrica;
    }
    profileVector[metrica] = scoreMetrica;
  });

  return profileVector;
};

/**
 * Calcula a distância Euclidiana entre dois vetores de perfil.
 */
const euclideanDistance = (vec1, vec2) => {
  let sumOfSquares = 0;
  const keys = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);
  for (const key of keys) {
    const val1 = vec1[key] || 0;
    const val2 = vec2[key] || 0;
    sumOfSquares += Math.pow(val1 - val2, 2);
  }
  return Math.sqrt(sumOfSquares);
};

/**
 * Encontra jogadores similares a um atleta alvo.
 */
export const findSimilarPlayers = (targetAtleta, todosAtletas, minMinutos = 0, numSimilar = 5) => {
  const targetVector = calculatePlayerProfileVector(targetAtleta, todosAtletas, minMinutos);
  if (Object.keys(targetVector).length === 0) return [];

  const similarities = [];
  todosAtletas.forEach(atleta => {
    if (atleta.Jogador === targetAtleta.Jogador) return; // Não comparar com ele mesmo

    const currentVector = calculatePlayerProfileVector(atleta, todosAtletas, minMinutos);
    if (Object.keys(currentVector).length === 0) return;

    const distance = euclideanDistance(targetVector, currentVector);
    similarities.push({ atleta, distance });
  });

  return similarities
    .sort((a, b) => a.distance - b.distance)
    .slice(0, numSimilar)
    .map(s => s.atleta);
};

/**
 * Simula a tendência de desempenho de um atleta.
 * Para uma implementação real, seria necessário dados históricos.
 */
export const getTrend = (atleta) => {
  // Implementação placeholder: retorna uma tendência aleatória para demonstração
  const random = Math.random();
  if (random < 0.33) return 'up';
  if (random < 0.66) return 'down';
  return 'stable';
};
