export type CreateInfrastructurePointInput = {
  name: string;
  description?: string | null;
  municipalityId: number;
  geometry: string;
};
