import { PERFIL_WEIGHTS, POSICAO_TO_PERFIS } from './perfilWeights';
import { safeParseFloat } from './dataCleaner';

/**
 * Calcula a nota (0-10) de um atleta para um perfil específico
 * Usa Z-Score normalizado pela posição do atleta
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
    const posicaoAtleta = (atleta.Posição || '').trim().toUpperCase();
    const valoresPosicao = todosAtletas
      .filter(a => (a.Posição || '').trim().toUpperCase() === posicaoAtleta)
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
 * Usa os novos nomes de posição do CSV: LATERAL DIREITO, LATERAL ESQUERDO, ZAGUEIRO, VOLANTE, MÉDIO, MEIA, EXTREMO, SEGUNDO ATACANTE, ATACANTE
 */
export const getPerfisForPosicao = (posicao) => {
  if (!posicao) return [];
  const posNorm = posicao.trim().toUpperCase();
  
  // Busca exata primeiro
  if (POSICAO_TO_PERFIS[posNorm]) {
    return POSICAO_TO_PERFIS[posNorm];
  }
  
  // Busca parcial (fallback)
  const key = Object.keys(POSICAO_TO_PERFIS).find(k => 
    posNorm.includes(k) || k.includes(posNorm)
  );
  return key ? POSICAO_TO_PERFIS[key] : [];
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
 * Gera o ranking de atletas por perfil
 * Filtra automaticamente apenas os atletas das posições compatíveis
 */
export const getRankingByPerfil = (atletas, perfilNome) => {
  const posicoesCompativeis = getPosicoesForPerfil(perfilNome);
  
  return atletas
    .filter(a => {
      const posNorm = (a.Posição || '').trim().toUpperCase();
      return posicoesCompativeis.some(p => p === posNorm);
    })
    .map(a => ({
      ...a,
      notaPerfil: calculateRating(a, atletas, perfilNome)
    }))
    .sort((a, b) => b.notaPerfil - a.notaPerfil);
};

/**
 * Identifica o perfil dominante de um atleta (aquele em que ele tem a maior nota)
 */
export const getDominantPerfil = (atleta, todosAtletas) => {
  const perfisPossiveis = getPerfisForPosicao(atleta.Posição);
  
  if (perfisPossiveis.length === 0) {
    return { perfil: 'Sem perfil', nota: 0 };
  }

  let melhorPerfil = perfisPossiveis[0];
  let maiorNota = 0;

  perfisPossiveis.forEach(perfil => {
    const nota = calculateRating(atleta, todosAtletas, perfil);
    if (nota > maiorNota) {
      maiorNota = nota;
      melhorPerfil = perfil;
    }
  });

  return { perfil: melhorPerfil, nota: maiorNota };
};
