<script setup>
import { ref, computed } from 'vue'
import config from './apps.json'

const query = ref('')

const apps = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return config.apps
  return config.apps.filter((a) =>
    `${a.name} ${a.description} ${a.path}`.toLowerCase().includes(q)
  )
})

const palette = ['#2563eb', '#0d9488', '#7c3aed', '#db2777', '#ea580c', '#16a34a']
const colorOf = (name) =>
  palette[[...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % palette.length]
</script>

<template>
  <div class="page">
    <header class="header">
      <h1>{{ config.title }}</h1>
      <p class="subtitle">{{ config.subtitle }}</p>
      <input
        v-model="query"
        class="search"
        type="search"
        placeholder="ค้นหาแอป…"
        aria-label="ค้นหาแอป"
      />
    </header>

    <main class="grid">
      <a v-for="app in apps" :key="app.path" class="tile" :href="app.path">
        <span class="avatar" :style="{ background: colorOf(app.name) }">
          {{ app.name[0] }}
        </span>
        <span class="name">{{ app.name }}</span>
        <span class="desc">{{ app.description }}</span>
        <span class="path">{{ app.path }}</span>
      </a>
      <p v-if="apps.length === 0" class="empty">ไม่พบแอปที่ค้นหา</p>
    </main>
  </div>
</template>

<style scoped>
:global(*) {
  box-sizing: border-box;
}
:global(body) {
  margin: 0;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  background: #f1f5f9;
  color: #0f172a;
}

.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 48px 24px;
}

.header {
  text-align: center;
  margin-bottom: 40px;
}
.header h1 {
  margin: 0 0 8px;
  font-size: 2rem;
}
.subtitle {
  margin: 0 0 24px;
  color: #64748b;
}
.search {
  width: 100%;
  max-width: 420px;
  padding: 12px 16px;
  font-size: 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  outline: none;
}
.search:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.tile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 20px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  text-decoration: none;
  color: inherit;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.tile:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
}

.avatar {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  color: #fff;
  font-size: 1.25rem;
  font-weight: 700;
}

.name {
  font-size: 1.1rem;
  font-weight: 600;
}
.desc {
  color: #64748b;
  font-size: 0.9rem;
}
.path {
  margin-top: auto;
  font-family: ui-monospace, monospace;
  font-size: 0.8rem;
  color: #2563eb;
  background: #eff6ff;
  padding: 2px 8px;
  border-radius: 6px;
}

.empty {
  grid-column: 1 / -1;
  text-align: center;
  color: #64748b;
}
</style>
