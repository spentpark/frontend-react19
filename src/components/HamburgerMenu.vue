<template>
  <>
    <button @click="open = !open" class="hamburger-btn">☰</button>

    <div v-if="open" role="button" tabindex="0" @click="open = false" @keydown.enter="open = false" @keydown.space.prevent="open = false" :style="overlayStyle"></div>

    <div :style="menuStyle">
      <h2 style="margin-bottom:20px">Plataformas</h2>
      <ul style="list-style:none; padding:0">
        <li v-if="platforms.length === 0">No platforms</li>
        <li v-for="p in platforms" :key="p.id" style="margin:12px 0">
          <router-link :to="{ path: '/', query: { platform: p.description } }" @click.native="open = false" style="color:white; text-decoration:none; font-weight:500">{{ p.description }}</router-link>
        </li>
      </ul>
    </div>
  </>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getPlatforms, type Platform } from '../services/platformService'

const platforms = ref<Platform[]>([])
const open = ref(false)

onMounted(async () => {
  try {
    const data = await getPlatforms()
    if (Array.isArray(data)) platforms.value = data
    else platforms.value = []
  } catch (e) { console.error('Error cargando plataformas', e) }
})

const overlayStyle = {
  position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 998
}

const menuStyle = {
  position: 'fixed', top: '0', left: open.value ? '0' : '-260px', width: '260px', height: '100%', backgroundColor: '#3498db', color: 'white', padding: '25px', transition: 'left 0.3s ease', zIndex: 999, boxShadow: '4px 0 10px rgba(0,0,0,0.2)'
}
</script>

<style scoped>
.hamburger-btn {
  font-size: 26px; background: none; border: none; cursor: pointer; color: white
}
</style>
