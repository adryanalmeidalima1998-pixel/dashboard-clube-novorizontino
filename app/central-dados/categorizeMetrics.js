// Função para categorizar métricas automaticamente
export const categorizarMetricas = (todasAsColunas) => {
  const categorias = {
    'Ataque': [],
    'Defesa': [],
    'Passes & Criação': [],
    'Posse & Controle': [],
    'Físico & Duelos': [],
    'Geral': []
  }

  const palavrasChaveAtaque = ['Gol', 'Assistência', 'Chance', 'Chute', 'Finalização', 'Xg', 'xA', 'Tiro', 'Header', 'Poste', 'Entradas no terço final']
  const palavrasChaveDefesa = ['Desarme', 'Interceptação', 'Rebote', 'Falha', 'Erro', 'Cartão', 'Falta', 'Defesa', 'Disputa defensiva', 'Disputa na defesa']
  const palavrasChavePasses = ['Passe', 'Cruzamento', 'Passe chave', 'Passe progressivo', 'Passe longo', 'Passe super longo', 'Passe para', 'Precisão']
  const palavrasChavePosse = ['Drible', 'Controle', 'Bola', 'Posse', 'Impedimento', 'Perda']
  const palavrasChaveFisico = ['Duelo', 'Disputa', 'Disputa aérea', 'Desafio', 'Minutos']

  todasAsColunas.forEach(metrica => {
    if (['?', 'Jogador', 'Time', 'Posição', 'Idade', 'Altura', 'Peso', 'Nacionalidade'].includes(metrica)) {
      return // Pula colunas básicas
    }

    let categorizado = false

    // Verifica Ataque
    if (palavrasChaveAtaque.some(palavra => metrica.includes(palavra))) {
      categorias['Ataque'].push(metrica)
      categorizado = true
    }
    // Verifica Defesa
    else if (palavrasChaveDefesa.some(palavra => metrica.includes(palavra))) {
      categorias['Defesa'].push(metrica)
      categorizado = true
    }
    // Verifica Passes
    else if (palavrasChavePasses.some(palavra => metrica.includes(palavra))) {
      categorias['Passes & Criação'].push(metrica)
      categorizado = true
    }
    // Verifica Posse
    else if (palavrasChavePosse.some(palavra => metrica.includes(palavra))) {
      categorias['Posse & Controle'].push(metrica)
      categorizado = true
    }
    // Verifica Físico
    else if (palavrasChaveFisico.some(palavra => metrica.includes(palavra))) {
      categorias['Físico & Duelos'].push(metrica)
      categorizado = true
    }

    // Se não foi categorizado, vai para Geral
    if (!categorizado) {
      categorias['Geral'].push(metrica)
    }
  })

  // Adiciona Index e métricas especiais no início de Geral
  if (todasAsColunas.includes('Index')) {
    categorias['Geral'].unshift('Index')
  }

  return categorias
}
