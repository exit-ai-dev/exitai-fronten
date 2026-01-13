import { OrbitLogo } from "./OrbitLogo";

export function LogoThinkingOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="flex flex-col items-center gap-4">
        {/* 外側のグロー効果 - より柔らかく透明に */}
        <div className="relative">
          <div className="absolute inset-0 -m-20 rounded-full bg-red-500/5 blur-3xl animate-pulse" />
          <div className="absolute inset-0 -m-12 rounded-full bg-pink-500/10 blur-2xl animate-pulse" style={{ animationDelay: "0.5s" }} />

          <OrbitLogo size={200} showText />
        </div>

        {/* テキストラベル - より透明感のある背景 */}
        <div className="px-4 py-1.5 rounded-full bg-white/40 backdrop-blur-md border border-white/20 shadow-lg">
          <div className="text-xs text-slate-700 tracking-[0.2em] uppercase font-medium">
            Thinking...
          </div>
        </div>
      </div>
    </div>
  );
}
