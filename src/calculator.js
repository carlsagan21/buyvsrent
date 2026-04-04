export const DEFAULTS = {
  homePrice: 700000,       // 2026 Ridgewood NJ median ~$900K–$1.5M
  downPct: 0.20,
  closingPct: 0.03,
  mortgageRate: 0.065,     // 2026.04 30yr fixed: 6.23%–6.51%
  propertyTaxRate: 0.0289, // Ridgewood NJ 2025 재산세율
  insuranceY1: 1800,       // NJ 평균 주택 보험
  maintenanceY1: 9000,     // 수선비 (~1% of home value)
  marginalTaxRate: 0.24,   // MFJ $300K 연방 한계세율
  stateIncomeTaxY1: 14000, // NJ 주 소득세 추정치 (MFJ $300K 가정)
  standardDeduction: 32200,// 2026 MFJ 표준공제
  saltCap: 40000,          // 2026 SALT 공제 한도 (phaseout 전)
  mortgageInterestLimit: 750000,
  homeAppreciation: 0.05,  // Ridgewood NJ 10년 평균 ~5.0% (Zillow ZHVI)
  investReturn: 0.08,      // S&P 500 명목 CAGR ~9.5%, 배당세·보수적 마진 차감
  costGrowth: 0.035,
  rentGrowth: 0.03,
  sellingCostPct: 0.05,    // NAR 합의 이후 4%–6%, 5% 적용
  capitalGainsTaxRate: 0.188, // 장기자본이득세 15% + NIIT 3.8% 가정
  homeSaleGainExclusion: 500000,
};

export const REGIONS = [
  { name: "Ridgewood (Bergen)", homePrice: 900000, propertyTaxRate: 0.0289, homeAppreciation: 0.05 },
  { name: "Tenafly (Bergen)", homePrice: 1200000, propertyTaxRate: 0.0260, homeAppreciation: 0.05 },
  { name: "Paramus (Bergen)", homePrice: 850000, propertyTaxRate: 0.0145, homeAppreciation: 0.045 },
  { name: "Fort Lee (Bergen)", homePrice: 650000, propertyTaxRate: 0.0230, homeAppreciation: 0.045 },
  { name: "Millburn (Essex)", homePrice: 1500000, propertyTaxRate: 0.0195, homeAppreciation: 0.045 },
  { name: "Montclair (Essex)", homePrice: 1000000, propertyTaxRate: 0.0315, homeAppreciation: 0.05 },
  { name: "Jersey City (Hudson)", homePrice: 850000, propertyTaxRate: 0.0165, homeAppreciation: 0.04 },
  { name: "Princeton (Mercer)", homePrice: 950000, propertyTaxRate: 0.0245, homeAppreciation: 0.045 },
];

export function calcTaxBenefit({
  yearlyInterest,
  avgBalance,
  propertyTax,
  stateIncomeTax,
  mortgageInterestLimit,
  marginalTaxRate,
  standardDeduction,
  saltCap,
}) {
  const deductibleInterestRatio = avgBalance > 0
    ? Math.min(1, mortgageInterestLimit / avgBalance)
    : 0;
  const deductibleInterest = yearlyInterest * deductibleInterestRatio;
  const saltDeduction = Math.min(propertyTax + stateIncomeTax, saltCap);
  const itemized = deductibleInterest + saltDeduction;
  const excess = Math.max(0, itemized - standardDeduction);

  return excess * marginalTaxRate;
}

export function deriveParams(params) {
  const downPayment = params.homePrice * params.downPct;
  const closingCost = params.homePrice * params.closingPct;
  const mortgage = params.homePrice - downPayment;
  const annualCostsY1 = params.homePrice * params.propertyTaxRate + params.insuranceY1 + params.maintenanceY1;

  return { ...params, downPayment, closingCost, mortgage, annualCostsY1 };
}

export function monthlyPmt(principal, rate, months) {
  const monthlyRate = rate / 12;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
}

export function amortizeYear(balance, rate, monthlyPayment) {
  let nextBalance = balance;
  let yearInterest = 0;
  let balanceSum = 0;

  for (let month = 0; month < 12; month++) {
    balanceSum += nextBalance;
    const monthlyInterest = nextBalance * (rate / 12);
    yearInterest += monthlyInterest;
    nextBalance -= (monthlyPayment - monthlyInterest);
  }

  return {
    endBalance: nextBalance,
    yearInterest,
    yearPrincipal: balance - nextBalance,
    avgBalance: balanceSum / 12,
  };
}

