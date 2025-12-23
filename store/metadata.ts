import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from '~/store/auth';
import type { NarrativeArc, DramaticFunction, ActantialSchema } from '~/types';

interface StructureEventMapping {
    eventId: number;
    position: number;
    isOptional: boolean;
}

interface MetadataResponse {
    criterias: Criteria[];
    status: Status[];
    types: Type[];
    narrativeArcs: NarrativeArc[];
    dramaticFunctions: DramaticFunction[];
    actantialSchema: ActantialSchema[];
    genres: Genre[];
    subgenres: Subgenre[];
    events: Event[];
    narrativeStructures: NarrativeStructure[];
    subgenreEvents: Record<number, number[]>; // subgenreId => eventIds[]
    structureEvents: Record<number, StructureEventMapping[]>; // structureId => [{eventId, position, isOptional}]
}

interface Criteria {
    id: number;
    name: string;
    explanation: string;
}

interface Status {
    id: number;
    name: string;
    description: string;
}

interface Type {
    id: number;
    name: string;
    description: string;
}

interface Genre {
    id: number;
    name: string;
    description: string;
    subgenres: Subgenre[];
}

interface Subgenre {
    id: number;
    name: string;
    description: string;
}

interface Event {
    id: number;
    name: string;
    description: string;
    eventType?: {
        id: number;
        name: string;
        description?: string;
    };
}

interface NarrativeStructure {
    id: number;
    name: string;
    description: string;
    totalBeats: number;
}


export const useMetadataStore = defineStore('metadata', () => {
    const authStore = useAuthStore();

    const criterias = ref<Criteria[]>([]);
    const status = ref<Status[]>([]);
    const types = ref<Type[]>([]);
    const narrativeArcs = ref<NarrativeArc[]>([]);
    const dramaticFunctions = ref<DramaticFunction[]>([]);
    const actantialSchema = ref<ActantialSchema[]>([]);
    const genres = ref<Genre[]>([]);
    const subgenres = ref<Subgenre[]>([]);
    const events = ref<Event[]>([]);
    const narrativeStructures = ref<NarrativeStructure[]>([]);
    const subgenreEvents = ref<Record<number, number[]>>({});
    const structureEvents = ref<Record<number, StructureEventMapping[]>>({});

    const loaded = ref(false);

    async function fetchMetadata() {
        try {
            const config = useRuntimeConfig();

            const response: MetadataResponse = await $fetch(`${config.public.apiBase}/metadata`, {
                headers: { 'X-AUTH-TOKEN': authStore.token! },
            });

            criterias.value = response.criterias || [];
            status.value = response.status || [];
            types.value = response.types || [];
            narrativeArcs.value = response.narrativeArcs || [];
            dramaticFunctions.value = response.dramaticFunctions || [];
            actantialSchema.value = response.actantialSchema || [];
            genres.value = response.genres || [];
            subgenres.value = response.subgenres || [];
            events.value = response.events || [];
            narrativeStructures.value = response.narrativeStructures || [];
            subgenreEvents.value = response.subgenreEvents || {};
            structureEvents.value = response.structureEvents || {};

            loaded.value = true;
        } catch (error) {
            console.error("Erreur chargement metadata :", error);
        }
    }


    return {
        criterias,
        status,
        types,
        narrativeArcs,
        dramaticFunctions,
        actantialSchema,
        genres,
        subgenres,
        events,
        narrativeStructures,
        subgenreEvents,
        structureEvents,
        loaded,
        fetchMetadata
    };
});
