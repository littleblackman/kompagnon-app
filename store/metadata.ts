import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from '~/store/auth';

interface MetadataResponse {
    criterias: Criteria[];
    status: Status[];
    types: Type[];
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

            loaded.value = true;
        } catch (error) {
            console.error("Erreur chargement metadata :", error);
        }
    }


    return {
        criterias,
        status,
        types,
        loaded,
        fetchMetadata
    };
});
