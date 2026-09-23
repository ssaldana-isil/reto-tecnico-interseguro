<script setup>
import { ref } from 'vue';
import { routesApi } from '../api/services.js';
import { ApiError } from '../api/errors.js';
import ErrorPanel from './ErrorPanel.vue';
import ejemplo from '../examples/routes-ejemplo.json?raw';

const body = ref(ejemplo);
const status = ref('idle'); // idle | loading | success | error
const result = ref(null);
const error = ref(null);

async function calculate() {
  result.value = null;
  error.value = null;
  let payload;
  try {
    payload = JSON.parse(body.value);
  } catch (err) {
    error.value = new ApiError({ code: 'INVALID_JSON', message: `el texto no es JSON válido: ${err.message}` });
    status.value = 'error';
    return;
  }
  status.value = 'loading';
  try {
    result.value = await routesApi.post('/v1/routes/optimal', payload);
    status.value = 'success';
  } catch (err) {
    error.value = err instanceof ApiError ? err : new ApiError({ code: 'CLIENT_ERROR', message: String(err) });
    status.value = 'error';
  }
}
</script>

<template>
  <section>
    <p class="muted">Accidente, bases y grafo de distritos (contenido de routes-service/ejemplo.json).</p>
    <form class="form" @submit.prevent="calculate">
      <textarea v-model="body" rows="16" spellcheck="false" class="code" data-testid="routes-input"></textarea>
      <button type="submit" class="primary" :disabled="status === 'loading'" data-testid="calculate">
        {{ status === 'loading' ? 'Calculando…' : 'Calcular' }}
      </button>
    </form>

    <div v-if="status === 'success'" class="panel panel--ok" data-testid="routes-result">
      <p class="panel__title"><span class="badge badge--ok">200</span> Ruta óptima</p>
      <dl class="route">
        <dt>fromDepot</dt>
        <dd data-testid="route-from">{{ result.fromDepot }}</dd>
        <dt>to</dt>
        <dd data-testid="route-to">{{ result.to }}</dd>
        <dt>path</dt>
        <dd data-testid="route-path">{{ result.path.join(' → ') }}</dd>
        <dt>distance</dt>
        <dd data-testid="route-distance">{{ result.distance }}</dd>
      </dl>
    </div>
    <ErrorPanel v-if="status === 'error'" :error="error" />
  </section>
</template>
