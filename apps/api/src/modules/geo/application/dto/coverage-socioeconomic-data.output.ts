import type { BrazilianState } from '../../domain/brazilian-state';

export type CoverageSocioeconomicAreaOutput = {
  id: number;
  name: string;
  state: BrazilianState | null;
  population: number;
  averageMonthlyIncome: number;
};

export type CoverageSocioeconomicDataOutput = {
  infrastructurePointId: number;
  externalAreasCount: number;
  totalPopulation: number;
  averageMonthlyIncome: number;
  areas: CoverageSocioeconomicAreaOutput[];
};
