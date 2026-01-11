<script setup>
import { ref } from 'vue';
import { StarIcon } from "@heroicons/vue/24/solid";

// Props
const props = defineProps({
  rating: Number,           // note actuelle
  sequenceId: Number,
  criteriaId: Number,
});

// Emit la nouvelle note au parent
const emit = defineEmits(['rate']);

const hoverValue = ref(0);

// Fonction au survol
const handleHover = (value) => {
  hoverValue.value = value;
};

// Fonction au clic
const handleClick = (value) => {
  emit('rate', {
    value,
    sequenceId: props.sequenceId,
    criteriaId: props.criteriaId
  });
};
</script>

<template>
  <div class="flex items-center whitespace-nowrap">
    <span
        v-for="n in 10"
        :key="n"
        class="cursor-pointer"
        @click="handleClick(n)"
        @mouseover="handleHover(n)"
        @mouseleave="hoverValue = 0"
    >
      <StarIcon
          class="w-5 h-5 transition-colors"
          :class="n <= (hoverValue || rating) ? 'text-yellow-500' : 'text-gray-200'"
      />
    </span>
  </div>
</template>
