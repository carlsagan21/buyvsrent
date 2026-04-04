import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULTS,
  amortizeYear,
  calcSaleOutcome,
  calcTaxBenefit,
  deriveParams,
  findBE,
  findBEnoInfl,
  monthlyPmt,
  simulate,
} from "../src/calculator.ts";

function assertClose(actual: number, expected: number, tolerance = 1e-6): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

test("deriveParams computes upfront cash, mortgage, and first-year carrying cost", () => {
  const params = deriveParams(DEFAULTS);

  assert.equal(params.downPayment, 140000);
  assert.equal(params.closingCost, 21000);
  assert.equal(params.mortgage, 560000);
  assert.equal(params.annualCostsY1, 31030);
});

test("calcTaxBenefit respects both the mortgage interest cap and the SALT cap", () => {
  const benefit = calcTaxBenefit({
    yearlyInterest: 60000,
    avgBalance: 1000000,
    propertyTax: 25000,
    stateIncomeTax: 20000,
    mortgageInterestLimit: 750000,
    marginalTaxRate: 0.24,
    standardDeduction: 30000,
    saltCap: 40000,
  });

  assert.equal(benefit, 13200);
});

test("amortizeYear preserves the annual payment split between interest and principal", () => {
  const params = deriveParams(DEFAULTS);
  const monthlyPayment = monthlyPmt(params.mortgage, params.mortgageRate, 360);
  const firstYear = amortizeYear(params.mortgage, params.mortgageRate, monthlyPayment);

  assertClose(firstYear.yearInterest + firstYear.yearPrincipal, monthlyPayment * 12, 1e-4);
  assert.ok(firstYear.endBalance < params.mortgage);
});

test("calcSaleOutcome applies the home sale exclusion only when the holding period qualifies", () => {
  const params = deriveParams(DEFAULTS);
  const qualified = calcSaleOutcome(params, 7, 1300000, 500000);
  const notQualified = calcSaleOutcome(params, 1, 1300000, 500000);

  assert.equal(qualified.taxableGain, 35000);
  assert.equal(qualified.capitalGainsTax, 6580);
  assert.equal(qualified.buyerNW, 728420);

  assert.equal(notQualified.taxableGain, 535000);
  assert.equal(notQualified.capitalGainsTax, 100580);
});

test("findBE converges to a rent where buyer and renter net worths are nearly equal", () => {
  const params = deriveParams(DEFAULTS);
  const breakEvenRent = findBE(params, 7);
  const result = simulate(params, 7, breakEvenRent);

  assert.ok(Math.abs(result.buyerNW - result.renterNW) < 10);
});

test("inflation-aware break-even rent is lower than the no-inflation baseline", () => {
  const params = deriveParams(DEFAULTS);
  const withInflation = findBE(params, 7);
  const withoutInflation = findBEnoInfl(params, 7);

  assert.ok(withInflation < withoutInflation);
});

test("long holding periods surface positive capital gains tax in the default scenario", () => {
  const params = deriveParams(DEFAULTS);
  const result = simulate(params, 20, 4000);

  assert.ok(result.taxableGain > 0);
  assert.ok(result.capitalGainsTax > 0);
});