export function calcSaleOutcome(params, holdYears, homeVal, balance) {
  const saleProceeds = homeVal * (1 - params.sellingCostPct);
  const exclusion = holdYears >= 2 ? params.homeSaleGainExclusion : 0;
  const taxableGain = Math.max(0, saleProceeds - params.homePrice - exclusion);
  const capitalGainsTax = taxableGain * params.capitalGainsTaxRate;
  const buyerNW = saleProceeds - capitalGainsTax - Math.max(0, balance);

  return { saleProceeds, taxableGain, capitalGainsTax, buyerNW };
}

export function simulate(params, holdYears, startRent) {
  const monthlyPayment = monthlyPmt(params.mortgage, params.mortgageRate, 360);
  const annualMtg = monthlyPayment * 12;
  let balance = params.mortgage;
  let renterInv = params.downPayment + params.closingCost;

  for (let year = 1; year <= holdYears; year++) {
    const yearMortgage = amortizeYear(balance, params.mortgageRate, monthlyPayment);
    balance = yearMortgage.endBalance;

    const propertyTax = params.homePrice * params.propertyTaxRate * Math.pow(1 + params.costGrowth, year - 1);
    const stateIncomeTax = params.stateIncomeTaxY1 * Math.pow(1 + params.costGrowth, year - 1);
    const taxBenefit = calcTaxBenefit({
      yearlyInterest: yearMortgage.yearInterest,
      avgBalance: yearMortgage.avgBalance,
      propertyTax,
      stateIncomeTax,
      mortgageInterestLimit: params.mortgageInterestLimit,
      marginalTaxRate: params.marginalTaxRate,
      standardDeduction: params.standardDeduction,
      saltCap: params.saltCap,
    });

    const costs = params.annualCostsY1 * Math.pow(1 + params.costGrowth, year - 1);
    const buyerOut = annualMtg + costs - taxBenefit;
    const renterOut = startRent * 12 * Math.pow(1 + params.rentGrowth, year - 1);
    const investGain = renterInv > 0 ? renterInv * params.investReturn : 0;

    renterInv = renterInv + investGain + (buyerOut - renterOut);
  }

  const homeVal = params.homePrice * Math.pow(1 + params.homeAppreciation, holdYears);
  const sale = calcSaleOutcome(params, holdYears, homeVal, balance);

  return {
    buyerNW: sale.buyerNW,
    renterNW: renterInv,
    homeVal,
    balance: Math.max(0, balance),
    taxableGain: sale.taxableGain,
    capitalGainsTax: sale.capitalGainsTax,
    saleProceeds: sale.saleProceeds,
  };
}

export function findBE(params, holdYears) {
  let lo = 0;
  let hi = Math.max(20000, params.homePrice / 48);

  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const { buyerNW, renterNW } = simulate(params, holdYears, mid);
    if (renterNW > buyerNW) lo = mid;
    else hi = mid;
  }

  return (lo + hi) / 2;
}

export function findBEnoInfl(params, holdYears) {
  const monthlyPayment = monthlyPmt(params.mortgage, params.mortgageRate, 360);
  const annualMtg = monthlyPayment * 12;
  const year1Mortgage = amortizeYear(params.mortgage, params.mortgageRate, monthlyPayment);
  const year1PropTax = params.homePrice * params.propertyTaxRate;
  const fixedTaxBenefit = calcTaxBenefit({
    yearlyInterest: year1Mortgage.yearInterest,
    avgBalance: year1Mortgage.avgBalance,
    propertyTax: year1PropTax,
    stateIncomeTax: params.stateIncomeTaxY1,
    mortgageInterestLimit: params.mortgageInterestLimit,
    marginalTaxRate: params.marginalTaxRate,
    standardDeduction: params.standardDeduction,
    saltCap: params.saltCap,
  });
  const buyerOut = annualMtg + params.annualCostsY1 - fixedTaxBenefit;

  let lo = 0;
  let hi = Math.max(20000, params.homePrice / 48);

  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    let balance = params.mortgage;
    let renterInv = params.downPayment + params.closingCost;

    for (let year = 1; year <= holdYears; year++) {
      const investGain = renterInv > 0 ? renterInv * params.investReturn : 0;
      renterInv = renterInv + investGain + (buyerOut - mid * 12);
      balance = amortizeYear(balance, params.mortgageRate, monthlyPayment).endBalance;
    }

    const homeVal = params.homePrice * Math.pow(1 + params.homeAppreciation, holdYears);
    const buyerNW = calcSaleOutcome(params, holdYears, homeVal, balance).buyerNW;

    if (renterInv > buyerNW) lo = mid;
    else hi = mid;
  }

  return (lo + hi) / 2;
}
