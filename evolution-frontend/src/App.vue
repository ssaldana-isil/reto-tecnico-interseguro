<script setup>
import { ref } from 'vue';
import EndorseTab from './components/EndorseTab.vue';
import RoutesTab from './components/RoutesTab.vue';

// Dos vistas sin URLs propias: basta con estado local, no se justifica un router.
const tabs = [
  { id: 'endorse', label: 'Traductor de Endosos' },
  { id: 'routes', label: 'Rutas Óptimas' },
];
const active = ref('endorse');
</script>

<template>
  <header class="header">
    <h1>Evolution</h1>
    <p class="muted">Reto técnico Interseguro · Parte 2 de los ejercicios 1 y 2</p>
  </header>

  <nav class="tabs" role="tablist">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      role="tab"
      :aria-selected="active === tab.id"
      :class="['tab', { 'tab--active': active === tab.id }]"
      :data-testid="`tab-${tab.id}`"
      @click="active = tab.id"
    >
      {{ tab.label }}
    </button>
  </nav>

  <main class="content">
    <!-- v-show conserva el formulario y el resultado al cambiar de pestaña. -->
    <EndorseTab v-show="active === 'endorse'" />
    <RoutesTab v-show="active === 'routes'" />
  </main>
</template>
