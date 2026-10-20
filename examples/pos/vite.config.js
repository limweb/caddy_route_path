import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// base ต้องตรงกับ prefix ที่ gateway ใช้ route (/pos/*)
// เพราะ asset ใน index.html จะถูกอ้างเป็น /pos/assets/...
export default defineConfig({
  base: '/pos/',
  plugins: [vue()],
})
