import { useState, useMemo } from "react";
import {
  DEFAULTS,
  REGIONS,
  amortizeYear,
  calcTaxBenefit,
  deriveParams,
  findBE,
  findBEnoInfl,
  monthlyPmt,
  simulate,
} from "./calculator";

function fmt(n) { return "$" + Math.round(n).toLocaleString("en-US"); }
function pct(n) { return (n * 100).toFixed(1) + "%"; }

const sliderDefs = [
  { key: "downPct", label: "다운페이먼트", min: 0.20, max: 0.40, step: 0.01, format: pct },
  { key: "mortgageRate", label: "모기지 금리", min: 0.03, max: 0.09, step: 0.001, format: pct },
  { key: "propertyTaxRate", label: "재산세율", min: 0.01, max: 0.04, step: 0.001, format: pct },
  { key: "insuranceY1", label: "주택 보험 (연)", min: 500, max: 5000, step: 100, format: fmt },
  { key: "maintenanceY1", label: "수선비 (연)", min: 2000, max: 20000, step: 500, format: fmt },
  { key: "stateIncomeTaxY1", label: "주 소득세 (연)", min: 0, max: 30000, step: 500, format: fmt },
  { key: "homeAppreciation", label: "집값 상승률", min: 0.01, max: 0.08, step: 0.005, format: pct },
  { key: "investReturn", label: "투자 수익률 (명목)", min: 0.04, max: 0.12, step: 0.005, format: pct },
  { key: "costGrowth", label: "유지비 상승률", min: 0.01, max: 0.06, step: 0.005, format: pct },
  { key: "rentGrowth", label: "렌트 상승률", min: 0.01, max: 0.06, step: 0.005, format: pct },
  { key: "sellingCostPct", label: "매도 수수료", min: 0.02, max: 0.08, step: 0.005, format: pct },
  { key: "capitalGainsTaxRate", label: "양도차익세율", min: 0.10, max: 0.30, step: 0.001, format: pct },
];

const sliderTrack = {
  WebkitAppearance: "none", appearance: "none", width: "100%", height: 4, borderRadius: 2,
  background: "#1e2430", outline: "none", cursor: "pointer",
};

const hdr = { fontSize: 10, color: "#4b5363", padding: "6px 0", borderBottom: "1px solid #1e2430" };
const cell = { fontFamily: "'JetBrains Mono', monospace", fontSize: 12, padding: "7px 0", borderBottom: "1px solid #1a1f26", color: "#9ca3b0" };

