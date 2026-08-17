<template>
  <div class="game-detail-container">
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Loading game...</p>
    </div>

    <div v-else-if="!game">Game not found</div>

    <div v-else>
      <div class="game-header">
        <img v-if="game.image_Large" :src="game.image_Large" :alt="game.title" class="game-cover" />
        <div class="game-info">
          <h2>{{ game.title }}</h2>
          <p class="description">{{ game.description }}</p>
        </div>
      </div>

      <div class="game-meta">
        <div class="meta-card"><h4>Platform</h4><p>{{ game.Platform }}</p></div>
        <div class="meta-card"><h4>Publisher</h4><p>{{ game.Publisher }}</p></div>
        <div class="meta-card"><h4>Genre</h4><p>{{ game.genre }}</p></div>
        <div class="meta-card"><h4>Players</h4><p>{{ game.players }}</p></div>
        <div class="meta-card"><h4>Release</h4><p>{{ game.releasedate }}</p></div>
      </div>

      <div v-if="game.youtube_Trailer"> <h3>Trailer</h3>
        <div class="video-container"><iframe :src="game.youtube_Trailer" title="video" allowfullscreen></iframe></div>
      </div>

      <div v-if="game.spotify_ost">
        <h3>Original Soundtrack</h3>
        <div class="spotify-container">
          <iframe :src="getSpotifyEmbedUrl(game.spotify_ost)" height="152" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>
        </div>
      </div>

      <button class="back-btn" @click="goBack">⬅ Back</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getGameById, type GameDetail as GameDetailType } from '../services/gameService'

const route = useRoute()
const router = useRouter()
const id = route.params.id as string

const game = ref<GameDetailType | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    game.value = await getGameById(id)
  } catch (e) { console.error(e) }
  finally { loading.value = false }
})

const getSpotifyEmbedUrl = (url: string) => {
  if (!url.includes('spotify.com')) return url
  return url.replace('open.spotify.com/', 'open.spotify.com/embed/')
}

const goBack = () => { router.back() }
</script>
