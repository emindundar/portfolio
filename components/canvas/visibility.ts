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

export function supportsWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (!gl) return false;
    // Sonda bağlamını hemen bırak: tarayıcının WebGL bağlam limitinden yemesin
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}
