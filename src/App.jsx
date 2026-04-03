import { useState, useMemo } from "react";

const P = {
  homePrice: 800000,
  downPayment: 160000,
  closingCost: 24000,
  mortgage: 640000,
  mortgageRate: 0.065,
  annualCostsY1: 20000,
  taxBenefitY1: 6000,
  homeAppreciation: 0.04,
  investReturn: 0.07,
  costGrowth: 0.035,
  rentGrowth: 0.03,
  sellingCostPct: 0.06,
};

function fmt(n) { return "$" + Math.round(n).toLocaleString("en-US"); }

function monthlyPmt(principal, rate, months) {
  const r = rate / 12;
  return principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

function simulate(holdYears, startRent) {
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

function findBE(holdYears) {
  let lo = 0, hi = 15000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const { buyerNW, renterNW } = simulate(holdYears, mid);
    if (renterNW > buyerNW) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function findBEnoInfl(holdYears) {
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

const hdr = { fontSize: 10, color: "#4b5363", padding: "6px 0", borderBottom: "1px solid #1e2430" };
const cell = { fontFamily: "'JetBrains Mono', monospace", fontSize: 12, padding: "7px 0", borderBottom: "1px solid #1a1f26", color: "#9ca3b0" };

export default function App() {
  const [hy, setHy] = useState(7);
  const yrs = [3, 5, 7, 10, 15, 20];

  const allBE = useMemo(() => yrs.map(y => ({ y, r: findBE(y), rni: findBEnoInfl(y) })), []);
  const be = useMemo(() => findBE(hy), [hy]);
  const beNI = useMemo(() => findBEnoInfl(hy), [hy]);

  const mp = monthlyPmt(P.mortgage, P.mortgageRate, 360);
  const annualMtg = mp * 12;

  const details = useMemo(() => {
    const d = [];
    let bal = P.mortgage;
    for (let y = 1; y <= hy; y++) {
      const costs = P.annualCostsY1 * Math.pow(1 + P.costGrowth, y - 1);
      const bOut = annualMtg + costs - P.taxBenefitY1;
      const rOut = be * 12 * Math.pow(1 + P.rentGrowth, y - 1);
      let yInt = 0;
      for (let m = 0; m < 12; m++) { const mi = bal * (P.mortgageRate / 12); yInt += mi; bal -= (mp - mi); }
      d.push({ year: y, bOut: Math.round(bOut), rOut: Math.round(rOut), mRent: Math.round(be * Math.pow(1 + P.rentGrowth, y - 1)), costs: Math.round(costs) });
    }
    return d;
  }, [hy, be]);

  const samples = [2500, 3000, 3500, 4000, 4500, 5000];
  const comp = useMemo(() => samples.map(r => {
    const { buyerNW, renterNW } = simulate(hy, r);
    return { rent: r, bNW: buyerNW, rNW: renterNW };
  }), [hy]);

  return (
    <div style={{ background: "#0b0e13", color: "#c9d1d9", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", padding: "20px 12px" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#e6edf3" }}>Buy vs Rent 손익분기 계산기</h1>
          <p style={{ color: "#4b5363", fontSize: 12, marginTop: 6 }}>Ridgewood, NJ · $800K · 인플레이션 & 매도수수료 반영</p>
        </div>

        {/* ASSUMPTIONS */}
        <div style={{ background: "#111318", border: "1px solid #1e2430", borderRadius: 10, padding: "16px 18px", marginBottom: 20, fontSize: 12, color: "#6b7280", lineHeight: 1.9 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#4a9eff", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>전제 조건</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 24px" }}>
            <span>집값: <b style={{ color: "#c9d1d9" }}>$800,000</b></span>
            <span>모기지: <b style={{ color: "#c9d1d9" }}>$640K @ 6.5%</b></span>
            <span>초기 투입: <b style={{ color: "#c9d1d9" }}>$184,000</b></span>
            <span>유지비(1년차): <b style={{ color: "#c9d1d9" }}>$20,000/yr</b></span>
            <span>세제 혜택: <b style={{ color: "#c9d1d9" }}>$6,000/yr</b></span>
            <span>집값 상승: <b style={{ color: "#c9d1d9" }}>4%/yr</b></span>
            <span>투자 수익: <b style={{ color: "#c9d1d9" }}>7%/yr</b></span>
            <span>인플레이션: <b style={{ color: "#e9a23b" }}>3%/yr</b></span>
            <span>유지비 상승: <b style={{ color: "#e9a23b" }}>3.5%/yr</b> <span style={{fontSize:10}}>(재산세 연동)</span></span>
            <span>렌트 상승: <b style={{ color: "#e9a23b" }}>3%/yr</b></span>
            <span>매도 수수료: <b style={{ color: "#c9d1d9" }}>6%</b></span>
            <span>원금 상환: <b style={{ color: "#4ade80" }}>비용 아님</b></span>
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
            이후 연 3%↑ → {hy}년차: {fmt(Math.round(be * Math.pow(1.03, hy - 1)))}/mo
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
            렌트도 매년 3% ↑ → 후반부에 매수 지출과 렌트 지출이 역전
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
          <div style={{ fontSize: 11, color: "#4b5363", marginTop: 10 }}>렌트는 매년 3%↑ 가정 · 매수 순자산 = 집 매도(−6%) 후 equity</div>
        </div>

        {/* METHOD */}
        <div style={{ background: "#111318", border: "1px solid #1e2430", borderRadius: 10, padding: "16px 18px", fontSize: 12, color: "#4b5363", lineHeight: 1.8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#4a9eff", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>계산 방법</div>
          <p style={{ margin: "0 0 6px 0" }}>매년 시뮬레이션: 매수자 지출(모기지 고정 + 유지비↑3.5% − 세제혜택)과 렌트 지출(렌트↑3%)의 차이를 7%로 투자 누적.</p>
          <p style={{ margin: "0 0 6px 0" }}><b style={{ color: "#9ca3b0" }}>매수 순자산</b> = 집값×1.04ᴺ×0.94 − 잔여모기지</p>
          <p style={{ margin: "0 0 6px 0" }}><b style={{ color: "#9ca3b0" }}>렌트 순자산</b> = $184K×1.07ᴺ + 매년 절약분 투자 누적</p>
          <p style={{ margin: 0 }}>양쪽 순자산이 같아지는 1년차 렌트가 손익분기점입니다.</p>
        </div>
      </div>
    </div>
  );
}
