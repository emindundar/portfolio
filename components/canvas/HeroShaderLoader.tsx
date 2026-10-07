"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { useReducedMotion } from "@/components/motion/useReducedMotion";
import { supportsWebGL } from "./visibility";

const HeroShader = dynamic(() => import("./HeroShader"), { ssr: false });

function Poster() {
  return (
    <div
      aria-hidden="true"
      data-hero-poster
      className="absolute inset-0 -z-10 bg-[url('/media/hero-poster.svg')] bg-cover bg-center opacity-80"
    />
  );
}

// WebGL desteği oturum boyunca değişmez: bir kez ölç, önbellekle (getSnapshot kararlı olmalı).
let webglCache: boolean | undefined;
const noopSubscribe = () => () => {};
const getWebGLSnapshot = () => (webglCache ??= supportsWebGL());
// Sunucuda ve hydration'da null → poster; istemci onaylayınca shader.
const getWebGLServerSnapshot = () => null;

export function HeroShaderLoader() {
  const reduced = useReducedMotion();
  const webgl = useSyncExternalStore<boolean | null>(noopSubscribe, getWebGLSnapshot, getWebGLServerSnapshot);

  if (reduced || !webgl) return <Poster />;
  return <HeroShader />;
}
