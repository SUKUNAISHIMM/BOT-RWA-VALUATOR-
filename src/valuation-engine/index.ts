import type {
  AssetFields,
  AssetType,
  ValuationResult,
} from './types';

export type { AssetFields, AssetType, ValuationResult };

export const assetTypeLabels: Record<AssetType, string> = {
  'real-estate': 'Real estate',
  vehicle: 'Vehicle',
  equipment: 'Equipment',
  agriculture: 'Agricultural asset',
  invoice: 'Invoice',
};

export const defaultFields: Record<AssetType, AssetFields> = {
  'real-estate': {
    location: '',
    propertyType: 'Residential',
    size: 1200,
    yearBuilt: new Date().getFullYear() - 10,
    condition: 'Good',
    rentalIncome: 0,
    purchasePrice: 250000,
  },
  vehicle: {
    make: '',
    model: '',
    year: new Date().getFullYear() - 4,
    mileage: 45000,
    condition: 'Good',
    purchasePrice: 28000,
  },
  equipment: {
    equipmentType: '',
    age: 5,
    condition: 'Good',
    originalValue: 50000,
    usage: 1000,
  },
  agriculture: {
    assetDescription: '',
    acreage: 20,
    cropOrLivestock: 'Mixed',
    age: 3,
    condition: 'Good',
    annualYield: 0,
    purchasePrice: 60000,
  },
  invoice: {
    customerName: '',
    invoiceAmount: 25000,
    daysOutstanding: 30,
    paymentHistory: 'Good',
    dueDate: '',
    purchasePrice: 0,
  },
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, Math.round(value)));

const numeric = (fields: AssetFields, key: string) => {
  const value = Number(fields[key]);
  return Number.isFinite(value) ? value : 0;
};

const text = (fields: AssetFields, key: string) =>
  String(fields[key] ?? '').trim();

const conditionScore: Record<string, number> = {
  Excellent: 1.14,
  Good: 1,
  Fair: 0.84,
  Poor: 0.64,
};

const conditionRisk: Record<string, number> = {
  Excellent: 8,
  Good: 18,
  Fair: 38,
  Poor: 64,
};

const locationMultiplier = (location: string) => {
  const normalized = location.toLowerCase();
  if (/(lagos|abuja|new york|london|san francisco)/.test(normalized)) return 1.18;
  if (/(ibadan|port harcourt|atlanta|manchester|dallas)/.test(normalized)) return 1.04;
  return 0.92;
};

function realEstate(fields: AssetFields) {
  const size = Math.max(numeric(fields, 'size'), 1);
  const purchasePrice = numeric(fields, 'purchasePrice');
  const rentalIncome = numeric(fields, 'rentalIncome');
  const yearBuilt = numeric(fields, 'yearBuilt') || new Date().getFullYear();
  const age = Math.max(new Date().getFullYear() - yearBuilt, 0);
  const condition = text(fields, 'condition') || 'Good';
  const replacementValue = size * 220 * locationMultiplier(text(fields, 'location'));
  const incomeValue = rentalIncome > 0 ? (rentalIncome * 12) / 0.075 : replacementValue;
  const anchor = purchasePrice > 0 ? purchasePrice : replacementValue;
  const estimatedValue = Math.max(1000, (anchor * 0.48 + incomeValue * 0.32 + replacementValue * 0.2) * conditionScore[condition]);
  const riskScore = clamp(16 + age * 0.8 + (conditionRisk[condition] ?? 28) * 0.55 - (rentalIncome > 0 ? 8 : 0));
  const confidenceScore = clamp(68 + (purchasePrice > 0 ? 10 : 0) + (rentalIncome > 0 ? 8 : 0) + (locationMultiplier(text(fields, 'location')) > 1 ? 4 : 0) - age * 0.15);
  return {
    estimatedValue,
    riskScore,
    confidenceScore,
    factors: ['Location signal', 'Property age', 'Condition', 'Income potential', 'Purchase price anchor'],
    assumptions: ['Income approach uses a 7.5% capitalization rate.', 'Comparable signal uses an indicative $220 per square foot baseline.'],
  };
}

function vehicle(fields: AssetFields) {
  const purchasePrice = numeric(fields, 'purchasePrice');
  const year = numeric(fields, 'year') || new Date().getFullYear();
  const age = Math.max(new Date().getFullYear() - year, 0);
  const mileage = numeric(fields, 'mileage');
  const condition = text(fields, 'condition') || 'Good';
  const base = purchasePrice > 0 ? purchasePrice : 18000;
  const ageFactor = Math.max(0.42, 1 - age * 0.075);
  const mileageFactor = Math.max(0.58, 1 - Math.max(mileage - 15000, 0) / 250000);
  const estimatedValue = Math.max(500, base * ageFactor * mileageFactor * conditionScore[condition]);
  const riskScore = clamp(12 + age * 4 + mileage / 7000 + (conditionRisk[condition] ?? 28) * 0.4);
  const confidenceScore = clamp(76 + (purchasePrice > 0 ? 8 : 0) - Math.min(age * 0.7, 12) - (mileage > 150000 ? 8 : 0));
  return {
    estimatedValue,
    riskScore,
    confidenceScore,
    factors: ['Vehicle age', 'Mileage', 'Condition', 'Purchase price anchor'],
    assumptions: ['Depreciation is modeled as a straight-line proxy with a mileage adjustment.', 'No make/model market premium is applied without a live comps feed.'],
  };
}

