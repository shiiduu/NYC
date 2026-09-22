import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const UNLOCK_KEY = 'trip_unlocked'

function isUnlocked() {
  try {
    return localStorage.getItem(UNLOCK_KEY) === 'true'
  } catch {
    return false
  }
}

// Rein client-seitiger Schutz: die PIN landet im JS-Bundle und ist nicht
// kryptographisch sicher. Soll nur zufällige Linkklicks abhalten, nicht
// vor gezieltem Zugriff auf sensible Daten schützen.
export function AccessGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(isUnlocked)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const expected = import.meta.env.VITE_FAMILY_PIN

    if (!expected) {
      setError('Familien-PIN ist noch nicht konfiguriert (VITE_FAMILY_PIN fehlt).')
      return
    }

    if (pin === expected) {
      try {
        localStorage.setItem(UNLOCK_KEY, 'true')
      } catch {
        // localStorage evtl. nicht verfügbar - Unlock gilt dann nur für diese Session
      }
      setError(null)
      setUnlocked(true)
    } else {
      setError('Falsche PIN.')
    }
  }

  if (unlocked) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Familien-Trip</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="password"
              autoComplete="off"
              placeholder="PIN"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit">Entsperren</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
