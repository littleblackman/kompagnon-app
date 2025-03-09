export default {
    async updatePart(id, data) {
        return await this._update("part", id, data);
    },

    async updateSequence(id, data) {
        return await this._update("sequence", id, data);
    },

    async updateScene(id, data) {
        return await this._update("scene", id, data);
    },

    async _update(type, id, data) {
        try {
            const response = await fetch(`http://localhost:8000/api/${type}/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`, // ⚠️ Adapter si besoin
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error(`Erreur ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Erreur lors de la mise à jour de ${type} ${id} :`, error);
            return null;
        }
    },
};
