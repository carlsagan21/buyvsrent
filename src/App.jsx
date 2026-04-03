import { useState, useMemo } from "react";

const DEFAULTS = {
  homePrice: 900000,       // 2026 Ridgewood NJ median ~$900K–$1.5M
  downPct: 0.20,
  closingPct: 0.03,
  mortgageRate: 0.065,     // 2026.04 30yr fixed: 6.23%–6.51%
  propertyTaxRate: 0.0289, // Ridgewood NJ 2025 재산세율
  insuranceY1: 1800,       // NJ 평균 주택 보험
  maintenanceY1: 9000,     // 수선비 (~1% of home value)
  taxBenefitY1: 6400,      // MFJ $300K: (항목공제 $56.8K − 표준공제 $30K) × 24%
  homeAppreciation: 0.05,  // Ridgewood NJ 10년 평균 ~5.0% (Zillow ZHVI)
  investReturn: 0.07,      // S&P 500 인플레 반영 실질수익률
  costGrowth: 0.035,
  rentGrowth: 0.03,
  sellingCostPct: 0.05,    // NAR 합의 이후 4%–6%, 5% 적용
};

function derive(p) {
  const downPayment = p.homePrice * p.downPct;
  const closingCost = p.homePrice * p.closingPct;
  const mortgage = p.homePrice - downPayment;
  const annualCostsY1 = p.homePrice * p.propertyTaxRate + p.insuranceY1 + p.maintenanceY1;
  return { ...p, downPayment, closingCost, mortgage, annualCostsY1 };
}

function fmt(n) { return "$" + Math.round(n).toLocaleString("en-US"); }
function pct(n) { return (n * 100).toFixed(1) + "%"; }

