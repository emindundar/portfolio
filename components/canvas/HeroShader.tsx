"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { Renderer, Program, Mesh, Triangle, Vec2, Vec3 } from "ogl";
import { vertex, fragment } from "./shader";
import { createVisibilityController } from "./visibility";

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const FALLBACK: Record<string, string> = { "--bg": "#0b0b0c", "--accent": "#ff4d00" };

function cssColor(name: string): Vec3 {
  let raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!HEX.test(raw)) raw = FALLBACK[name] ?? "#000000";
  const hex = raw.slice(1);
  const n = parseInt(hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex, 16);
  return new Vec3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

type Props = {
  onFirstFrame?: () => void;
  onError?: () => void;
};

export default function HeroShader({ onFirstFrame, onError }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const firstFrame = useEffectEvent(() => onFirstFrame?.());
  const failed = useEffectEvent(() => onError?.());

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: Renderer;
    let program: Program;
    let mesh: Mesh;
    try {
      renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio, 1.5), alpha: true, antialias: false });
      program = new Program(renderer.gl, {
        vertex,
        fragment,
        uniforms: {
          uTime: { value: 0 },
          uMouse: { value: new Vec2(0.5, 0.5) },
          uRes: { value: new Vec2(1, 1) },
          uBg: { value: cssColor("--bg") },
          uAccent: { value: cssColor("--accent") },
        },
      });
      mesh = new Mesh(renderer.gl, { geometry: new Triangle(renderer.gl), program });
    } catch {
      failed();
      return;
    }
    const gl = renderer.gl;
    gl.canvas.setAttribute("aria-hidden", "true");
    host.appendChild(gl.canvas);

    const resize = () => {
      renderer.setSize(host.clientWidth, host.clientHeight);
      program.uniforms.uRes.value.set(host.clientWidth, host.clientHeight);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    let running = false;
    const target = new Vec2(0.5, 0.5);
    const onMove = (e: PointerEvent) => {
      if (!running) return;
      const r = host.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      target.set(clamp01((e.clientX - r.left) / r.width), clamp01(1 - (e.clientY - r.top) / r.height));
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    // Tema değişince (data-theme veya sistem tercihi) renkleri güncelle
    const updateColors = () => {
      program.uniforms.uBg.value = cssColor("--bg");
      program.uniforms.uAccent.value = cssColor("--accent");
    };
    const mo = new MutationObserver(updateColors);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const schemeMql = window.matchMedia("(prefers-color-scheme: light)");
    schemeMql.addEventListener("change", updateColors);

    let raf = 0;
    let last = 0;
    let time = 0;
    let rendered = false;
    const loop = (t: number) => {
      if (!running) return;
      const dt = last ? (t - last) / 1000 : 0;
      last = t;
      // Duraklatmadan dönünce sıçrama olmasın: zaman ve lerp dt'ye bağlı, dt sınırlı
      time += Math.min(dt, 0.05);
      program.uniforms.uTime.value = time;
      const m = program.uniforms.uMouse.value as Vec2;
      const a = 1 - Math.pow(0.95, Math.min(dt, 0.05) * 60);
      m.x += (target.x - m.x) * a;
      m.y += (target.y - m.y) * a;
      renderer.render({ scene: mesh });
      if (!rendered) {
        rendered = true;
        host.dataset.shader = "ready";
        firstFrame();
      }
      raf = requestAnimationFrame(loop);
    };
    const vis = createVisibilityController(host, (visible) => {
      if (visible && !running) {
        running = true;
        last = 0;
        raf = requestAnimationFrame(loop);
      } else if (!visible && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      vis.dispose();
      ro.disconnect();
      mo.disconnect();
      schemeMql.removeEventListener("change", updateColors);
      window.removeEventListener("pointermove", onMove);
      host.removeChild(gl.canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0 -z-10 [&>canvas]:block" data-shader="loading" />;
}