export default function App() {
  const [params, setParams] = useState(DEFAULTS);
  const [hy, setHy] = useState(7);
  const [currentRent, setCurrentRent] = useState(4000);
  const [showSliders, setShowSliders] = useState(false);
  const [showCashFlow, setShowCashFlow] = useState(false);
  const [activeRegion, setActiveRegion] = useState(null);

  const baseParams = useMemo(() => {
    if (!activeRegion) return DEFAULTS;
    const reg = REGIONS.find(r => r.name === activeRegion);
    return reg ? { ...DEFAULTS, homePrice: reg.homePrice, propertyTaxRate: reg.propertyTaxRate, homeAppreciation: reg.homeAppreciation } : DEFAULTS;
  }, [activeRegion]);

  const P = useMemo(() => deriveParams(params), [params]);

  const applyRegion = (reg) => {
    setActiveRegion(reg.name);
    setParams(prev => ({
      ...prev,
      homePrice: reg.homePrice,
      propertyTaxRate: reg.propertyTaxRate,
      homeAppreciation: reg.homeAppreciation,
    }));
  };

  const setP = (key, val) => {
    setParams(prev => ({
      ...prev,
      [key]: key === "downPct" ? Math.max(0.20, val) : val,
    }));
    setActiveRegion(null);
  };

  const be = useMemo(() => findBE(P, hy), [P, hy]);

  // 핵심: 현재 월세로 시뮬레이션
  const result = useMemo(() => simulate(P, hy, currentRent), [P, hy, currentRent]);
  const diff = result.buyerNW - result.renterNW;
  const buyWins = diff > 0;

  const mp = monthlyPmt(P.mortgage, P.mortgageRate, 360);
  const annualMtg = mp * 12;

  const details = useMemo(() => {
    const d = [];
    let bal = P.mortgage;
    for (let y = 1; y <= hy; y++) {
      const yearMortgage = amortizeYear(bal, P.mortgageRate, mp);
      bal = yearMortgage.endBalance;
      const propTax = P.homePrice * P.propertyTaxRate * Math.pow(1 + P.costGrowth, y - 1);
      const stateIncomeTax = P.stateIncomeTaxY1 * Math.pow(1 + P.costGrowth, y - 1);
      const taxBen = calcTaxBenefit({
        yearlyInterest: yearMortgage.yearInterest,
        avgBalance: yearMortgage.avgBalance,
        propertyTax: propTax,
        stateIncomeTax,
        mortgageInterestLimit: P.mortgageInterestLimit,
        marginalTaxRate: P.marginalTaxRate,
        standardDeduction: P.standardDeduction,
        saltCap: P.saltCap,
      });
      const costs = P.annualCostsY1 * Math.pow(1 + P.costGrowth, y - 1);
      const bOut = annualMtg + costs - taxBen;
      const bPrin = yearMortgage.yearPrincipal;
      const rOut = currentRent * 12 * Math.pow(1 + P.rentGrowth, y - 1);
      d.push({ year: y, bOut: Math.round(bOut), bPrin: Math.round(bPrin), rOut: Math.round(rOut), mRent: Math.round(currentRent * Math.pow(1 + P.rentGrowth, y - 1)), costs: Math.round(costs) });
    }
    return d;
  }, [P, hy, currentRent, annualMtg, mp]);

  const isDefault = JSON.stringify(params) === JSON.stringify(baseParams);

  return (
    <div style={{ background: "#0b0e13", color: "#c9d1d9", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", padding: "20px 12px" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 14px; height: 14px; border-radius: 50%;
          background: #4a9eff; cursor: pointer; border: none;
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px; height: 14px; border-radius: 50%;
          background: #4a9eff; cursor: pointer; border: none;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none; margin: 0;
        }
      `}</style>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#e6edf3" }}>Buy vs Rent 계산기</h1>
          <p style={{ color: "#4b5363", fontSize: 12, marginTop: 6 }}>{activeRegion ? `${activeRegion} 기준 · ` : ""}인플레이션 & 매도수수료 반영</p>
        </div>

        {/* REGION PRESETS */}
        <div style={{ marginBottom: 16 }}>
          <style>{`.region-scroll::-webkit-scrollbar { display: none; }`}</style>
          <div className="region-scroll" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, msOverflowStyle: "none", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
            {REGIONS.map(reg => (
              <button key={reg.name} onClick={() => applyRegion(reg)} style={{
                background: activeRegion === reg.name ? "#1d4ed8" : "#111318",
                border: activeRegion === reg.name ? "1px solid #3b82f6" : "1px solid #1e2430",
                color: activeRegion === reg.name ? "#fff" : "#8b949e",
                padding: "8px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer",
                transition: "all 0.2s ease", flexShrink: 0,
              }}>
                {reg.name}
              </button>
            ))}
          </div>
        </div>

        {/* PRIMARY INPUT: 현재 월세 + 집값 + 거주기간 */}
        <div style={{ background: "#111318", border: "1px solid #1e2430", borderRadius: 12, padding: "20px 18px", marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 90px", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#4a9eff", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>현재 월세</div>
              <div style={{ display: "flex", alignItems: "center", background: "#0b0e13", borderRadius: 8, border: "1px solid #1e2430", padding: "8px 12px" }}>
                <span style={{ color: "#6b7280", fontSize: 18, fontWeight: 600, marginRight: 4 }}>$</span>
                <input type="number" value={currentRent === 0 ? "" : currentRent} onChange={e => setCurrentRent(e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
                  style={{ background: "none", border: "none", color: "#e6edf3", fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, width: "100%", outline: "none" }} />
                <span style={{ color: "#4b5363", fontSize: 11, whiteSpace: "nowrap" }}>/mo</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#4a9eff", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>매수 가격</div>
              <div style={{ display: "flex", alignItems: "center", background: "#0b0e13", borderRadius: 8, border: "1px solid #1e2430", padding: "8px 12px" }}>
                <span style={{ color: "#6b7280", fontSize: 18, fontWeight: 600, marginRight: 4 }}>$</span>
                <input type="number" value={params.homePrice === 0 ? "" : params.homePrice} onChange={e => setP("homePrice", e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
                  style={{ background: "none", border: "none", color: "#e6edf3", fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, width: "100%", outline: "none" }} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#4a9eff", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>거주 기간</div>
              <div style={{ display: "flex", alignItems: "center", background: "#0b0e13", borderRadius: 8, border: "1px solid #1e2430", padding: "8px 12px" }}>
                <input type="number" value={hy === 0 ? "" : hy} onChange={e => setHy(e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
                  style={{ background: "none", border: "none", color: "#e6edf3", fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, width: "100%", outline: "none", textAlign: "center" }} />
                <span style={{ color: "#4b5363", fontSize: 12, fontWeight: 600, marginLeft: 4, whiteSpace: "nowrap" }}>년</span>
              </div>
            </div>
          </div>
        </div>

        {/* HERO VERDICT */}
        <div style={{
          background: buyWins
            ? "linear-gradient(135deg, #0f2418, #0d1a14)"
            : "linear-gradient(135deg, #1a1410, #14100d)",
          borderRadius: 14,
          border: `1px solid ${buyWins ? "#166534" : "#92400e"}`,
          padding: "24px 20px", marginBottom: 20, textAlign: "center",
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: buyWins ? "#4ade80" : "#fbbf24", letterSpacing: 0.5, marginBottom: 16 }}>
            {hy}년 거주 시 · 순자산 기준 손익분기
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10, marginTop: 4 }}>
            <div style={{ background: "#0b0e13", borderRadius: 10, padding: "16px 10px", border: !buyWins ? "1px solid #fbbf24" : "1px solid #1e2430" }}>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>현재 월세</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700, color: !buyWins ? "#fbbf24" : "#9ca3b0" }}>
                {fmt(currentRent)}<span style={{ fontSize: 14, fontWeight: 500 }}>/mo</span>
              </div>
            </div>
            <div style={{ fontSize: 14, color: "#4b5363", fontWeight: 700 }}>VS</div>
            <div style={{ background: "#0b0e13", borderRadius: 10, padding: "16px 10px", border: buyWins ? "1px solid #4ade80" : "1px solid #1e2430" }}>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>손익분기 시작 월세*</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700, color: buyWins ? "#4ade80" : "#9ca3b0" }}>
                {fmt(Math.round(be))}<span style={{ fontSize: 14, fontWeight: 500 }}>/mo</span>
              </div>
            </div>
          </div>

          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700,
            color: buyWins ? "#4ade80" : "#fbbf24", marginTop: 24,
          }}>
            {buyWins 
              ? `현재 월세가 손익분기보다 ${fmt(Math.round(currentRent - be))} 높아 매수가 유리합니다`
              : `현재 월세가 손익분기보다 ${fmt(Math.round(be - currentRent))} 낮아 렌트가 유리합니다`}
          </div>
          
          <div style={{ marginTop: 20, fontSize: 11, color: "#6b7280", lineHeight: 1.6, textAlign: "left", padding: "0 8px" }}>
            * <b style={{ color: "#8b949e" }}>손익분기 시작 월세:</b> 1년차 시작 월세를 뜻하며, 해당 월세에서 렌트가 매년 상승할 때 {hy}년 후 <b>최종 순자산</b>이 매수와 같아지는 지점입니다. 즉 현재의 실지출 월비용이 아니라 순자산 기준 손익분기선입니다.
          </div>
          
          <div style={{ background: "#0b0e13", borderRadius: 8, padding: "12px", marginTop: 16, fontSize: 11, color: "#8b949e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{hy}년 후 순자산</span>
            <span>
              매수(after-tax) <b style={{ color: "#c9d1d9" }}>{fmt(Math.round(result.buyerNW))}</b> vs 
              렌트 <b style={{ color: "#c9d1d9" }}>{fmt(Math.round(result.renterNW))}</b>
            </span>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "#4b5363", textAlign: "left", padding: "0 8px" }}>
            매도 수수료와 초과 양도차익세 {fmt(Math.round(result.capitalGainsTax))} 반영
          </div>
        </div>

        {/* ALL YEARS CHART */}
        {(() => {
          const chartYrs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 18, 20];
          const chartData = chartYrs.map(y => ({ y, r: findBE(P, y), rni: findBEnoInfl(P, y) }));
          const allVals = chartData.flatMap(d => [d.r, d.rni]);
          const minV = Math.floor(Math.min(...allVals) / 500) * 500;
          const maxV = Math.ceil(Math.max(...allVals) / 500) * 500;
          const range = maxV - minV || 1;

          const W = 600, H = 260, pad = { t: 20, r: 20, b: 36, l: 56 };
          const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;
          const xOf = (yr) => pad.l + ((yr - 1) / 19) * cw;
          const yOf = (v) => pad.t + (1 - (v - minV) / range) * ch;

          const makePath = (key) => chartData.map((d, i) =>
            `${i === 0 ? "M" : "L"}${xOf(d.y).toFixed(1)},${yOf(d[key]).toFixed(1)}`
          ).join(" ");

          const gridLines = [];
          const step = range <= 3000 ? 500 : 1000;
          for (let v = minV; v <= maxV; v += step) gridLines.push(v);

          const selData = chartData.find(d => d.y === hy);

          return (
            <div style={{ background: "#111318", border: "1px solid #1e2430", borderRadius: 10, padding: "16px 18px", marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#4a9eff", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 }}>
                보유 기간별 손익분기 시작 월세
              </div>
              <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
                {/* grid */}
                {gridLines.map(v => (
                  <g key={v}>
                    <line x1={pad.l} x2={W - pad.r} y1={yOf(v)} y2={yOf(v)} stroke="#1e2430" strokeWidth="1" />
                    <text x={pad.l - 6} y={yOf(v) + 4} textAnchor="end" fill="#4b5363" fontSize="10" fontFamily="'JetBrains Mono', monospace">
                      {fmt(v)}
                    </text>
                  </g>
                ))}
                {/* x labels */}
                {[1, 3, 5, 7, 10, 15, 20].map(yr => (
                  <text key={yr} x={xOf(yr)} y={H - 6} textAnchor="middle" fill="#4b5363" fontSize="10" fontFamily="'JetBrains Mono', monospace">
                    {yr}년
                  </text>
                ))}
                {/* lines */}
                <path d={makePath("rni")} fill="none" stroke="#555d6b" strokeWidth="1.5" strokeDasharray="6,4" />
                <path d={makePath("r")} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {/* area fill */}
                <path d={`${makePath("r")} L${xOf(chartData[chartData.length-1].y)},${yOf(minV)} L${xOf(1)},${yOf(minV)} Z`} fill="url(#areaGrad)" />
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* data points */}
                {chartData.map(d => {
                  const sel = d.y === hy;
                  return (
                    <g key={d.y} onClick={() => setHy(d.y)} style={{ cursor: "pointer" }}>
                      <circle cx={xOf(d.y)} cy={yOf(d.rni)} r={sel ? 4 : 2.5} fill={sel ? "#555d6b" : "#333"} stroke="#555d6b" strokeWidth="1" />
                      <circle cx={xOf(d.y)} cy={yOf(d.r)} r={sel ? 5 : 3} fill={sel ? "#3b82f6" : "#1d4ed8"} stroke={sel ? "#fff" : "none"} strokeWidth="1.5" />
                      {/* invisible larger hit area */}
                      <circle cx={xOf(d.y)} cy={yOf(d.r)} r="12" fill="transparent" />
                    </g>
                  );
                })}
                {/* selected indicator */}
                {selData && (
                  <g>
                    <line x1={xOf(hy)} x2={xOf(hy)} y1={pad.t} y2={H - pad.b} stroke="#3b82f6" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
                    <rect x={xOf(hy) - 44} y={yOf(selData.r) - 28} width="88" height="22" rx="4" fill="#0f1a2e" stroke="#1d4ed8" strokeWidth="1" />
                    <text x={xOf(hy)} y={yOf(selData.r) - 13} textAnchor="middle" fill="#4ade80" fontSize="11" fontWeight="700" fontFamily="'JetBrains Mono', monospace">
                      {fmt(Math.round(selData.r))}
                    </text>
                  </g>
                )}
              </svg>
              {/* legend */}
              <div style={{ display: "flex", gap: 20, marginTop: 8, fontSize: 11, color: "#6b7280" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 16, height: 3, background: "#3b82f6", borderRadius: 2, display: "inline-block" }} />
                  인플레 반영
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 16, height: 0, borderTop: "2px dashed #555d6b", display: "inline-block" }} />
                  인플레 미반영
                </span>
                <span style={{ marginLeft: "auto", color: "#4b5363" }}>점 클릭 → 보유 기간 선택</span>
              </div>
              <div style={{ fontSize: 11, color: "#4b5363", marginTop: 6 }}>선이 낮을수록 더 낮은 시작 월세에서도 매수와 렌트의 최종 순자산이 같아집니다.</div>
            </div>
          );
        })()}

        {/* CASH FLOW YEAR BY YEAR */}
        <div style={{ background: "#111318", border: "1px solid #1e2430", borderRadius: 10, padding: "16px 18px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showCashFlow ? 14 : 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#4a9eff", textTransform: "uppercase", letterSpacing: 1.2 }}>
              연도별 현금 흐름 (1년차 월세 {fmt(currentRent)} 기준)
            </div>
            <button onClick={() => setShowCashFlow(!showCashFlow)} style={{
              background: showCashFlow ? "#1d4ed8" : "#151920", border: "none", borderRadius: 5,
              padding: "4px 10px", color: showCashFlow ? "#fff" : "#6b7280", fontSize: 11,
              cursor: "pointer", fontWeight: 500,
            }}>{showCashFlow ? "접기" : "자세히 보기"}</button>
          </div>

          {showCashFlow && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "30px 1.1fr 0.9fr 1.1fr 74px", gap: 0 }}>
                <div style={hdr}>년</div>
                <div style={{ ...hdr, textAlign: "right" }}>매수 연지출</div>
                <div style={{ ...hdr, textAlign: "right", color: "#6b7280" }}>(원금 상환)</div>
                <div style={{ ...hdr, textAlign: "right" }}>렌트 연지출</div>
                <div style={{ ...hdr, textAlign: "right" }}>월 렌트</div>
                {details.filter((_, i) => hy <= 10 || i % 2 === 0 || i === details.length - 1).map(d => (
                  <div key={d.year} style={{ display: "contents" }}>
                    <div style={cell}>{d.year}</div>
                    <div style={{ ...cell, textAlign: "right", color: "#f87171" }}>{fmt(d.bOut)}</div>
                    <div style={{ ...cell, textAlign: "right", color: "#6b7280" }}>{fmt(d.bPrin)}</div>
                    <div style={{ ...cell, textAlign: "right", color: "#4ade80" }}>{fmt(d.rOut)}</div>
                    <div style={{ ...cell, textAlign: "right", color: "#8b949e" }}>{fmt(d.mRent)}/mo</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "#4b5363", marginTop: 10, lineHeight: 1.6 }}>
                모기지 P+I ({fmt(Math.round(annualMtg))}/yr)는 고정이지만 유지비는 매년 ↑<br />
                렌트도 매년 {pct(P.rentGrowth)} ↑ → 장기 거주 시 매수 지출과 렌트 지출의 격차가 줄어듭니다.<br />
                <span style={{ color: "#9ca3b0", display: "inline-block", marginTop: 4 }}>
                  💡 <strong>왜 매년 돈이 더 많이 나가는데 매수가 유리하다고 나오나요?</strong><br />
                  매수 연지출에는 은행에 내는 <strong>모기지 원금(순자산으로 100% 쌓임)</strong>이 포함되어 있습니다. 또한, 내 집 마련 시 매년 발생하는 <strong>부동산 가치 상승분(레버리지 효과)</strong>이 당장의 높은 월 지출액을 압도적으로 상쇄하기 때문입니다.
                </span>
              </div>
            </>
          )}
        </div>


        {/* ASSUMPTIONS (collapsible) */}
        <div style={{ background: "#111318", border: "1px solid #1e2430", borderRadius: 10, padding: "16px 18px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showSliders ? 14 : 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#4a9eff", textTransform: "uppercase", letterSpacing: 1.2 }}>전제 조건</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {!isDefault && (
                <button onClick={() => setParams(baseParams)} style={{
                  background: "none", border: "1px solid #333", borderRadius: 5, padding: "3px 8px",
                  color: "#6b7280", fontSize: 11, cursor: "pointer",
                }}>초기화</button>
              )}
              <button onClick={() => setShowSliders(!showSliders)} style={{
                background: showSliders ? "#1d4ed8" : "#151920", border: "none", borderRadius: 5,
                padding: "4px 10px", color: showSliders ? "#fff" : "#6b7280", fontSize: 11,
                cursor: "pointer", fontWeight: 500,
              }}>{showSliders ? "접기" : "조절하기"}</button>
            </div>
          </div>
          {showSliders && (
            <div style={{ display: "grid", gap: 14 }}>
              {sliderDefs.map(({ key, label, min, max, step, format }) => (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>{label}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: params[key] !== baseParams[key] ? "#4a9eff" : "#9ca3b0", fontWeight: 600 }}>
                      {format(params[key])}
                    </span>
                  </div>
                  <input type="range" min={min} max={max} step={step} value={params[key]}
                    onChange={e => setP(key, parseFloat(e.target.value))} style={sliderTrack} />
                </div>
              ))}
              <div style={{ fontSize: 11, color: "#4b5363", paddingTop: 4, borderTop: "1px solid #1e2430" }}>
                다운페이먼트: {fmt(P.downPayment)} · 클로징: {fmt(P.closingCost)} · 모기지: {fmt(P.mortgage)} · 초기 투입: {fmt(P.downPayment + P.closingCost)}
              </div>
            </div>
          )}
          {!showSliders && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 24px", fontSize: 12, color: "#6b7280", lineHeight: 1.9, marginTop: 8 }}>
              <span>모기지: <b style={{ color: "#c9d1d9" }}>{fmt(P.mortgage)} @ {pct(P.mortgageRate)}</b></span>
              <span>초기 투입: <b style={{ color: "#c9d1d9" }}>{fmt(P.downPayment + P.closingCost)}</b></span>
              <span>유지비: <b style={{ color: "#c9d1d9" }}>{fmt(P.annualCostsY1)}/yr</b></span>
              <span>주 소득세: <b style={{ color: "#c9d1d9" }}>{fmt(P.stateIncomeTaxY1)}/yr</b></span>
              <span>투자 수익: <b style={{ color: "#c9d1d9" }}>{pct(P.investReturn)}/yr</b></span>
              <span>양도차익세율: <b style={{ color: "#c9d1d9" }}>{pct(P.capitalGainsTaxRate)}</b></span>
              <span>집값 상승: <b style={{ color: "#c9d1d9" }}>{pct(P.homeAppreciation)}/yr</b></span>
              <span>매도 수수료: <b style={{ color: "#c9d1d9" }}>{pct(P.sellingCostPct)}</b></span>
            </div>
          )}
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #1e2430" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#555d6b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>고정 가정</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px 24px", fontSize: 11, color: "#4b5363", lineHeight: 1.8 }}>
              <span>모기지: <b style={{ color: "#6b7280" }}>30년 고정</b></span>
              <span>MFJ $300K · {pct(P.marginalTaxRate)}</span>
              <span>표준공제: <b style={{ color: "#6b7280" }}>{fmt(P.standardDeduction)}</b></span>
              <span>SALT cap: <b style={{ color: "#6b7280" }}>{fmt(P.saltCap)}</b></span>
              <span>이자공제 한도: <b style={{ color: "#6b7280" }}>{fmt(P.mortgageInterestLimit)}</b></span>
              <span>양도차익 비과세: <b style={{ color: "#6b7280" }}>{fmt(P.homeSaleGainExclusion)}</b></span>
            </div>
          </div>
        </div>

        {/* METHOD */}
        <div style={{ background: "#111318", border: "1px solid #1e2430", borderRadius: 10, padding: "16px 18px", fontSize: 12, color: "#4b5363", lineHeight: 1.8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#4a9eff", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>계산 방법</div>
          <p style={{ margin: "0 0 6px 0" }}>매년 시뮬레이션: 매수자 지출(모기지 고정 + 유지비↑{pct(P.costGrowth)} − 세제혜택)과 렌트 지출(1년차 시작 월세에서 매년 {pct(P.rentGrowth)}↑)의 차이를 {pct(P.investReturn)}로 투자 누적.</p>
          <p style={{ margin: "0 0 6px 0" }}><b style={{ color: "#9ca3b0" }}>세제혜택</b> = 모기지 이자(원금 {fmt(P.mortgageInterestLimit)} 한도 반영) + 재산세·주 소득세(SALT 최대 {fmt(P.saltCap)})가 표준공제 {fmt(P.standardDeduction)}를 초과하는 부분에 대한 연방 절세</p>
          <p style={{ margin: "0 0 6px 0" }}><b style={{ color: "#9ca3b0" }}>매수 순자산</b> = 집값×(1+{pct(P.homeAppreciation)})ᴺ에서 매도 수수료와 초과 양도차익세(비과세 {fmt(P.homeSaleGainExclusion)} 초과분 × {pct(P.capitalGainsTaxRate)})를 뺀 후 잔여모기지 차감</p>
          <p style={{ margin: "0 0 6px 0" }}><b style={{ color: "#9ca3b0" }}>렌트 순자산</b> = {fmt(P.downPayment + P.closingCost)}×(1+{pct(P.investReturn)})ᴺ + 매년 절약분 투자 누적</p>
          <p style={{ margin: 0 }}>양쪽 순자산이 같아지는 1년차 시작 월세가 손익분기점입니다.</p>
        </div>
      </div>
    </div>
  );
}
