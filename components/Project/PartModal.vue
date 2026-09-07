<script setup lang="ts">
import { useToast } from '~/composables/useToast';
const toast = useToast();
import { ref, watch, computed } from "vue";
import { useProjectStore } from "~/store/project";
import { useConfirm } from "~/composables/useConfirm";
const projectStore = useProjectStore();
const { confirm } = useConfirm();

const props = defineProps({
  part: { type: Object, default: null },
  projectId: { type: Number, required: true },
  /** À la création : insérer juste après cette partie (null = début du projet) */
  insertAfterId: { type: Number, default: null }
});

const emit = defineEmits(["close"]);

const editedPart = ref({ name: "", description: "" });
const afterPartId = ref<number | null>(null);

// Liste des parties disponibles pour le select
const availableParts = computed(() => projectStore.parts);

watch(() => props.part, (newPart) => {
  editedPart.value = newPart ? { ...newPart } : { name: "", description: "" };

  if (newPart?.id) {
    const index = projectStore.parts.findIndex(p => p.id === newPart.id);
    if (index > 0) {
      afterPartId.value = projectStore.parts[index - 1].id;
    } else {
      afterPartId.value = null;
    }
  } else {
    // Création : point d'insertion demandé par l'appelant
    afterPartId.value = props.insertAfterId;
  }

}, { immediate: true });

const savePart = async () => {
  if (!editedPart.value.name.trim()) {
    toast.error("Le nom est obligatoire.");
    return;
  }

  try {
    editedPart.value.project_id = props.projectId;
    await projectStore.addPart(editedPart.value, afterPartId.value);
    emit("close");
  } catch (error) {
    console.error("Erreur API :", error);
    toast.error("Erreur lors de la sauvegarde.");
  }
};

// Supprimer une partie emporte toute sa hiérarchie : on annonce le volume exact.
const deletionDetails = computed(() => {
  const sequences = projectStore.parts.find(p => p.id === editedPart.value.id)?.sequences ?? [];
  const scenes = sequences.reduce((n, seq) => n + (seq.scenes?.length ?? 0), 0);
  if (!sequences.length) return [];
  return [
    `${sequences.length} séquence${sequences.length > 1 ? 's' : ''}`,
    `${scenes} scène${scenes > 1 ? 's' : ''} et leur contenu`
  ];
});

const confirmDelete = async () => {
  if (!editedPart.value.id) return;

  const ok = await confirm({
    title: 'Supprimer cette partie ?',
    message: `« ${editedPart.value.name || 'Sans titre'} » sera supprimée définitivement, avec :`,
    details: deletionDetails.value,
    danger: true,
    confirmLabel: 'Supprimer'
  });
  if (!ok) return;

  try {
    await projectStore.deletePart(editedPart.value.id);
    emit("close");
  } catch (error) {
    console.error("Erreur API :", error);
    toast.error("Erreur lors de la suppression.");
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
        <button
            v-if="editedPart.id"
            @click="confirmDelete"
            class="px-4 py-2 rounded bg-red-500 text-white"
        >
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
