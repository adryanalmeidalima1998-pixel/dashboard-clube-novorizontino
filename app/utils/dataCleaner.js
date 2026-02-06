/**
 * Utilitário para limpeza e normalização de dados vindos de CSVs (Google Sheets)
 * Resolve problemas de espaços extras, inconsistências de caixa e valores nulos.
 */

export const cleanData = (data) => {
  if (!Array.isArray(data)) return [];

  return data.map(row => {
    const cleanedRow = {};
    
    Object.keys(row).forEach(key => {
      let value = row[key];
      
      // 1. Limpar a chave (nome da coluna)
      const cleanKey = key.trim();
      
      // 2. Tratar o valor
      if (typeof value === 'string') {
        value = value.trim();
        
        // Converter "nan", "-", "" em null ou 0 dependendo do contexto (aqui mantemos como string vazia ou tratamos depois)
        if (['nan', 'NaN', '-', 'null', 'undefined'].includes(value)) {
          value = '';
        }
      }
      
      cleanedRow[cleanKey] = value;
    });

    return cleanedRow;
  }).filter(row => {
    // Filtrar linhas que não possuem um identificador principal (ex: Jogador ou Data)
    return (row.Jogador && row.Jogador.trim() !== '') || 
           (row.Data && row.Data.trim() !== '') ||
           (row.Atleta && row.Atleta.trim() !== '');
  });
};

/**
 * Normaliza nomes de times para evitar duplicatas por erro de digitação
 */
export const normalizeTeamName = (teamName) => {
  if (!teamName) return '';
  
  const name = teamName.trim();
  
  // Mapa de normalização (pode ser expandido conforme necessário)
  const normalizationMap = {
    'novorizontino': 'Grêmio Novorizontino',
    'gremio novorizontino': 'Grêmio Novorizontino',
    'grêmio novorizontino': 'Grêmio Novorizontino',
    'novorizontino sp': 'Grêmio Novorizontino',
    // Adicione outros times se encontrar variações
  };

  const lowerName = name.toLowerCase();
  return normalizationMap[lowerName] || name;
};

/**
 * Helper para converter valores numéricos do CSV de forma segura
 */
export const safeParseFloat = (val) => {
  if (val === undefined || val === null || val === '-' || val === '') return 0;
  if (typeof val === 'number') return val;
  
  const clean = String(val)
    .replace('%', '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, ''); // Remove qualquer caractere que não seja número, ponto ou sinal de menos
    
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};
