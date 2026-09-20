import { isSupabaseConfigured } from '@/lib/supabase'

export function TripPage() {
  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-sans text-sm uppercase tracking-widest text-muted-foreground">
        18.–24. Oktober 2026
      </p>
      <h1 className="font-display text-4xl font-semibold text-foreground sm:text-5xl">
        USA Family Trip
      </h1>
      <p className="max-w-md text-balance font-sans text-muted-foreground">
        Die gemeinsame Wochenplanung entsteht hier als Nächstes.
      </p>

      {!isSupabaseConfigured && (
        <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 font-sans text-sm text-destructive">
          Supabase-Zugangsdaten fehlen, siehe .env.example.
        </p>
      )}
    </div>
  )
}
