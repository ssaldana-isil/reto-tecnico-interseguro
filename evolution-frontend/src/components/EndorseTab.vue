<script setup>
import { reactive, ref } from 'vue';
import { endorseApi } from '../api/services.js';
import { ApiError } from '../api/errors.js';
import ErrorPanel from './ErrorPanel.vue';

/** Los 11 campos del JSON plano del enunciado, precargados con el ejemplo. */
const fields = [
  { key: 'policyNumber', label: 'policyNumber', type: 'text' },
  { key: 'idEnvio', label: 'idEnvio', type: 'number' },
  { key: 'frecuencia', label: 'frecuencia', type: 'text' },
  { key: 'tipoEndoso', label: 'tipoEndoso', type: 'text' },
  { key: 'producto', label: 'producto', type: 'text' },
  { key: 'plan', label: 'plan', type: 'text' },
  { key: 'moneda', label: 'moneda', type: 'text' },
  { key: 'usuario', label: 'usuario', type: 'text' },
  { key: 'fechaSolicitud', label: 'fechaSolicitud', type: 'text' },
  { key: 'fechaCliente', label: 'fechaCliente', type: 'text' },
  { key: 'fechaEfectiva', label: 'fechaEfectiva', type: 'text' },
];

const form = reactive({
  policyNumber: '08200000049',
  idEnvio: 5984,
  frecuencia: 'Semestral',
  tipoEndoso: 'CambioFrecuencia',
  producto: 'Rumbo',
  plan: 'PlanRumbo',
  moneda: 'Nuevo Sol',
  usuario: 'interface.servicios',
  fechaSolicitud: '2025-08-27',
  fechaCliente: '2025-08-27',
  fechaEfectiva: '2025-09-01',
});

/** Campos adicionales que puede leer otra plantilla (por ejemplo, beneficiario en VidaFlex). */
const extras = ref([]);

const status = ref('idle'); // idle | loading | success | error
const result = ref(null);
const error = ref(null);

/** Los campos vacíos no se envían: así la plantilla aplica su default o reporta el faltante. */
function buildPayload() {
  const payload = {};
  for (const { key, type } of fields) {
    const value = form[key];
    if (value === '' || value === null || value === undefined) continue;
    payload[key] = type === 'number' ? Number(value) : value;
  }
  for (const { key, value } of extras.value) {
    if (key.trim() && value !== '') payload[key.trim()] = value;
  }
  return payload;
}

async function translate() {
  status.value = 'loading';
  result.value = null;
  error.value = null;
  try {
    result.value = await endorseApi.post('/v1/endorse/translate', buildPayload());
    status.value = 'success';
  } catch (err) {
    error.value = err instanceof ApiError ? err : new ApiError({ code: 'CLIENT_ERROR', message: String(err) });
    status.value = 'error';
  }
}
</script>

<template>
  <section>
    <p class="muted">
      JSON plano del endoso (ejemplo del enunciado). Los campos vacíos no se envían.
    </p>
    <form class="form" @submit.prevent="translate">
      <div class="grid">
        <label v-for="field in fields" :key="field.key" class="field">
          <span>{{ field.label }}</span>
          <input v-model="form[field.key]" :type="field.type" :name="field.key" :data-testid="`field-${field.key}`" />
        </label>
      </div>

      <fieldset class="extras">
        <legend>Campos adicionales</legend>
        <div v-for="(extra, index) in extras" :key="index" class="extra-row">
          <input v-model="extra.key" placeholder="clave" :data-testid="`extra-key-${index}`" />
          <input v-model="extra.value" placeholder="valor" :data-testid="`extra-value-${index}`" />
          <button type="button" class="link" @click="extras.splice(index, 1)">quitar</button>
        </div>
        <button type="button" class="link" data-testid="add-extra" @click="extras.push({ key: '', value: '' })">
          + campo
        </button>
      </fieldset>

      <button type="submit" class="primary" :disabled="status === 'loading'" data-testid="translate">
        {{ status === 'loading' ? 'Traduciendo…' : 'Traducir' }}
      </button>
    </form>

    <div v-if="status === 'success'" class="panel panel--ok" data-testid="endorse-result">
      <p class="panel__title"><span class="badge badge--ok">200</span> JSON para el core</p>
      <pre data-testid="endorse-json">{{ JSON.stringify(result, null, 2) }}</pre>
    </div>
    <ErrorPanel v-if="status === 'error'" :error="error" />
  </section>
</template>
