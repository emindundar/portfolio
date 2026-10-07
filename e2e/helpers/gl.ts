import type { Page } from "@playwright/test";

/**
 * Mirrors probeWebGL()/isSoftwareRenderer() in components/canvas/visibility.ts (e2e cannot import app code).
 * Keep the regex identical to SOFTWARE_RENDERER there.
 * True when the browser exposes WebGL on a hardware renderer, i.e. when HeroShader mounts a canvas.
 */
export async function hasHardwareGL(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    try {
      const c = document.createElement("canvas");
      const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
      if (!gl) return false;
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      const renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "";
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return !/swiftshader|llvmpipe|softpipe|software|mesa offscreen|basic render driver|microsoft basic/i.test(renderer);
    } catch {
      return false;
    }
  });
}
