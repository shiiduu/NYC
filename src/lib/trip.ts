export interface TripDay {
  iso: string
  label: string
}

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('de-DE', { weekday: 'short' })

function toTripDay(iso: string): TripDay {
  const date = new Date(`${iso}T00:00:00`)
  const weekday = WEEKDAY_FORMATTER.format(date).replace('.', '')
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return { iso, label: `${weekday}, ${day}.${month}.` }
}

export const TRIP_DAYS: TripDay[] = [
  '2026-10-18',
  '2026-10-19',
  '2026-10-20',
  '2026-10-21',
  '2026-10-22',
  '2026-10-23',
  '2026-10-24',
].map(toTripDay)
