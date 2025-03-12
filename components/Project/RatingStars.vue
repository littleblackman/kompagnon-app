<script setup>
import { StarIcon } from "@heroicons/vue/24/solid/index.js";
defineProps({ rating: Number });
</script>
<template>
  <div class="flex items-center whitespace-nowrap">
    <span v-for="n in 10" :key="n">
      <StarIcon
          class="w-4 h-4"
          :class="n <= rating ? 'text-yellow-500' : 'text-gray-200'"
      />
    </span>
  </div>
</template>