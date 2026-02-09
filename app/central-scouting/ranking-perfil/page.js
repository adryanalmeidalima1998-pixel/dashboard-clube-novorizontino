'use client';

import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { getRankingByPerfil, getPerfisForPosicao } from '@/app/utils/ratingSystem';
import { cleanData } from '@/app/utils/dataCleaner';

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTx73GpGdTLkIPTmBfkYujRILN3DmPV5FG2dH4-bbELYZJ4STAIYrOSJ7AOPDOTq_tB0ib_xFKHLiHZ/pub?output=csv';

export default function RankingPerfil() {
  const [atletas, setAtletas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPerfil, setSelectedPerfil] = useState('');
  const [ranking, setRanking] = useState([]);
  const [minMinutos, setMinMinutos] = useState(0);
  const [posicoesFiltradas, setPosicoesFiltradas] = useState([]);
  const [selectedPosicao, setSelectedPosicao] = useState('');
  const [allPerfis, setAllPerfis] = useState([]);

  // Carregar dados do CSV
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(CSV_URL);
        const csvText = await response.text();
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const cleaned = cleanData(results.data);
            setAtletas(cleaned);
            
            // Extrair todos os perfis únicos
            const perfisUnicos = new Set();
            cleaned.forEach(atleta => {
              const pos = (atleta.Posição || '').trim().toUpperCase();
              const perfis = getPerfisForPosicao(pos);
              perfis.forEach(p => perfisUnicos.add(p));
            });
            setAllPerfis(Array.from(perfisUnicos).sort());
            
            // Definir primeiro perfil como padrão
            if (perfisUnicos.size > 0) {
              const firstPerfil = Array.from(perfisUnicos).sort()[0];
              setSelectedPerfil(firstPerfil);
            }
            
            setLoading(false);
          },
          error: (err) => {
            setError(`Erro ao carregar CSV: ${err.message}`);
            setLoading(false);
          }
        });
      } catch (err) {
        setError(`Erro ao buscar dados: ${err.message}`);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Atualizar ranking quando perfil ou minutos mudam
  useEffect(() => {
    if (atletas.length > 0 && selectedPerfil) {
      const newRanking = getRankingByPerfil(atletas, selectedPerfil, minMinutos);
      setRanking(newRanking);
      
      // Extrair posições do ranking
      const posicoes = [...new Set(newRanking.map(a => (a.Posição || '').trim().toUpperCase()))].sort();
      setPosicoesFiltradas(posicoes);
      setSelectedPosicao('');
    }
  }, [atletas, selectedPerfil, minMinutos]);

  // Filtrar ranking por posição se selecionada
  const rankingFinal = selectedPosicao 
    ? ranking.filter(a => (a.Posição || '').trim().toUpperCase() === selectedPosicao)
    : ranking;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="bg-red-900 border border-red-700 text-red-100 px-6 py-4 rounded-lg max-w-md">
          <h2 className="font-bold mb-2">Erro ao carregar dados</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Ranking de Perfil</h1>
          <p className="text-slate-400">Classifique atletas por perfil técnico usando análise de percentis</p>
        </div>

        {/* Controles */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Seletor de Perfil */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3">Perfil Técnico</label>
              <select
                value={selectedPerfil}
                onChange={(e) => setSelectedPerfil(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {allPerfis.map(perfil => (
                  <option key={perfil} value={perfil}>{perfil}</option>
                ))}
              </select>
            </div>

            {/* Seletor de Posição */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3">Posição (opcional)</label>
              <select
                value={selectedPosicao}
                onChange={(e) => setSelectedPosicao(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Todas as posições</option>
                {posicoesFiltradas.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>

            {/* Minutos Mínimos */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3">Minutos Mínimos</label>
              <input
                type="number"
                value={minMinutos}
                onChange={(e) => setMinMinutos(Math.max(0, parseInt(e.target.value) || 0))}
                min="0"
                step="90"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Informações do Ranking */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 mb-6">
          <p className="text-slate-300">
            <span className="font-semibold text-white">{rankingFinal.length}</span> atletas encontrados
            {selectedPosicao && ` na posição ${selectedPosicao}`}
            {minMinutos > 0 && ` com ${minMinutos}+ minutos`}
          </p>
        </div>

        {/* Tabela de Ranking */}
        {rankingFinal.length > 0 ? (
          <div className="overflow-x-auto bg-slate-800 rounded-lg border border-slate-700">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Posição</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Jogador</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Time</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Pos.</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Idade</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Min.</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-blue-400">Nota</th>
                </tr>
              </thead>
              <tbody>
                {rankingFinal.map((atleta, idx) => (
                  <tr key={idx} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-blue-400">{idx + 1}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-white">{atleta.Jogador}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{atleta.Time}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{atleta.Posição}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{atleta.Idade || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{atleta['Minutos jogados'] || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white font-bold text-lg">
                        {atleta.notaPerfil}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-12 text-center">
            <p className="text-slate-400 text-lg">Nenhum atleta encontrado com os critérios selecionados.</p>
          </div>
        )}

        {/* Rodapé com informações */}
        <div className="mt-8 bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">ℹ️ Como funciona</h3>
          <ul className="text-sm text-slate-400 space-y-2">
            <li>• <strong>Nota (0-100):</strong> Calculada usando percentis das métricas do perfil dentro da mesma posição</li>
            <li>• <strong>Percentil:</strong> Posição relativa do atleta entre todos os jogadores da mesma posição</li>
            <li>• <strong>Minutos Mínimos:</strong> Filtra apenas atletas com tempo de jogo suficiente</li>
            <li>• <strong>Pesos:</strong> Cada métrica tem um peso diferente conforme o perfil técnico</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
