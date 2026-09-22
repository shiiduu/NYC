export interface FamilyMember {
  id: string
  username: string
  created_at: string
}

export type SlotScope = 'personal' | 'global'

export interface Slot {
  id: string
  day: string
  sort_order: number
  title: string
  time_label: string | null
  start_time: string | null
  description: string | null
  link: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  scope: SlotScope
  affected_members: string[]
}
