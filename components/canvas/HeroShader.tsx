"use client";

import { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Triangle, Vec2, Vec3 } from "ogl";
import { vertex, fragment } from "./shader";
import { createVisibilityController } from "./visibility";

function cssColor(name: string): Vec3 {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const hex = raw.replace("#", "");
  const n = parseInt(hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex, 16);
  return new Vec3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export default function HeroShader() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio, 1.5), alpha: true, antialias: false });
    const gl = renderer.gl;
    gl.canvas.setAttribute("aria-hidden", "true");
    host.appendChild(gl.canvas);

    const program = new Program(gl, {
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
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    const resize = () => {
      renderer.setSize(host.clientWidth, host.clientHeight);
      program.uniforms.uRes.value.set(host.clientWidth, host.clientHeight);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const target = new Vec2(0.5, 0.5);
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      target.set((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    // tema değişince renkleri güncelle
    const mo = new MutationObserver(() => {
      program.uniforms.uBg.value = cssColor("--bg");
      program.uniforms.uAccent.value = cssColor("--accent");
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    let raf = 0;
    let running = false;
    const loop = (t: number) => {
      if (!running) return;
      program.uniforms.uTime.value = t * 0.001;
      const m = program.uniforms.uMouse.value as Vec2;
      m.x += (target.x - m.x) * 0.05;
      m.y += (target.y - m.y) * 0.05;
      renderer.render({ scene: mesh });
      raf = requestAnimationFrame(loop);
    };
    const vis = createVisibilityController(host, (visible) => {
      if (visible && !running) {
        running = true;
        raf = requestAnimationFrame(loop);
      } else if (!visible && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    host.dataset.shader = "ready";

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      vis.dispose();
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("pointermove", onMove);
      host.removeChild(gl.canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0 -z-10" data-shader="loading" />;
}
