"use client";

import dynamic from "next/dynamic";
import { useState, useSyncExternalStore } from "react";
import { useReducedMotion } from "@/components/motion/useReducedMotion";
import { supportsWebGL } from "./visibility";

// Chunk yüklenirken dıştaki <Poster /> zaten görünür; ikinci bir poster render etme.
const HeroShader = dynamic(() => import("./HeroShader"), { ssr: false, loading: () => null });

// Token tabanlı poster: iki temada da --bg / --accent'ten türer, görsel dosyası yok.
// data-hero-poster: "pending" (SSR/hydration, karar yok) · "static" (kalıcı fallback) · "loading" (shader ısınıyor)
type PosterState = "pending" | "static" | "loading";

function Poster({ state }: { state: PosterState }) {
  return (
    <div
      aria-hidden="true"
      data-hero-poster={state}
      className="absolute inset-0 -z-10"
      style={{
        backgroundColor: "var(--bg)",
        backgroundImage:
          "radial-gradient(ellipse at center, transparent 40%, var(--bg) 90%)," +
          "linear-gradient(to right, color-mix(in srgb, var(--accent) 12%, transparent) 1px, transparent 1px)," +
          "linear-gradient(to bottom, color-mix(in srgb, var(--accent) 12%, transparent) 1px, transparent 1px)",
        backgroundSize: "100% 100%, 120px 120px, 120px 120px",
      }}
    />
  );
}

// WebGL desteği oturum boyunca değişmez: bir kez ölç, önbellekle (getSnapshot kararlı olmalı).
let webglCache: boolean | undefined;
const noopSubscribe = () => () => {};
const getWebGLSnapshot = () => (webglCache ??= supportsWebGL());
// Sunucuda ve hydration'da null → poster; istemci onaylayınca shader.
const getWebGLServerSnapshot = () => null;

type Phase = "poster" | "live" | "failed";

export function HeroShaderLoader() {
  const reduced = useReducedMotion();
  const webgl = useSyncExternalStore<boolean | null>(noopSubscribe, getWebGLSnapshot, getWebGLServerSnapshot);
  // Poster, shader ilk kareyi çizene kadar kalır (takas flaşı yok); hata olursa poster kalır.
  const [phase, setPhase] = useState<Phase>("poster");

  if (webgl === null) return <Poster state="pending" />;
  if (reduced || !webgl) return <Poster state="static" />;
  return (
    <>
      {phase !== "live" && <Poster state={phase === "failed" ? "static" : "loading"} />}
      {phase !== "failed" && (
        <HeroShader onFirstFrame={() => setPhase("live")} onError={() => setPhase("failed")} />
      )}
    </>
  );
}
