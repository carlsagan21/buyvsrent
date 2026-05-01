import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";

import { findBE, findBEnoInfl, type DerivedParams } from "../calculator";

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

interface BreakEvenChartCardProps {
  params: DerivedParams;
  holdYears: number;
  onSelectHoldYears: (years: number) => void;
}

type ChartDatum = { y: number; r: number; rni: number };

export default function BreakEvenChartCard({
  params,
  holdYears,
  onSelectHoldYears,
}: BreakEvenChartCardProps) {
  const theme = useTheme();
  const chartColors = {
    grid: theme.palette.divider,
    axis: theme.palette.text.disabled,
    baseline: theme.palette.text.secondary,
    primary: theme.palette.primary.main,
    primarySoft: alpha(theme.palette.primary.main, 0.15),
    primarySurface: alpha(theme.palette.primary.main, 0.12),
    selectedLabel: theme.palette.success.main,
    selectedStroke: theme.palette.background.paper,
    neutralDot: theme.palette.text.disabled,
  };

  const chartYrs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 18, 20];
  const chartData: ChartDatum[] = chartYrs.map(y => ({ y, r: findBE(params, y), rni: findBEnoInfl(params, y) }));
  const allVals = chartData.flatMap(d => [d.r, d.rni]);
  const minV = Math.floor(Math.min(...allVals) / 500) * 500;
  const maxV = Math.ceil(Math.max(...allVals) / 500) * 500;
  const range = maxV - minV || 1;

  const W = 600;
  const H = 260;
  const pad = { t: 20, r: 20, b: 36, l: 56 };
  const cw = W - pad.l - pad.r;
  const ch = H - pad.t - pad.b;
  const xOf = (yr: number) => pad.l + ((yr - 1) / 19) * cw;
  const yOf = (v: number) => pad.t + (1 - (v - minV) / range) * ch;

  const makePath = (key: keyof Pick<ChartDatum, "r" | "rni">): string =>
    chartData
      .map((d, i) => `${i === 0 ? "M" : "L"}${xOf(d.y).toFixed(1)},${yOf(d[key]).toFixed(1)}`)
      .join(" ");

  const lastDatum = chartData[chartData.length - 1]!;
  const gridLines: number[] = [];
  const step = range <= 3000 ? 500 : 1000;
  for (let v = minV; v <= maxV; v += step) {
    gridLines.push(v);
  }
  const selData = chartData.find(d => d.y === holdYears);

  return (
    <Card sx={{ mb: 2.5 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          보유 기간별 손익분기 시작 월세
        </Typography>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
          {gridLines.map(v => (
            <g key={v}>
              <line x1={pad.l} x2={W - pad.r} y1={yOf(v)} y2={yOf(v)} stroke={chartColors.grid} strokeWidth="1" />
              <text x={pad.l - 6} y={yOf(v) + 4} textAnchor="end" fill={chartColors.axis} fontSize="10">
                {fmt(v)}
              </text>
            </g>
          ))}
          {[1, 3, 5, 7, 10, 15, 20].map(yr => (
            <text key={yr} x={xOf(yr)} y={H - 6} textAnchor="middle" fill={chartColors.axis} fontSize="10">
              {yr}년
            </text>
          ))}
          <path d={makePath("rni")} fill="none" stroke={chartColors.baseline} strokeWidth="1.5" strokeDasharray="6,4" />
          <path d={makePath("r")} fill="none" stroke={chartColors.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d={`${makePath("r")} L${xOf(lastDatum.y)},${yOf(minV)} L${xOf(1)},${yOf(minV)} Z`} fill="url(#areaGrad)" />
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColors.primarySoft} stopOpacity="1" />
              <stop offset="100%" stopColor={chartColors.primary} stopOpacity="0" />
            </linearGradient>
          </defs>
          {chartData.map(d => {
            const sel = d.y === holdYears;
            return (
              <g key={d.y} onClick={() => onSelectHoldYears(d.y)} style={{ cursor: "pointer" }}>
                <circle cx={xOf(d.y)} cy={yOf(d.rni)} r={sel ? 4 : 2.5} fill={sel ? chartColors.baseline : chartColors.neutralDot} stroke={chartColors.baseline} strokeWidth="1" />
                <circle cx={xOf(d.y)} cy={yOf(d.r)} r={sel ? 5 : 3} fill={chartColors.primary} stroke={sel ? chartColors.selectedStroke : "none"} strokeWidth="1.5" />
                <circle cx={xOf(d.y)} cy={yOf(d.r)} r="12" fill="transparent" />
              </g>
            );
          })}
          {selData && (
            <g>
              <line x1={xOf(holdYears)} x2={xOf(holdYears)} y1={pad.t} y2={H - pad.b} stroke={chartColors.primary} strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
              <rect x={xOf(holdYears) - 44} y={yOf(selData.r) - 28} width="88" height="22" rx="4" fill={chartColors.primarySurface} stroke={chartColors.primary} strokeWidth="1" />
              <text x={xOf(holdYears)} y={yOf(selData.r) - 13} textAnchor="middle" fill={chartColors.selectedLabel} fontSize="11" fontWeight="700">
                {fmt(Math.round(selData.r))}
              </text>
            </g>
          )}
        </svg>
        <Stack direction="row" spacing={2.5} mt={1} sx={{ color: "text.secondary" }}>
          <Stack direction="row" alignItems="center" spacing={0.6}>
            <Box sx={{ width: 16, height: 3, bgcolor: "primary.main", borderRadius: 2 }} />
            <Typography variant="caption">인플레 반영</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={0.6}>
            <Box sx={{ width: 16, height: 0, borderTop: "2px dashed", borderColor: "text.secondary" }} />
            <Typography variant="caption">인플레 미반영</Typography>
          </Stack>
          <Typography variant="caption" sx={{ ml: "auto !important" }}>
            점 클릭 → 보유 기간 선택
          </Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
          선이 낮을수록 더 낮은 시작 월세에서도 매수와 렌트의 최종 순자산이 같아집니다.
        </Typography>
      </CardContent>
    </Card>
  );
}
