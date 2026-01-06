<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '~/store/auth'
import { useMetadataStore } from '~/store/metadata'

definePageMeta({
  middleware: 'auth'
})

const authStore = useAuthStore()
const metadataStore = useMetadataStore()
const config = useRuntimeConfig()

const activeTab = ref('events')
const genres = ref<any[]>([])
const isLoading = ref(false)
const expandedGenres = ref<Set<number>>(new Set())

// Modal de modification de sous-genre
const isSubgenreModalOpen = ref(false)
const selectedSubgenre = ref<any>(null)
const subgenreForm = ref({
  name: '',
  description: '',
  genre_id: null as number | null
})
const subgenreEventTypes = ref<any[]>([])
const isLoadingEventTypes = ref(false)
const newEventTypeId = ref<number | null>(null)

// Modal de création de genre
const isGenreModalOpen = ref(false)
const genreForm = ref({
  name: '',
  description: ''
})

// Modal de création de sous-genre
const isCreateSubgenreModalOpen = ref(false)
const createSubgenreForm = ref({
  name: '',
  description: '',
  genre_id: null as number | null
})

// Event Types
const eventTypes = ref<any[]>([])
const expandedEventTypes = ref<Set<number>>(new Set())
const isEventTypeModalOpen = ref(false)
const selectedEventType = ref<any>(null)
const eventTypeForm = ref({
  name: '',
  code: '',
  description: '',
  narrative_part_id: null as number | null
})
const newBeatIsOptional = ref<Record<number, boolean>>({})

// Narrative Structures
const narrativeStructures = ref<any[]>([])
const expandedNarrativeStructures = ref<Set<number>>(new Set())
const isNarrativeStructureModalOpen = ref(false)
const selectedNarrativeStructure = ref<any>(null)
const narrativeStructureForm = ref({
  name: '',
  description: '',
  narrativePartOrder: {} as Record<string, string[]>
})

// Narrative Parts (Segments Narratifs)
const narrativeParts = ref<any[]>([])
const isNarrativePartModalOpen = ref(false)
const selectedNarrativePart = ref<any>(null)
const narrativePartForm = ref({
  name: '',
  code: '',
  description: ''
})

const tabs = [
  { id: 'genres', name: 'Genres', icon: '📚', description: 'Gérer les genres et sous-genres littéraires' },
  { id: 'events', name: 'Beats narratifs', icon: '✨', description: 'Gérer les types de beats et les beats narratifs' },
  { id: 'narrative-structures', name: 'Structures Narratives', icon: '🏗️', description: 'Gérer les structures narratives' },
  { id: 'narrative-parts', name: 'Segments narratifs', icon: '🧩', description: 'Gérer les parties narratives universelles' },
]

// Charger les genres avec leurs subgenres
const fetchGenres = async () => {
  isLoading.value = true
  try {
    genres.value = await $fetch(`${config.public.apiBase}/genre/all`, {
      headers: { 'X-AUTH-TOKEN': authStore.token || '' }
    })
  } catch (error) {
    console.error('Erreur lors du chargement des genres:', error)
  } finally {
    isLoading.value = false
  }
}

// Toggle expansion d'un genre
const toggleGenre = (genreId: number) => {
  if (expandedGenres.value.has(genreId)) {
    expandedGenres.value.delete(genreId)
  } else {
    expandedGenres.value.add(genreId)
  }
}

// Ouvrir la modal de modification d'un sous-genre
const openSubgenreModal = async (subgenre: any) => {
  selectedSubgenre.value = subgenre

  // Trouver le genre parent
  const parentGenre = genres.value.find(g =>
    g.subgenres?.some((sg: any) => sg.id === subgenre.id)
  )

  subgenreForm.value = {
    name: subgenre.name,
    description: subgenre.description || '',
    genre_id: parentGenre?.id || null
  }
  isSubgenreModalOpen.value = true

  // Charger les event types de ce sous-genre
  await fetchSubgenreEventTypes(subgenre.id)
}

// Fermer la modal
const closeSubgenreModal = () => {
  isSubgenreModalOpen.value = false
  selectedSubgenre.value = null
  subgenreEventTypes.value = []
}

// Charger les event types d'un sous-genre
const fetchSubgenreEventTypes = async (subgenreId: number) => {
  isLoadingEventTypes.value = true
  try {
    const response: any = await $fetch(`${config.public.apiBase}/subgenre/${subgenreId}`, {
      headers: { 'X-AUTH-TOKEN': authStore.token || '' }
    })
    subgenreEventTypes.value = response.eventTypes || []
  } catch (error) {
    console.error('Erreur lors du chargement des event types:', error)
  } finally {
    isLoadingEventTypes.value = false
  }
}

// Event types disponibles (non encore assignés au sous-genre)
const availableEventTypes = computed(() => {
  const assignedIds = new Set(subgenreEventTypes.value.map(et => et.id))
  // On utilise les event types du metadata store
  const available = metadataStore.eventTypes.filter(et => !assignedIds.has(et.id))
  console.log('Available event types:', available.length, 'Total:', metadataStore.eventTypes.length, 'Assigned:', assignedIds.size)
  return available
})

// Ajouter un event type au sous-genre
const addEventTypeToSubgenre = async () => {
  if (!newEventTypeId.value || !selectedSubgenre.value) return

  try {
    await $fetch(`${config.public.apiBase}/admin/subgenre-event-type/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': authStore.token || ''
      },
      body: {
        subgenre_id: selectedSubgenre.value.id,
        event_type_id: newEventTypeId.value,
        weight: 1, // Valeur par défaut
        is_mandatory: true
      }
    })

    // Recharger les event types
    await fetchSubgenreEventTypes(selectedSubgenre.value.id)
    newEventTypeId.value = null
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'event type:', error)
  }
}

// Mettre à jour weight ou is_mandatory
const updateEventTypeParams = async (eventTypeId: number, weight?: number, isMandatory?: boolean) => {
  if (!selectedSubgenre.value) return

  try {
    const body: any = {
      subgenre_id: selectedSubgenre.value.id,
      event_type_id: eventTypeId
    }
    if (weight !== undefined) body.weight = weight
    if (isMandatory !== undefined) body.is_mandatory = isMandatory

    await $fetch(`${config.public.apiBase}/admin/subgenre-event-type/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': authStore.token || ''
      },
      body
    })

    // Recharger les event types
    await fetchSubgenreEventTypes(selectedSubgenre.value.id)
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error)
  }
}

// Supprimer un event type du sous-genre
const removeEventTypeFromSubgenre = async (eventTypeId: number) => {
  if (!selectedSubgenre.value) return

  try {
    await $fetch(`${config.public.apiBase}/admin/subgenre-event-type/remove`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': authStore.token || ''
      },
      body: {
        subgenre_id: selectedSubgenre.value.id,
        event_type_id: eventTypeId
      }
    })

    // Recharger les event types
    await fetchSubgenreEventTypes(selectedSubgenre.value.id)
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'event type:', error)
  }
}

