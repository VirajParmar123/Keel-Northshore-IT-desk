export function BootScreen({ label = "Opening the desk…" }: { label?: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#241c16] text-[#f6efe6]">
      <div className="text-center">
        <p className="font-heading text-4xl tracking-tight">Keel</p>
        <p className="mt-2 text-sm text-[#d9cfc3]">{label}</p>
      </div>
    </div>
  )
}
