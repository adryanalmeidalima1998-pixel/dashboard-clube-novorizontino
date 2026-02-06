// Mapeamento direto: Nome do Time (como aparece na planilha) -> Arquivo de logo
// Para adicionar um novo time, basta adicionar uma nova linha aqui

export const LOGOS = {
  // Novorizontino (sempre usar o escudo oficial)
  'Grêmio Novorizontino': '/club/escudonovorizontino.png',
  
  // Times do Paulistão e outras competições
  'Santos': '/club/logos/santos.png',
  'Santos FC': '/club/logos/santos.png',
  'Palmeiras': '/club/logos/palmeiras.png',
  'SE Palmeiras': '/club/logos/palmeiras.png',
  'Guarani': '/club/logos/guarani.png',
  'Guarani FC': '/club/logos/guarani.png',
  'Mirassol': '/club/logos/mirassol.png',
  'Mirassol FC': '/club/logos/mirassol.png',
  'Botafogo-SP': '/club/logos/botafogo-sp.png',
  'Botafogo SP': '/club/logos/botafogo-sp.png',
  'Botafogo-sp': '/club/logos/botafogo-sp.png',
  'EC Primavera': '/club/logos/primavera.png',
  'Primavera': '/club/logos/primavera.png',
  'São Bernardo': '/club/logos/são-bernardo.png',
  'São Bernardo FC': '/club/logos/são-bernardo.png',
  
  // Novos adversários
  'Nacional-AM': '/club/logos/Nacional-AM.png',
  'Nacional AM': '/club/logos/Nacional-AM.png',
  'Nacional': '/club/logos/Nacional-AM.png',
  'RB Bragantino': '/club/logos/RB Bragantino.png',
  'Red Bull Bragantino': '/club/logos/RB Bragantino.png',
  'Bragantino': '/club/logos/RB Bragantino.png',
  
  // Adicione mais times conforme necessário:
  // 'Nome do Time': '/club/logos/nome-do-arquivo.png',
}

// Logo padrão quando o time não está no mapeamento
export const DEFAULT_LOGO = 'https://www.sofascore.com/static/images/team-logo/football/default.png'

// Função para obter a logo de um time
export const getLogo = (nomeTime) => {
  if (!nomeTime) return DEFAULT_LOGO
  
  // Tenta encontrar o time no mapeamento (case-insensitive)
  const nomeNormalizado = nomeTime.trim()
  
  // Busca exata primeiro
  if (LOGOS[nomeNormalizado]) {
    return LOGOS[nomeNormalizado]
  }
  
  // Busca case-insensitive
  const chaveEncontrada = Object.keys(LOGOS).find(
    key => key.toLowerCase() === nomeNormalizado.toLowerCase()
  )
  
  if (chaveEncontrada) {
    return LOGOS[chaveEncontrada]
  }
  
  // Se não encontrar no mapeamento, tenta buscar pelo nome exato do arquivo
  // Verifica variações comuns do nome
  const variacoes = [
    nomeNormalizado,                                    // Nome exato
    nomeNormalizado.replace(/\s+/g, '-'),               // Espaços para hífens
    nomeNormalizado.toLowerCase(),                      // Minúsculas
    nomeNormalizado.toLowerCase().replace(/\s+/g, '-'), // Minúsculas com hífens
  ]
  
  // Retorna a primeira variação como tentativa
  return `/club/logos/${nomeNormalizado}.png`
}
