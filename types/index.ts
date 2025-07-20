export interface Scene {
  id: number
  name: string
  description: string
  position: number
  sequence_id: number
  status_id?: number
  content?: string
}

export interface SequencePersonnage {
  id: number
  personnage: Personnage
}

export interface Sequence {
  id: number
  name: string
  description: string
  position: number
  part_id: number
  status_id?: number
  scenes?: Scene[]
  afterSequenceId?: number
  intention?: string
  aesthetic_idea?: string
  sequencePersonnages?: SequencePersonnage[]
}

export interface Part {
  id: number
  name: string
  description: string
  position: number
  project_id: number
  sequences?: Sequence[]
  status_id?: number
}

export interface Project {
  id: number
  name: string
  description: string
  slug?: string
  parts: Part[]
  personnages?: Personnage[]
}

export interface Personnage {
  id: number
  firstName: string
  lastName: string
  background?: string
  age?: number
  origin?: string
  avatar?: string
  images?: string[]
  level?: number
  analysis?: string
  strength?: string
  weakness?: string
  project_id: number
} 