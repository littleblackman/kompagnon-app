import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from '~/store/auth';
import type { NarrativeArc, DramaticFunction, ActantialSchema } from '~/types';

interface MetadataResponse {
    criterias: Criteria[];
    status: Status[];
    types: Type[];
    narrativeArcs: NarrativeArc[];
    dramaticFunctions: DramaticFunction[];
    actantialSchema: ActantialSchema[];
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


export const useMetadataStore = defineStore('metadata', () => {
    const authStore = useAuthStore();

    const criterias = ref<Criteria[]>([]);
    const status = ref<Status[]>([]);
    const types = ref<Type[]>([]);
    const narrativeArcs = ref<NarrativeArc[]>([]);
    const dramaticFunctions = ref<DramaticFunction[]>([]);
    const actantialSchema = ref<ActantialSchema[]>([]);

    const loaded = ref(false);

    async function fetchMetadata() {
        try {
            const config = useRuntimeConfig();
            
            const response: MetadataResponse = await $fetch(`${config.public.apiBase}/metadata`, {
                headers: { Authorization: `Bearer ${authStore.token}` },
            });

            criterias.value = response.criterias || [];
            status.value = response.status || [];
            types.value = response.types || [];
            narrativeArcs.value = response.narrativeArcs || [];
            dramaticFunctions.value = response.dramaticFunctions || [];
            actantialSchema.value = response.actantialSchema || [];

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
        loaded,
        fetchMetadata
    };
});
