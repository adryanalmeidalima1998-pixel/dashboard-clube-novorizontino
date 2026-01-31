'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getLogo, DEFAULT_LOGO } from '../logos'

// Mapeamento de logos dos campeonatos
const LOGOS_CAMPEONATOS = {
  'PAULISTA SÉRIE A1': '/competitions/paulistao.png',
  'PAULISTÃO': '/competitions/paulistao.png',
  'BRASILEIRÃO SÉRIE B': '/competitions/brasileirao-b.png',
  'SÉRIE B': '/competitions/brasileirao-b.png',
  'COPA DO BRASIL': '/competitions/copa-do-brasil.png',
}

const getLogoCampeonato = (campeonato) => {
  if (!campeonato) return null
  const chave = Object.keys(LOGOS_CAMPEONATOS).find(
    key => campeonato.toUpperCase().includes(key)
  )
  return chave ? LOGOS_CAMPEONATOS[chave] : null
}

export default function AgendaPage() {
  const router = useRouter()
  const [jogos, setJogos] = useState([])
  const [loading, setLoading] = useState(true)
  const [jogoSelecionado, setJogoSelecionado] = useState(null)

  useEffect(() => {
    async function loadData() {
      try {
        const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRTx9m5RGrJDNka8hpPUh2k1iTTSSs6lDOyDqNoDFOjBJDG7xCsIcEhdEutK2lKGmc5LgCmcsFcGZBY/pub?output=csv"
        const response = await fetch(url)
        const csvText = await response.text()
        
        const parseCSV = (text) => {
          const rows = [];
          let currentRow = [];
          let currentField = '';
          let inQuotes = false;

          for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];

            if (char === '"' && inQuotes && nextChar === '"') {
              currentField += '"';
              i++;
            } else if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              currentRow.push(currentField.trim());
              currentField = '';
            } else if ((char === '\r' || char === '\n') && !inQuotes) {
              if (currentField || currentRow.length > 0) {
                currentRow.push(currentField.trim());
                rows.push(currentRow);
                currentRow = [];
                currentField = '';
              }
              if (char === '\r' && nextChar === '\n') i++;
            } else {
              currentField += char;
            }
          }
          if (currentField || currentRow.length > 0) {
            currentRow.push(currentField.trim());
            rows.push(currentRow);
          }
          return rows;
        };

        const rows = parseCSV(csvText);
        if (rows.length === 0) return;

        const headers = rows[0];
        const dataRows = rows.slice(1);

        const parsedJogos = dataRows.map((row, index) => {
          const data = {};
          headers.forEach((header, i) => {
            data[header.trim()] = row[i] || "";
          });

          const isMandante = data['Mandante'] === 'Grêmio Novorizontino';
          
          return {
            id: index,
            data: data['Data'],
            hora: data['Horário'],
            mandante: data['Mandante'],
            visitante: data['Visitante'],
            golsMandanteNum: data['Gols Mandante'] || '0',
            golsVisitanteNum: data['Gols Visitante'] || '0',
            status: data['Resultado'] ? 'passado' : 'proximo',
            campeonato: data['Competição'],
            local: data['Local'] || (isMandante ? 'Jorjão' : 'Fora'),
            escalaçaoIframe: data['código escalação'] || null,
            golsMandante: data['Gols marcados mandante'] || "",
            golsVisitante: data['Gols marcados VISITANTE'] || "",
            logoMandante: getLogo(data['Mandante']),
            logoVisitante: getLogo(data['Visitante']),
            logoCampeonato: getLogoCampeonato(data['Competição'])
          };
        });

        setJogos(parsedJogos);
      } catch (error) {
        console.error("Erro ao carregar agenda:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const renderIframe = (iframeString) => {
    if (!iframeString || iframeString.trim() === "") return null;
    const iframeMatch = iframeString.match(/<iframe.*<\/iframe>/i);
    let finalIframe = iframeMatch ? iframeMatch[0] : iframeString;
    finalIframe = finalIframe.replace(/style="[^"]*"/i, 'style="width:100%; height:600px; border:none;"');
    if (!finalIframe.includes('style=')) {
      finalIframe = finalIframe.replace('<iframe', '<iframe style="width:100%; height:600px; border:none;"');
    }
    return <div className="bg-white rounded-xl overflow-hidden min-h-[600px]" dangerouslySetInnerHTML={{ __html: finalIframe }} />;
  }

  const handleImageError = (e) => {
    e.target.src = DEFAULT_LOGO;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <span className="text-slate-400 text-sm">Carregando Agenda...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/')} 
              className="p-2.5 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl transition-all duration-300 text-slate-400 hover:text-white hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                Agenda de Jogos
              </h1>
              <p className="text-xs text-slate-500">{jogos.length} partidas registradas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid gap-4">
          {jogos.map((jogo) => (
            <div 
              key={jogo.id}
              onClick={() => setJogoSelecionado(jogo)}
              className="group relative bg-gradient-to-r from-slate-800/40 to-slate-800/20 rounded-2xl border border-slate-700/50 hover:border-emerald-500/40 transition-all duration-300 cursor-pointer overflow-hidden hover:shadow-lg hover:shadow-emerald-500/5"
            >
              {/* Glow effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative p-5">
                <div className="flex items-center justify-between gap-4">
                  
                  {/* Data e Hora */}
                  <div className="flex-shrink-0 text-center min-w-[80px]">
                    <div className="bg-slate-900/60 rounded-xl px-3 py-2 border border-slate-700/30">
                      <span className="block text-emerald-400 font-bold text-sm">{jogo.data}</span>
                      <span className="text-slate-500 text-xs">{jogo.hora || 'A definir'}</span>
                    </div>
                  </div>

                  {/* Confronto Principal */}
                  <div className="flex-1 flex items-center justify-center gap-3 md:gap-6">
                    {/* Time Mandante */}
                    <div className="flex items-center gap-3 flex-1 justify-end">
                      <span className="font-semibold text-sm md:text-base text-right text-white/90 hidden sm:block">
                        {jogo.mandante}
                      </span>
                      <div className="relative">
                        <img 
                          src={jogo.logoMandante} 
                          alt={jogo.mandante} 
                          className="w-12 h-12 md:w-14 md:h-14 object-contain drop-shadow-lg" 
                          onError={handleImageError} 
                        />
                      </div>
                    </div>

                    {/* Placar / VS */}
                    <div className="flex-shrink-0">
                      {jogo.status === 'passado' ? (
                        <div className="flex items-center gap-2 bg-slate-900/80 rounded-xl px-4 py-2 border border-slate-600/30">
                          <span className="text-xl md:text-2xl font-black text-white">{jogo.golsMandanteNum}</span>
                          <span className="text-slate-500 text-sm">-</span>
                          <span className="text-xl md:text-2xl font-black text-white">{jogo.golsVisitanteNum}</span>
                        </div>
                      ) : (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2">
                          <span className="text-emerald-400 font-bold text-sm">VS</span>
                        </div>
                      )}
                    </div>

                    {/* Time Visitante */}
                    <div className="flex items-center gap-3 flex-1 justify-start">
                      <div className="relative">
                        <img 
                          src={jogo.logoVisitante} 
                          alt={jogo.visitante} 
                          className="w-12 h-12 md:w-14 md:h-14 object-contain drop-shadow-lg" 
                          onError={handleImageError} 
                        />
                      </div>
                      <span className="font-semibold text-sm md:text-base text-left text-white/90 hidden sm:block">
                        {jogo.visitante}
                      </span>
                    </div>
                  </div>

                  {/* Info Campeonato */}
                  <div className="flex-shrink-0 flex items-center gap-3">
                    <div className="text-right hidden md:block">
                      <span className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
                        {jogo.campeonato}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center justify-end gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {jogo.local}
                      </span>
                    </div>
                    
                    {/* Logo do Campeonato */}
                    {jogo.logoCampeonato && (
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-white/5 p-1.5 border border-slate-700/30">
                        <img 
                          src={jogo.logoCampeonato} 
                          alt={jogo.campeonato}
                          className="w-full h-full object-contain"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      </div>
                    )}

                    {/* Seta */}
                    <div className="p-2 bg-slate-900/50 rounded-lg group-hover:bg-emerald-500/20 transition-all duration-300">
                      <svg className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Nomes dos times em mobile */}
                <div className="flex justify-between mt-3 sm:hidden px-2">
                  <span className="text-xs text-slate-400 text-center flex-1">{jogo.mandante}</span>
                  <span className="text-xs text-slate-600 px-2">•</span>
                  <span className="text-xs text-slate-400 text-center flex-1">{jogo.visitante}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Detalhes */}
      {jogoSelecionado && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setJogoSelecionado(null)}
        >
          <div 
            className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/50 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className="relative p-6 border-b border-slate-700/50 bg-slate-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {jogoSelecionado.logoCampeonato && (
                    <div className="w-10 h-10 rounded-lg bg-white/10 p-1.5">
                      <img 
                        src={jogoSelecionado.logoCampeonato} 
                        alt={jogoSelecionado.campeonato}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-bold text-white">{jogoSelecionado.campeonato}</h2>
                    <p className="text-xs text-slate-400">{jogoSelecionado.data} • {jogoSelecionado.hora || 'Horário a definir'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setJogoSelecionado(null)} 
                  className="p-2 hover:bg-slate-700/50 rounded-full transition-colors"
                >
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              {/* Placar Principal */}
              <div className="flex items-center justify-center gap-6 md:gap-10 mb-8 py-6 bg-slate-900/50 rounded-2xl border border-slate-700/30">
                <div className="text-center flex flex-col items-center">
                  <img 
                    src={jogoSelecionado.logoMandante} 
                    alt={jogoSelecionado.mandante} 
                    className="w-20 h-20 md:w-24 md:h-24 object-contain mb-3 drop-shadow-xl" 
                    onError={handleImageError}
                  />
                  <span className="font-bold text-sm md:text-base text-white">{jogoSelecionado.mandante}</span>
                </div>
                
                <div className="text-center">
                  {jogoSelecionado.status === 'passado' ? (
                    <div className="flex items-center gap-3">
                      <span className="text-4xl md:text-5xl font-black text-white">{jogoSelecionado.golsMandanteNum}</span>
                      <span className="text-2xl text-slate-500">-</span>
                      <span className="text-4xl md:text-5xl font-black text-white">{jogoSelecionado.golsVisitanteNum}</span>
                    </div>
                  ) : (
                    <span className="text-3xl font-black text-emerald-400">VS</span>
                  )}
                  <p className="text-xs text-slate-500 mt-2 flex items-center justify-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {jogoSelecionado.local}
                  </p>
                </div>

                <div className="text-center flex flex-col items-center">
                  <img 
                    src={jogoSelecionado.logoVisitante} 
                    alt={jogoSelecionado.visitante} 
                    className="w-20 h-20 md:w-24 md:h-24 object-contain mb-3 drop-shadow-xl" 
                    onError={handleImageError}
                  />
                  <span className="font-bold text-sm md:text-base text-white">{jogoSelecionado.visitante}</span>
                </div>
              </div>

              {/* Gols */}
              {jogoSelecionado.status === 'passado' && (
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                      Gols {jogoSelecionado.mandante}
                    </h4>
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/30 text-sm text-slate-300 min-h-[60px] whitespace-pre-line">
                      {jogoSelecionado.golsMandante || "Sem gols"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-2 justify-end">
                      Gols {jogoSelecionado.visitante}
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                    </h4>
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/30 text-sm text-slate-300 min-h-[60px] text-right whitespace-pre-line">
                      {jogoSelecionado.golsVisitante || "Sem gols"}
                    </div>
                  </div>
                </div>
              )}

              {/* Escalação */}
              <div>
                <h3 className="text-emerald-400 font-bold text-sm uppercase mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                  Escalação (SofaScore)
                </h3>
                {renderIframe(jogoSelecionado.escalaçaoIframe) || (
                  <div className="bg-slate-900/50 p-12 rounded-xl border border-slate-700/30 text-center">
                    <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-slate-500 text-sm">Escalação ainda não disponível para este jogo</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
