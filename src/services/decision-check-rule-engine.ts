/**
 * Decision Check Rule Engine
 * Deterministic, no-AI evaluation engine for Phase 8.0B.
 */

export type RuleOperator = 
  | 'equals' 
  | 'not_equals' 
  | 'greater_than' 
  | 'greater_than_or_equal' 
  | 'less_than' 
  | 'less_than_or_equal' 
  | 'between' 
  | 'is_unknown' 
  | 'is_known' 
  | 'all' 
  | 'any';

export interface RuleDefinition {
  code: string;
  questionCode?: string;
  operator: RuleOperator;
  threshold?: any;
  thresholdMax?: any;
  findingCode: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  messageTemplate: string;
  actionCode?: string;
  blocking?: boolean;
  priority?: number;
}

export interface RuleEngineInput {
  answers: Record<string, any>;
  unknowns: Record<string, boolean>;
  rules: RuleDefinition[];
}

export interface Finding {
  code: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  actionCode?: string;
  isBlocking: boolean;
  priority: number;
}

export interface RuleEngineOutput {
  findings: Finding[];
  missingInformation: string[];
  criticalIssues: string[];
  recommendedActions: string[];
  status: 'ready' | 'generally_suitable' | 'missing_information' | 'caution' | 'high_risk' | 'not_recommended';
  riskLevel: 'low' | 'medium' | 'high' | 'critical' | 'undetermined';
}

function evaluateCondition(operator: RuleOperator, value: any, threshold: any, thresholdMax?: any, isUnknown?: boolean): boolean {
  if (operator === 'is_unknown') return !!isUnknown;
  if (operator === 'is_known') return !isUnknown;
  
  // If we require a known value for standard operators, and it's unknown, condition fails.
  if (isUnknown) return false;

  switch (operator) {
    case 'equals': return value === threshold;
    case 'not_equals': return value !== threshold;
    case 'greater_than': return Number(value) > Number(threshold);
    case 'greater_than_or_equal': return Number(value) >= Number(threshold);
    case 'less_than': return Number(value) < Number(threshold);
    case 'less_than_or_equal': return Number(value) <= Number(threshold);
    case 'between': return Number(value) >= Number(threshold) && Number(value) <= Number(thresholdMax);
    case 'all': 
      if (Array.isArray(value)) return value.every(v => threshold.includes(v));
      return false;
    case 'any':
      if (Array.isArray(value)) return value.some(v => threshold.includes(v));
      return false;
    default: return false;
  }
}

export function evaluateDecisionCheck(input: RuleEngineInput): RuleEngineOutput {
  const findings: Finding[] = [];
  const missingInformation: string[] = [];
  
  // Collect findings based on rules
  for (const rule of input.rules) {
    const { questionCode, operator, threshold, thresholdMax, findingCode, severity, messageTemplate, actionCode, blocking, priority } = rule;
    
    // Evaluate rule
    let matched = false;
    
    if (questionCode) {
      const val = input.answers[questionCode];
      const isUnk = input.unknowns[questionCode];
      matched = evaluateCondition(operator, val, threshold, thresholdMax, isUnk);
      
      if (matched && operator === 'is_unknown') {
        missingInformation.push(questionCode);
      }
    } else {
      // In advanced cases, rule might evaluate without questionCode (e.g., aggregate rules). MVP supports single question evaluation.
    }
    
    if (matched) {
      findings.push({
        code: findingCode,
        severity,
        message: messageTemplate, // Note: future enhancement could interpolate values
        actionCode,
        isBlocking: !!blocking,
        priority: priority ?? 0
      });
    }
  }
  
  // Sort findings by priority and severity
  findings.sort((a, b) => b.priority - a.priority);
  
  // Extract critical issues and recommended actions (max 3 actions as MVP)
  const criticalIssues = findings.filter(f => f.severity === 'critical').map(f => f.code);
  const recommendedActions = Array.from(new Set(findings.map(f => f.actionCode).filter(Boolean) as string[])).slice(0, 3);
  
  // Determine risk level
  let riskLevel: RuleEngineOutput['riskLevel'] = 'low';
  if (findings.some(f => f.severity === 'critical')) riskLevel = 'critical';
  else if (findings.some(f => f.severity === 'high')) riskLevel = 'high';
  else if (findings.some(f => f.severity === 'medium')) riskLevel = 'medium';
  
  if (missingInformation.length > 0 && riskLevel !== 'critical') {
    riskLevel = 'undetermined'; // If there's missing critical info, we can't be sure
  }

  // Determine overall status
  let status: RuleEngineOutput['status'] = 'ready';
  if (criticalIssues.length > 0) status = 'not_recommended';
  else if (riskLevel === 'high') status = 'high_risk';
  else if (missingInformation.length > 0) status = 'missing_information';
  else if (riskLevel === 'medium') status = 'caution';
  else status = 'generally_suitable';

  return {
    findings,
    missingInformation,
    criticalIssues,
    recommendedActions,
    status,
    riskLevel
  };
}


export interface ProfitabilityInput {
  salePrice: number | null;
  productCost: number | null;
  commissionRate: number | null;
  shippingCost: number | null;
  packagingCost: number | null;
  otherVariableCost: number | null;
  returnLossAllowance: number | null;
  discountRate: number | null;
  /** Kept for compatibility with the existing marketplace formula helper. */
  taxOrDeduction?: number | null;
  /** Kept for compatibility with earlier Decision Check snapshots. */
  allocatedFixedCost?: number | null;
}

