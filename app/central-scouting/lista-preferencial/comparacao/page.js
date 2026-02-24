'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { findPlayersByIds } from '@/app/utils/extremosData';
import { cleanData, safeParseFloat } from '@/app/utils/dataCleaner';
import { sheetUrl } from '@/app/datasources';
import jsPDF from 'jspdf';

function ComparacaoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const playersParam = searchParams.get('players');
  
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  const radarMetrics = [
    { label: 'Gols', key: 'Gols' },
    { label: 'Assistências', key: 'Assistências' },
    { label: 'Dribles %', key: 'Dribles com sucesso (%)' },
    { label: 'Cruzamentos %', key: 'Cruzamentos precisos (%)' },
    { label: 'Recuperações', key: 'Recuperações de bola campo ataque' },
    { label: 'Desarmes', key: 'Desarmes' }
  ];

  useEffect(() => {
    const loadPlayers = async () => {
      if (!playersParam) {
        router.push('/central-scouting/lista-preferencial');
        return;
      }

      const playerIds = playersParam.split(',');

      try {
        const response = await fetch(sheetUrl('LISTA_PREFERENCIAL'));
        const csvText = await response.text();
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const cleaned = cleanData(results.data);
            const found = findPlayersByIds(cleaned, playerIds);
            setPlayers(found);
            setLoading(false);
          }
        });
      } catch (error) {
        console.error('Erro ao carregar jogadores:', error);
        setLoading(false);
      }
    };

    loadPlayers();
  }, [playersParam]);

  const exportPDF = () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // TÍTULO
      pdf.setFontSize(20);
      pdf.setTextColor(251, 191, 36);
      pdf.text('ANÁLISE COMPARATIVA DE ATLETAS', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // ATLETAS
      pdf.setFontSize(10);
      pdf.setTextColor(200, 200, 200);
      const playerNames = players.map(p => p.name).join(' vs ');
      pdf.text(playerNames, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // DADOS DOS ATLETAS
      pdf.setFontSize(9);
      players.forEach((player, idx) => {
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.setTextColor(251, 191, 36);
        pdf.text(`${idx + 1}. ${player.name}`, 20, yPosition);
        yPosition += 8;
        
        pdf.setTextColor(150, 150, 150);
        pdf.setFontSize(8);
        pdf.text(`Time: ${player.Time || 'N/A'} | Posição: ${player.Posição || 'N/A'} | Idade: ${player.Idade || 'N/A'}`, 25, yPosition);
        yPosition += 10;
      });

      // NOVA PÁGINA PARA MÉTRICAS
      pdf.addPage();
      yPosition = 20;

      // TABELA DE COMPARAÇÃO
      pdf.setFontSize(12);
      pdf.setTextColor(251, 191, 36);
      pdf.text('COMPARAÇÃO DE MÉTRICAS', 20, yPosition);
      yPosition += 10;

      // CABEÇALHO
      pdf.setFontSize(8);
      pdf.setTextColor(200, 200, 200);
      const colWidth = (pageWidth - 40) / (players.length + 1);
      
      // Métrica
      pdf.text('Métrica', 20, yPosition);
      // Nomes dos atletas
      players.forEach((player, idx) => {
        pdf.text(player.name.substring(0, 12), 20 + colWidth * (idx + 1), yPosition);
      });
      yPosition += 8;

      // Dados
      radarMetrics.forEach(metric => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.setTextColor(150, 150, 150);
        pdf.text(metric.label.substring(0, 15), 20, yPosition);
        
        players.forEach((player, idx) => {
          const value = safeParseFloat(player[metric.key]).toFixed(1);
          pdf.setTextColor(251, 191, 36);
          pdf.text(value, 20 + colWidth * (idx + 1), yPosition);
        });
        yPosition += 7;
      });

      // SALVAR PDF
      const fileName = `comparacao-${players.map(p => p.name.split(' ')[0]).join('-vs-')}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow"></div>
    </div>
  );

  if (players.length === 0) return (
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
      <p className="text-white text-lg font-black uppercase">Nenhum atleta selecionado</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-brand-yellow transition-colors font-black uppercase text-[10px]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </button>
          <h1 className="text-3xl font-black italic uppercase text-brand-yellow">Comparação de Atletas</h1>
          <div className="w-12"></div>
        </div>

        {/* CARDS DOS ATLETAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {players.map((player) => (
            <div key={player.id} className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-6">
              <div className="w-full h-32 rounded-lg bg-slate-800 border border-slate-700 mb-4 overflow-hidden">
                <img 
                  src={`/images/players/${player.id}.png`} 
                  alt={player.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/200/1e293b/fbbf24?text=' + player.name.charAt(0); }}
                />
              </div>
              <h3 className="font-black uppercase italic text-brand-yellow text-sm mb-2">{player.name}</h3>
              <p className="text-[10px] text-slate-400 mb-3">{player.Time} • {player.Posição}</p>
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-300">Gols: <span className="text-brand-yellow">{safeParseFloat(player['Gols']).toFixed(1)}</span></p>
                <p className="text-xs font-bold text-slate-300">Assistências: <span className="text-brand-yellow">{safeParseFloat(player['Assistências']).toFixed(1)}</span></p>
              </div>
            </div>
          ))}
        </div>

        {/* BOTÕES DE AÇÃO */}
        <div className="flex flex-wrap gap-4 mb-8">
          <button
            onClick={() => router.push(`/central-scouting/lista-preferencial/radar?players=${playersParam}`)}
            className="px-6 py-3 bg-brand-yellow text-black font-black uppercase text-[10px] rounded-lg hover:bg-yellow-500 transition-all"
          >
            📊 Ver Radar Completo
          </button>
          <button
            onClick={() => router.push(`/central-scouting/lista-preferencial/dispersao?players=${playersParam}`)}
            className="px-6 py-3 bg-blue-600 text-white font-black uppercase text-[10px] rounded-lg hover:bg-blue-700 transition-all"
          >
            📈 Ver Dispersão Completa
          </button>
          <button
            onClick={exportPDF}
            className="px-6 py-3 bg-slate-700 text-white font-black uppercase text-[10px] rounded-lg hover:bg-slate-600 transition-all"
          >
            🖨️ Exportar PDF
          </button>
        </div>

        {/* TABELA DE COMPARAÇÃO */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8 overflow-x-auto">
          <h3 className="text-lg font-black uppercase italic text-brand-yellow mb-6">Comparação de Métricas</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 font-black uppercase text-[10px] text-slate-400">Métrica</th>
                {players.map((player) => (
                  <th key={player.id} className="text-center py-3 px-4 font-black uppercase text-[10px] text-brand-yellow">{player.name.split(' ')[0]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {radarMetrics.map((metric) => (
                <tr key={metric.key} className="border-b border-slate-800 hover:bg-slate-950/50 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-300">{metric.label}</td>
                  {players.map((player) => {
                    const value = safeParseFloat(player[metric.key]);
                    return (
                      <td key={`${player.id}-${metric.key}`} className="text-center py-3 px-4 font-black text-brand-yellow">
                        {value.toFixed(1)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function ComparacaoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow"></div>
      </div>
    }>
      <ComparacaoContent />
    </Suspense>
  );
}
