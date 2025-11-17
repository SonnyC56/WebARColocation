<template>
  <div class="home-page">
    <div class="home-container">
      <h1>Camera Kit Lenses</h1>
      <p class="subtitle">Select a lens to start</p>

      <div class="lens-list">
        <router-link
          v-for="lens in lenses"
          :key="lens.id"
          :to="`/lens/${lens.lensGroupId}/${lens.lensId}/${lens.cameraType}`"
          class="lens-card"
        >
          <h3>{{ lens.name }}</h3>
          <p>{{ lens.description }}</p>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Lens {
  id: string;
  name: string;
  description: string;
  lensId: string;
  lensGroupId: string;
  cameraType: 'user' | 'environment';
}

const lenses = ref<Lens[]>([
  {
    id: 'face-demo',
    name: 'Face Lens',
    description: 'Try out the face lens',
    lensId: '49414230875',
    lensGroupId: '395ea2c5-dae0-4782-ad18-3a01e03d01a8',
    cameraType: 'user'
  },
  {
    id: 'hand-demo',
    name: 'Hand Lens',
    description: 'Try out the hand lens',
    lensId: '50502080875',
    lensGroupId: '395ea2c5-dae0-4782-ad18-3a01e03d01a8',
    cameraType: 'user'
  },
  {
    id: 'cat-demo',
    name: 'Cat Demo',
    description: 'Try out the world lens',
    lensId: '59750560887',
    lensGroupId: '395ea2c5-dae0-4782-ad18-3a01e03d01a8',
    cameraType: 'environment'
  },
  {
    id: 'body-demo',
    name: 'Body Lens',
    description: 'Try out the body lens',
    lensId: '59750560887',
    lensGroupId: '395ea2c5-dae0-4782-ad18-3a01e03d01a8',
    cameraType: 'environment'
  },
  {
    id: 'anim-demo',
    name: 'Anim Lens',
    description: 'Try out the anim lens',
    lensId: '43288930875',
    lensGroupId: '395ea2c5-dae0-4782-ad18-3a01e03d01a8',
    cameraType: 'environment'
  },
  {
    id: 'portal-demo',
    name: 'Portal Lens',
    description: 'Try out the portal lens',
    lensId: '49820200880',
    lensGroupId: '395ea2c5-dae0-4782-ad18-3a01e03d01a8',
    cameraType: 'environment'
  },
  {
    id: 'highscore-demo',
    name: 'Highscore Lens',
    description: 'Try out the highscore lens',
    lensId: '43276930875',
    lensGroupId: '395ea2c5-dae0-4782-ad18-3a01e03d01a8',
    cameraType: 'environment'
  },
  {
    id: 'Xmas-card',
    name: 'Xmas Card',
    description: 'Try out the demo lens',
    lensId: 'a4bd2e0d-d5be-42b9-9b75-0c6764141c7a',
    lensGroupId: 'e22096cf-8353-4f1c-8160-e6fe155b7b49',
    cameraType: 'environment'
  }
]);
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: #000;
  padding: 20px;
}

.home-container {
  max-width: 600px;
  margin: 0 auto;
}

h1 {
  color: #fff;
  font-size: 1.5rem;
  margin: 0 0 6px 0;
  font-weight: 700;
}

.subtitle {
  color: #888;
  margin: 0 0 20px 0;
  font-size: 0.9rem;
}

.lens-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.lens-card {
  padding: 14px 0;
  border-bottom: 1px solid #222;
  text-decoration: none;
  color: #fff;
  display: block;
  -webkit-tap-highlight-color: transparent;
}

.lens-card:active {
  background: rgba(255, 255, 255, 0.05);
}

.lens-card h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
}

.lens-card p {
  display: none;
}

</style>
