import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Container from "@mui/material/Container";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  DEFAULTS,
  REGIONS,
  amortizeYear,
  calcTaxBenefit,
  type CalculatorParams,
  type DerivedParams,
  type RegionPreset,
  deriveParams,
  findBE,
  findBEnoInfl,
  monthlyPmt,
  simulate,
} from "./calculator";

/* ── helpers ────────────────────────────────────────────────────── */
function fmt(n: number): string { return "$" + Math.round(n).toLocaleString("en-US"); }
function pct(n: number): string { return (n * 100).toFixed(1) + "%"; }

const MONO = "'JetBrains Mono', monospace";

/* ── slider defs ────────────────────────────────────────────────── */
type SliderKey =
  | "downPct" | "mortgageRate" | "propertyTaxRate"
  | "insuranceY1" | "maintenanceY1" | "stateIncomeTaxY1"
  | "homeAppreciation" | "investReturn" | "costGrowth"
  | "rentGrowth" | "sellingCostPct" | "capitalGainsTaxRate";

interface SliderDef { key: SliderKey; label: string; min: number; max: number; step: number; format: (v: number) => string; }
const sliderDefs: SliderDef[] = [
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

/* ── table styles ───────────────────────────────────────────────── */
const hdr = { fontSize: 10, color: "#4b5363", py: "6px", borderBottom: "1px solid #1e2430" } as const;
const cell = { fontFamily: MONO, fontSize: 12, py: "7px", borderBottom: "1px solid #1a1f26", color: "#9ca3b0" } as const;

/* ── component ──────────────────────────────────────────────────── */
export default function App() {
  const [params, setParams] = useState<CalculatorParams>(DEFAULTS);
  const [hy, setHy] = useState(7);
  const [currentRent, setCurrentRent] = useState(4000);
  const [showSliders, setShowSliders] = useState(false);
  const [showCashFlow, setShowCashFlow] = useState(false);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);

  const baseParams = useMemo<CalculatorParams>(() => {
    if (!activeRegion) return DEFAULTS;
    const reg = REGIONS.find(r => r.name === activeRegion);
    return reg ? { ...DEFAULTS, homePrice: reg.homePrice, propertyTaxRate: reg.propertyTaxRate, homeAppreciation: reg.homeAppreciation } : DEFAULTS;
  }, [activeRegion]);

  const P = useMemo<DerivedParams>(() => deriveParams(params), [params]);

  const applyRegion = (reg: RegionPreset) => {
    setActiveRegion(reg.name);
    setParams(prev => ({ ...prev, homePrice: reg.homePrice, propertyTaxRate: reg.propertyTaxRate, homeAppreciation: reg.homeAppreciation }));
  };

  const setP = (key: keyof CalculatorParams, val: number) => {
    setParams(prev => ({ ...prev, [key]: key === "downPct" ? Math.max(0.20, val) : val }));
    setActiveRegion(null);
  };

  const be = useMemo(() => findBE(P, hy), [P, hy]);
  const result = useMemo(() => simulate(P, hy, currentRent), [P, hy, currentRent]);
  const buyWins = result.buyerNW - result.renterNW > 0;

  const mp = monthlyPmt(P.mortgage, P.mortgageRate, 360);
  const annualMtg = mp * 12;

  const details = useMemo(() => {
    const d: Array<{ year: number; bOut: number; bPrin: number; rOut: number; mRent: number }> = [];
    let bal = P.mortgage;
    for (let y = 1; y <= hy; y++) {
      const am = amortizeYear(bal, P.mortgageRate, mp);
      bal = am.endBalance;
      const propTax = P.homePrice * P.propertyTaxRate * Math.pow(1 + P.costGrowth, y - 1);
      const stateIncomeTax = P.stateIncomeTaxY1 * Math.pow(1 + P.costGrowth, y - 1);
      const taxBen = calcTaxBenefit({ yearlyInterest: am.yearInterest, avgBalance: am.avgBalance, propertyTax: propTax, stateIncomeTax, mortgageInterestLimit: P.mortgageInterestLimit, marginalTaxRate: P.marginalTaxRate, standardDeduction: P.standardDeduction, saltCap: P.saltCap });
      const costs = P.annualCostsY1 * Math.pow(1 + P.costGrowth, y - 1);
      d.push({ year: y, bOut: Math.round(annualMtg + costs - taxBen), bPrin: Math.round(am.yearPrincipal), rOut: Math.round(currentRent * 12 * Math.pow(1 + P.rentGrowth, y - 1)), mRent: Math.round(currentRent * Math.pow(1 + P.rentGrowth, y - 1)) });
    }
    return d;
  }, [P, hy, currentRent, annualMtg, mp]);

  const isDefault = JSON.stringify(params) === JSON.stringify(baseParams);

  /* ── number input helper ──────────────────────────────────────── */
  const numInputSx = { input: { fontFamily: MONO, fontSize: 22, fontWeight: 700, color: "#e6edf3", p: "8px 0" } };

  return (
    <Box sx={{ minHeight: "100vh", py: "20px", px: "12px" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <Container maxWidth={false} sx={{ maxWidth: 680 }} disableGutters>

        {/* TITLE */}
        <Box textAlign="center" mb={3}>
          <Typography variant="h1">Buy vs Rent 계산기</Typography>
          <Typography variant="subtitle1" mt={0.75}>세금·매도비용·투자수익까지 반영한 실질 비교</Typography>
        </Box>

        {/* REGION PRESETS */}
        <Stack
          direction="row" spacing={1} mb={2}
          sx={{ overflowX: "auto", pb: 1, "&::-webkit-scrollbar": { display: "none" }, scrollbarWidth: "none" }}
        >
          {REGIONS.map(reg => (
            <Chip
              key={reg.name} label={reg.name} clickable onClick={() => applyRegion(reg)}
              variant={activeRegion === reg.name ? "filled" : "outlined"}
              color={activeRegion === reg.name ? "primary" : "default"}
              sx={{
                bgcolor: activeRegion === reg.name ? "primary.main" : "#111318",
                borderColor: activeRegion === reg.name ? "primary.main" : "#1e2430",
                color: activeRegion === reg.name ? "#fff" : "#8b949e",
                flexShrink: 0,
              }}
            />
          ))}
        </Stack>

        {/* PRIMARY INPUTS */}
        <Paper elevation={1} sx={{ borderRadius: 3, p: "20px 18px", mb: 2 }}>
          <Box display="grid" gridTemplateColumns="1fr 1fr 90px" gap={1.5}>
            <Box>
              <Typography variant="overline" sx={{ color: "primary.main" }}>현재 월세</Typography>
              <TextField
                fullWidth variant="outlined" type="number"
                value={currentRent === 0 ? "" : currentRent}
                onChange={e => setCurrentRent(e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><Typography sx={{ color: "text.secondary", fontSize: 18, fontWeight: 600 }}>$</Typography></InputAdornment>, endAdornment: <InputAdornment position="end"><Typography variant="caption">/mo</Typography></InputAdornment> } }}
                sx={{ ...numInputSx }}
              />
            </Box>
            <Box>
              <Typography variant="overline" sx={{ color: "primary.main" }}>매수 가격</Typography>
              <TextField
                fullWidth variant="outlined" type="number"
                value={params.homePrice === 0 ? "" : params.homePrice}
                onChange={e => setP("homePrice", e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><Typography sx={{ color: "text.secondary", fontSize: 18, fontWeight: 600 }}>$</Typography></InputAdornment> } }}
                sx={{ ...numInputSx }}
              />
            </Box>
            <Box>
              <Typography variant="overline" sx={{ color: "primary.main" }}>거주 기간</Typography>
              <TextField
                fullWidth variant="outlined" type="number"
                value={hy === 0 ? "" : hy}
                onChange={e => setHy(e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
                slotProps={{ input: { endAdornment: <InputAdornment position="end"><Typography sx={{ fontSize: 12, fontWeight: 600 }}>년</Typography></InputAdornment> } }}
                sx={{ ...numInputSx, input: { ...numInputSx.input, textAlign: "center" } }}
              />
            </Box>
          </Box>
        </Paper>

        {/* HERO VERDICT */}
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 3.5, p: "24px 20px", mb: 2.5, textAlign: "center",
            borderWidth: 1,
            borderColor: buyWins ? "rgba(74, 222, 128, 0.4)" : "rgba(251, 191, 36, 0.4)",
            bgcolor: buyWins ? "rgba(74, 222, 128, 0.03)" : "rgba(251, 191, 36, 0.03)"
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: buyWins ? "success.main" : "warning.main", letterSpacing: 0.5, mb: 2 }}>
            {hy}년 거주 시 · 순자산 기준 손익분기
          </Typography>

          <Box display="grid" gridTemplateColumns="1fr auto 1fr" alignItems="center" gap={1.25} mt={0.5}>
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 2.5, p: "16px 10px", textAlign: "center",
                borderColor: !buyWins ? "warning.main" : "divider",
                bgcolor: "background.default"
              }}
            >
              <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>현재 월세</Typography>
              <Typography sx={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: !buyWins ? "warning.main" : "text.primary" }}>
                {fmt(currentRent)}<Typography component="span" sx={{ fontSize: 14, fontWeight: 500 }}>/mo</Typography>
              </Typography>
            </Paper>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>VS</Typography>
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 2.5, p: "16px 10px", textAlign: "center",
                borderColor: buyWins ? "success.main" : "divider",
                bgcolor: "background.default"
              }}
            >
              <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>손익분기 시작 월세*</Typography>
              <Typography sx={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: buyWins ? "success.main" : "text.primary" }}>
                {fmt(Math.round(be))}<Typography component="span" sx={{ fontSize: 14, fontWeight: 500 }}>/mo</Typography>
              </Typography>
            </Paper>
          </Box>

          <Typography sx={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: buyWins ? "success.main" : "warning.main", mt: 3 }}>
            {buyWins
              ? `현재 월세가 손익분기보다 ${fmt(Math.round(currentRent - be))} 높아 매수가 유리합니다`
              : `현재 월세가 손익분기보다 ${fmt(Math.round(be - currentRent))} 낮아 렌트가 유리합니다`}
          </Typography>

          <Typography variant="body2" sx={{ mt: 2.5, textAlign: "left", px: 1 }}>
            * <b>손익분기 시작 월세:</b> 1년차 시작 월세를 뜻하며, 해당 월세에서 렌트가 매년 상승할 때 {hy}년 후 <b>최종 순자산</b>이 매수와 같아지는 지점입니다. 즉 현재의 실지출 월비용이 아니라 순자산 기준 손익분기선입니다.
          </Typography>
        </Paper>

        {/* CHART */}
        {(() => {
          type ChartDatum = { y: number; r: number; rni: number };
          const chartYrs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 18, 20];
          const chartData: ChartDatum[] = chartYrs.map(y => ({ y, r: findBE(P, y), rni: findBEnoInfl(P, y) }));
          const allVals = chartData.flatMap(d => [d.r, d.rni]);
          const minV = Math.floor(Math.min(...allVals) / 500) * 500;
          const maxV = Math.ceil(Math.max(...allVals) / 500) * 500;
          const range = maxV - minV || 1;

          const W = 600, H = 260, pad = { t: 20, r: 20, b: 36, l: 56 };
          const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;
          const xOf = (yr: number) => pad.l + ((yr - 1) / 19) * cw;
          const yOf = (v: number) => pad.t + (1 - (v - minV) / range) * ch;

          const makePath = (key: keyof Pick<ChartDatum, "r" | "rni">) => chartData.map((d, i) =>
            `${i === 0 ? "M" : "L"}${xOf(d.y).toFixed(1)},${yOf(d[key]).toFixed(1)}`
          ).join(" ");
          const lastDatum = chartData[chartData.length - 1]!;

          const gridLines: number[] = [];
          const step = range <= 3000 ? 500 : 1000;
          for (let v = minV; v <= maxV; v += step) gridLines.push(v);
          const selData = chartData.find(d => d.y === hy);

          return (
            <Paper sx={{ borderRadius: 2.5, p: "16px 18px", mb: 2.5 }}>
              <Typography variant="overline" sx={{ color: "primary.main", display: "block", mb: 1.5 }}>
                보유 기간별 손익분기 시작 월세
              </Typography>
              <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
                {gridLines.map(v => (
                  <g key={v}>
                    <line x1={pad.l} x2={W - pad.r} y1={yOf(v)} y2={yOf(v)} stroke="#1e2430" strokeWidth="1" />
                    <text x={pad.l - 6} y={yOf(v) + 4} textAnchor="end" fill="#4b5363" fontSize="10" fontFamily={MONO}>{fmt(v)}</text>
                  </g>
                ))}
                {[1, 3, 5, 7, 10, 15, 20].map(yr => (
                  <text key={yr} x={xOf(yr)} y={H - 6} textAnchor="middle" fill="#4b5363" fontSize="10" fontFamily={MONO}>{yr}년</text>
                ))}
                <path d={makePath("rni")} fill="none" stroke="#555d6b" strokeWidth="1.5" strokeDasharray="6,4" />
                <path d={makePath("r")} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d={`${makePath("r")} L${xOf(lastDatum.y)},${yOf(minV)} L${xOf(1)},${yOf(minV)} Z`} fill="url(#areaGrad)" />
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {chartData.map(d => {
                  const sel = d.y === hy;
                  return (
                    <g key={d.y} onClick={() => setHy(d.y)} style={{ cursor: "pointer" }}>
                      <circle cx={xOf(d.y)} cy={yOf(d.rni)} r={sel ? 4 : 2.5} fill={sel ? "#555d6b" : "#333"} stroke="#555d6b" strokeWidth="1" />
                      <circle cx={xOf(d.y)} cy={yOf(d.r)} r={sel ? 5 : 3} fill={sel ? "#3b82f6" : "#1d4ed8"} stroke={sel ? "#fff" : "none"} strokeWidth="1.5" />
                      <circle cx={xOf(d.y)} cy={yOf(d.r)} r="12" fill="transparent" />
                    </g>
                  );
                })}
                {selData && (
                  <g>
                    <line x1={xOf(hy)} x2={xOf(hy)} y1={pad.t} y2={H - pad.b} stroke="#3b82f6" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
                    <rect x={xOf(hy) - 44} y={yOf(selData.r) - 28} width="88" height="22" rx="4" fill="#0f1a2e" stroke="#1d4ed8" strokeWidth="1" />
                    <text x={xOf(hy)} y={yOf(selData.r) - 13} textAnchor="middle" fill="#4ade80" fontSize="11" fontWeight="700" fontFamily={MONO}>{fmt(Math.round(selData.r))}</text>
                  </g>
                )}
              </svg>
              <Stack direction="row" spacing={2.5} mt={1} sx={{ color: "text.secondary" }}>
                <Stack direction="row" alignItems="center" spacing={0.6}><Box sx={{ width: 16, height: 3, bgcolor: "#3b82f6", borderRadius: 2 }} /><Typography variant="caption">인플레 반영</Typography></Stack>
                <Stack direction="row" alignItems="center" spacing={0.6}><Box sx={{ width: 16, height: 0, borderTop: "2px dashed #555d6b" }} /><Typography variant="caption">인플레 미반영</Typography></Stack>
                <Typography variant="caption" sx={{ ml: "auto !important" }}>점 클릭 → 보유 기간 선택</Typography>
              </Stack>
              <Typography variant="caption" sx={{ display: "block", mt: 0.75 }}>선이 낮을수록 더 낮은 시작 월세에서도 매수와 렌트의 최종 순자산이 같아집니다.</Typography>
            </Paper>
          );
        })()}

        {/* CASH FLOW (collapsible) */}
        <Paper sx={{ borderRadius: 2.5, p: "16px 18px", mb: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={showCashFlow ? 1.75 : 0}>
            <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 600, letterSpacing: 1.2 }}>
              연도별 현금 흐름 (1년차 월세 {fmt(currentRent)} 기준)
            </Typography>
            <Button variant={showCashFlow ? "contained" : "text"} onClick={() => setShowCashFlow(!showCashFlow)}
              sx={{ color: showCashFlow ? "#fff" : "text.secondary", bgcolor: showCashFlow ? "primary.main" : "#151920" }}
            >{showCashFlow ? "접기" : "자세히 보기"}</Button>
          </Stack>
          <Collapse in={showCashFlow}>
            <Box display="grid" gridTemplateColumns="30px 1.1fr 0.9fr 1.1fr 74px">
              <Box sx={hdr}>년</Box>
              <Box sx={{ ...hdr, textAlign: "right" }}>매수 연지출</Box>
              <Box sx={{ ...hdr, textAlign: "right", color: "#6b7280" }}>(원금 상환)</Box>
              <Box sx={{ ...hdr, textAlign: "right" }}>렌트 연지출</Box>
              <Box sx={{ ...hdr, textAlign: "right" }}>월 렌트</Box>
              {details.filter((_, i) => hy <= 10 || i % 2 === 0 || i === details.length - 1).map(d => (
                <Box key={d.year} sx={{ display: "contents" }}>
                  <Box sx={cell}>{d.year}</Box>
                  <Box sx={{ ...cell, textAlign: "right", color: "error.main" }}>{fmt(d.bOut)}</Box>
                  <Box sx={{ ...cell, textAlign: "right", color: "text.secondary" }}>{fmt(d.bPrin)}</Box>
                  <Box sx={{ ...cell, textAlign: "right", color: "success.main" }}>{fmt(d.rOut)}</Box>
                  <Box sx={{ ...cell, textAlign: "right", color: "#8b949e" }}>{fmt(d.mRent)}/mo</Box>
                </Box>
              ))}
            </Box>
            <Typography variant="body2" sx={{ mt: 1.25, lineHeight: 1.6, color: "#4b5363" }}>
              모기지 P+I ({fmt(Math.round(annualMtg))}/yr)는 고정이지만 유지비는 매년 ↑<br />
              렌트도 매년 {pct(P.rentGrowth)} ↑ → 장기 거주 시 매수 지출과 렌트 지출의 격차가 줄어듭니다.<br />
              <Box component="span" sx={{ color: "#9ca3b0", display: "inline-block", mt: 0.5 }}>
                💡 <strong>왜 매년 돈이 더 많이 나가는데 매수가 유리하다고 나오나요?</strong><br />
                매수 연지출에는 은행에 내는 <strong>모기지 원금(순자산으로 100% 쌓임)</strong>이 포함되어 있습니다. 또한, 내 집 마련 시 매년 발생하는 <strong>부동산 가치 상승분(레버리지 효과)</strong>이 당장의 높은 월 지출액을 압도적으로 상쇄하기 때문입니다.
              </Box>
            </Typography>
          </Collapse>
        </Paper>

        {/* ASSUMPTIONS (collapsible) */}
        <Paper sx={{ borderRadius: 2.5, p: "16px 18px", mb: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={showSliders ? 1.75 : 0}>
            <Typography variant="overline" sx={{ color: "primary.main" }}>전제 조건</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              {!isDefault && (
                <Button variant="outlined" onClick={() => setParams(baseParams)} color="inherit">초기화</Button>
              )}
              <Button variant={showSliders ? "contained" : "text"} onClick={() => setShowSliders(!showSliders)}
                sx={{ color: showSliders ? "#fff" : "text.secondary", bgcolor: showSliders ? "primary.main" : "#151920" }}
              >{showSliders ? "접기" : "조절하기"}</Button>
            </Stack>
          </Stack>

          <Collapse in={showSliders}>
            <Stack spacing={1.75}>
              {sliderDefs.map(({ key, label, min, max, step, format }) => (
                <Box key={key}>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{label}</Typography>
                    <Typography sx={{ fontFamily: MONO, fontSize: 12, color: params[key] !== baseParams[key] ? "primary.main" : "#9ca3b0", fontWeight: 600 }}>
                      {format(params[key])}
                    </Typography>
                  </Stack>
                  <Slider size="small" min={min} max={max} step={step} value={params[key]}
                    onChange={(_, v) => setP(key, v as number)} />
                </Box>
              ))}
              <Typography variant="body2" sx={{ pt: 0.5, borderTop: "1px solid #1e2430", color: "#4b5363" }}>
                다운페이먼트: {fmt(P.downPayment)} · 클로징: {fmt(P.closingCost)} · 모기지: {fmt(P.mortgage)} · 초기 투입: {fmt(P.downPayment + P.closingCost)}
              </Typography>
            </Stack>
          </Collapse>

          <Collapse in={!showSliders}>
            <Box display="grid" gridTemplateColumns="1fr 1fr" gap="2px 24px" sx={{ fontSize: 12, color: "text.secondary", lineHeight: 1.9, mt: 1 }}>
              <span>모기지: <b style={{ color: "#c9d1d9" }}>{fmt(P.mortgage)} @ {pct(P.mortgageRate)}</b></span>
              <span>초기 투입: <b style={{ color: "#c9d1d9" }}>{fmt(P.downPayment + P.closingCost)}</b></span>
              <span>유지비: <b style={{ color: "#c9d1d9" }}>{fmt(P.annualCostsY1)}/yr</b></span>
              <span>주 소득세: <b style={{ color: "#c9d1d9" }}>{fmt(P.stateIncomeTaxY1)}/yr</b></span>
              <span>투자 수익: <b style={{ color: "#c9d1d9" }}>{pct(P.investReturn)}/yr</b></span>
              <span>양도차익세율: <b style={{ color: "#c9d1d9" }}>{pct(P.capitalGainsTaxRate)}</b></span>
              <span>집값 상승: <b style={{ color: "#c9d1d9" }}>{pct(P.homeAppreciation)}/yr</b></span>
              <span>매도 수수료: <b style={{ color: "#c9d1d9" }}>{pct(P.sellingCostPct)}</b></span>
            </Box>
          </Collapse>

          <Box sx={{ mt: 1.25, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
            <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>고정 가정</Typography>
            <Box display="grid" gridTemplateColumns="1fr 1fr" gap="1px 24px" sx={{ fontSize: 11, color: "#8b949e", lineHeight: 1.8 }}>
              <span>모기지: <b>30년 고정</b></span>
              <span>MFJ $300K · {pct(P.marginalTaxRate)}</span>
              <span>표준공제: <b>{fmt(P.standardDeduction)}</b></span>
              <span>SALT cap: <b>{fmt(P.saltCap)}</b></span>
              <span>이자공제 한도: <b>{fmt(P.mortgageInterestLimit)}</b></span>
              <span>양도차익 비과세: <b>{fmt(P.homeSaleGainExclusion)}</b></span>
            </Box>
          </Box>
        </Paper>

        {/* METHOD */}
        <Paper sx={{ borderRadius: 2.5, p: "16px 18px", fontSize: 12, color: "#4b5363", lineHeight: 1.8 }}>
          <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 600, letterSpacing: 1.2, display: "block", mb: 1 }}>계산 방법</Typography>
          <p style={{ margin: "0 0 6px 0" }}>매년 시뮬레이션: 매수자 지출(모기지 고정 + 유지비↑{pct(P.costGrowth)} − 세제혜택)과 렌트 지출(1년차 시작 월세에서 매년 {pct(P.rentGrowth)}↑)의 차이를 {pct(P.investReturn)}로 투자 누적.</p>
          <p style={{ margin: "0 0 6px 0" }}><b style={{ color: "#9ca3b0" }}>세제혜택</b> = 모기지 이자(원금 {fmt(P.mortgageInterestLimit)} 한도 반영) + 재산세·주 소득세(SALT 최대 {fmt(P.saltCap)})가 표준공제 {fmt(P.standardDeduction)}를 초과하는 부분에 대한 연방 절세</p>
          <p style={{ margin: "0 0 6px 0" }}><b style={{ color: "#9ca3b0" }}>매수 순자산</b> = 집값×(1+{pct(P.homeAppreciation)})ᴺ에서 매도 수수료와 초과 양도차익세(비과세 {fmt(P.homeSaleGainExclusion)} 초과분 × {pct(P.capitalGainsTaxRate)})를 뺀 후 잔여모기지 차감</p>
          <p style={{ margin: "0 0 6px 0" }}><b style={{ color: "#9ca3b0" }}>렌트 순자산</b> = {fmt(P.downPayment + P.closingCost)}×(1+{pct(P.investReturn)})ᴺ + 매년 절약분 투자 누적</p>
          <p style={{ margin: 0 }}>양쪽 순자산이 같아지는 1년차 시작 월세가 손익분기점입니다.</p>
        </Paper>

      </Container>
    </Box>
  );
}
