export type VisibilityController = { dispose(): void };

export function createVisibilityController(
  el: Element,
  onChange: (visible: boolean) => void,
): VisibilityController {
  let intersecting = false;
  const emit = () => onChange(intersecting && document.visibilityState === "visible");

  const io = new IntersectionObserver((entries) => {
    intersecting = entries.some((e) => e.isIntersecting);
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
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
