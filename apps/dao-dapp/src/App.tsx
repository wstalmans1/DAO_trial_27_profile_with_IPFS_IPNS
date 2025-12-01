import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function App() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-slate-950 to-indigo-500/10" aria-hidden />
      <div className="relative flex w-full flex-col gap-10 px-6 py-10">
        <header className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-6 py-4 backdrop-blur">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Starter</p>
            <h1 className="text-2xl font-semibold text-white">DAO DApp</h1>
          </div>
          <ConnectButton />
        </header>
      </div>
    </div>
  )
}
