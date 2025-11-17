<template>
  <ARScene :lens-id="lensId" :lens-group-id="lensGroupId" :camera-type="cameraType" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import ARScene from '../components/ARScene.vue';

const route = useRoute();

const lensId = computed(() => route.params.lensId as string);
const lensGroupId = computed(() => route.params.lensGroupId as string);
const cameraType = computed(() => (route.params.cameraType as 'user' | 'environment') || 'environment');
</script>
