'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCarregando(true)
    setErro('')

    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    })

    if (result.error) {
      setErro('USUÁRIO OU SENHA INCORRETOS')
      setCarregando(false)
    } else {
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen bg-white text-black flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">

        {/* HEADER */}
        <div className="flex items-center gap-4 border-b-4 border-amber-500 pb-4 mb-10">
          <img
            src="/club/escudonovorizontino.png"
            alt="Novorizontino"
            className="h-16 w-auto"
            onError={(e) => { e.target.src = "https://upload.wikimedia.org/wikipedia/pt/8/89/Gremio_Novorizontino_2010.png" }}
          />
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-black uppercase leading-none">Grêmio Novorizontino</h1>
            <p className="text-base font-bold tracking-widest text-slate-600 uppercase">Departamento de Scouting</p>
          </div>
        </div>

        {/* BADGE */}
        <div className="flex justify-end mb-8">
          <div className="bg-amber-500 text-black px-6 py-1 font-black text-xl uppercase italic shadow-md">
            Acesso ao Sistema
          </div>
        </div>

        {/* FORMULÁRIO */}
        <div className="border-2 border-slate-200 rounded-2xl p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Identificação</label>
              <input
                type="text"
                placeholder="USUÁRIO"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest focus:border-amber-500 outline-none transition-all"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Chave de Acesso</label>
              <input
                type="password"
                placeholder="SENHA"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest focus:border-amber-500 outline-none transition-all"
                required
              />
            </div>

            {erro && (
              <div className="border-2 border-red-300 bg-red-50 rounded-xl p-3 text-center">
                <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">{erro}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-black font-black italic uppercase text-[11px] tracking-widest py-4 rounded-2xl transition-all shadow-md active:scale-95 mt-2"
            >
              {carregando ? 'AUTENTICANDO...' : 'ENTRAR NO SISTEMA'}
            </button>
          </form>
        </div>

        {/* FOOTER */}
        <div className="flex justify-between items-center border-t-2 border-slate-900 pt-3 mt-8">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">
            Acesso Restrito à Comissão Técnica
          </span>
          <p className="text-[10px] text-slate-500 font-black italic tracking-tight uppercase">© Scouting System GN</p>
        </div>
      </div>
    </div>
  )
}
