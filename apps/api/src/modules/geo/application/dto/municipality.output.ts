import type { BrazilianState } from '../../domain/brazilian-state';

export type MunicipalityOutput = {
  id: number;
  name: string;
  state: BrazilianState | null;
  population: number;
};