// Sauvegarder les modifications du sous-genre
const saveSubgenre = async () => {
  if (!selectedSubgenre.value) return

  try {
    await $fetch(`${config.public.apiBase}/admin/subgenre/${selectedSubgenre.value.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': authStore.token || ''
      },
      body: subgenreForm.value
    })

    // Recharger les genres
    await fetchGenres()
    closeSubgenreModal()
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
  }
}

// Ouvrir modal de création de genre
const openGenreModal = () => {
  genreForm.value = { name: '', description: '' }
  isGenreModalOpen.value = true
}

// Créer un genre
const createGenre = async () => {
  try {
    await $fetch(`${config.public.apiBase}/admin/genre`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': authStore.token || ''
      },
      body: genreForm.value
    })
    await fetchGenres()
    isGenreModalOpen.value = false
  } catch (error) {
    console.error('Erreur lors de la création du genre:', error)
  }
}

// Supprimer un genre
const deleteGenre = async (genreId: number, subgenresCount: number) => {
  if (subgenresCount > 0) {
    alert('Impossible de supprimer un genre qui contient des sous-genres')
    return
  }

  if (!confirm('Êtes-vous sûr de vouloir supprimer ce genre ?')) return

  try {
    await $fetch(`${config.public.apiBase}/admin/genre/${genreId}`, {
      method: 'DELETE',
      headers: { 'X-AUTH-TOKEN': authStore.token || '' }
    })
    await fetchGenres()
  } catch (error) {
    console.error('Erreur lors de la suppression du genre:', error)
  }
}

// Ouvrir modal de création de sous-genre
const openCreateSubgenreModal = () => {
  createSubgenreForm.value = { name: '', description: '', genre_id: null }
  isCreateSubgenreModalOpen.value = true
}

// Créer un sous-genre
const createSubgenre = async () => {
  if (!createSubgenreForm.value.genre_id) {
    alert('Veuillez sélectionner un genre parent')
    return
  }

  try {
    await $fetch(`${config.public.apiBase}/admin/subgenre`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': authStore.token || ''
      },
      body: createSubgenreForm.value
    })
    await fetchGenres()
    isCreateSubgenreModalOpen.value = false
  } catch (error) {
    console.error('Erreur lors de la création du sous-genre:', error)
  }
}

// Supprimer un sous-genre
const deleteSubgenre = async (subgenreId: number) => {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce sous-genre ?')) return

  try {
    await $fetch(`${config.public.apiBase}/admin/subgenre/${subgenreId}`, {
      method: 'DELETE',
      headers: { 'X-AUTH-TOKEN': authStore.token || '' }
    })
    await fetchGenres()
  } catch (error) {
    console.error('Erreur lors de la suppression du sous-genre:', error)
    alert('Erreur lors de la suppression du sous-genre')
  }
}

// ========== EVENT TYPES ==========

// Charger les event types avec leurs events
const fetchEventTypes = async () => {
  isLoading.value = true
  try {
    eventTypes.value = await $fetch(`${config.public.apiBase}/admin/event-type`, {
      headers: { 'X-AUTH-TOKEN': authStore.token || '' }
    })
  } catch (error) {
    console.error('Erreur lors du chargement des event types:', error)
  } finally {
    isLoading.value = false
  }
}

// Toggle expansion d'un event type
const toggleEventType = (eventTypeId: number) => {
  if (expandedEventTypes.value.has(eventTypeId)) {
    expandedEventTypes.value.delete(eventTypeId)
  } else {
    expandedEventTypes.value.add(eventTypeId)
  }
}

// Ouvrir le modal pour créer un event type
const openCreateEventTypeModal = () => {
  selectedEventType.value = null
  eventTypeForm.value = { name: '', code: '', description: '', narrative_part_id: null }
  isEventTypeModalOpen.value = true
}

// Ouvrir le modal pour éditer un event type
const openEventTypeModal = (eventType: any) => {
  selectedEventType.value = eventType
  eventTypeForm.value = {
    name: eventType.name,
    code: eventType.code,
    description: eventType.description || '',
    narrative_part_id: eventType.narrativePart?.id || null
  }
  isEventTypeModalOpen.value = true
}

// Fermer le modal event type
const closeEventTypeModal = () => {
  isEventTypeModalOpen.value = false
  selectedEventType.value = null
}

// Sauvegarder un event type (création ou modification)
const saveEventType = async () => {
  try {
    if (selectedEventType.value) {
      // Modification
      await $fetch(`${config.public.apiBase}/admin/event-type/${selectedEventType.value.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-AUTH-TOKEN': authStore.token || ''
        },
        body: eventTypeForm.value
      })
    } else {
      // Création
      await $fetch(`${config.public.apiBase}/admin/event-type`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AUTH-TOKEN': authStore.token || ''
        },
        body: eventTypeForm.value
      })
    }
    await fetchEventTypes()
    closeEventTypeModal()
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du type de beat:', error)
    alert('Erreur lors de la sauvegarde')
  }
}

// Supprimer un event type
const deleteEventType = async (eventTypeId: number, eventsCount: number) => {
  if (eventsCount > 0) {
    alert('Impossible de supprimer un type de beat qui contient des beats')
    return
  }
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce type de beat ?')) return

  try {
    await $fetch(`${config.public.apiBase}/admin/event-type/${eventTypeId}`, {
      method: 'DELETE',
      headers: { 'X-AUTH-TOKEN': authStore.token || '' }
    })
    await fetchEventTypes()
  } catch (error) {
    console.error('Erreur lors de la suppression du type de beat:', error)
    alert('Erreur lors de la suppression')
  }
}

// Créer un event dans un event type
const createEvent = async (eventTypeId: number, eventName: string, isOptional: boolean = false) => {
  if (!eventName.trim()) return

  try {
    await $fetch(`${config.public.apiBase}/admin/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': authStore.token || ''
      },
      body: {
        name: eventName,
        event_type_id: eventTypeId,
        isOptional: isOptional
      }
    })
    await fetchEventTypes()
    // Réinitialiser le checkbox après création
    if (newBeatIsOptional.value[eventTypeId]) {
      newBeatIsOptional.value[eventTypeId] = false
    }
  } catch (error) {
    console.error('Erreur lors de la création du beat:', error)
    alert('Erreur lors de la création du beat')
  }
}

// Supprimer un event
const deleteEvent = async (eventId: number) => {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce beat ?')) return

  try {
    await $fetch(`${config.public.apiBase}/admin/event/${eventId}`, {
      method: 'DELETE',
      headers: { 'X-AUTH-TOKEN': authStore.token || '' }
    })
    await fetchEventTypes()
  } catch (error) {
    console.error('Erreur lors de la suppression du beat:', error)
    alert('Erreur lors de la suppression')
  }
}

// Mettre à jour le statut isOptional d'un event
const toggleEventOptional = async (event: any) => {
  try {
    await $fetch(`${config.public.apiBase}/admin/event/${event.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': authStore.token || ''
      },
      body: {
        isOptional: !event.isOptional
      }
    })
    await fetchEventTypes()
  } catch (error) {
    console.error('Erreur lors de la mise à jour du beat:', error)
    alert('Erreur lors de la mise à jour')
  }
}

// === NARRATIVE STRUCTURES ===

// Charger les structures narratives
const fetchNarrativeStructures = async () => {
  isLoading.value = true
  try {
    narrativeStructures.value = await $fetch(`${config.public.apiBase}/admin/narrative-structure`, {
      headers: { 'X-AUTH-TOKEN': authStore.token || '' }
    })
  } catch (error) {
    console.error('Erreur lors du chargement des structures narratives:', error)
  } finally {
    isLoading.value = false
  }
}

