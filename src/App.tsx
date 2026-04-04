import { useMemo, useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Container from "@mui/material/Container";
import InputAdornment from "@mui/material/InputAdornment";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
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
  monthlyPmt,
  simulate,
} from "./calculator";
import BreakEvenChartCard from "./components/BreakEvenChartCard";
import VerdictCard from "./components/VerdictCard";

/* ── helpers ────────────────────────────────────────────────────── */
function fmt(n: number): string { return "$" + Math.round(n).toLocaleString("en-US"); }
function pct(n: number): string { return (n * 100).toFixed(1) + "%"; }

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
const hdr = { typography: "overline", borderBottom: "1px solid", borderColor: "divider" } as const;
const cell = { typography: "body2", borderBottom: "1px solid", borderColor: "divider" } as const;
const cardContainerSx = { mb: 2.5 } as const;

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

  return (
    <Box sx={{ minHeight: "100vh", py: "30px", px: "16px" }}>
      <Container maxWidth={false} sx={{ maxWidth: 680 }} disableGutters>

        {/* TITLE */}
        <Box textAlign="center" mb={4}>
          <Typography variant="h4" component="h1">Buy vs Rent 계산기</Typography>
          <Typography variant="subtitle1" color="text.secondary" mt={0.5}>세금·매도비용·투자수익까지 반영한 실질 비교</Typography>
        </Box>

        {/* REGION PRESETS */}
        <Stack
          direction="row" spacing={1} mb={2}
          sx={{ overflowX: "auto", pb: 1 }}
        >
          {REGIONS.map(reg => (
            <Chip
              key={reg.name} label={reg.name} clickable onClick={() => applyRegion(reg)}
              variant={activeRegion === reg.name ? "filled" : "outlined"}
              color={activeRegion === reg.name ? "primary" : "default"}
              sx={{ flexShrink: 0 }}
            />
          ))}
        </Stack>

        {/* PRIMARY INPUTS */}
        <Card sx={cardContainerSx}>
          <CardContent>
            <Box display="grid" gridTemplateColumns="1fr 1fr 90px" gap={1.5}>
              <Box>
                <Typography variant="overline">현재 월세</Typography>
                <TextField
                  fullWidth variant="outlined" type="number"
                  value={currentRent === 0 ? "" : currentRent}
                  onChange={e => setCurrentRent(e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment>, endAdornment: <InputAdornment position="end"><Typography variant="caption">/mo</Typography></InputAdornment> } }}
                />
              </Box>
              <Box>
                <Typography variant="overline">매수 가격</Typography>
                <TextField
                  fullWidth variant="outlined" type="number"
                  value={params.homePrice === 0 ? "" : params.homePrice}
                  onChange={e => setP("homePrice", e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
                />
              </Box>
              <Box>
                <Typography variant="overline">거주 기간</Typography>
                <TextField
                  fullWidth variant="outlined" type="number"
                  value={hy === 0 ? "" : hy}
                  onChange={e => setHy(e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
                  slotProps={{ input: { endAdornment: <InputAdornment position="end">년</InputAdornment> } }}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* HERO VERDICT */}
        <VerdictCard
          holdYears={hy}
          currentRent={currentRent}
          breakEvenRent={be}
          buyWins={buyWins}
        />

        {/* CHART */}
        <BreakEvenChartCard
          params={P}
          holdYears={hy}
          onSelectHoldYears={setHy}
        />

        {/* CASH FLOW (collapsible) */}
        <Accordion
          expanded={showCashFlow}
          onChange={(_, expanded) => setShowCashFlow(expanded)}
          sx={{ mb: 3 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">
              연도별 현금 흐름 (1년차 월세 {fmt(currentRent)} 기준)
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box display="grid" gridTemplateColumns="30px 1.1fr 0.9fr 1.1fr 74px">
              <Box sx={hdr}>년</Box>
              <Box sx={{ ...hdr, textAlign: "right" }}>매수 연지출</Box>
              <Box sx={{ ...hdr, textAlign: "right" }}>(원금 상환)</Box>
              <Box sx={{ ...hdr, textAlign: "right" }}>렌트 연지출</Box>
              <Box sx={{ ...hdr, textAlign: "right" }}>월 렌트</Box>
              {details.filter((_, i) => hy <= 10 || i % 2 === 0 || i === details.length - 1).map(d => (
                <Box key={d.year} sx={{ display: "contents" }}>
                  <Box sx={cell}>{d.year}</Box>
                  <Box sx={{ ...cell, textAlign: "right" }}>{fmt(d.bOut)}</Box>
                  <Box sx={{ ...cell, textAlign: "right" }}>{fmt(d.bPrin)}</Box>
                  <Box sx={{ ...cell, textAlign: "right" }}>{fmt(d.rOut)}</Box>
                  <Box sx={{ ...cell, textAlign: "right" }}>{fmt(d.mRent)}/mo</Box>
                </Box>
              ))}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
              모기지 P+I ({fmt(Math.round(annualMtg))}/yr)는 고정이지만 유지비는 매년 ↑<br />
              렌트도 매년 {pct(P.rentGrowth)} ↑ → 장기 거주 시 매수 지출과 렌트 지출의 격차가 줄어듭니다.<br />
              <Box component="span" sx={{ display: "inline-block", mt: 0.5 }}>
                💡 <strong>왜 매년 돈이 더 많이 나가는데 매수가 유리하다고 나오나요?</strong><br />
                매수 연지출에는 은행에 내는 <strong>모기지 원금(순자산으로 100% 쌓임)</strong>이 포함되어 있습니다. 또한, 내 집 마련 시 매년 발생하는 <strong>부동산 가치 상승분(레버리지 효과)</strong>이 당장의 높은 월 지출액을 압도적으로 상쇄하기 때문입니다.
              </Box>
            </Typography>
          </AccordionDetails>
        </Accordion>

        {/* ASSUMPTIONS (collapsible) */}
        <Accordion
          expanded={showSliders}
          onChange={(_, expanded) => setShowSliders(expanded)}
          sx={{ mb: 3 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ flexGrow: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">전제 조건</Typography>
                {!isDefault && (
                  <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); setParams(baseParams); }}>초기화</Button>
                )}
              </Stack>
              <Collapse in={!showSliders}>
                <Box display="grid" gridTemplateColumns="1fr 1fr" gap="2px 24px">
                  <span>모기지: <Typography component="span" variant="caption"><strong>{fmt(P.mortgage)} @ {pct(P.mortgageRate)}</strong></Typography></span>
                  <span>초기 투입: <Typography component="span" variant="caption"><strong>{fmt(P.downPayment + P.closingCost)}</strong></Typography></span>
                  <span>유지비: <Typography component="span" variant="caption"><strong>{fmt(P.annualCostsY1)}/yr</strong></Typography></span>
                  <span>주 소득세: <Typography component="span" variant="caption"><strong>{fmt(P.stateIncomeTaxY1)}/yr</strong></Typography></span>
                  <span>투자 수익: <Typography component="span" variant="caption"><strong>{pct(P.investReturn)}/yr</strong></Typography></span>
                  <span>양도차익세율: <Typography component="span" variant="caption"><strong>{pct(P.capitalGainsTaxRate)}</strong></Typography></span>
                  <span>집값 상승: <Typography component="span" variant="caption"><strong>{pct(P.homeAppreciation)}/yr</strong></Typography></span>
                  <span>매도 수수료: <Typography component="span" variant="caption"><strong>{pct(P.sellingCostPct)}</strong></Typography></span>
                </Box>
              </Collapse>
            </Box>
          </AccordionSummary>

          <AccordionDetails>
            <Stack spacing={2} mt={1}>
              {sliderDefs.map(({ key, label, min, max, step, format }) => (
                <Box key={key}>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                    <Typography variant="caption" sx={{ color: params[key] !== baseParams[key] ? "primary.main" : "text.secondary", fontWeight: 600 }}>
                      {format(params[key])}
                    </Typography>
                  </Stack>
                  <Slider size="small" min={min} max={max} step={step} value={params[key]}
                    onChange={(_, v) => setP(key, v as number)} />
                </Box>
              ))}
            </Stack>

            <Box sx={{ mt: 1.25 }}>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>고정 가정</Typography>
              <Box display="grid" gridTemplateColumns="1fr 1fr" gap="1px 24px">
                <span>모기지: <b>30년 고정</b></span>
                <span>MFJ $300K · {pct(P.marginalTaxRate)}</span>
                <span>표준공제: <b>{fmt(P.standardDeduction)}</b></span>
                <span>SALT cap: <b>{fmt(P.saltCap)}</b></span>
                <span>이자공제 한도: <b>{fmt(P.mortgageInterestLimit)}</b></span>
                <span>양도차익 비과세: <b>{fmt(P.homeSaleGainExclusion)}</b></span>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* METHOD */}
        <Card sx={cardContainerSx}>
          <CardContent>
            <Typography variant="h6" gutterBottom>계산 방법</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>매년 시뮬레이션: 매수자 지출(모기지 고정 + 유지비↑{pct(P.costGrowth)} − 세제혜택)과 렌트 지출(1년차 시작 월세에서 매년 {pct(P.rentGrowth)}↑)의 차이를 {pct(P.investReturn)}로 투자 누적.</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}><strong>세제혜택</strong> = 모기지 이자(원금 {fmt(P.mortgageInterestLimit)} 한도 반영) + 재산세·주 소득세(SALT 최대 {fmt(P.saltCap)})가 표준공제 {fmt(P.standardDeduction)}를 초과하는 부분에 대한 연방 절세</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}><strong>매수 순자산</strong> = 집값×(1+{pct(P.homeAppreciation)})ᴺ에서 매도 수수료와 초과 양도차익세(비과세 {fmt(P.homeSaleGainExclusion)} 초과분 × {pct(P.capitalGainsTaxRate)})를 뺀 후 잔여모기지 차감</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}><strong>렌트 순자산</strong> = {fmt(P.downPayment + P.closingCost)}×(1+{pct(P.investReturn)})ᴺ + 매년 절약분 투자 누적</Typography>
            <Typography variant="body2" color="text.secondary">양쪽 순자산이 같아지는 1년차 시작 월세가 손익분기점입니다.</Typography>
          </CardContent>
        </Card>

      </Container>
    </Box>
  );
}
