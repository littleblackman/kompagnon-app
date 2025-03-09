<script setup>
import { ref } from "vue";
import SequenceList from "@/components/Project/SequenceList.vue";
import PersistProject from "@/utils/PersistProject.js";

const props = defineProps({
  parts: Array,
  criterias: Array,
  personnages: Array,
  status: Array,
})

// edit project
const editingPart = ref(null);
const editedData = ref({ name: "", description: "" });

const editPartName = (part) => {
  editingPart.value = part.id;
  editedData.value = { ...part };
};

const editPartDescription = (part) => {
  editingPart.value = part.id;
  editedData.value = { ...part };
};

const savePartData = async (part) => {
  if (!editedData.value.name.trim() || !editedData.value.description.trim()) {
    editingPart.value = null;
    return;
  }

  // Update
  part.name = editedData.value.name;
  part.description = editedData.value.description;

  // persist
  await PersistProject.updatePart(part.id, {
    name: editedData.value.name,
    description: editedData.value.description,
  });

  editingPart.value = null;
};
</script>

<template>

  <ul class="mt-6">
    <li v-for="part in parts" :key="part.id">

      <h2 v-if="editingPart !== part.id"
          class="font-bold text-2xl cursor-pointer"
          @dblclick="editPartName(part)">
        {{ part.name }}
      </h2>
      <input v-else
             v-model="editedData.name"
             @keyup.enter="savePartData(part)"
             @blur="savePartData(part)"
             class="text-2xl border border-gray-300 rounded px-2"
             autofocus />

      <hr class="border-2" />

      <p v-if="editingPart !== part.id"
         v-html="part.description ? part.description : '<i>..description...</i>'"
         class="cursor-pointer"
         @dblclick="editPartDescription(part)">
      </p>
      <textarea v-else
                v-model="editedData.description"
                @keyup.enter="savePartData(part)"
                @blur="savePartData(part)"
                class="border border-gray-300 rounded px-2 w-full">
      </textarea>

      <SequenceList :sequences="part.sequences" :criterias="criterias" :personnages="personnages"/>

    </li>
  </ul>
</template>