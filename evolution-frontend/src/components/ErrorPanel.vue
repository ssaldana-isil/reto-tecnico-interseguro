<script setup>
defineProps({
  /** ApiError con code, message e items (missingFields o fields). */
  error: { type: Object, required: true },
});
</script>

<template>
  <div class="panel panel--error" role="alert" data-testid="error">
    <p class="panel__title">
      <span class="badge badge--error" data-testid="error-code">{{ error.code }}</span>
      <span v-if="error.status" class="muted">HTTP {{ error.status }}</span>
    </p>
    <p data-testid="error-message">{{ error.message }}</p>
    <ul v-if="error.items.length" class="error-items" data-testid="error-items">
      <li v-for="item in error.items" :key="item">{{ item }}</li>
    </ul>
  </div>
</template>
