export type AssetType =
  | 'real-estate'
  | 'vehicle'
  | 'equipment'
  | 'agriculture'
  | 'invoice';

export type AssetFields = Record<string, string | number>;

export interface ValuationResult {
  assetId: string;
  assetType: AssetType;
  estimatedValue: number;
  currency: 'USD';
  riskScore: number;
  confidenceScore: number;
  summary: string;
  factors: string[];
  assumptions: string[];
  generatedAt: string;
  input: AssetFields;
}