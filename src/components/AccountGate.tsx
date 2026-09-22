import { type FormEvent, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'

interface Username {
  id: string
  username: string
}

type Mode = 'existing' | 'new'

export function AccountGate() {
  const { login } = useAuth()
  const [usernames, setUsernames] = useState<Username[]>([])
  const [loadingUsernames, setLoadingUsernames] = useState(true)
  const [mode, setMode] = useState<Mode>('existing')
  const [selectedUsername, setSelectedUsername] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadUsernames() {
      if (!supabase) {
        setLoadingUsernames(false)
        return
      }

      const { data, error: rpcError } = await supabase.rpc('list_usernames')

      if (cancelled) return

      if (rpcError) {
        setError('Namen konnten nicht geladen werden: ' + rpcError.message)
      } else {
        setUsernames((data ?? []) as Username[])
      }
      setLoadingUsernames(false)
    }

    loadUsernames()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!supabase) {
      setError('Supabase-Zugangsdaten fehlen, siehe .env.example.')
      return
    }

    const username = mode === 'existing' ? selectedUsername : newUsername.trim()

    if (!username) {
      setError('Bitte einen Namen auswählen oder eingeben.')
      return
    }

    if (!pin) {
      setError('Bitte PIN eingeben.')
      return
    }

    setSubmitting(true)

    const { data, error: rpcError } = await supabase.rpc('register_or_login', {
      p_username: username,
      p_pin: pin,
    })

    setSubmitting(false)

    if (rpcError) {
      setError(
        rpcError.message.includes('PIN')
          ? 'PIN stimmt nicht überein.'
          : rpcError.message,
      )
      return
    }

    login({ id: data as string, username })
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Wer bist du?</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === 'existing' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setMode('existing')}
              >
                Ich bin schon dabei
              </Button>
              <Button
                type="button"
                variant={mode === 'new' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setMode('new')}
              >
                Ich bin neu
              </Button>
            </div>

            {mode === 'existing' ? (
              <Select
                value={selectedUsername}
                onValueChange={setSelectedUsername}
                disabled={loadingUsernames}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingUsernames ? 'Lade Namen…' : 'Namen auswählen'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {usernames.map((entry) => (
                    <SelectItem key={entry.id} value={entry.username}>
                      {entry.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="Dein Name"
                value={newUsername}
                onChange={(event) => setNewUsername(event.target.value)}
                autoFocus
              />
            )}

            <Input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              placeholder="PIN"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
            />

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={submitting}>
              Weiter
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
