"use client"
import Image from 'next/image'
import Link from 'next/link'

// DADOS DOS JOGADORES
const jogadores = [
  { "Jogador": "Alexis Ivan Alvarino", "Time": "Grêmio Novorizontino", "Idade": 24, "Altura": "184", "Peso": "81", "Nacionalidade": "Argentina", "Index": "186", "Posição": "RD" },
  { "Jogador": "Mayk", "Time": "Grêmio Novorizontino", "Idade": 26, "Altura": "172", "Peso": "67", "Nacionalidade": "Brazil", "Index": "193", "Posição": "LD" },
  { "Jogador": "Raul Prata", "Time": "Grêmio Novorizontino", "Idade": 37, "Altura": "175", "Peso": "72", "Nacionalidade": "Brazil", "Index": "186", "Posição": "RD" },
  { "Jogador": "Reverson", "Time": "Grêmio Novorizontino", "Idade": 27, "Altura": "180", "Peso": "75", "Nacionalidade": "Brazil", "Index": "190", "Posição": "LD" },
  { "Jogador": "Rodrigo Soares", "Time": "Grêmio Novorizontino", "Idade": 32, "Altura": "177", "Peso": "75", "Nacionalidade": "Brazil", "Index": "192", "Posição": "RD" },
  { "Jogador": "Danilo Barcelos", "Time": "Grêmio Novorizontino", "Idade": 33, "Altura": "186", "Peso": "79", "Nacionalidade": "Brazil", "Index": "184", "Posição": "LD" },
  { "Jogador": "Patrick", "Time": "Grêmio Novorizontino", "Idade": 26, "Altura": "188", "Peso": "82", "Nacionalidade": "Brazil", "Index": "208", "Posição": "ZG" },
  { "Jogador": "Rafael Donato", "Time": "Grêmio Novorizontino", "Idade": 35, "Altura": "194", "Peso": "95", "Nacionalidade": "Brazil", "Index": "204", "Posição": "ZG" },
  { "Jogador": "César Martins", "Time": "Grêmio Novorizontino", "Idade": 32, "Altura": "190", "Peso": "84", "Nacionalidade": "Brazil", "Index": "199", "Posição": "ZG" },
  { "Jogador": "Luisão", "Time": "Grêmio Novorizontino", "Idade": 26, "Altura": "188", "Peso": "80", "Nacionalidade": "Brazil", "Index": "195", "Posição": "ZG" },
  { "Jogador": "Renato Palm", "Time": "Grêmio Novorizontino", "Idade": 25, "Altura": "184", "Peso": "80", "Nacionalidade": "Brazil", "Index": "191", "Posição": "ZG" },
  { "Jogador": "Geovane", "Time": "Grêmio Novorizontino", "Idade": 26, "Altura": "179", "Peso": "76", "Nacionalidade": "Brazil", "Index": "198", "Posição": "VOL" },
  { "Jogador": "Dudu", "Time": "Grêmio Novorizontino", "Idade": 25, "Altura": "176", "Peso": "74", "Nacionalidade": "Brazil", "Index": "196", "Posição": "VOL" },
  { "Jogador": "Marlon", "Time": "Grêmio Novorizontino", "Idade": 34, "Altura": "178", "Peso": "75", "Nacionalidade": "Brazil", "Index": "194", "Posição": "VOL" },
  { "Jogador": "Willian Farias", "Time": "Grêmio Novorizontino", "Idade": 35, "Altura": "177", "Peso": "76", "Nacionalidade": "Brazil", "Index": "188", "Posição": "VOL" },
  { "Jogador": "Eduardo", "Time": "Grêmio Novorizontino", "Idade": 29, "Altura": "182", "Peso": "78", "Nacionalidade": "Brazil", "Index": "192", "Posição": "MC" },
  { "Jogador": "Rodolfo", "Time": "Grêmio Novorizontino", "Idade": 32, "Altura": "175", "Peso": "70", "Nacionalidade": "Brazil", "Index": "185", "Posição": "ATA" },
  { "Jogador": "Lucca", "Time": "Grêmio Novorizontino", "Idade": 21, "Altura": "180", "Peso": "75", "Nacionalidade": "Brazil", "Index": "182", "Posição": "ATA" },
  { "Jogador": "Neto Pessoa", "Time": "Grêmio Novorizontino", "Idade": 30, "Altura": "183", "Peso": "80", "Nacionalidade": "Brazil", "Index": "195", "Posição": "ATA" },
  { "Jogador": "Léo Tocantins", "Time": "Grêmio Novorizontino", "Idade": 26, "Altura": "178", "Peso": "74", "Nacionalidade": "Brazil", "Index": "188", "Posição": "ATA" },
  { "Jogador": "Waguininho", "Time": "Grêmio Novorizontino", "Idade": 34, "Altura": "178", "Peso": "74", "Nacionalidade": "Brazil", "Index": "186", "Posição": "ATA" },
  { "Jogador": "Jordi", "Time": "Grêmio Novorizontino", "Idade": 31, "Altura": "192", "Peso": "88", "Nacionalidade": "Brazil", "Index": "198", "Posição": "GOL" },
  { "Jogador": "Airton", "Time": "Grêmio Novorizontino", "Idade": 30, "Altura": "188", "Peso": "84", "Nacionalidade": "Brazil", "Index": "185", "Posição": "GOL" }
];

export default function PlantelPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      
      {/* HEADER DA PÁGINA */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-800 max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Plantel Principal</h1>
            <p className="text-slate-400 text-sm">Temporada 2026 • Grêmio Novorizontino</p>
          </div>
        </div>
      </div>

      {/* TABELA DE JOGADORES */}
      <div className="max-w-7xl mx-auto bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 text-xs text-slate-500 uppercase border-b border-slate-700">
                <th className="py-4 pl-6 font-medium w-[30%]">Jogador</th>
                <th className="py-4 font-medium w-[10%]">Pos</th>
                <th className="py-4 font-medium w-[10%]">Idade</th>
                <th className="py-4 font-medium w-[10%]">Alt (cm)</th>
                <th className="py-4 font-medium w-[10%]">Peso (kg)</th>
                <th className="py-4 font-medium w-[20%]">Nacionalidade</th>
                <th className="py-4 pr-6 text-right font-medium w-[10%]">Index</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-700/50">
              {jogadores.map((jogador, idx) => (
                <tr key={idx} className="hover:bg-slate-700/30 transition-colors group">
                  <td className="py-4 pl-6 font-medium text-white group-hover:text-emerald-400 transition-colors flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold text-slate-400">
                      {jogador.Jogador.charAt(0)}
                    </div>
                    {jogador.Jogador}
                  </td>
                  <td className="py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold border ${
                      jogador.Posição === 'GOL' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                      jogador.Posição === 'ZG' || jogador.Posição === 'LD' || jogador.Posição === 'RD' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      jogador.Posição === 'VOL' || jogador.Posição === 'MC' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {jogador.Posição}
                    </span>
                  </td>
                  <td className="py-4 text-slate-400">{jogador.Idade}</td>
                  <td className="py-4 text-slate-400">{jogador.Altura}</td>
                  <td className="py-4 text-slate-400">{jogador.Peso}</td>
                  <td className="py-4 text-slate-400 flex items-center gap-2">
                    {jogador.Nacionalidade === 'Brazil' ? '🇧🇷' : '🇦🇷'} {jogador.Nacionalidade}
                  </td>
                  <td className="py-4 pr-6 text-right font-bold text-emerald-400 text-lg">{jogador.Index}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
