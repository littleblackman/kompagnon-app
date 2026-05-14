<script setup>
import { ref } from 'vue';
import { StarIcon } from "@heroicons/vue/24/solid";

const props = defineProps({
  rating: Number,
  sequenceId: Number,
  criteriaId: Number,
});

const emit = defineEmits(['rate']);
const hoverValue = ref(0);

const handleClick = (value) => {
  emit('rate', { value, sequenceId: props.sequenceId, criteriaId: props.criteriaId });
};
</script>

<template>
  <div class="flex items-center gap-0.5 flex-wrap">
    <span
      v-for="n in 10"
      :key="n"
      class="cursor-pointer"
      @click="handleClick(n)"
      @mouseover="hoverValue = n"
      @mouseleave="hoverValue = 0"
    >
      <StarIcon
        class="w-6 h-6 transition-colors"
        :class="n <= (hoverValue || rating) ? 'text-yellow-400' : 'text-gray-200'"
      />
    </span>
  </div>
</template>
