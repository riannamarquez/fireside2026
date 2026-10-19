import { Plus } from 'lucide-react'

export function DashedAddButton({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-pine/35 font-serif text-[17px] text-pine hover:bg-sage/50"
    >
      <Plus size={18} strokeWidth={1.75} aria-hidden="true" />
      {children}
    </button>
  )
}
