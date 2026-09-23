import { ProductoModel } from './producto.model';
import { TipoEndosoModel } from './tipo-endoso.model';
import { PlantillaModel } from './plantilla.model';
import { PlantillaCampoModel, OrigenCampo } from './plantilla-campo.model';
import { PlantillaEventoModel } from './plantilla-evento.model';
import { PlantillaRiskUnitModel } from './plantilla-risk-unit.model';

export {
  ProductoModel,
  TipoEndosoModel,
  PlantillaModel,
  PlantillaCampoModel,
  OrigenCampo,
  PlantillaEventoModel,
  PlantillaRiskUnitModel,
};

export const models = [
  ProductoModel,
  TipoEndosoModel,
  PlantillaModel,
  PlantillaCampoModel,
  PlantillaEventoModel,
  PlantillaRiskUnitModel,
];
