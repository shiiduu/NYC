import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SlotCard } from '@/components/SlotCard'
import type { TripDay } from '@/lib/trip'
import type { Slot } from '@/types'

interface DayColumnProps {
  day: TripDay
  slots: Slot[]
  usernames: Record<string, string>
  memberId: string
  onAddSlot: () => void
  onEditSlot: (slot: Slot) => void
  onPromoteSlot?: (slot: Slot) => void
}

export function DayColumn({
  day,
  slots,
  usernames,
  memberId,
  onAddSlot,
  onEditSlot,
  onPromoteSlot,
}: DayColumnProps) {
  return (
    <div className="flex w-72 shrink-0 flex-col gap-3 sm:w-full">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-semibold text-foreground">
          {day.label}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground"
          onClick={onAddSlot}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {slots.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">Noch nichts geplant</p>
            <Button variant="outline" size="sm" onClick={onAddSlot}>
              + Aktivität
            </Button>
          </div>
        ) : (
          slots.map((slot) => (
            <SlotCard
              key={slot.id}
              slot={slot}
              authorUsername={slot.created_by ? usernames[slot.created_by] : undefined}
              usernames={usernames}
              canManage={slot.created_by === memberId}
              onEdit={() => onEditSlot(slot)}
              onPromote={
                onPromoteSlot && slot.scope === 'personal'
                  ? () => onPromoteSlot(slot)
                  : undefined
              }
            />
          ))
        )}
      </div>
    </div>
  )
}
