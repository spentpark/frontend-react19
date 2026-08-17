<template>
  <div class="game-list">
    <h2 class="title">🎮 Game List ({{ platform }})</h2>

    <div class="search-container">
      <input v-model="searchTitle" class="search-input" type="text" placeholder="Search game..." />
      <button class="search-btn" @click="goFirstPage">🔎 Search</button>
      <button v-if="searchTitle" class="clear-btn" @click="clearSearch">✖ Clear</button>
    </div>

    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Loading games...</p>
    </div>

    <template v-if="!loading && games.length">
      <table class="styled-table">
        <thead>
          <tr><th>ID</th><th>Title</th><th>Action</th></tr>
        </thead>
        <tbody>
          <tr v-for="g in games" :key="g.id">
            <td>{{ g.id }}</td>
            <td>{{ g.title }}</td>
            <td><button class="btn-view" @click="viewGame(g)">View</button></td>
          </tr>
        </tbody>
      </table>

      <div v-if="totalPages > 1" class="pagination">
        <button class="btn-nav" @click="prevPage" :disabled="page <= 1">⬅ Prev</button>
        <span class="page-info">Page {{ page }} of {{ totalPages }}</span>
        <button class="btn-nav" @click="nextPage" :disabled="page >= totalPages">Next ➡</button>
      </div>
    </template>

    <div v-if="!loading && games.length === 0" class="no-games-message">No games found</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getGames, searchGames, type Game } from '../services/gameService'
import { getPlatforms } from '../services/platformService'

const games = ref<Game[]>([])
const platforms = ref([])
const platform = ref<string>('Sony Playstation 4')
const searchTitle = ref<string>('')
const page = ref<number>(1)
const totalPages = ref<number>(0)
const loading = ref<boolean>(false)
const limit = 5

const router = useRouter()
const route = useRoute()

onMounted(async () => {
  try { platforms.value = await getPlatforms() } catch (e) { console.error(e) }
  if (route.query.platform) {
    platform.value = String(route.query.platform)
  }
})

watch(() => route.query.platform, (val) => {
  if (val) platform.value = String(val)
})

const fetchGames = async () => {
  loading.value = true
  try {
    const data = searchTitle.value.trim()
      ? await searchGames(searchTitle.value, page.value, limit)
      : await getGames(platform.value, page.value, limit)

    games.value = data?.data ?? []
    totalPages.value = data?.pagination?.totalPages ?? 1
  } catch (e) {
    console.error(e)
  } finally { loading.value = false }
}

watch([page, platform, searchTitle], fetchGames)

const viewGame = (g: Game) => { router.push(`/game/${g.id}`) }
const goFirstPage = () => { page.value = 1 }
const clearSearch = () => { searchTitle.value = ''; page.value = 1 }
const prevPage = () => { if (page.value > 1) page.value -= 1 }
const nextPage = () => { if (page.value < totalPages.value) page.value += 1 }

</script>
