import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
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
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import type { Slot } from '@/types'

interface SlotCardProps {
  slot: Slot
  authorUsername: string | undefined
  canManage: boolean
  onEdit: () => void
}

export function SlotCard({ slot, authorUsername, canManage, onEdit }: SlotCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!supabase) return
    setDeleting(true)
    await supabase.from('slots').delete().eq('id', slot.id)
    setDeleting(false)
    setConfirmOpen(false)
  }

  return (
    <Card className="text-left">
      <CardContent className="flex flex-col gap-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            {slot.time_label && (
              <span className="font-sans text-xs font-medium uppercase tracking-wide text-secondary">
                {slot.time_label}
              </span>
            )}
            <h3 className="font-display text-base font-semibold leading-snug text-foreground">
              {slot.title}
            </h3>
          </div>

          {canManage && (
            <div className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onEdit}
                aria-label="Bearbeiten"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={() => setConfirmOpen(true)}
                aria-label="Löschen"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {slot.description && (
          <p className="text-sm text-muted-foreground">{slot.description}</p>
        )}

        {slot.link && (
          <a
            href={slot.link}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary underline underline-offset-2"
          >
            Link öffnen
          </a>
        )}

        {authorUsername && (
          <p className="mt-1 text-xs text-muted-foreground">von {authorUsername}</p>
        )}
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aktivität löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              „{slot.title}" wird endgültig entfernt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={handleDelete}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
