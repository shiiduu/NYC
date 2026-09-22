import { ArrowRightCircle, ChevronDown, Pencil, Trash2 } from 'lucide-react'
import { type KeyboardEvent, type MouseEvent, useState } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatTime } from '@/lib/trip'
import { supabase } from '@/lib/supabase'
import type { Slot } from '@/types'

interface SlotCardProps {
  slot: Slot
  authorUsername: string | undefined
  usernames: Record<string, string>
  canManage: boolean
  onEdit: () => void
  onPromote?: () => void
}

export function SlotCard({
  slot,
  authorUsername,
  usernames,
  canManage,
  onEdit,
  onPromote,
}: SlotCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  async function handleDelete() {
    if (!supabase) return
    setDeleting(true)
    await supabase.from('slots').delete().eq('id', slot.id)
    setDeleting(false)
    setConfirmOpen(false)
  }

  function toggleExpanded() {
    setIsExpanded((current) => !current)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggleExpanded()
    }
  }

  function withStopPropagation(handler: () => void) {
    return (event: MouseEvent) => {
      event.stopPropagation()
      handler()
    }
  }

  const displayTime = formatTime(slot.start_time) ?? slot.time_label

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      onClick={toggleExpanded}
      onKeyDown={handleKeyDown}
      className="cursor-pointer text-left"
    >
      <CardContent className="flex flex-col gap-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-[4rem] flex-1 flex-col gap-0.5">
            {displayTime && (
              <span className="font-sans text-xs font-medium uppercase tracking-wide text-secondary">
                {displayTime}
              </span>
            )}
            <h3 className="break-words font-display text-base font-semibold leading-snug text-foreground [overflow-wrap:anywhere]">
              {slot.title}
            </h3>
            {isExpanded && slot.affected_members.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {slot.affected_members.map((id) => (
                  <Badge key={id} variant="secondary" className="font-normal">
                    {usernames[id] ?? '?'}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-start gap-1">
            {canManage && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={withStopPropagation(onEdit)}
                  aria-label="Bearbeiten"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={withStopPropagation(() => setConfirmOpen(true))}
                  aria-label="Löschen"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            <ChevronDown
              className={cn(
                'mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                isExpanded && 'rotate-180',
              )}
              aria-hidden="true"
            />
          </div>
        </div>

        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-200 ease-in-out',
            isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          )}
        >
          <div className="overflow-hidden">
            <div className="flex flex-col gap-1 pt-1">
              {slot.description && (
                <p className="text-sm text-muted-foreground">{slot.description}</p>
              )}

              {slot.link && (
                <a
                  href={slot.link}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="text-sm text-primary underline underline-offset-2"
                >
                  Link öffnen
                </a>
              )}

              {authorUsername && (
                <p className="mt-1 text-xs text-muted-foreground">von {authorUsername}</p>
              )}

              {canManage && onPromote && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 h-auto w-full whitespace-normal py-2"
                  onClick={withStopPropagation(onPromote)}
                  aria-label="In den gemeinsamen Plan übernehmen"
                >
                  <ArrowRightCircle className="h-4 w-4 shrink-0" />
                  <span className="ml-1.5 hidden sm:inline">
                    In den gemeinsamen Plan übernehmen
                  </span>
                  <span className="ml-1.5 sm:hidden">Übernehmen</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent onClick={(event) => event.stopPropagation()}>
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
