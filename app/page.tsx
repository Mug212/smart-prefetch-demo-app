"use client";

import { useSmartPrefetch, type PrefetchCandidate } from "@/hooks/useSmartPrefetch";
import { Zap, Gauge, Navigation, Cpu, CheckCircle2, ArrowRight } from "lucide-react";

const TARGET_CANDIDATES: PrefetchCandidate[] = [
  { id: "nav-checkout", route: "/checkout", label: "Proceed to Checkout", priorProb: 0.45 },
  { id: "nav-specs", route: "/specs", label: "Technical Specs", priorProb: 0.25 },
  { id: "nav-reviews", route: "/reviews", label: "Customer Reviews", priorProb: 0.20 },
  { id: "nav-support", route: "/support", label: "Developer Docs", priorProb: 0.10 },
];

export default function SmartPrefetchDemo() {
  const { isModelReady, predictions, metrics } = useSmartPrefetch(TARGET_CANDIDATES);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold text-lg tracking-tight">SmartPrefetch SDK</h1>
            <p className="text-xs text-slate-400">Client-Side Edge-ML Predictive Navigation</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-full border border-slate-800 bg-slate-900">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            Engine: {isModelReady ? "ONNX WebAssembly (Active)" : "Loading Model..."}
          </span>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl mx-auto w-full">
        {/* Interactive Storefront */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 flex flex-col gap-6">
            <div className="inline-block px-2.5 py-1 rounded text-xs font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 w-max">
              Interactive Test Environment
            </div>

            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white">QuantumEdge Cloud Engine</h2>
              <p className="text-slate-400 mt-2 leading-relaxed">
                Move your cursor naturally toward any button below. The telemetry engine measures velocity alignment (cos θ) and Euclidean distance to predict intent and trigger dynamic prefetching.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              {TARGET_CANDIDATES.map((item) => {
                const pred = predictions.find((p) => p.route === item.route);
                const isTriggered = (pred?.probability ?? 0) >= 0.7;

                return (
                  <button
                    key={item.id}
                    id={item.id}
                    className={`relative p-5 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between h-32 group ${
                      isTriggered
                        ? "border-cyan-500 bg-cyan-950/20 shadow-lg shadow-cyan-500/10"
                        : "border-slate-800 bg-slate-900/80 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-mono text-slate-500">{item.route}</span>
                      {pred?.prefetched && (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Prefetched
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold text-slate-200 group-hover:text-white">{item.label}</span>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border border-slate-800/80 bg-slate-900/20 rounded-xl p-6 text-sm text-slate-400 leading-relaxed">
            <h3 className="font-semibold text-slate-200 mb-2">Performance Optimization:</h3>
            Standard prefetching relies on <code className="text-slate-200">mouseenter</code> (~100ms budget before click) or bulk prefetching. SmartPrefetch anticipates target routes 300–600ms before hover, shaving significant Time to First Byte (TTFB) off route transitions.
          </div>
        </section>

        {/* Real-Time Telemetry HUD */}
        <aside className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 flex flex-col gap-6 sticky top-6 backdrop-blur">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-cyan-400" />
                <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-200">Inference Engine HUD</h3>
              </div>
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                LIVE
              </span>
            </div>

            {/* Physics Metrics */}
            <div className="grid grid-cols-3 gap-3 font-mono">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/60">
                <div className="text-[10px] text-slate-500">SPEED (PX/MS)</div>
                <div className="text-lg font-semibold text-cyan-400 mt-0.5">{metrics.speed.toFixed(2)}</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/60">
                <div className="text-[10px] text-slate-500">INFERENCE</div>
                <div className="text-lg font-semibold text-emerald-400 mt-0.5">{metrics.inferenceTimeMs.toFixed(1)} ms</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/60">
                <div className="text-[10px] text-slate-500">DWELL TIME</div>
                <div className="text-lg font-semibold text-slate-200 mt-0.5">{metrics.dwellSec.toFixed(1)} s</div>
              </div>
            </div>

            {/* Probabilities */}
            <div className="flex flex-col gap-4">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Target Intent Probabilities</span>
              {predictions.map((p) => {
                const percent = Math.round(p.probability * 100);
                const isHigh = p.probability >= 0.7;

                return (
                  <div key={p.route} className="flex flex-col gap-1.5 font-mono text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5 truncate max-w-50">
                        <Navigation className={`w-3 h-3 ${isHigh ? "text-cyan-400" : "text-slate-600"}`} />
                        {p.label}
                      </span>
                      <span className={`font-bold ${isHigh ? "text-cyan-400" : "text-slate-500"}`}>{percent}%</span>
                    </div>

                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className={`h-full transition-all duration-75 ${
                          isHigh ? "bg-cyan-500 shadow-sm shadow-cyan-400" : "bg-slate-700"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>align: {p.cosTheta.toFixed(2)}</span>
                      <span>dist: {Math.round(p.distanceNorm * 100)}%</span>
                      <span>threshold: 70%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}