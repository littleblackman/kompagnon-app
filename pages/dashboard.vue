<script lang="ts" setup>
import {useAuthStore} from "~/store/auth";
const auth = useAuthStore();
auth.requireAuth();
</script>

<template>

  hello dash

</template>