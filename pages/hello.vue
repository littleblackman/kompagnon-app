<template>
  <div class="container">
    <h1>Hello World 🌍</h1>
    <p>Bienvenue sur Nuxt 3 !</p>
    <HelloMessage />
  </div>

    <div class="bg-blue-500 text-white p-4 rounded-lg">
      🎉 Tailwind est bien installé !
    </div>

    <div>
      <h1 class="text-3xl font-bold underline">Hello World!</h1>
      <p class="text-red-500">Ce texte devrait être rouge.</p>
      <button class="bg-blue-500 text-white px-4 py-2 rounded">Bouton bleu</button>
    </div>



</template>

<style scoped>
.container {
  text-align: center;
  margin-top: 50px;
}

h1 {
  color: #42b983;
  font-size: 2.5rem;
}

p {
  font-size: 1.2rem;
}
</style>
