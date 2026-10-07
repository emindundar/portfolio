export type VisibilityController = { dispose(): void };

export function createVisibilityController(
  el: Element,
  onChange: (visible: boolean) => void,
): VisibilityController {
  let intersecting = false;
  const emit = () => onChange(intersecting && document.visibilityState === "visible");

  const io = new IntersectionObserver((entries) => {
    const lastEntry = entries[entries.length - 1];
    if (lastEntry) intersecting = lastEntry.isIntersecting;
    emit();
  });
  io.observe(el);

  const onVis = () => emit();
  document.addEventListener("visibilitychange", onVis);

  return {
    dispose() {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    },
  };
}

// Yazılım GL (SwiftShader/llvmpipe…) tam ekran shader'ı her karede long task'a çevirir (CI'da TBT ~4 s).
// e2e/helpers/gl.ts içinde aynı regex'in kopyası var; değiştirirsen ikisini birlikte güncelle.
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|mesa offscreen|basic render driver|microsoft basic/i;

export function isSoftwareRenderer(name: string): boolean {
  return SOFTWARE_RENDERER.test(name);
}

export function probeWebGL(): { supported: boolean; renderer: string } {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return { supported: false, renderer: "" };
    // Eklenti yoksa donanım varsay
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "";
    // Sonda bağlamını hemen bırak: tarayıcının WebGL bağlam limitinden yemesin
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return { supported: !isSoftwareRenderer(renderer), renderer };
  } catch {
    return { supported: false, renderer: "" };
  }
}

export function supportsWebGL(): boolean {
  return probeWebGL().supported;
}
