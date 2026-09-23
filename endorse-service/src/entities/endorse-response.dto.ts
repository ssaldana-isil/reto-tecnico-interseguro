export interface DescriptionDto {
  description: string | null;
}

export interface DynamicDataItemDto {
  etiqueta: string;
  value: string | null;
}

export interface EventAppliedDto {
  description: string;
  orderEvent: number;
}

export interface InsuranceObjectDto {
  insuranceObjectNumber: string;
  coverageEntities: unknown[];
  participationEntities: unknown[];
}

export interface RiskUnitDto {
  insuranceObjectEntities: InsuranceObjectDto[];
  plansEntity: { description: unknown };
  riskUnitNumber: string;
}

/** JSON estructurado que consume el core. El orden de las claves es el del ejemplo del reto. */
export interface EndorseResponseDto {
  policyNumber: string;
  idEnvio: number | null;
  financialPlansEntity: DescriptionDto;
  currency: DescriptionDto;
  productEntity: DescriptionDto;
  eventEntity: {
    description: string;
    dynamicData: DynamicDataItemDto[];
  };
  eventAppliedEntities: EventAppliedDto[];
  riskUnitEntities: RiskUnitDto[];
  participationEntities: unknown[];
}
