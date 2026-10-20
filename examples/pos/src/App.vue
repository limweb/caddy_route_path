<script setup>
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()
const currentPath = computed(() => route.fullPath)
</script>

<template>
  <div class="admin">
    <h1>POS (Vue)</h1>
    <nav>
      <router-link to="/test1">test1</router-link>
      <router-link to="/test2">test2</router-link>
      <router-link to="/test3">test3</router-link>
      <a href="/" class="home">Home</a>
    </nav>
    <p class="path">current path: {{ currentPath }}</p>
    <router-view />
  </div>
</template>

<style>
body {
  font-family: system-ui, sans-serif;
  margin: 0;
  background: #f4f6f8;
  color: #222;
}
.admin {
  max-width: 640px;
  margin: 40px auto;
  padding: 24px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
nav {
  display: flex;
  gap: 12px;
  margin: 16px 0;
}
nav a {
  padding: 6px 14px;
  border-radius: 8px;
  background: #eef2ff;
  color: #3451b2;
  text-decoration: none;
}
nav a.router-link-active {
  background: #3451b2;
  color: #fff;
}
nav a.home {
  margin-left: auto;
  background: #e8e8e8;
  color: #444;
}
.path {
  font-family: ui-monospace, monospace;
  font-size: 13px;
  color: #666;
}
</style>
