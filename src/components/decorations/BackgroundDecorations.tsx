export function BackgroundDecorations() {
  return (
    <div className="fixed inset-0 pointer-events-none -z-50 overflow-hidden">
      {/* Void Watermark */}
      <div className="absolute top-1/4 -right-20 text-[20rem] font-black text-primary opacity-[0.03] rotate-12 select-none leading-none">
        VOID
      </div>

      {/* Light Leaks */}
      <div className="absolute -top-1/4 -left-1/4 w-full h-full bg-primary/5 blur-[120px] rounded-full" />
      <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-primary/5 blur-[120px] rounded-full" />
    </div>
  );
}
