/**
 * ═══════════════════════════════════════════════════════════════
 *  DATASOURCES — Grêmio Novorizontino Dashboard
 *  Planilha centralizada com todas as abas do dashboard.
 *  Para trocar a fonte de dados, altere apenas este arquivo.
 * ═══════════════════════════════════════════════════════════════
 */

const BASE_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQKQDSwtQvkSq1v9P2TzUDnFsV_i1gRCNXyQ0aT5TewfwNMnouAoICwQKRAmtCUDLHcJXO4DYS0fL_R/pub?output=csv'

const GIDS = {
  LISTA_PREFERENCIAL:   0,
  GREMIO_NOVORIZONTINO: 1236859817,
  PERFIS:               1608800336,
  RANKING_PERFIL:       1464731636,
  CENTRAL_DADOS:        1750539192,
  AGENDA:               938807395,
  ELENCO:               1499961831,
  SERIE_B:              1860272965,
}

/**
 * Retorna a URL completa de uma aba, com cache-busting opcional.
 * @param {keyof typeof GIDS} aba
 * @param {boolean} bustCache  - adiciona timestamp para forçar dados frescos
 */
export function sheetUrl(aba, bustCache = true) {
  const gid = GIDS[aba]
  const ts  = bustCache ? `&t=${Date.now()}` : ''
  return `${BASE_URL}&gid=${gid}${ts}`
}

// URLs pré-montadas para uso direto (sem cache-busting, ex: constantes de módulo)
export const URLS = {
  AGENDA:               `${BASE_URL}&gid=${GIDS.AGENDA}`,
  ELENCO:               `${BASE_URL}&gid=${GIDS.ELENCO}`,
  CENTRAL_DADOS:        `${BASE_URL}&gid=${GIDS.CENTRAL_DADOS}`,
  LISTA_PREFERENCIAL:   `${BASE_URL}&gid=${GIDS.LISTA_PREFERENCIAL}`,
  GREMIO_NOVORIZONTINO: `${BASE_URL}&gid=${GIDS.GREMIO_NOVORIZONTINO}`,
  PERFIS:               `${BASE_URL}&gid=${GIDS.PERFIS}`,
  RANKING_PERFIL:       `${BASE_URL}&gid=${GIDS.RANKING_PERFIL}`,
  SERIE_B:              `${BASE_URL}&gid=${GIDS.SERIE_B}`,
}
