import { createRouter, createWebHistory } from 'vue-router'
import Test1 from './views/Test1.vue'
import Test2 from './views/Test2.vue'
import Test3 from './views/Test3.vue'

// history base ต้องตรงกับ prefix ที่ browser เห็น (/pos/)
// gateway strip /pos ออกก่อนส่งมา แต่ URL ฝั่ง browser ยังเป็น /pos/test1
export default createRouter({
  history: createWebHistory('/pos/'),
  routes: [
    { path: '/', redirect: '/test1' },
    { path: '/test1', component: Test1 },
    { path: '/test2', component: Test2 },
    { path: '/test3', component: Test3 },
  ],
})
