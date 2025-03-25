import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from '~/store/auth';

interface MetadataResponse {
    criterias: Criteria[];
    status: Status[];
    personnages: Personnage[];
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

interface Personnage {
    id: number;
    firstName: string;
    lastName?: string;
    background?: string;
}

export const useMetadataStore = defineStore('metadata', () => {
    const authStore = useAuthStore();

    const criterias = ref<Criteria[]>([]);
    const status = ref<Status[]>([]);
    const personnages = ref<Personnage[]>([]);

    const loaded = ref(false);

    async function fetchMetadata() {
        try {
            const config = useRuntimeConfig();
            const response: MetadataResponse = await $fetch(`${config.public.apiBase}/metadata`, {
                headers: { Authorization: `Bearer ${authStore.token}` },
            });

            criterias.value = response.criterias || [];
            status.value = response.status || [];
            personnages.value = response.personnages || [];

            loaded.value = true;
        } catch (error) {
            console.error("Erreur chargement metadata :", error);
        }
    }


    return {
        criterias,
        status,
        personnages,
        loaded,
        fetchMetadata
    };
});