function monthlyPmt(principal, rate, months) {
  const r = rate / 12;
  return principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

function simulate(P, holdYears, startRent) {
  const mp = monthlyPmt(P.mortgage, P.mortgageRate, 360);
  const annualMtg = mp * 12;
  let balance = P.mortgage;
  let renterInv = P.downPayment + P.closingCost;

  for (let y = 1; y <= holdYears; y++) {
    const costs = P.annualCostsY1 * Math.pow(1 + P.costGrowth, y - 1);
    const buyerOut = annualMtg + costs - P.taxBenefitY1;
    const renterOut = startRent * 12 * Math.pow(1 + P.rentGrowth, y - 1);
    renterInv = renterInv * (1 + P.investReturn) + (buyerOut - renterOut);
    for (let m = 0; m < 12; m++) {
      const mi = balance * (P.mortgageRate / 12);
      balance -= (mp - mi);
    }
  }

  const hv = P.homePrice * Math.pow(1 + P.homeAppreciation, holdYears);
  const buyerNW = hv * (1 - P.sellingCostPct) - Math.max(0, balance);
  return { buyerNW, renterNW: renterInv, homeVal: hv, balance: Math.max(0, balance) };
}

function findBE(P, holdYears) {
  let lo = 0, hi = 15000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const { buyerNW, renterNW } = simulate(P, holdYears, mid);
    if (renterNW > buyerNW) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function findBEnoInfl(P, holdYears) {
  const mp = monthlyPmt(P.mortgage, P.mortgageRate, 360);
  const annualMtg = mp * 12;
  const buyerOut = annualMtg + P.annualCostsY1 - P.taxBenefitY1;

  let lo = 0, hi = 15000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    let balance = P.mortgage;
    let renterInv = P.downPayment + P.closingCost;
    for (let y = 1; y <= holdYears; y++) {
      renterInv = renterInv * (1 + P.investReturn) + (buyerOut - mid * 12);
      for (let m = 0; m < 12; m++) {
        const mi = balance * (P.mortgageRate / 12);
        balance -= (mp - mi);
      }
    }
    const hv = P.homePrice * Math.pow(1 + P.homeAppreciation, holdYears);
    const bNW = hv * (1 - P.sellingCostPct) - Math.max(0, balance);
    if (renterInv > bNW) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

const sliderDefs = [
  { key: "homePrice", label: "집값", min: 500000, max: 2000000, step: 10000, format: fmt },
  { key: "downPct", label: "다운페이먼트", min: 0.05, max: 0.40, step: 0.01, format: pct },
  { key: "mortgageRate", label: "모기지 금리", min: 0.03, max: 0.09, step: 0.001, format: pct },
  { key: "propertyTaxRate", label: "재산세율", min: 0.01, max: 0.04, step: 0.001, format: pct },
  { key: "insuranceY1", label: "주택 보험 (연)", min: 500, max: 5000, step: 100, format: fmt },
  { key: "maintenanceY1", label: "수선비 (연)", min: 2000, max: 20000, step: 500, format: fmt },
  { key: "taxBenefitY1", label: "세제 혜택", min: 0, max: 20000, step: 500, format: fmt },
  { key: "homeAppreciation", label: "집값 상승률", min: 0.01, max: 0.08, step: 0.005, format: pct },
  { key: "investReturn", label: "투자 수익률", min: 0.04, max: 0.12, step: 0.005, format: pct },
  { key: "costGrowth", label: "유지비 상승률", min: 0.01, max: 0.06, step: 0.005, format: pct },
  { key: "rentGrowth", label: "렌트 상승률", min: 0.01, max: 0.06, step: 0.005, format: pct },
  { key: "sellingCostPct", label: "매도 수수료", min: 0.02, max: 0.08, step: 0.005, format: pct },
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
  const [showSliders, setShowSliders] = useState(false);
  const yrs = [3, 5, 7, 10, 15, 20];

  const P = useMemo(() => derive(params), [params]);

  const setP = (key, val) => setParams(prev => ({ ...prev, [key]: val }));

  const allBE = useMemo(() => yrs.map(y => ({ y, r: findBE(P, y), rni: findBEnoInfl(P, y) })), [P]);
  const be = useMemo(() => findBE(P, hy), [P, hy]);
  const beNI = useMemo(() => findBEnoInfl(P, hy), [P, hy]);

  const mp = monthlyPmt(P.mortgage, P.mortgageRate, 360);
  const annualMtg = mp * 12;

  const details = useMemo(() => {
    const d = [];
    let bal = P.mortgage;
    for (let y = 1; y <= hy; y++) {
      const costs = P.annualCostsY1 * Math.pow(1 + P.costGrowth, y - 1);
      const bOut = annualMtg + costs - P.taxBenefitY1;
      const rOut = be * 12 * Math.pow(1 + P.rentGrowth, y - 1);
      for (let m = 0; m < 12; m++) { const mi = bal * (P.mortgageRate / 12); bal -= (mp - mi); }
      d.push({ year: y, bOut: Math.round(bOut), rOut: Math.round(rOut), mRent: Math.round(be * Math.pow(1 + P.rentGrowth, y - 1)), costs: Math.round(costs) });
    }
    return d;
  }, [P, hy, be, annualMtg, mp]);

  const samples = [2500, 3000, 3500, 4000, 4500, 5000, 5500];
  const comp = useMemo(() => samples.map(r => {
    const { buyerNW, renterNW } = simulate(P, hy, r);
    return { rent: r, bNW: buyerNW, rNW: renterNW };
  }), [P, hy]);

  const isDefault = JSON.stringify(params) === JSON.stringify(DEFAULTS);

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
      `}</style>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#e6edf3" }}>Buy vs Rent 손익분기 계산기</h1>
          <p style={{ color: "#4b5363", fontSize: 12, marginTop: 6 }}>Ridgewood, NJ · {fmt(P.homePrice)} · 인플레이션 & 매도수수료 반영</p>
        </div>

        {/* ASSUMPTIONS + SLIDERS */}
        <div style={{ background: "#111318", border: "1px solid #1e2430", borderRadius: 10, padding: "16px 18px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showSliders ? 14 : 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#4a9eff", textTransform: "uppercase", letterSpacing: 1.2 }}>전제 조건</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {!isDefault && (
                <button onClick={() => setParams(DEFAULTS)} style={{
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

          {showSliders ? (
            <div style={{ display: "grid", gap: 14 }}>
              {sliderDefs.map(({ key, label, min, max, step, format }) => (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>{label}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: params[key] !== DEFAULTS[key] ? "#4a9eff" : "#9ca3b0", fontWeight: 600 }}>
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
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 24px", fontSize: 12, color: "#6b7280", lineHeight: 1.9 }}>
              <span>집값: <b style={{ color: "#c9d1d9" }}>{fmt(P.homePrice)}</b></span>
              <span>모기지: <b style={{ color: "#c9d1d9" }}>{fmt(P.mortgage)} @ {pct(P.mortgageRate)}</b></span>
              <span>초기 투입: <b style={{ color: "#c9d1d9" }}>{fmt(P.downPayment + P.closingCost)}</b></span>
              <span>재산세: <b style={{ color: "#c9d1d9" }}>{fmt(P.homePrice * P.propertyTaxRate)}/yr ({pct(P.propertyTaxRate)})</b></span>
              <span>보험+수선: <b style={{ color: "#c9d1d9" }}>{fmt(P.insuranceY1 + P.maintenanceY1)}/yr</b></span>
              <span>유지비 합계: <b style={{ color: "#c9d1d9" }}>{fmt(P.annualCostsY1)}/yr</b></span>
              <span>세제 혜택: <b style={{ color: "#c9d1d9" }}>{fmt(P.taxBenefitY1)}/yr</b></span>
              <span>집값 상승: <b style={{ color: "#c9d1d9" }}>{pct(P.homeAppreciation)}/yr</b></span>
              <span>투자 수익: <b style={{ color: "#c9d1d9" }}>{pct(P.investReturn)}/yr</b></span>
              <span>유지비 상승: <b style={{ color: "#e9a23b" }}>{pct(P.costGrowth)}/yr</b></span>
              <span>렌트 상승: <b style={{ color: "#e9a23b" }}>{pct(P.rentGrowth)}/yr</b></span>
              <span>매도 수수료: <b style={{ color: "#c9d1d9" }}>{pct(P.sellingCostPct)}</b></span>
              <span>원금 상환: <b style={{ color: "#4ade80" }}>비용 아님</b></span>
            </div>
          )}

          {/* FIXED ASSUMPTIONS */}
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #1e2430" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#555d6b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>고정 가정</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px 24px", fontSize: 11, color: "#4b5363", lineHeight: 1.9 }}>
              <span>모기지 기간: <b style={{ color: "#6b7280" }}>30년 고정</b></span>
              <span>세금 신고: <b style={{ color: "#6b7280" }}>MFJ (부부 합산)</b></span>
              <span>연소득: <b style={{ color: "#6b7280" }}>$300,000</b></span>
              <span>한계 세율: <b style={{ color: "#6b7280" }}>24% (연방)</b></span>
              <span>표준 공제: <b style={{ color: "#6b7280" }}>$30,000</b></span>
              <span>SALT cap: <b style={{ color: "#6b7280" }}>$10,000</b></span>
              <span>재산세: <b style={{ color: "#6b7280" }}>집값 × 세율 (자동 연동)</b></span>
              <span>NJ 주세: <b style={{ color: "#6b7280" }}>모기지이자 공제 불가</b></span>
            </div>
          </div>
        </div>

        {/* HOLDING PERIOD */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8, fontWeight: 500 }}>보유 기간 선택</div>
          <div style={{ display: "flex", gap: 6 }}>
            {yrs.map(y => (
              <button key={y} onClick={() => setHy(y)} style={{
                flex: 1, padding: "10px 0", borderRadius: 8, border: "none", cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600,
                background: hy === y ? "#1d4ed8" : "#151920", color: hy === y ? "#fff" : "#6b7280",
              }}>{y}년</button>
            ))}
          </div>
        </div>

        {/* HERO RESULT */}
        <div style={{ background: "linear-gradient(135deg, #0f1a2e, #0d1424)", borderRadius: 14, border: "1px solid #1d4ed8", padding: "24px 20px", marginBottom: 20, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#4a9eff", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>
            {hy}년 보유 시 · 손익분기 1년차 월 렌트
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 52, fontWeight: 700, color: "#4ade80", lineHeight: 1, margin: "8px 0" }}>
            {fmt(Math.round(be))}
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
            이후 연 {pct(P.rentGrowth)}↑ → {hy}년차: {fmt(Math.round(be * Math.pow(1 + P.rentGrowth, hy - 1)))}/mo
          </div>
          <div style={{ fontSize: 13, color: "#8b949e", marginTop: 12, lineHeight: 1.7 }}>
            1년차에 이보다 <span style={{ color: "#4ade80", fontWeight: 600 }}>싸게</span> 렌트 가능 → 렌트 유리
            &nbsp;·&nbsp;
            이보다 <span style={{ color: "#f87171", fontWeight: 600 }}>비싸면</span> → 매수 유리
          </div>
          <div style={{ marginTop: 16, padding: "10px 14px", background: "#0b0e13", borderRadius: 8, fontSize: 12, lineHeight: 1.6 }}>
            <span style={{ color: "#e9a23b" }}>📌 인플레이션 효과:</span>{" "}
            <span style={{ color: "#6b7280" }}>
              미반영 {fmt(Math.round(beNI))} → 반영 {fmt(Math.round(be))} (차이 {fmt(Math.round(beNI - be))})
            </span>
            <br />
            <span style={{ color: "#4b5363" }}>
              모기지 고정 상환이 인플레이션 헤지 역할 → 매수가 월 {fmt(Math.round(beNI - be))} 만큼 더 유리해짐
            </span>
          </div>
        </div>

        {/* ALL YEARS TABLE */}
        <div style={{ background: "#111318", border: "1px solid #1e2430", borderRadius: 10, padding: "16px 18px", marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#4a9eff", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 }}>
            보유 기간별 손익분기 렌트 비교
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 80px 80px", gap: 0 }}>
            <div style={hdr}>기간</div><div style={hdr}></div>
            <div style={{ ...hdr, textAlign: "right" }}>인플레 ✕</div>
            <div style={{ ...hdr, textAlign: "right" }}>인플레 ✓</div>
            {allBE.map(({ y, r, rni }) => {
              const maxR = Math.max(...allBE.map(a => a.r));
              const sel = y === hy;
              return (
                <div key={y} style={{ display: "contents", cursor: "pointer" }} onClick={() => setHy(y)}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, padding: "8px 0", borderBottom: "1px solid #1a1f26", fontWeight: sel ? 700 : 400, color: sel ? "#4a9eff" : "#6b7280" }}>{y}년</div>
                  <div style={{ padding: "8px 6px", borderBottom: "1px solid #1a1f26", display: "flex", alignItems: "center" }}>
                    <div style={{ height: 14, borderRadius: 3, width: `${(r / maxR) * 100}%`, background: sel ? "linear-gradient(90deg, #1d4ed8, #3b82f6)" : "#1e2430", transition: "width 0.3s" }} />
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, padding: "8px 0", borderBottom: "1px solid #1a1f26", textAlign: "right", color: "#555d6b" }}>{fmt(Math.round(rni))}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, padding: "8px 0", borderBottom: "1px solid #1a1f26", textAlign: "right", fontWeight: 600, color: sel ? "#4ade80" : "#8b949e" }}>{fmt(Math.round(r))}</div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: "#4b5363", marginTop: 10 }}>인플레이션 반영 시 손익분기 렌트 ↓ = 매수에 유리</div>
        </div>

        {/* CASH FLOW YEAR BY YEAR */}
        <div style={{ background: "#111318", border: "1px solid #1e2430", borderRadius: 10, padding: "16px 18px", marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#4a9eff", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 }}>
            연도별 현금 흐름 (손익분기 렌트 기준)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 1fr 80px", gap: 0 }}>
            <div style={hdr}>년</div>
            <div style={{ ...hdr, textAlign: "right" }}>매수 연지출</div>
            <div style={{ ...hdr, textAlign: "right" }}>렌트 연지출</div>
            <div style={{ ...hdr, textAlign: "right" }}>월 렌트</div>
            {details.filter((_, i) => hy <= 10 || i % 2 === 0 || i === details.length - 1).map(d => (
              <div key={d.year} style={{ display: "contents" }}>
                <div style={cell}>{d.year}</div>
                <div style={{ ...cell, textAlign: "right", color: "#f87171" }}>{fmt(d.bOut)}</div>
                <div style={{ ...cell, textAlign: "right", color: "#4ade80" }}>{fmt(d.rOut)}</div>
                <div style={{ ...cell, textAlign: "right", color: "#8b949e" }}>{fmt(d.mRent)}/mo</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#4b5363", marginTop: 10, lineHeight: 1.6 }}>
            모기지 P+I ({fmt(Math.round(annualMtg))}/yr)는 고정이지만 유지비는 매년 ↑<br />
            렌트도 매년 {pct(P.rentGrowth)} ↑ → 후반부에 매수 지출과 렌트 지출이 역전
          </div>
        </div>

        {/* SAMPLE RENT COMPARISON */}
        <div style={{ background: "#111318", border: "1px solid #1e2430", borderRadius: 10, padding: "16px 18px", marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#4a9eff", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 }}>
            1년차 월렌트별 · {hy}년 후 순자산 비교
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "70px 1fr 1fr 80px", gap: 0 }}>
            <div style={hdr}>월 렌트</div>
            <div style={{ ...hdr, textAlign: "right" }}>렌트 순자산</div>
            <div style={{ ...hdr, textAlign: "right" }}>매수 순자산</div>
            <div style={{ ...hdr, textAlign: "right" }}>판정</div>
            {comp.map(({ rent, bNW, rNW }) => {
              const rw = rNW > bNW;
              return (
                <div key={rent} style={{ display: "contents" }}>
                  <div style={{ ...cell, fontWeight: 600 }}>{fmt(rent)}</div>
                  <div style={{ ...cell, textAlign: "right", color: rw ? "#4ade80" : "#6b7280" }}>{fmt(rNW)}</div>
                  <div style={{ ...cell, textAlign: "right", color: !rw ? "#4ade80" : "#6b7280" }}>{fmt(bNW)}</div>
                  <div style={{ ...cell, textAlign: "right", fontWeight: 600, color: rw ? "#4ade80" : "#f87171" }}>{rw ? "렌트 ✓" : "매수 ✓"}</div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: "#4b5363", marginTop: 10 }}>렌트는 매년 {pct(P.rentGrowth)}↑ 가정 · 매수 순자산 = 집 매도(−{pct(P.sellingCostPct)}) 후 equity</div>
        </div>

        {/* METHOD */}
        <div style={{ background: "#111318", border: "1px solid #1e2430", borderRadius: 10, padding: "16px 18px", fontSize: 12, color: "#4b5363", lineHeight: 1.8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#4a9eff", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>계산 방법</div>
          <p style={{ margin: "0 0 6px 0" }}>매년 시뮬레이션: 매수자 지출(모기지 고정 + 유지비↑{pct(P.costGrowth)} − 세제혜택)과 렌트 지출(렌트↑{pct(P.rentGrowth)})의 차이를 {pct(P.investReturn)}로 투자 누적.</p>
          <p style={{ margin: "0 0 6px 0" }}><b style={{ color: "#9ca3b0" }}>매수 순자산</b> = 집값×(1+{pct(P.homeAppreciation)})ᴺ×{(1 - P.sellingCostPct).toFixed(2)} − 잔여모기지</p>
          <p style={{ margin: "0 0 6px 0" }}><b style={{ color: "#9ca3b0" }}>렌트 순자산</b> = {fmt(P.downPayment + P.closingCost)}×(1+{pct(P.investReturn)})ᴺ + 매년 절약분 투자 누적</p>
          <p style={{ margin: 0 }}>양쪽 순자산이 같아지는 1년차 렌트가 손익분기점입니다.</p>
        </div>
      </div>
    </div>
  );
}
