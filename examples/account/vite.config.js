import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// base ต้องตรงกับ prefix ที่ gateway ใช้ route (/account/*)
// เพราะ asset ใน index.html จะถูกอ้างเป็น /account/assets/...
export default defineConfig({
  base: '/account/',
  plugins: [vue()],
})
