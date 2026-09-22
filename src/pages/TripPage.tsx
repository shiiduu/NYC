import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DayColumn } from '@/components/DayColumn'
import { SlotFormDialog } from '@/components/SlotFormDialog'
import { useAuth } from '@/lib/AuthContext'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { formatTime, TRIP_DAYS, type TripDay } from '@/lib/trip'
import type { Slot, SlotScope } from '@/types'

interface DialogState {
  day: TripDay
  slot?: Slot
}

interface PromoteState {
  slot: Slot
  dayGlobalSlots: Slot[]
}

export function TripPage() {
  const { member } = useAuth()
  const [activeTab, setActiveTab] = useState<SlotScope>('global')
  const [slots, setSlots] = useState<Slot[]>([])
  const [usernames, setUsernames] = useState<Record<string, string>>({})
  const [dialogState, setDialogState] = useState<DialogState | null>(null)
  const [promoteState, setPromoteState] = useState<PromoteState | null>(null)
  const [promoting, setPromoting] = useState(false)
  const [hasOverflow, setHasOverflow] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const activeTabRef = useRef(activeTab)
  const memberIdRef = useRef(member?.id)

  useEffect(() => {
    activeTabRef.current = activeTab
    memberIdRef.current = member?.id
  }, [activeTab, member])

  function matchesActiveTab(slot: Slot) {
    if (activeTabRef.current === 'global') return slot.scope === 'global'
    return slot.scope === 'personal' && slot.created_by === memberIdRef.current
  }

  useEffect(() => {
    if (!supabase || !member) return

    let cancelled = false

    async function loadSlots() {
      let query = supabase!.from('slots').select('*').order('created_at', { ascending: true })
      query =
        activeTab === 'global'
          ? query.eq('scope', 'global')
          : query.eq('scope', 'personal').eq('created_by', member!.id)

      const { data } = await query
      if (!cancelled && data) {
        setSlots(data as Slot[])
      }
    }

    loadSlots()

    return () => {
      cancelled = true
    }
  }, [activeTab, member])

  useEffect(() => {
    if (!supabase) return

    let cancelled = false

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

    loadUsernames()

    const channel = supabase
      .channel('slots-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'slots' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newSlot = payload.new as Slot
            if (!matchesActiveTab(newSlot)) return
            setSlots((current) =>
              current.some((s) => s.id === newSlot.id) ? current : [...current, newSlot],
            )
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Slot
            setSlots((current) => {
              const exists = current.some((s) => s.id === updated.id)
              if (!matchesActiveTab(updated)) {
                return exists ? current.filter((s) => s.id !== updated.id) : current
              }
              return exists
                ? current.map((s) => (s.id === updated.id ? updated : s))
                : [...current, updated]
            })
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

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    function checkOverflow() {
      setHasOverflow(el!.scrollWidth > el!.clientWidth + 1)
    }

    checkOverflow()

    const observer = new ResizeObserver(checkOverflow)
    observer.observe(el)

    return () => observer.disconnect()
  }, [])

  const slotsByDay = useMemo(() => {
    const map = new Map<string, Slot[]>()
    for (const day of TRIP_DAYS) map.set(day.iso, [])
    for (const slot of slots) {
      map.get(slot.day)?.push(slot)
    }
    return map
  }, [slots])

  async function handlePromoteClick(slot: Slot) {
    if (!supabase) return

    const { data, error } = await supabase
      .from('slots')
      .select('*')
      .eq('day', slot.day)
      .eq('scope', 'global')

    if (error || !data) return

    const dayGlobalSlots = data as Slot[]
    const day = TRIP_DAYS.find((d) => d.iso === slot.day)
    const ownTime = slot.start_time?.slice(0, 5)

    if (ownTime) {
      const ownMembers = new Set(slot.affected_members)
      const conflict = dayGlobalSlots.find((g) => {
        if (g.start_time?.slice(0, 5) !== ownTime) return false
        if (ownMembers.size === 0 || g.affected_members.length === 0) return true
        return g.affected_members.some((id) => ownMembers.has(id))
      })
      if (conflict) {
        toast.error(
          `Konflikt: Um "${formatTime(slot.start_time)}" ist am ${day?.label ?? slot.day} bereits "${conflict.title}" geplant.`,
        )
        return
      }
    }

    setPromoteState({ slot, dayGlobalSlots })
  }

  async function confirmPromote() {
    if (!supabase || !promoteState) return
    setPromoting(true)
    await supabase.from('slots').update({ scope: 'global' }).eq('id', promoteState.slot.id)
    setPromoting(false)
    setPromoteState(null)
  }

  if (!member) return null

  const promoteDay = promoteState
    ? TRIP_DAYS.find((d) => d.iso === promoteState.slot.day)
    : undefined

  return (
    <div className="w-full px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
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

        <div className="mb-6 flex flex-col items-center gap-2">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SlotScope)}>
            <TabsList>
              <TabsTrigger value="global">Gemeinsamer Plan</TabsTrigger>
              <TabsTrigger value="personal">Mein Plan</TabsTrigger>
            </TabsList>
          </Tabs>
          {activeTab === 'personal' && (
            <p className="text-xs text-muted-foreground">
              Nur du siehst diese Einträge, bis du sie in den gemeinsamen Plan übernimmst.
            </p>
          )}
        </div>
      </div>

      <div className="relative w-full">
        <div
          ref={scrollRef}
          className="grid w-full grid-cols-[repeat(7,minmax(220px,1fr))] gap-4 overflow-x-auto pb-4"
        >
          {TRIP_DAYS.map((day) => (
            <DayColumn
              key={day.iso}
              day={day}
              slots={slotsByDay.get(day.iso) ?? []}
              usernames={usernames}
              memberId={member.id}
              onAddSlot={() => setDialogState({ day })}
              onEditSlot={(slot) => setDialogState({ day, slot })}
              onPromoteSlot={activeTab === 'personal' ? handlePromoteClick : undefined}
            />
          ))}
        </div>
        {hasOverflow && (
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent" />
        )}
      </div>

      {dialogState && (
        <SlotFormDialog
          open
          onOpenChange={(open) => {
            if (!open) setDialogState(null)
          }}
          day={dialogState.day}
          memberId={member.id}
          scope={activeTab}
          slot={dialogState.slot}
        />
      )}

      <AlertDialog
        open={promoteState !== null}
        onOpenChange={(open) => {
          if (!open) setPromoteState(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>In gemeinsamen Plan übernehmen?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-2 text-left">
                <span>
                  „{promoteState?.slot.title}" wird am {promoteDay?.label ?? promoteState?.slot.day}{' '}
                  für alle im gemeinsamen Plan sichtbar.
                </span>
                {promoteState && promoteState.dayGlobalSlots.length > 0 && (
                  <span>
                    Bereits geplant an diesem Tag:
                    <ul className="mt-1 list-disc pl-5">
                      {promoteState.dayGlobalSlots.map((g) => (
                        <li key={g.id}>
                          {formatTime(g.start_time) ?? g.time_label
                            ? `${formatTime(g.start_time) ?? g.time_label} – `
                            : ''}
                          {g.title}
                        </li>
                      ))}
                    </ul>
                  </span>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction disabled={promoting} onClick={confirmPromote}>
              Übernehmen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