// Toggle expansion d'une structure
const toggleNarrativeStructure = (structureId: number) => {
  if (expandedNarrativeStructures.value.has(structureId)) {
    expandedNarrativeStructures.value.delete(structureId)
  } else {
    expandedNarrativeStructures.value.add(structureId)
  }
}

// Ouvrir modal création
const openCreateNarrativeStructureModal = () => {
  selectedNarrativeStructure.value = null
  narrativeStructureForm.value = {
    name: '',
    description: '',
    narrativePartOrder: {}
  }
  isNarrativeStructureModalOpen.value = true
}

// Ouvrir modal modification
const openNarrativeStructureModal = (structure: any) => {
  selectedNarrativeStructure.value = structure
  narrativeStructureForm.value = {
    name: structure.name,
    description: structure.description || '',
    narrativePartOrder: structure.narrativePartOrder || {}
  }
  isNarrativeStructureModalOpen.value = true
}

// Fermer modal
const closeNarrativeStructureModal = () => {
  isNarrativeStructureModalOpen.value = false
  selectedNarrativeStructure.value = null
}

// Sauvegarder structure
const saveNarrativeStructure = async () => {
  try {
    if (selectedNarrativeStructure.value) {
      await $fetch(`${config.public.apiBase}/admin/narrative-structure/${selectedNarrativeStructure.value.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-AUTH-TOKEN': authStore.token || ''
        },
        body: narrativeStructureForm.value
      })
    } else {
      await $fetch(`${config.public.apiBase}/admin/narrative-structure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AUTH-TOKEN': authStore.token || ''
        },
        body: narrativeStructureForm.value
      })
    }
    await fetchNarrativeStructures()
    closeNarrativeStructureModal()
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la structure narrative:', error)
    alert('Erreur lors de la sauvegarde')
  }
}

// Supprimer structure
const deleteNarrativeStructure = async (structureId: number) => {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette structure narrative ?')) return

  try {
    await $fetch(`${config.public.apiBase}/admin/narrative-structure/${structureId}`, {
      method: 'DELETE',
      headers: { 'X-AUTH-TOKEN': authStore.token || '' }
    })
    await fetchNarrativeStructures()
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    alert('Erreur lors de la suppression')
  }
}

// Ajouter une section (acte/phase)
const addSection = () => {
  const sectionName = prompt('Nom de la section (ex: "Acte 1", "Éveil", etc.):')
  if (!sectionName || !sectionName.trim()) return

  narrativeStructureForm.value.narrativePartOrder[sectionName] = []
}

// Supprimer une section
const removeSection = (sectionName: string) => {
  delete narrativeStructureForm.value.narrativePartOrder[sectionName]
}

// Ajouter un segment narratif à une section
const addNarrativePartToSection = (sectionName: string) => {
  const code = prompt('Code du Segment Narratif (ex: SETUP, CRISIS, etc.):')
  if (!code || !code.trim()) return

  if (!narrativeStructureForm.value.narrativePartOrder[sectionName]) {
    narrativeStructureForm.value.narrativePartOrder[sectionName] = []
  }
  narrativeStructureForm.value.narrativePartOrder[sectionName].push(code.toUpperCase())
}

// Retirer un segment narratif d'une section
const removeNarrativePartFromSection = (sectionName: string, index: number) => {
  narrativeStructureForm.value.narrativePartOrder[sectionName].splice(index, 1)
}

// Déplacer un segment narratif vers le haut dans une section
const moveNarrativePartUp = (sectionName: string, index: number) => {
  if (index === 0) return
  const parts = narrativeStructureForm.value.narrativePartOrder[sectionName]
  const temp = parts[index]
  parts[index] = parts[index - 1]
  parts[index - 1] = temp
}

// Déplacer un segment narratif vers le bas dans une section
const moveNarrativePartDown = (sectionName: string, index: number) => {
  const parts = narrativeStructureForm.value.narrativePartOrder[sectionName]
  if (index === parts.length - 1) return
  const temp = parts[index]
  parts[index] = parts[index + 1]
  parts[index + 1] = temp
}

// Obtenir les sections comme array ordonné
const getSectionsArray = () => {
  return Object.keys(narrativeStructureForm.value.narrativePartOrder)
}

// Déplacer une section vers le haut
const moveSectionUp = (sectionName: string) => {
  const sections = getSectionsArray()
  const index = sections.indexOf(sectionName)
  if (index <= 0) return

  // Créer un nouvel objet avec le bon ordre
  const newOrder: Record<string, string[]> = {}
  sections.forEach((key, i) => {
    if (i === index - 1) {
      newOrder[sections[index]] = narrativeStructureForm.value.narrativePartOrder[sections[index]]
    } else if (i === index) {
      newOrder[sections[index - 1]] = narrativeStructureForm.value.narrativePartOrder[sections[index - 1]]
    } else {
      newOrder[key] = narrativeStructureForm.value.narrativePartOrder[key]
    }
  })
  narrativeStructureForm.value.narrativePartOrder = newOrder
}

// Déplacer une section vers le bas
const moveSectionDown = (sectionName: string) => {
  const sections = getSectionsArray()
  const index = sections.indexOf(sectionName)
  if (index === -1 || index >= sections.length - 1) return

  // Créer un nouvel objet avec le bon ordre
  const newOrder: Record<string, string[]> = {}
  sections.forEach((key, i) => {
    if (i === index) {
      newOrder[sections[index + 1]] = narrativeStructureForm.value.narrativePartOrder[sections[index + 1]]
    } else if (i === index + 1) {
      newOrder[sections[index]] = narrativeStructureForm.value.narrativePartOrder[sections[index]]
    } else {
      newOrder[key] = narrativeStructureForm.value.narrativePartOrder[key]
    }
  })
  narrativeStructureForm.value.narrativePartOrder = newOrder
}

// === NARRATIVE PARTS (SEGMENTS NARRATIFS) ===

// Charger les segments narratifs
const fetchNarrativeParts = async () => {
  isLoading.value = true
  try {
    narrativeParts.value = await $fetch(`${config.public.apiBase}/admin/narrative-part`, {
      headers: { 'X-AUTH-TOKEN': authStore.token || '' }
    })
  } catch (error) {
    console.error('Erreur lors du chargement des segments narratifs:', error)
  } finally {
    isLoading.value = false
  }
}

// Ouvrir modal création
const openCreateNarrativePartModal = () => {
  selectedNarrativePart.value = null
  narrativePartForm.value = { name: '', code: '', description: '' }
  isNarrativePartModalOpen.value = true
}

// Ouvrir modal modification
const openNarrativePartModal = (narrativePart: any) => {
  selectedNarrativePart.value = narrativePart
  narrativePartForm.value = {
    name: narrativePart.name,
    code: narrativePart.code,
    description: narrativePart.description || ''
  }
  isNarrativePartModalOpen.value = true
}

// Fermer modal
const closeNarrativePartModal = () => {
  isNarrativePartModalOpen.value = false
  selectedNarrativePart.value = null
}

