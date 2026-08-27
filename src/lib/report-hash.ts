import { keccak256, stringToHex, toBytes } from 'viem';
import type { ValuationResult } from '@/valuation-engine';

export function stableReportRepresentation(result: ValuationResult) {
  return JSON.stringify({
    assetId: result.assetId,
    assetType: result.assetType,
    estimatedValue: result.estimatedValue,
    currency: result.currency,
    riskScore: result.riskScore,
    confidenceScore: result.confidenceScore,
    summary: result.summary,
    factors: [...result.factors],
    assumptions: [...result.assumptions],
    input: Object.keys(result.input)
      .sort()
      .reduce<Record<string, string | number>>((acc, key) => {
        acc[key] = result.input[key];
        return acc;
      }, {}),
  });
}

export function hashValuationReport(result: ValuationResult) {
  return keccak256(toBytes(stringToHex(stableReportRepresentation(result))));
}

export function verifyValuationReport(result: ValuationResult, expectedHash: string) {
  return hashValuationReport(result).toLowerCase() === expectedHash.toLowerCase();
}