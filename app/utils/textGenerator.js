/**
 * Gera o parágrafo analítico do atleta com base nos dados do radar e benchmarks.
 * REGRAS:
 * - Sem mencionar minutos
 * - Todas as comparações são por 90 minutos
 * - Tom objetivo para apresentação interna (diretoria / comissão técnica)
 */

const LABELS_TEXTO = {
  'Passes Chave': 'passes chave',
  'Passes Progressivos %': 'passes progressivos',
  'Passes na Área %': 'passes para a área',
  'Dribles Certos/90': 'dribles bem-sucedidos',
  'Dribles 1/3 Final Certos/90': 'dribles no terço final',
  'Entradas 1/3 Final (C)': 'entradas no terço final com bola',
  'Recuperações Campo Adv': 'recuperações em campo adversário',
  'xA': 'xA (assistências esperadas)',
  'xG': 'xG (gols esperados)',
  'Ações Área Adv Certas/90': 'ações certas na área adversária',
};

function listarItens(itens) {
  if (itens.length === 0) return '';
  if (itens.length === 1) return itens[0];
  const copia = [...itens];
  const ultimo = copia.pop();
  return `${copia.join(', ')} e ${ultimo}`;
}

/**
 * Gera o parágrafo descritivo do atleta
 *
 * @param {Object} player            - objeto do atleta com dados processados (com _per90)
 * @param {string} perfil            - perfil técnico atribuído/validado
 * @param {string} descricaoPerfil   - descrição curta do perfil (de PERFIL_DESCRICOES)
 * @param {Array}  listaPreferencial - todos os atletas da lista preferencial (processados)
 * @param {Array}  serieB            - todos os atletas da Série B (raw)
 * @param {Array}  metricas          - array METRICAS_RADAR com { label, key, type }
 * @returns {string} parágrafo em português
 */
export function gerarTextoAnalise({
  player,
  perfil,
  descricaoPerfil,
  listaPreferencial,
  serieB,
  metricas,
}) {
  if (!player || !metricas || metricas.length === 0) return '';

  const getVal = (jogador, metrica) => {
    if (!jogador) return 0;
    if (metrica.type === 'per90') {
      const pre = parseFloat(jogador[`${metrica.key}_per90`]);
      if (!isNaN(pre)) return pre;
      const min = parseFloat(jogador['Minutos jogados']) || 1;
      const val = parseFloat(jogador[metrica.key]) || 0;
      return (val / min) * 90;
    }
    return parseFloat(jogador[metrica.key]) || 0;
  };

  // Médias da lista preferencial
  const mediaLista = metricas.map(m => {
    const vals = listaPreferencial.map(j => getVal(j, m)).filter(v => isFinite(v) && v >= 0);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  });

  // Médias da Série B
  const mediaSerieB = metricas.map(m => {
    const vals = serieB.map(j => {
      const min = parseFloat(j['Minutos jogados']) || 1;
      const val = parseFloat(j[m.key]) || 0;
      return m.type === 'per90' ? (val / min) * 90 : val;
    }).filter(v => isFinite(v) && v >= 0);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  });

  // Comparação atleta vs lista preferencial
  const comparacoes = metricas.map((m, i) => {
    const valorAtleta = getVal(player, m);
    const media = mediaLista[i];
    const diff = media > 0.01 ? (valorAtleta - media) / media : 0;
    const diffSerieB = mediaSerieB[i] > 0.01 ? (valorAtleta - mediaSerieB[i]) / mediaSerieB[i] : 0;
    return {
      label: m.label,
      labelTexto: LABELS_TEXTO[m.label] || m.label.toLowerCase(),
      valorAtleta,
      diff,
      diffSerieB,
    };
  });

  // Destaques: acima de 20% da média da lista
  const destaques = comparacoes
    .filter(c => c.diff > 0.20)
    .sort((a, b) => b.diff - a.diff)
    .slice(0, 3);

  // Pontos fracos: abaixo de 20% da média da lista
  const fracos = comparacoes
    .filter(c => c.diff < -0.20)
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 2);

  // Destaques vs Série B
  const destaquesSerieB = comparacoes
    .filter(c => c.diffSerieB > 0.10)
    .sort((a, b) => b.diffSerieB - a.diffSerieB)
    .slice(0, 2);

  const nome = player.Jogador || 'O atleta';
  const time = player.TIME_FIXED || player['Time'] || player['TIME'] || '';
  const idade = player.Idade ? `${Math.round(player.Idade)} anos` : '';

  let partes = [];

  // Abertura com perfil
  const abertura = `${nome}${idade ? `, ${idade}` : ''}${time ? `, do ${time}` : ''}, se enquadra no perfil de **${perfil}**${descricaoPerfil ? ` — ${descricaoPerfil.toLowerCase().replace(/\.$/, '')}` : ''}.`;
  partes.push(abertura);

  // Destaques vs lista
  if (destaques.length > 0) {
    partes.push(`Em relação à média da lista preferencial, se destaca em ${listarItens(destaques.map(d => d.labelTexto))}.`);
  }

  // Pontos abaixo vs lista
  if (fracos.length > 0) {
    partes.push(`Apresenta índices abaixo da média da lista em ${listarItens(fracos.map(d => d.labelTexto))}.`);
  }

  // Contexto Série B
  if (destaquesSerieB.length > 0 && serieB.length > 0) {
    partes.push(`Comparado à média da Série B, também se sobressai em ${listarItens(destaquesSerieB.map(d => d.labelTexto))}.`);
  }

  // Caso sem destaque nem fraco
  if (destaques.length === 0 && fracos.length === 0) {
    partes.push(`Apresenta métricas equilibradas em relação à média da lista preferencial.`);
  }

  return partes.join(' ');
}
