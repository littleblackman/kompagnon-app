export interface Scene {
  id: number
  name: string
  description: string
  position: number
  sequence_id?: number
  project_id: number
}

export interface Sequence {
  id: number
  name: string
  description: string
  position: number
  scenes?: Scene[]
  part_id?: number
  afterSequenceId?: number
}

export interface Part {
  id: number
  name: string
  description: string
  position: number
  sequences?: Sequence[]
}

export interface Project {
  id: number
  name: string
  description: string
  parts: Part[]
} 