// Sauvegarder segment narratif
const saveNarrativePart = async () => {
  try {
    if (selectedNarrativePart.value) {
      // Modification
      await $fetch(`${config.public.apiBase}/admin/narrative-part/${selectedNarrativePart.value.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-AUTH-TOKEN': authStore.token || ''
        },
        body: narrativePartForm.value
      })
    } else {
      // Création
      await $fetch(`${config.public.apiBase}/admin/narrative-part`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AUTH-TOKEN': authStore.token || ''
        },
        body: narrativePartForm.value
      })
    }
    await fetchNarrativeParts()
    await metadataStore.fetchMetadata() // Recharger pour mettre à jour les selects
    closeNarrativePartModal()
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du segment narratif:', error)
    alert('Erreur lors de la sauvegarde')
  }
}

// Supprimer segment narratif
const deleteNarrativePart = async (narrativePartId: number, eventTypesCount: number) => {
  if (eventTypesCount > 0) {
    alert('Impossible de supprimer un segment narratif qui a des types de beats associés')
    return
  }
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce segment narratif ?')) return

  try {
    await $fetch(`${config.public.apiBase}/admin/narrative-part/${narrativePartId}`, {
      method: 'DELETE',
      headers: { 'X-AUTH-TOKEN': authStore.token || '' }
    })
    await fetchNarrativeParts()
    await metadataStore.fetchMetadata()
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    alert('Erreur lors de la suppression')
  }
}

onMounted(async () => {
  // Charger les metadata si pas encore chargés
  if (!metadataStore.loaded) {
    await metadataStore.fetchMetadata()
  }
  fetchGenres()
  fetchEventTypes()
  fetchNarrativeStructures()
  fetchNarrativeParts()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-gray-900 mb-2">
          🔧 Administration
        </h1>
        <p class="text-gray-600">
          Gestion des métadonnées narratives
        </p>
      </div>

      <!-- Tabs Navigation -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              :class="[
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2'
              ]"
            >
              <span class="text-lg">{{ tab.icon }}</span>
              {{ tab.name }}
            </button>
          </nav>
        </div>
      </div>

      <!-- Tab Content -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <!-- Info du tab actif -->
        <div class="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
          <p class="text-sm text-blue-800">
            {{ tabs.find(t => t.id === activeTab)?.description }}
          </p>
        </div>

        <!-- Genres -->
        <div v-if="activeTab === 'genres'">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl font-bold text-gray-900">Gestion des Genres</h2>
            <div class="flex gap-3">
              <button
                @click="openGenreModal"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                + Ajouter un genre
              </button>
              <button
                @click="openCreateSubgenreModal"
                class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                + Ajouter un sous-genre
              </button>
            </div>
          </div>

          <!-- Loading -->
          <div v-if="isLoading" class="text-center py-8">
            <p class="text-gray-600">Chargement...</p>
          </div>

          <!-- Liste des genres -->
          <div v-else class="space-y-4">
            <div
              v-for="genre in genres"
              :key="genre.id"
              class="bg-white border border-gray-200 rounded-lg overflow-hidden"
            >
              <!-- Genre Header -->
              <div
                class="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100"
              >
                <div class="flex items-center justify-between">
                  <div
                    @click="toggleGenre(genre.id)"
                    class="flex items-center gap-3 flex-1 cursor-pointer hover:opacity-80"
                  >
                    <svg
                      class="w-5 h-5 text-blue-600 transition-transform"
                      :class="{ 'rotate-90': expandedGenres.has(genre.id) }"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                    <h3 class="text-lg font-bold text-gray-900">{{ genre.name }}</h3>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-sm bg-blue-200 text-blue-800 px-3 py-1 rounded-full font-medium">
                      {{ genre.subgenresCount || 0 }} sous-genre(s)
                    </span>
                    <button
                      v-if="genre.subgenresCount === 0"
                      @click.stop="deleteGenre(genre.id, genre.subgenresCount)"
                      class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer ce genre"
                    >
                      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p
                  v-if="genre.description"
                  @click="toggleGenre(genre.id)"
                  class="text-sm text-gray-600 mt-2 cursor-pointer hover:opacity-80"
                >
                  {{ genre.description }}
                </p>
              </div>

              <!-- Subgenres (si déplié) -->
              <div v-if="expandedGenres.has(genre.id)" class="p-6 bg-gray-50">
                <div v-if="genre.subgenres && genre.subgenres.length > 0" class="space-y-3">
                  <div
                    v-for="subgenre in genre.subgenres"
                    :key="subgenre.id"
                    class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div class="flex items-start justify-between">
                      <div
                        class="flex-1 cursor-pointer"
                        @click="openSubgenreModal(subgenre)"
                      >
                        <h4 class="font-semibold text-gray-900">{{ subgenre.name }}</h4>
                        <p v-if="subgenre.description" class="text-sm text-gray-600 mt-1">
                          {{ subgenre.description }}
                        </p>
                        <p v-if="subgenre.eventTypesCount > 0" class="text-xs text-gray-500 mt-1">
                          {{ subgenre.eventTypesCount }} event type(s) associé(s)
                        </p>
                      </div>
                      <button
                        v-if="subgenre.eventTypesCount === 0"
                        @click.stop="deleteSubgenre(subgenre.id)"
                        class="ml-3 p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Supprimer ce sous-genre"
                      >
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                <p v-else class="text-gray-500 text-sm italic">
                  Aucun sous-genre pour ce genre.
                </p>
              </div>
            </div>
          </div>

          <!-- Texte d'aide Genres -->
          <div class="mt-8 p-6 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
            <h3 class="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Comment fonctionnent les Genres & Sous-genres ?
            </h3>
            <div class="space-y-3 text-sm text-blue-900">
              <p><strong>Hiérarchie :</strong> Genre → Sous-genres → Types de Beats narratifs</p>
              <p>
                <strong>Rôle des Genres :</strong> Les genres servent à catégoriser les projets (Thriller, Fantasy, Romance...).
                Chaque genre peut contenir plusieurs sous-genres qui affinent la catégorie.
              </p>
              <p>
                <strong>Rôle des Sous-genres :</strong> Les sous-genres (ex: "Thriller Psychologique", "Fantasy Épique")
                définissent des <strong>Types de Beats spécifiques</strong> avec un poids et une obligation (mandatory).
              </p>
              <p>
                <strong>⚠️ Impact des modifications :</strong>
              </p>
              <ul class="list-disc list-inside ml-4 space-y-1">
                <li>Supprimer un <strong>Genre</strong> supprime tous ses <strong>sous-genres</strong> (protection activée)</li>
                <li>Supprimer un <strong>Sous-genre</strong> retire toutes ses associations avec les Types de Beats</li>
                <li>Les projets existants conservent leur genre/sous-genre même après suppression</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Subgenres -->
        <div v-else-if="activeTab === 'subgenres'">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Gestion des Sous-genres</h2>
          <p class="text-gray-600">Bientôt disponible...</p>
        </div>

        <!-- Segments Narratifs -->
        <div v-else-if="activeTab === 'narrative-parts'">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl font-bold text-gray-900">Gestion des Segments Narratifs</h2>
            <button @click="openCreateNarrativePartModal"
                    class="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium">
              + Ajouter un Segment
            </button>
          </div>

          <div v-if="isLoading" class="text-center py-8">
            <p class="text-gray-600">Chargement...</p>
          </div>

          <div v-else class="space-y-3">
            <div v-for="narrativePart in narrativeParts" :key="narrativePart.id"
                 class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-2">
                    <h3 class="text-lg font-bold text-gray-900">{{ narrativePart.name }}</h3>
                    <code class="px-2 py-1 text-xs bg-teal-100 text-teal-800 rounded font-mono">{{ narrativePart.code }}</code>
                    <span v-if="narrativePart.eventTypesCount > 0"
                          class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {{ narrativePart.eventTypesCount }} type(s) de beat
                    </span>
                  </div>
                  <p v-if="narrativePart.description" class="text-sm text-gray-600 mt-1">
                    {{ narrativePart.description }}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <button @click="openNarrativePartModal(narrativePart)"
                          class="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Modifier">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button v-if="narrativePart.eventTypesCount === 0"
                          @click="deleteNarrativePart(narrativePart.id, narrativePart.eventTypesCount)"
                          class="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Supprimer">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <p v-if="narrativeParts.length === 0" class="text-center text-gray-500 py-8 italic">
              Aucun segment narratif créé. Cliquez sur "Ajouter un Segment" pour commencer.
            </p>
          </div>

          <!-- Texte d'aide Segments Narratifs -->
          <div class="mt-8 p-6 bg-teal-50 border-l-4 border-teal-500 rounded-r-lg">
            <h3 class="text-lg font-bold text-teal-900 mb-3 flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Comment fonctionnent les Segments Narratifs ?
            </h3>
            <div class="space-y-3 text-sm text-teal-900">
              <p><strong>Hiérarchie :</strong> Segments Narratifs → Types de Beats → Beats</p>
              <p>
                <strong>Rôle des Segments :</strong> Les segments narratifs (ex: SETUP, DISRUPTION, CRISIS, CLIMAX, RESOLUTION)
                sont des <strong>composants universels réutilisables</strong> qui structurent un récit.
              </p>
              <p>
                <strong>Utilisation :</strong> Les segments contiennent des <strong>Types de Beats</strong>, qui eux-mêmes contiennent des <strong>Beats</strong> concrets.
                Ils sont ensuite utilisés dans les <strong>Structures Narratives</strong> pour définir l'ordre et l'organisation d'une histoire.
              </p>
              <p>
                <strong>⚠️ Impact des modifications :</strong>
              </p>
              <ul class="list-disc list-inside ml-4 space-y-1">
                <li>Supprimer un <strong>Segment</strong> est impossible s'il contient des Types de Beats (protection activée)</li>
                <li>Modifier le <strong>code</strong> d'un segment impacte toutes les Structures Narratives qui l'utilisent</li>
                <li>Les segments sont référencés par leur code (ex: "SETUP") dans le champ JSON <code>narrativePartOrder</code></li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Narrative Structures -->
        <div v-else-if="activeTab === 'narrative-structures'">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl font-bold text-gray-900">Gestion des Structures Narratives</h2>
            <button @click="openCreateNarrativeStructureModal"
                    class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              + Ajouter une Structure
            </button>
          </div>

          <div v-if="isLoading" class="text-center py-8">
            <p class="text-gray-600">Chargement...</p>
          </div>

          <div v-else class="space-y-4">
            <div v-for="structure in narrativeStructures" :key="structure.id"
                 class="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">

              <!-- Header cliquable -->
              <div @click="toggleNarrativeStructure(structure.id)"
                   class="p-6 cursor-pointer hover:bg-gray-50 transition-colors">
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-3">
                      <h3 class="text-xl font-bold text-gray-900">{{ structure.name }}</h3>
                      <span class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        {{ Object.keys(structure.narrativePartOrder || {}).length }} sections
                      </span>
                    </div>
                    <p v-if="structure.description" class="text-gray-600 mt-1">{{ structure.description }}</p>
                  </div>
                  <div class="flex items-center gap-3">
                    <button @click.stop="openNarrativeStructureModal(structure)"
                            class="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Modifier">
                      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button @click.stop="deleteNarrativeStructure(structure.id)"
                            class="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Supprimer">
                      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <svg class="w-6 h-6 text-gray-400 transition-transform"
                         :class="{ 'transform rotate-180': expandedNarrativeStructures.has(structure.id) }"
                         fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <!-- Contenu déplié -->
              <div v-if="expandedNarrativeStructures.has(structure.id)" class="p-6 bg-gray-50 border-t border-gray-200">
                <div v-if="structure.narrativePartOrder && Object.keys(structure.narrativePartOrder).length > 0"
                     class="space-y-4">
                  <div v-for="(parts, sectionName) in structure.narrativePartOrder" :key="sectionName"
                       class="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 class="font-bold text-gray-900 mb-2">{{ sectionName }}</h4>
                    <div v-if="parts && parts.length > 0" class="space-y-2">
                      <div v-for="(partCode, index) in parts" :key="index"
                           class="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                        <span class="font-mono text-sm text-gray-700">{{ partCode }}</span>
                        <span class="text-xs text-gray-500">Position {{ Number(index) + 1 }}</span>
                      </div>
                    </div>
                    <p v-else class="text-sm text-gray-500 italic">Aucune partie narrative</p>
                  </div>
                </div>
                <p v-else class="text-gray-500 italic">Aucune section définie</p>
              </div>
            </div>
          </div>

          <!-- Texte d'aide Structures Narratives -->
          <div class="mt-8 p-6 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-lg">
            <h3 class="text-lg font-bold text-indigo-900 mb-3 flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Comment fonctionnent les Structures Narratives ?
            </h3>
            <div class="space-y-3 text-sm text-indigo-900">
              <p><strong>Hiérarchie :</strong> Structures Narratives → Sections → Segments Narratifs (ordonnés)</p>
              <p>
                <strong>Rôle des Structures :</strong> Les structures narratives (ex: Voyage du Héros, Structure en 3 actes, In Media Res)
                définissent <strong>l'ordre et l'organisation</strong> d'un récit en regroupant des Segments Narratifs dans des sections thématiques.
              </p>
              <p>
                <strong>Organisation :</strong> Chaque structure utilise le champ JSON <code>narrativePartOrder</code> qui contient :
              </p>
              <ul class="list-disc list-inside ml-4 space-y-1">
                <li>Des <strong>sections</strong> nommées (ex: "Acte 1", "Acte 2", "Retour")</li>
                <li>Une <strong>liste ordonnée de codes</strong> de Segments Narratifs pour chaque section</li>
                <li>Exemple : <code>{"Acte 1": ["SETUP", "DISRUPTION"], "Acte 2": ["ESCALATION", "TURN"]}</code></li>
              </ul>
              <p>
                <strong>Utilisation :</strong> Lorsqu'un utilisateur choisit un <strong>Sous-genre</strong> + une <strong>Structure Narrative</strong> :
              </p>
              <ul class="list-disc list-inside ml-4 space-y-1">
                <li>Le système récupère les Segments Narratifs définis dans la structure</li>
                <li>Pour chaque segment, il affiche les <strong>Types de Beats</strong> associés au sous-genre</li>
                <li>Les beats apparaissent dans l'ordre défini par la structure narrative</li>
                <li>Un <strong>pourcentage de compatibilité</strong> est calculé entre le sous-genre et la structure</li>
              </ul>
              <p>
                <strong>⚠️ Impact des modifications :</strong>
              </p>
              <ul class="list-disc list-inside ml-4 space-y-1">
                <li>Supprimer une <strong>Structure</strong> n'impacte pas les projets existants (référence conservée)</li>
                <li>Modifier l'ordre des segments change l'expérience de création pour les nouveaux projets</li>
                <li>Les codes de segments doivent correspondre exactement aux codes définis dans "Segments narratifs"</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Beats narratifs (Events) -->
        <div v-else-if="activeTab === 'events'">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl font-bold text-gray-900">Gestion des Beats narratifs</h2>
            <div class="flex gap-3">
              <button
                @click="openCreateEventTypeModal"
                class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                + Ajouter un Type de Beat
              </button>
            </div>
          </div>

          <!-- Loading -->
          <div v-if="isLoading" class="text-center py-8">
            <p class="text-gray-600">Chargement...</p>
          </div>

          <!-- Liste des Event Types -->
          <div v-else class="space-y-4">
            <div
              v-for="eventType in eventTypes"
              :key="eventType.id"
              class="bg-white border border-gray-200 rounded-lg overflow-hidden"
            >
              <!-- Event Type Header -->
              <div class="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
                <div class="flex items-center justify-between">
                  <div
                    @click="toggleEventType(eventType.id)"
                    class="flex items-center gap-3 flex-1 cursor-pointer hover:opacity-80"
                  >
                    <svg
                      class="w-5 h-5 text-purple-600 transition-transform"
                      :class="{ 'rotate-90': expandedEventTypes.has(eventType.id) }"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                    <div>
                      <h3 class="text-lg font-bold text-gray-900">{{ eventType.name }}</h3>
                      <p v-if="eventType.code" class="text-sm text-gray-500">Code: {{ eventType.code }}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-sm bg-purple-200 text-purple-800 px-3 py-1 rounded-full font-medium">
                      {{ eventType.eventsCount || 0 }} beat(s)
                    </span>
                    <button
                      @click.stop="openEventTypeModal(eventType)"
                      class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Modifier ce type de beat"
                    >
                      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      v-if="eventType.eventsCount === 0"
                      @click.stop="deleteEventType(eventType.id, eventType.eventsCount)"
                      class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer ce type de beat"
                    >
                      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p
                  v-if="eventType.description"
                  @click="toggleEventType(eventType.id)"
                  class="text-sm text-gray-600 mt-2 cursor-pointer hover:opacity-80"
                >
                  {{ eventType.description }}
                </p>
              </div>

              <!-- Events (si déplié) -->
              <div v-if="expandedEventTypes.has(eventType.id)" class="p-6 bg-gray-50">
                <div v-if="eventType.events && eventType.events.length > 0" class="space-y-3 mb-4">
                  <div
                    v-for="event in eventType.events"
                    :key="event.id"
                    class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <h4 class="font-semibold text-gray-900">{{ event.name }}</h4>
                        <p v-if="event.description" class="text-sm text-gray-600 mt-1">
                          {{ event.description }}
                        </p>
                        <label class="inline-flex items-center gap-2 mt-2 cursor-pointer">
                          <input
                            type="checkbox"
                            :checked="event.isOptional"
                            @change="toggleEventOptional(event)"
                            class="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <span class="text-sm text-gray-700">Optionnel</span>
                        </label>
                      </div>
                      <button
                        @click.stop="deleteEvent(event.id)"
                        class="ml-3 p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Supprimer ce beat"
                      >
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Formulaire d'ajout de beat -->
                <div class="mt-4 p-4 bg-white border-2 border-dashed border-gray-300 rounded-lg">
                  <h5 class="text-sm font-semibold text-gray-700 mb-3">Ajouter un beat</h5>
                  <div class="flex gap-3 items-start">
                    <input
                      type="text"
                      placeholder="Nom du beat narratif..."
                      class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      @keyup.enter="(e) => {
                        const input = e.target as HTMLInputElement
                        createEvent(eventType.id, input.value, newBeatIsOptional[eventType.id] || false)
                        input.value = ''
                      }"
                    />
                    <label class="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100">
                      <input
                        type="checkbox"
                        v-model="newBeatIsOptional[eventType.id]"
                        class="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <span class="text-sm text-gray-700">Optionnel</span>
                    </label>
                    <button
                      @click="(e) => {
                        const container = (e.target as HTMLElement).parentElement as HTMLElement
                        const input = container.querySelector('input[type=text]') as HTMLInputElement
                        createEvent(eventType.id, input.value, newBeatIsOptional[eventType.id] || false)
                        input.value = ''
                      }"
                      class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>

                <p v-if="!eventType.events || eventType.events.length === 0" class="text-gray-500 text-sm italic mb-4">
                  Aucun beat pour ce type.
                </p>
              </div>
            </div>
          </div>

          <!-- Texte d'aide Beats narratifs -->
          <div class="mt-8 p-6 bg-purple-50 border-l-4 border-purple-500 rounded-r-lg">
            <h3 class="text-lg font-bold text-purple-900 mb-3 flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Comment fonctionnent les Types de Beats & Beats narratifs ?
            </h3>
            <div class="space-y-3 text-sm text-purple-900">
              <p><strong>Hiérarchie :</strong> Segments Narratifs → Types de Beats → Beats (optionnels ou obligatoires)</p>
              <p>
                <strong>Rôle des Types de Beats :</strong> Les Types de Beats (ex: "Point d'entrée", "Incident déclencheur", "Climax")
                sont des <strong>catégories d'événements narratifs</strong> qui appartiennent à un Segment Narratif spécifique (SETUP, CRISIS, CLIMAX, etc.).
              </p>
              <p>
                <strong>Rôle des Beats :</strong> Les Beats (ex: "Le héros refuse l'appel", "Révélation majeure")
                sont des <strong>événements concrets</strong> qui peuvent être :
              </p>
              <ul class="list-disc list-inside ml-4 space-y-1">
                <li><strong>Obligatoires</strong> - Essentiels à la structure narrative (cochés par défaut lors de la création de projet)</li>
                <li><strong>Optionnels</strong> - Suggestions qui enrichissent le récit sans être indispensables</li>
              </ul>
              <p>
                <strong>Utilisation :</strong> Les Types de Beats sont <strong>assignés aux Sous-genres</strong> avec :
              </p>
              <ul class="list-disc list-inside ml-4 space-y-1">
                <li>Un <strong>poids</strong> (importance du beat dans ce sous-genre)</li>
                <li>Un <strong>statut obligatoire</strong> (mandatory: oui/non)</li>
                <li>Exemple : "Incident déclencheur" est obligatoire pour les Thrillers avec un poids de 10</li>
              </ul>
              <p>
                <strong>Flux de données :</strong> Sous-genre → Types de Beats (via SubgenreEventType) → Beats → affichés dans l'ordre des Segments Narratifs de la Structure choisie
              </p>
              <p>
                <strong>⚠️ Impact des modifications :</strong>
              </p>
              <ul class="list-disc list-inside ml-4 space-y-1">
                <li>Supprimer un <strong>Type de Beat</strong> supprime tous ses Beats associés (protection activée)</li>
                <li>Changer le <strong>Segment Narratif</strong> d'un Type de Beat modifie sa position dans les structures</li>
                <li>Modifier le <strong>flag optionnel</strong> d'un Beat change son comportement lors de la création de projet</li>
                <li>Les Beats obligatoires sont automatiquement cochés dans l'interface de création de projet</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Modal de modification de sous-genre -->
    <div v-if="isSubgenreModalOpen" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <!-- Overlay -->
        <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" @click="closeSubgenreModal"></div>

        <!-- Modal -->
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <!-- Header -->
          <div class="bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-4">
            <div class="flex items-center justify-between">
              <h3 class="text-xl font-bold text-white">
                Modifier le sous-genre
              </h3>
              <button @click="closeSubgenreModal" class="text-white hover:text-gray-200">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Body -->
          <div class="px-6 py-4">
            <!-- Formulaire -->
            <div class="space-y-4 mb-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Nom du sous-genre *</label>
                <input
                  v-model="subgenreForm.name"
                  type="text"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Ex: Thriller Psychologique"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  v-model="subgenreForm.description"
                  rows="3"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Description du sous-genre..."
                ></textarea>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Genre parent *</label>
                <select
                  v-model="subgenreForm.genre_id"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option :value="null">Sélectionnez un genre</option>
                  <option v-for="genre in genres" :key="genre.id" :value="genre.id">
                    {{ genre.name }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Event Types -->
            <div class="border-t border-gray-200 pt-6">
              <h4 class="text-lg font-bold text-gray-900 mb-4">Types de beats associés</h4>

              <div v-if="isLoadingEventTypes" class="text-center py-4">
                <p class="text-gray-600">Chargement...</p>
              </div>

              <div v-else-if="subgenreEventTypes.length > 0" class="space-y-3 mb-4">
                <div
                  v-for="eventType in subgenreEventTypes"
                  :key="eventType.id"
                  class="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div class="flex items-start justify-between mb-3">
                    <div class="flex-1">
                      <p class="font-medium text-gray-900">{{ eventType.name }}</p>
                      <p v-if="eventType.description" class="text-sm text-gray-600 mt-1">{{ eventType.description }}</p>
                    </div>
                    <button
                      @click="removeEventTypeFromSubgenre(eventType.id)"
                      class="text-red-600 hover:text-red-800 text-sm font-medium ml-4"
                      title="Supprimer cet event type"
                    >
                      Supprimer
                    </button>
                  </div>

                  <!-- Weight et Mandatory -->
                  <div class="flex items-center gap-4 mt-3 pt-3 border-t border-gray-200">
                    <div class="flex items-center gap-2">
                      <label class="text-sm font-medium text-gray-700">Poids (1-5):</label>
                      <select
                        :value="eventType.weight || 1"
                        @change="updateEventTypeParams(eventType.id, parseInt(($event.target as HTMLSelectElement).value), undefined)"
                        class="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option :value="1">1 - Très faible</option>
                        <option :value="2">2 - Faible</option>
                        <option :value="3">3 - Moyen</option>
                        <option :value="4">4 - Fort</option>
                        <option :value="5">5 - Très fort</option>
                      </select>
                    </div>

                    <div class="flex items-center gap-2">
                      <label class="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          :checked="eventType.isMandatory || false"
                          @change="updateEventTypeParams(eventType.id, undefined, ($event.target as HTMLInputElement).checked)"
                          class="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        >
                        <span class="ml-2 text-sm font-medium text-gray-700">Obligatoire</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <p v-else class="text-gray-500 text-sm italic mb-4">
                Aucun event type associé à ce sous-genre.
              </p>

              <!-- Section d'ajout séparée -->
              <div class="mt-6 pt-6 border-t-2 border-dashed border-gray-300">
                <h5 class="text-sm font-semibold text-gray-700 mb-3">Ajouter un Event Type</h5>
                <div class="flex gap-3">
                  <select
                    v-model="newEventTypeId"
                    class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option :value="null">Sélectionner un event type...</option>
                    <option v-for="eventType in availableEventTypes" :key="eventType.id" :value="eventType.id">
                      {{ eventType.name }}
                    </option>
                  </select>
                  <button
                    @click="addEventTypeToSubgenre"
                    :disabled="!newEventTypeId"
                    class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="bg-gray-50 px-6 py-4 flex justify-end gap-3">
            <button
              @click="closeSubgenreModal"
              class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Annuler
            </button>
            <button
              @click="saveSubgenre"
              class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de création de genre -->
    <div v-if="isGenreModalOpen" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <!-- Overlay -->
        <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" @click="isGenreModalOpen = false"></div>

        <!-- Modal -->
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <!-- Header -->
          <div class="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
            <div class="flex items-center justify-between">
              <h3 class="text-xl font-bold text-white">
                Créer un nouveau genre
              </h3>
              <button @click="isGenreModalOpen = false" class="text-white hover:text-gray-200">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Body -->
          <div class="px-6 py-4">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Nom du genre *</label>
                <input
                  v-model="genreForm.name"
                  type="text"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Science-Fiction, Fantasy, Thriller..."
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  v-model="genreForm.description"
                  rows="3"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Description du genre..."
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="bg-gray-50 px-6 py-4 flex justify-end gap-3">
            <button
              @click="isGenreModalOpen = false"
              class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Annuler
            </button>
            <button
              @click="createGenre"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Créer le genre
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de création de sous-genre -->
    <div v-if="isCreateSubgenreModalOpen" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <!-- Overlay -->
        <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" @click="isCreateSubgenreModalOpen = false"></div>

        <!-- Modal -->
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <!-- Header -->
          <div class="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-4">
            <div class="flex items-center justify-between">
              <h3 class="text-xl font-bold text-white">
                Créer un nouveau sous-genre
              </h3>
              <button @click="isCreateSubgenreModalOpen = false" class="text-white hover:text-gray-200">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Body -->
          <div class="px-6 py-4">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Genre parent *</label>
                <select
                  v-model="createSubgenreForm.genre_id"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option :value="null">Sélectionnez un genre</option>
                  <option v-for="genre in genres" :key="genre.id" :value="genre.id">
                    {{ genre.name }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Nom du sous-genre *</label>
                <input
                  v-model="createSubgenreForm.name"
                  type="text"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Ex: Thriller Psychologique, Space Opera..."
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  v-model="createSubgenreForm.description"
                  rows="3"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Description du sous-genre..."
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="bg-gray-50 px-6 py-4 flex justify-end gap-3">
            <button
              @click="isCreateSubgenreModalOpen = false"
              class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Annuler
            </button>
            <button
              @click="createSubgenre"
              class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Créer le sous-genre
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de création/modification d'Event Type -->
    <div v-if="isEventTypeModalOpen" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <!-- Overlay -->
        <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" @click="closeEventTypeModal"></div>

        <!-- Modal -->
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <!-- Header -->
          <div class="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
            <div class="flex items-center justify-between">
              <h3 class="text-xl font-bold text-white">
                {{ selectedEventType ? 'Modifier le type de beat' : 'Créer un type de beat' }}
              </h3>
              <button @click="closeEventTypeModal" class="text-white hover:text-gray-200">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Body -->
          <div class="px-6 py-4">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Nom du type de beat *</label>
                <input
                  v-model="eventTypeForm.name"
                  type="text"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Ex: Point d'intrigue, Climax, Révélation..."
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Code (unique) *</label>
                <input
                  v-model="eventTypeForm.code"
                  type="text"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Ex: plot_point, climax, revelation..."
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  v-model="eventTypeForm.description"
                  rows="3"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Description du type de beat..."
                ></textarea>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Segment Narratif *</label>
                <select
                  v-model="eventTypeForm.narrative_part_id"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option :value="null">Sélectionnez un segment narratif</option>
                  <option v-for="narrativePart in metadataStore.narrativeParts" :key="narrativePart.id" :value="narrativePart.id">
                    {{ narrativePart.name }} ({{ narrativePart.code }})
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="bg-gray-50 px-6 py-4 flex justify-end gap-3">
            <button
              @click="closeEventTypeModal"
              class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Annuler
            </button>
            <button
              @click="saveEventType"
              class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              {{ selectedEventType ? 'Enregistrer' : 'Créer' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de création/modification de Structure Narrative -->
    <div v-if="isNarrativeStructureModalOpen" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <!-- Overlay -->
        <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" @click="closeNarrativeStructureModal"></div>

        <!-- Modal -->
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <!-- Header -->
          <div class="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-4">
            <div class="flex items-center justify-between">
              <h3 class="text-xl font-bold text-white">
                {{ selectedNarrativeStructure ? 'Modifier la structure narrative' : 'Créer une structure narrative' }}
              </h3>
              <button @click="closeNarrativeStructureModal" class="text-white hover:text-gray-200">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Body -->
          <div class="px-6 py-6 space-y-6">
            <!-- Informations de base -->
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Nom de la structure *</label>
                <input
                  v-model="narrativeStructureForm.name"
                  type="text"
                  placeholder="Ex: Structure en 5 actes, Voyage du héros..."
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  v-model="narrativeStructureForm.description"
                  rows="3"
                  placeholder="Description de cette structure narrative..."
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                ></textarea>
              </div>
            </div>

            <!-- Sections et Segments Narratifs -->
            <div class="border-t border-gray-200 pt-6">
              <div class="flex items-center justify-between mb-4">
                <h4 class="text-lg font-bold text-gray-900">Organisation des Segments Narratifs</h4>
                <button
                  @click="addSection"
                  class="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  + Ajouter une section
                </button>
              </div>

              <div v-if="Object.keys(narrativeStructureForm.narrativePartOrder).length > 0" class="space-y-4">
                <div v-for="(sectionName, sectionIndex) in getSectionsArray()" :key="sectionName"
                     class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div class="flex items-center justify-between mb-3">
                    <h5 class="font-bold text-gray-900">{{ sectionName }}</h5>
                    <div class="flex items-center gap-2">
                      <!-- Déplacer section vers le haut -->
                      <button
                        @click="moveSectionUp(sectionName)"
                        :disabled="sectionIndex === 0"
                        class="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Déplacer la section vers le haut"
                      >
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <!-- Déplacer section vers le bas -->
                      <button
                        @click="moveSectionDown(sectionName)"
                        :disabled="sectionIndex === getSectionsArray().length - 1"
                        class="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Déplacer la section vers le bas"
                      >
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <!-- Supprimer section -->
                      <button
                        @click="removeSection(sectionName)"
                        class="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Supprimer cette section"
                      >
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div v-if="narrativeStructureForm.narrativePartOrder[sectionName] && narrativeStructureForm.narrativePartOrder[sectionName].length > 0" class="space-y-2 mb-3">
                    <div v-for="(partCode, index) in narrativeStructureForm.narrativePartOrder[sectionName]" :key="index"
                         class="flex items-center justify-between bg-white px-3 py-2 rounded border border-gray-200">
                      <span class="font-mono text-sm text-gray-700">{{ partCode }}</span>
                      <div class="flex items-center gap-2">
                        <button
                          @click="moveNarrativePartUp(sectionName, index)"
                          :disabled="index === 0"
                          class="p-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Déplacer vers le haut"
                        >
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          @click="moveNarrativePartDown(sectionName, index)"
                          :disabled="index === narrativeStructureForm.narrativePartOrder[sectionName].length - 1"
                          class="p-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Déplacer vers le bas"
                        >
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          @click="removeNarrativePartFromSection(sectionName, index)"
                          class="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Retirer"
                        >
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    @click="addNarrativePartToSection(sectionName)"
                    class="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                  >
                    + Ajouter un Segment Narratif
                  </button>
                </div>
              </div>

              <p v-else class="text-gray-500 text-sm italic text-center py-4">
                Aucune section définie. Cliquez sur "Ajouter une section" pour commencer.
              </p>

              <div class="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p class="text-sm text-blue-800">
                  <strong>💡 Astuce:</strong> Les codes de Segments Narratifs disponibles incluent: SETUP, DISRUPTION, COMMIT, ESCALATION, CRISIS, CLIMAX, RESOLUTION, REVELATION, TRANSFORMATION, etc.
                </p>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="bg-gray-50 px-6 py-4 flex justify-end gap-3">
            <button
              @click="closeNarrativeStructureModal"
              class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Annuler
            </button>
            <button
              @click="saveNarrativeStructure"
              class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {{ selectedNarrativeStructure ? 'Enregistrer' : 'Créer' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de création/modification de Segment Narratif -->
    <div v-if="isNarrativePartModalOpen" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <!-- Overlay -->
        <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" @click="closeNarrativePartModal"></div>

        <!-- Modal -->
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <!-- Header -->
          <div class="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-4">
            <div class="flex items-center justify-between">
              <h3 class="text-xl font-bold text-white">
                {{ selectedNarrativePart ? 'Modifier le segment narratif' : 'Créer un segment narratif' }}
              </h3>
              <button @click="closeNarrativePartModal" class="text-white hover:text-gray-200">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Body -->
          <div class="px-6 py-4">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Nom du segment *</label>
                <input
                  v-model="narrativePartForm.name"
                  type="text"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Ex: Setup, Confrontation, Résolution..."
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Code (unique, majuscules) *</label>
                <input
                  v-model="narrativePartForm.code"
                  type="text"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-mono"
                  placeholder="Ex: SETUP, CONFRONTATION, RESOLUTION..."
                  @input="narrativePartForm.code = narrativePartForm.code.toUpperCase()"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  v-model="narrativePartForm.description"
                  rows="4"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Description du segment narratif..."
                ></textarea>
              </div>
            </div>

            <div class="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p class="text-sm text-blue-800">
                <strong>💡 Info:</strong> Les segments narratifs sont des composants universels utilisés pour construire des structures narratives (ex: Voyage du héros, Structure en 3 actes, etc.).
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div class="bg-gray-50 px-6 py-4 flex justify-end gap-3">
            <button
              @click="closeNarrativePartModal"
              class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Annuler
            </button>
            <button
              @click="saveNarrativePart"
              class="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              {{ selectedNarrativePart ? 'Enregistrer' : 'Créer' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Styles additionnels si nécessaire */
</style>
