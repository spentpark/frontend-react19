import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import GameDetail from '../components/GameDetail.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/game/:id', component: GameDetail, props: true }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