function equipment(fields: AssetFields) {
  const originalValue = numeric(fields, 'originalValue');
  const age = numeric(fields, 'age');
  const usage = numeric(fields, 'usage');
  const condition = text(fields, 'condition') || 'Good';
  const base = originalValue > 0 ? originalValue : 10000;
  const ageFactor = Math.max(0.28, 1 - age * 0.09);
  const usageFactor = Math.max(0.7, 1 - usage / 30000);
  const estimatedValue = Math.max(250, base * ageFactor * usageFactor * conditionScore[condition]);
  const riskScore = clamp(18 + age * 4.2 + usage / 1000 + (conditionRisk[condition] ?? 28) * 0.45);
  const confidenceScore = clamp(72 + (originalValue > 0 ? 12 : 0) - age * 0.8);
  return {
    estimatedValue,
    riskScore,
    confidenceScore,
    factors: ['Equipment age', 'Condition', 'Usage intensity', 'Original value anchor'],
    assumptions: ['Residual value floors at 28% of original value before condition adjustments.', 'Usage is treated as operating hours or equivalent utilization units.'],
  };
}

function agriculture(fields: AssetFields) {
  const purchasePrice = numeric(fields, 'purchasePrice');
  const acreage = numeric(fields, 'acreage');
  const annualYield = numeric(fields, 'annualYield');
  const age = numeric(fields, 'age');
  const condition = text(fields, 'condition') || 'Good';
  const landProxy = acreage * 2800;
  const yieldProxy = annualYield > 0 ? annualYield * 4.5 : 0;
  const anchor = purchasePrice > 0 ? purchasePrice : landProxy;
  const estimatedValue = Math.max(500, (anchor * 0.55 + landProxy * 0.25 + yieldProxy * 0.2) * conditionScore[condition] * Math.max(0.7, 1 - age * 0.02));
  const riskScore = clamp(24 + age * 1.6 + (conditionRisk[condition] ?? 28) * 0.5 - (annualYield > 0 ? 7 : 0));
  const confidenceScore = clamp(62 + (purchasePrice > 0 ? 9 : 0) + (annualYield > 0 ? 12 : 0) + (acreage > 0 ? 6 : 0));
  return {
    estimatedValue,
    riskScore,
    confidenceScore,
    factors: ['Acreage', 'Condition', 'Asset age', 'Yield potential', 'Purchase price anchor'],
    assumptions: ['Acreage proxy uses an indicative $2,800 per acre baseline.', 'Yield potential is discounted and does not include commodity price volatility.'],
  };
}

function invoice(fields: AssetFields) {
  const invoiceAmount = numeric(fields, 'invoiceAmount');
  const daysOutstanding = numeric(fields, 'daysOutstanding');
  const paymentHistory = text(fields, 'paymentHistory') || 'Good';
  const historyFactor = paymentHistory === 'Excellent' ? 0.99 : paymentHistory === 'Good' ? 0.96 : paymentHistory === 'Fair' ? 0.87 : 0.72;
  const agingFactor = Math.max(0.55, 1 - Math.max(daysOutstanding - 30, 0) / 900);
  const estimatedValue = Math.max(100, invoiceAmount * historyFactor * agingFactor);
  const riskScore = clamp(10 + daysOutstanding * 0.45 + (paymentHistory === 'Poor' ? 36 : paymentHistory === 'Fair' ? 20 : 0));
  const confidenceScore = clamp(70 + (invoiceAmount > 0 ? 14 : 0) - Math.min(daysOutstanding / 14, 16));
  return {
    estimatedValue,
    riskScore,
    confidenceScore,
    factors: ['Invoice amount', 'Days outstanding', 'Payment history', 'Collection risk'],
    assumptions: ['Estimated value reflects an indicative collection discount.', 'No credit bureau, debtor verification, or legal review is performed locally.'],
  };
}

export function runValuation(assetType: AssetType, fields: AssetFields, assetId?: string): ValuationResult {
  const calculation = assetType === 'real-estate'
    ? realEstate(fields)
    : assetType === 'vehicle'
      ? vehicle(fields)
      : assetType === 'equipment'
        ? equipment(fields)
        : assetType === 'agriculture'
          ? agriculture(fields)
          : invoice(fields);

  const generatedAt = new Date().toISOString();
  const stableAssetId = assetId?.trim() || `${assetType}-${Date.now().toString(36)}`;
  return {
    assetId: stableAssetId,
    assetType,
    estimatedValue: Math.round(calculation.estimatedValue),
    currency: 'USD',
    riskScore: clamp(calculation.riskScore),
    confidenceScore: clamp(calculation.confidenceScore),
    summary: 'Estimated using the submitted asset information and transparent valuation factors.',
    factors: calculation.factors,
    assumptions: calculation.assumptions,
    generatedAt,
    input: { ...fields },
  };
}
