/** No hay plantilla activa para el par (producto, tipoEndoso). */
export class TemplateNotFoundError extends Error {
  constructor(
    readonly producto: string,
    readonly tipoEndoso: string,
  ) {
    super(`no existe plantilla activa para producto "${producto}" y tipoEndoso "${tipoEndoso}"`);
  }
}

/** Campos requeridos por la plantilla que no se pudieron resolver (ni input ni default). */
export class MissingFieldsError extends Error {
  constructor(readonly missingFields: string[]) {
    super(`faltan campos requeridos por la plantilla: ${missingFields.join(', ')}`);
  }
}
