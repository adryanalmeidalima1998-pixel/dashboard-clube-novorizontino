/**
 * Utilitário para limpeza e normalização de dados vindos de CSVs (Google Sheets)
 * Especialmente ajustado para tratar erros de formatação de porcentagem.
 */

export const cleanData = (data) => {
  if (!Array.isArray(data)) return [];

  return data.map(row => {
    const cleanedRow = {};
    
    Object.keys(row).forEach(key => {
      let value = row[key];
      const cleanKey = key.trim();
      
      if (typeof value === 'string') {
        value = value.trim();
        if (['nan', 'NaN', '-', 'null', 'undefined'].includes(value)) {
          value = '';
        }
      }
      
      cleanedRow[cleanKey] = value;
    });

    return cleanedRow;
  }).filter(row => {
    return (row.Jogador && row.Jogador.trim() !== '') || 
           (row.Atleta && row.Atleta.trim() !== '');
  });
};

/**
 * Helper para converter valores numéricos do CSV de forma segura.
 * Trata o erro do Google Sheets onde números são multiplicados por 100 ao aplicar formatação de %.
 */
export const safeParseFloat = (val, columnName = '') => {
  if (val === undefined || val === null || val === '-' || val === '') return 0;
  if (typeof val === 'number') return val;
  
  const strVal = String(val).trim();
  const hasPercent = strVal.endsWith('%');
  
  // Limpar string para conversão
  const clean = strVal
    .replace('%', '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
    
  let num = parseFloat(clean);
  if (isNaN(num)) return 0;

  // Lógica de tratamento de "Misformatted Percentages"
  // Se o valor tem % E é maior que 100 em colunas que não deveriam ser percentuais (ex: Passes, Gols, xA)
  // Ou se sabemos que o Sheets multiplicou por 100 erroneamente.
  if (hasPercent) {
    // Lista de colunas que são PERCENTUAIS REAIS (0-100%)
    const isRealPercent = [
      'Desafios aéreos vencidos, %',
      'Disputas defensivas ganhas, %',
      '% de desarmes bem sucedidos',
      'Disputas ofensivas ganhas, %',
      '% de dribles com sucesso',
      'Chances c/ sucesso, %',
      'Chutes no gol, %',
      'Passes precisos %',
      'Passes chave precisos,%',
      'Passes dentro da área / precisos, %',
      'Passes progressivos precisos,%',
      'Passes longos, precisos, %',
      '% de precisão nos cruzamentos',
      'Dribles no último terço do campo com sucesso, %',
      'Gols marcados do número total de chutes, %',
      'Passa para frente (ângulo de captura - 120 graus) até o terço final, preciso, %'
    ].includes(columnName);

    // Se NÃO é um percentual real mas tem %, dividimos por 100
    // Se É um percentual real mas o valor é bizarro (ex: 3800%), também dividimos por 100
    if (!isRealPercent || num > 100.1) {
      num = num / 100;
    }
  }
    
  return num;
};

/**
 * Normaliza nomes de times para evitar duplicatas por erro de digitação
 */
export const normalizeTeamName = (teamName) => {
  if (!teamName) return '';
  
  const name = teamName.trim();
  
  const normalizationMap = {
    'novorizontino': 'Grêmio Novorizontino',
    'gremio novorizontino': 'Grêmio Novorizontino',
    'grêmio novorizontino': 'Grêmio Novorizontino',
    'novorizontino sp': 'Grêmio Novorizontino',
  };

  const lowerName = name.toLowerCase();
  return normalizationMap[lowerName] || name;
};
