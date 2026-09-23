import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('ejemplo precargado de Rutas', () => {
  it('es idéntico a routes-service/ejemplo.json', () => {
    const local = readFileSync(new URL('../src/examples/routes-ejemplo.json', import.meta.url), 'utf8');
    const original = readFileSync(new URL('../../routes-service/ejemplo.json', import.meta.url), 'utf8');

    expect(local).toBe(original);
  });
});
