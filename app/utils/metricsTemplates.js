// Templates de Métricas para Radar
export const DEFAULT_METRICS = [
  { label: 'Gols', key: 'Gols', max: 30, color: '#ef4444' },
  { label: 'xG', key: 'xG', max: 10, color: '#f97316' },
  { label: 'Assistências', key: 'Assistências', max: 15, color: '#3b82f6' },
  { label: 'xA', key: 'xA', max: 8, color: '#06b6d4' },
  { label: 'Dribles %', key: 'Dribles com sucesso (%)', max: 100, color: '#fbbf24' },
  { label: 'Cruzamentos %', key: 'Cruzamentos precisos (%)', max: 100, color: '#10b981' },
];

export const PREDEFINED_TEMPLATES = {
  'atacante': {
    name: 'Atacante',
    metrics: [
      'Gols',
      'xG',
      'Assistências',
      'xA',
      'Dribles com sucesso (%)',
      'Finalizações no alvo'
    ]
  },
  'criador': {
    name: 'Criador de Jogo',
    metrics: [
      'Assistências',
      'xA',
      'Passes decisivos',
      'Cruzamentos precisos (%)',
      'Dribles com sucesso (%)',
      'Posse de bola'
    ]
  },
  'defensor': {
    name: 'Defensor',
    metrics: [
      'Desarmes',
      'Interceptações',
      'Recuperações de bola campo ataque',
      'Duelos ofensivos ganhos (%)',
      'Passes curtos',
      'Limpezas'
    ]
  },
  'extremo': {
    name: 'Extremo',
    metrics: [
      'Gols',
      'Assistências',
      'Dribles com sucesso (%)',
      'Cruzamentos precisos (%)',
      'Toques na área',
      'Velocidade máxima'
    ]
  }
};

export const ALL_AVAILABLE_METRICS = [
  'Gols',
  'xG',
  'Assistências',
  'xA',
  'Dribles com sucesso (%)',
  'Cruzamentos precisos (%)',
  'Recuperações de bola campo ataque',
  'Desarmes',
  'Interceptações',
  'Passes decisivos',
  'Finalizações no alvo',
  'Toques na área',
  'Duelos ofensivos ganhos (%)',
  'Passes curtos',
  'Limpezas',
  'Posse de bola',
  'Velocidade máxima',
  'Acelerações',
  'Minutos jogados',
  'Passes totais'
];

// Função para salvar template no localStorage
export const saveMetricsTemplate = (templateName, metrics) => {
  if (typeof window !== 'undefined') {
    const templates = JSON.parse(localStorage.getItem('metricsTemplates') || '{}');
    templates[templateName] = metrics;
    localStorage.setItem('metricsTemplates', JSON.stringify(templates));
  }
};

// Função para carregar template do localStorage
export const loadMetricsTemplate = (templateName) => {
  if (typeof window !== 'undefined') {
    const templates = JSON.parse(localStorage.getItem('metricsTemplates') || '{}');
    return templates[templateName] || DEFAULT_METRICS;
  }
  return DEFAULT_METRICS;
};

// Função para obter todos os templates salvos
export const getAllSavedTemplates = () => {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem('metricsTemplates') || '{}');
  }
  return {};
};
