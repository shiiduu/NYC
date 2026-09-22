import { type FormEvent, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
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
import type { Slot } from '@/types'

interface SlotFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  day: TripDay
  memberId: string
  slot?: Slot
}

export function SlotFormDialog({
  open,
  onOpenChange,
  day,
  memberId,
  slot,
}: SlotFormDialogProps) {
  const [title, setTitle] = useState('')
  const [timeLabel, setTimeLabel] = useState('')
  const [description, setDescription] = useState('')
  const [link, setLink] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(slot?.title ?? '')
      setTimeLabel(slot?.time_label ?? '')
      setDescription(slot?.description ?? '')
      setLink(slot?.link ?? '')
      setError(null)
    }
  }, [open, slot])

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
      time_label: timeLabel.trim() || null,
      description: description.trim() || null,
      link: link.trim() || null,
    }

    const { error: dbError } = slot
      ? await supabase.from('slots').update(payload).eq('id', slot.id)
      : await supabase.from('slots').insert({
          ...payload,
          day: day.iso,
          created_by: memberId,
        })

    setSubmitting(false)

    if (dbError) {
      setError(dbError.message)
      return
    }

    onOpenChange(false)
  }

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
            <Label htmlFor="slot-time">Zeit/Zeitraum</Label>
            <Input
              id="slot-time"
              placeholder="z.B. Vormittags oder 14:00"
              value={timeLabel}
              onChange={(event) => setTimeLabel(event.target.value)}
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
