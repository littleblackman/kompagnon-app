<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { useProjectStore } from "~/store/project";

const props = defineProps({
  part: { type: Object, default: null },
  projectId: { type: Number, required: true }
});

const emit = defineEmits(["close"]);
const projectStore = useProjectStore();

const editedPart = ref({ name: "", description: "" });
const afterPartId = ref<number | null>(null);

// Liste des parties disponibles pour le select
const availableParts = computed(() => projectStore.parts);

watch(() => props.part, (newPart) => {
  editedPart.value = newPart ? { ...newPart } : { name: "", description: "" };
  afterPartId.value = null;
}, { immediate: true });

const savePart = async () => {
  if (!editedPart.value.name.trim()) {
    alert("Le nom est obligatoire.");
    return;
  }

  try {
    editedPart.value.project_id = props.projectId;
    await projectStore.addPart(editedPart.value, afterPartId.value);
    emit("close");
  } catch (error) {
    console.error("Erreur API :", error);
    alert("Erreur lors de la sauvegarde.");
  }
};
</script>

<template>
  <div class="fixed inset-0 flex items-center justify-center z-50">
    <div class="bg-white rounded p-6 w-[500px] border-2 border-amber-950 shadow-xl">
      <h3 class="text-xl font-bold mb-4">
        {{ editedPart.id ? "Modifier la partie" : "Ajouter une partie" }}
      </h3>

      <label class="block mb-2 font-semibold">Nom :</label>
      <input type="text" v-model="editedPart.name" class="border rounded p-2 w-full mb-4">

      <label class="block mb-2 font-semibold">Description :</label>
      <textarea v-model="editedPart.description" class="w-full border p-2 rounded h-24"></textarea>

      <!-- Ajout du select pour l'emplacement -->
      <label class="block mt-4 font-semibold">Emplacement après :</label>
      <select v-model="afterPartId" class="border rounded p-2 w-full">
        <option :value="null">Début du projet</option>
        <option v-for="part in availableParts" :key="part.id" :value="part.id">
          {{ part.name }}
        </option>
      </select>

      <div class="flex justify-between gap-2 mt-4">
        <button v-if="editedPart.id" @click="deletePart" class="px-4 py-2 rounded bg-red-500 text-white">
          Supprimer
        </button>

        <div>
          <button @click="emit('close')" class="px-4 py-2 rounded bg-gray-400 text-white mr-2">
            Annuler
          </button>
          <button @click="savePart" class="px-4 py-2 rounded bg-blue-500 text-white">
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
