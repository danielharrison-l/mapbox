import type { BrazilianState } from '../../domain/brazilian-state';

export type CoverageSocioeconomicAreaGeometryOutput = {
  type: 'Point';
  coordinates: [number, number];
};

export type CoverageSocioeconomicAreaOutput = {
  id: number;
  name: string;
  state: BrazilianState | null;
  population: number;
  averageMonthlyIncome: number;
  geometry: CoverageSocioeconomicAreaGeometryOutput | null;
};

export type CoverageSocioeconomicDataOutput = {
  infrastructurePointId: number;
  externalAreasCount: number;
  totalPopulation: number;
  averageMonthlyIncome: number;
  areas: CoverageSocioeconomicAreaOutput[];
};
