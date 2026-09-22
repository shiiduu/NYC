import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/AuthContext'

export function IdentityBar() {
  const { member, logout } = useAuth()

  if (!member) return null

  return (
    <div className="flex items-center justify-center gap-3 border-b border-border bg-card px-4 py-2 font-sans text-sm text-muted-foreground">
      <span>
        Angemeldet als{' '}
        <span className="font-medium text-foreground">{member.username}</span>
      </span>
      <Button variant="link" size="sm" className="h-auto p-0" onClick={logout}>
        Wechseln
      </Button>
    </div>
  )
}
