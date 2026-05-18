import type { BrazilianState } from '../../domain/brazilian-state';

export type IbgeSocioeconomicIndicatorOutput = {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  source: string;
  referenceYear: number;
};

export type IbgeSocioeconomicIndicatorGroupOutput = {
  key: string;
  label: string;
  indicators: IbgeSocioeconomicIndicatorOutput[];
};

export type IbgeSocioeconomicDataOutput = {
  infrastructurePointId: number;
  municipality: {
    id: number;
    name: string;
    state: BrazilianState | null;
    ibgeCode: string | null;
  };
  source: string;
  referenceYear: number;
  population: number | null;
  occupiedHouseholds: number | null;
  residentsInHouseholds: number | null;
  averageResidentsPerHousehold: number | null;
  indicators: IbgeSocioeconomicIndicatorOutput[];
  indicatorGroups: IbgeSocioeconomicIndicatorGroupOutput[];
  warnings: string[];
};