export interface ProfitabilityScenario {
  salePrice: number;
  commissionAmount: number;
  totalCost: number;
  contribution: number;
  marginPercent: number;
  profitable: boolean;
}

export interface ProfitabilityOutput {
  revenue: number;
  knownCosts: Record<string, number>;
  unknownCostCodes: string[];
  totalKnownCost: number;
  estimatedProfit: number;
  estimatedMarginPercent: number;
  contribution: number;
  contributionMarginPercent: number;
  breakEvenPrice: number | null;
  discountedScenario: ProfitabilityScenario | null;
  riskWarnings: string[];
  safeNextSteps: string[];
  calculationComplete: boolean;
}

export function calculateDecisionCheckProfitability(inputs: ProfitabilityInput): ProfitabilityOutput {
  const unknownCostCodes: string[] = [];
  const knownCosts: Record<string, number> = {};
  let totalKnownCost = 0;

  // Revenue
  const revenue = inputs.salePrice ?? 0;
  if (inputs.salePrice === null) unknownCostCodes.push("salePrice");

  // Helper to process cost
  const processCost = (key: keyof ProfitabilityInput, amount: number | null) => {
    if (amount === null) {
      unknownCostCodes.push(key);
    } else {
      knownCosts[key] = amount;
      totalKnownCost += amount;
    }
  };

  processCost("productCost", inputs.productCost);
  
  if (inputs.commissionRate === null) {
    unknownCostCodes.push("commissionRate");
  } else {
    // Commission is calculated over revenue
    const commissionAmount = revenue * (inputs.commissionRate / 100);
    knownCosts["commissionAmount"] = commissionAmount;
    totalKnownCost += commissionAmount;
  }

  processCost("shippingCost", inputs.shippingCost);
  processCost("packagingCost", inputs.packagingCost);
  if (inputs.taxOrDeduction !== undefined) processCost("taxOrDeduction", inputs.taxOrDeduction);
  processCost("otherVariableCost", inputs.otherVariableCost);
  processCost("returnLossAllowance", inputs.returnLossAllowance);
  if (inputs.allocatedFixedCost !== undefined) processCost("allocatedFixedCost", inputs.allocatedFixedCost);

  if (inputs.discountRate === null) unknownCostCodes.push("discountRate");

  const estimatedProfit = revenue - totalKnownCost;
  const estimatedMarginPercent = revenue > 0 ? (estimatedProfit / revenue) * 100 : 0;

  const commissionRate = inputs.commissionRate ?? 0;
  const nonCommissionCost = totalKnownCost - (knownCosts.commissionAmount ?? 0);
  const breakEvenPrice = commissionRate >= 100
    ? null
    : nonCommissionCost / (1 - commissionRate / 100);

  let discountedScenario: ProfitabilityScenario | null = null;
  if (inputs.salePrice !== null && inputs.discountRate !== null && inputs.commissionRate !== null) {
    const discountedPrice = revenue * (1 - inputs.discountRate / 100);
    const discountedCommission = discountedPrice * (commissionRate / 100);
    const discountedTotalCost = nonCommissionCost + discountedCommission;
    const discountedContribution = discountedPrice - discountedTotalCost;
    discountedScenario = {
      salePrice: discountedPrice,
      commissionAmount: discountedCommission,
      totalCost: discountedTotalCost,
      contribution: discountedContribution,
      marginPercent: discountedPrice > 0 ? (discountedContribution / discountedPrice) * 100 : 0,
      profitable: discountedContribution > 0
    };
  }

  const riskWarnings: string[] = [];
  const safeNextSteps: string[] = [];
  if (unknownCostCodes.length > 0) {
    riskWarnings.push('Eksik maliyetler nedeniyle sonuç kesin değil.');
    safeNextSteps.push('Eksik maliyetleri doğrulamadan fiyat veya kampanya kararı vermeyin.');
  }
  if (inputs.commissionRate !== null && inputs.commissionRate >= 100) {
    riskWarnings.push('Komisyon oranı başabaş fiyatı hesaplamaya izin vermiyor.');
    safeNextSteps.push('Komisyon koşullarını yeniden görüşün veya farklı bir satış kanalı değerlendirin.');
  }
  if (estimatedProfit <= 0 && unknownCostCodes.length === 0) {
    riskWarnings.push('Mevcut satış fiyatı ürün başına katkı üretmiyor.');
    safeNextSteps.push('Satış fiyatını artırın veya birim maliyetleri düşürün.');
  } else if (estimatedMarginPercent < 10 && unknownCostCodes.length === 0) {
    riskWarnings.push('Katkı marjı küçük maliyet artışlarına karşı kırılgan.');
    safeNextSteps.push('İndirim vermeden önce maliyetler için güvenlik payı bırakın.');
  }
  if (discountedScenario && !discountedScenario.profitable) {
    riskWarnings.push('Planlanan indirim ürünü zarar noktasına geçiriyor.');
    safeNextSteps.push('İndirim oranını azaltın veya indirimi maliyet düşüşüyle eşleştirin.');
  }
  if (riskWarnings.length === 0) {
    safeNextSteps.push('Marjı korumak için maliyetleri düzenli aralıklarla güncelleyin.');
  }

  return {
    revenue,
    knownCosts,
    unknownCostCodes,
    totalKnownCost,
    estimatedProfit,
    estimatedMarginPercent,
    contribution: estimatedProfit,
    contributionMarginPercent: estimatedMarginPercent,
    breakEvenPrice,
    discountedScenario,
    riskWarnings,
    safeNextSteps: Array.from(new Set(safeNextSteps)).slice(0, 3),
    calculationComplete: unknownCostCodes.length === 0
  };
}

