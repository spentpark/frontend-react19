<template>
  <div>
    <header class="header">
      <div class="header-content">
        <HamburgerMenu />
      </div>
    </header>

    <router-view />

    <footer class="app-footer">
      &copy; {{ new Date().getFullYear() }} Spentpark - All rights reserved - Version 1.0.0 - Vue 3
    </footer>
  </div>
</template>

<script setup lang="ts">
import HamburgerMenu from './components/HamburgerMenu.vue'
</script>

<style>
/* keep layout-level styles if needed */
.app-footer {
  text-align: center;
  padding: 20px;
}
</style>
