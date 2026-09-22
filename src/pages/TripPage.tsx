import { useEffect, useMemo, useState } from 'react'
import { DayColumn } from '@/components/DayColumn'
import { SlotFormDialog } from '@/components/SlotFormDialog'
import { useAuth } from '@/lib/AuthContext'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { TRIP_DAYS, type TripDay } from '@/lib/trip'
import type { Slot } from '@/types'

interface DialogState {
  day: TripDay
  slot?: Slot
}

export function TripPage() {
  const { member } = useAuth()
  const [slots, setSlots] = useState<Slot[]>([])
  const [usernames, setUsernames] = useState<Record<string, string>>({})
  const [dialogState, setDialogState] = useState<DialogState | null>(null)

  useEffect(() => {
    if (!supabase) return

    let cancelled = false

    async function loadSlots() {
      const { data } = await supabase!
        .from('slots')
        .select('*')
        .order('created_at', { ascending: true })

      if (!cancelled && data) {
        setSlots(data as Slot[])
      }
    }

    async function loadUsernames() {
      const { data } = await supabase!.rpc('list_usernames')
      if (!cancelled && data) {
        const map: Record<string, string> = {}
        for (const entry of data as { id: string; username: string }[]) {
          map[entry.id] = entry.username
        }
        setUsernames(map)
      }
    }

    loadSlots()
    loadUsernames()

    const channel = supabase
      .channel('slots-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'slots' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newSlot = payload.new as Slot
            setSlots((current) =>
              current.some((s) => s.id === newSlot.id)
                ? current
                : [...current, newSlot],
            )
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Slot
            setSlots((current) =>
              current.map((s) => (s.id === updated.id ? updated : s)),
            )
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as Slot).id
            setSlots((current) => current.filter((s) => s.id !== deletedId))
          }
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase!.removeChannel(channel)
    }
  }, [])

  const slotsByDay = useMemo(() => {
    const map = new Map<string, Slot[]>()
    for (const day of TRIP_DAYS) map.set(day.iso, [])
    for (const slot of slots) {
      map.get(slot.day)?.push(slot)
    }
    return map
  }, [slots])

  if (!member) return null

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-col items-center gap-2 text-center">
        <p className="font-sans text-sm uppercase tracking-widest text-muted-foreground">
          18.–24. Oktober 2026
        </p>
        <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
          USA Family Trip
        </h1>
      </header>

      {!isSupabaseConfigured && (
        <p className="mb-6 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-center font-sans text-sm text-destructive">
          Supabase-Zugangsdaten fehlen, siehe .env.example.
        </p>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4 xl:grid-cols-7">
        {TRIP_DAYS.map((day) => (
          <DayColumn
            key={day.iso}
            day={day}
            slots={slotsByDay.get(day.iso) ?? []}
            usernames={usernames}
            memberId={member.id}
            onAddSlot={() => setDialogState({ day })}
            onEditSlot={(slot) => setDialogState({ day, slot })}
          />
        ))}
      </div>

      {dialogState && (
        <SlotFormDialog
          open
          onOpenChange={(open) => {
            if (!open) setDialogState(null)
          }}
          day={dialogState.day}
          memberId={member.id}
          slot={dialogState.slot}
        />
      )}
    </div>
  )
}
