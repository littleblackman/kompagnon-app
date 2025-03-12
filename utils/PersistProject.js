import { useAuthStore } from '~/store/auth';

export default {
    async savePart(data) {
        const authStore = useAuthStore();

        if (!authStore.token) {
            throw new Error("Aucun token d'authentification disponible");
        }

        const config = useRuntimeConfig();

        try {
            const response = await $fetch(`${config.public.apiBase}/part/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authStore.token}`
                },
                body: data,
            });

            return response; // Retourne directement la réponse JSON
        } catch (error) {
            throw new Error("Erreur save part : " + error.message);
        }
    },
};
