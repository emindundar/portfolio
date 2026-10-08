export function DeviceFrame({ frame, children }: { frame: "phone" | "browser" | "none"; children: React.ReactNode }) {
  if (frame === "none") {
    return (
      <div data-frame="none" className="flex justify-center border border-line bg-surface">
        {children}
      </div>
    );
  }
  if (frame === "phone") {
    return (
      <div data-frame="phone" className="mx-auto w-full max-w-xs border border-line bg-surface p-2">
        <div className="flex aspect-[9/19.5] items-center justify-center overflow-hidden border border-line bg-bg">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div data-frame="browser" className="border border-line bg-surface">
      <div className="flex gap-1.5 border-b border-line p-2" aria-hidden="true">
        <span className="size-2 border border-line" />
        <span className="size-2 border border-line" />
        <span className="size-2 border border-line" />
      </div>
      <div className="flex justify-center overflow-hidden bg-bg">{children}</div>
    </div>
  );
}
