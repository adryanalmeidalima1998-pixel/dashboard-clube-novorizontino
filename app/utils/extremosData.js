export function slugifyPlayer(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export function findPlayersByIds(allPlayers, ids) {
  return ids.map(id => {
    const match = allPlayers.find(p => {
      const nome = p['Jogador'] || p['Nome'] || p['Atleta'] || p['jogador'] || '';
      return slugifyPlayer(nome) === id;
    });
    if (!match) return null;
    const nome = match['Jogador'] || match['Nome'] || match['Atleta'] || match['jogador'] || id;
    return { ...match, id, name: nome };
  }).filter(Boolean);
}

export const EXTREMO_METRICS = {
  ataque: ['Gols', 'xG', 'Finalizações', 'Finalizações no alvo', 'Toques na área adversária'],
  defesa: ['Recuperações de bola campo ataque', 'Desarmes', 'Interceptações'],
  criacao: ['Assistências', 'xA', 'Passes decisivos', 'Cruzamentos precisos (%)', 'Passes para a área'],
  posse: ['Dribles com sucesso (%)', 'Progressões com bola', 'Perdas de posse'],
  fisico: ['Duelos ofensivos ganhos (%)', 'Acelerações', 'Minutos jogados']
};

export const RADAR_METRICS = ['Gols', 'xG', 'Dribles com sucesso (%)', 'Cruzamentos precisos (%)', 'xA', 'Recuperações de bola campo ataque'];
