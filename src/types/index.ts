export interface FamilyMember {
  id: string
  username: string
  created_at: string
}

export interface Slot {
  id: string
  day: string
  sort_order: number
  title: string
  description: string | null
  link: string | null
  created_by: string
  created_at: string
  updated_at: string
}
