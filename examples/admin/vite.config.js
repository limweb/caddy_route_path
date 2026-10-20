import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// base ต้องตรงกับ prefix ที่ gateway ใช้ route (/admin/*)
// เพราะ asset ใน index.html จะถูกอ้างเป็น /admin/assets/...
export default defineConfig({
  base: '/admin/',
  plugins: [vue()],
})
