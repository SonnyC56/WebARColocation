import { createRouter, createWebHistory } from 'vue-router';
import HomePage from '../pages/HomePage.vue';
import LensPage from '../pages/LensPage.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage
    },
    {
      path: '/lens/:lensGroupId/:lensId',
      name: 'lens',
      component: LensPage
    }
  ]
});

export default router;
