<script setup>
import { useAuthStore } from '~/store/auth'
import { navigateTo } from '#app'
const auth = useAuthStore()

auth.logout();
navigateTo('/')

</script>