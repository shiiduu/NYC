import { type FormEvent, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import type { TripDay } from '@/lib/trip'
import type { Slot, SlotScope } from '@/types'

interface SlotFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  day: TripDay
  memberId: string
  scope: SlotScope
  slot?: Slot
}

interface Username {
  id: string
  username: string
}

export function SlotFormDialog({
  open,
  onOpenChange,
  day,
  memberId,
  scope,
  slot,
}: SlotFormDialogProps) {
  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState('')
  const [description, setDescription] = useState('')
  const [link, setLink] = useState('')
  const [affectedMembers, setAffectedMembers] = useState<string[]>([])
  const [usernames, setUsernames] = useState<Username[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(slot?.title ?? '')
      setStartTime(slot?.start_time ? slot.start_time.slice(0, 5) : '')
      setDescription(slot?.description ?? '')
      setLink(slot?.link ?? '')
      setAffectedMembers(slot?.affected_members ?? [])
      setError(null)
    }
  }, [open, slot])

  useEffect(() => {
    if (!open || !supabase) return

    let cancelled = false

    async function loadUsernames() {
      const { data } = await supabase!.rpc('list_usernames')
      if (!cancelled && data) {
        setUsernames(data as Username[])
      }
    }

    loadUsernames()

    return () => {
      cancelled = true
    }
  }, [open])

  function toggleMember(id: string) {
    setAffectedMembers((current) =>
      current.includes(id) ? current.filter((m) => m !== id) : [...current, id],
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (!supabase) {
      setError('Supabase-Zugangsdaten fehlen, siehe .env.example.')
      return
    }

    if (!title.trim()) {
      setError('Titel darf nicht leer sein.')
      return
    }

    setSubmitting(true)

    const payload = {
      title: title.trim(),
      start_time: startTime || null,
      description: description.trim() || null,
      link: link.trim() || null,
      affected_members: affectedMembers,
    }

    const { error: dbError } = slot
      ? await supabase.from('slots').update(payload).eq('id', slot.id)
      : await supabase.from('slots').insert({
          ...payload,
          day: day.iso,
          created_by: memberId,
          scope,
        })

    setSubmitting(false)

    if (dbError) {
      setError(dbError.message)
      return
    }

    onOpenChange(false)
  }

  const affectedLabel =
    affectedMembers.length === 0
      ? 'Betrifft alle'
      : `Betrifft: ${usernames
          .filter((u) => affectedMembers.includes(u.id))
          .map((u) => u.username)
          .join(', ')}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">
            {slot ? 'Aktivität bearbeiten' : 'Neue Aktivität'} — {day.label}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slot-title">Titel</Label>
            <Input
              id="slot-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slot-time">Uhrzeit</Label>
            <Input
              id="slot-time"
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slot-description">Beschreibung</Label>
            <Textarea
              id="slot-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slot-link">Link</Label>
            <Input
              id="slot-link"
              type="url"
              placeholder="https://…"
              value={link}
              onChange={(event) => setLink(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Betrifft</Label>
            <div className="flex flex-col gap-2">
              {usernames.map((user) => (
                <div key={user.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`slot-member-${user.id}`}
                    checked={affectedMembers.includes(user.id)}
                    onCheckedChange={() => toggleMember(user.id)}
                  />
                  <Label htmlFor={`slot-member-${user.id}`} className="font-normal">
                    {user.username}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{affectedLabel}</p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              Speichern
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
