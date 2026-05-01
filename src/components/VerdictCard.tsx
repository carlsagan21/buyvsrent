import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

interface VerdictCardProps {
  holdYears: number;
  currentRent: number;
  breakEvenRent: number;
  buyWins: boolean;
}

export default function VerdictCard({
  holdYears,
  currentRent,
  breakEvenRent,
  buyWins,
}: VerdictCardProps) {
  return (
    <Card sx={{ mb: 2.5 }}>
      <CardContent>
        <Box textAlign="center">
          <Typography variant="h6" gutterBottom>
            {holdYears}년 거주 시 · 순자산 기준 손익분기
          </Typography>

          <Box display="grid" gridTemplateColumns="1fr auto 1fr" alignItems="center" gap={1.25} mt={0.5}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: "center" }}>
                <Typography variant="caption" display="block" gutterBottom>
                  현재 월세
                </Typography>
                <Typography variant="h4" fontWeight="bold" color={!buyWins ? "warning.main" : undefined}>
                  {fmt(currentRent)}
                  <Typography component="span" variant="subtitle1">
                    /mo
                  </Typography>
                </Typography>
              </CardContent>
            </Card>
            <Typography variant="subtitle2">VS</Typography>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: "center" }}>
                <Typography variant="caption" display="block" gutterBottom>
                  손익분기 시작 월세*
                </Typography>
                <Typography variant="h4" fontWeight="bold" color={buyWins ? "success.main" : undefined}>
                  {fmt(Math.round(breakEvenRent))}
                  <Typography component="span" variant="subtitle1">
                    /mo
                  </Typography>
                </Typography>
              </CardContent>
            </Card>
          </Box>

          <Typography variant="h6" fontWeight="bold" color={buyWins ? "success.main" : "warning.main"} sx={{ mt: 3.5 }}>
            {buyWins
              ? `현재 월세가 손익분기보다 ${fmt(Math.round(currentRent - breakEvenRent))} 높아 매수가 유리합니다`
              : `현재 월세가 손익분기보다 ${fmt(Math.round(breakEvenRent - currentRent))} 낮아 렌트가 유리합니다`}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2.5, textAlign: "left" }}>
            * <b>손익분기 시작 월세:</b> 1년차 시작 월세를 뜻하며, 해당 월세에서 렌트가 매년 상승할 때 {holdYears}년 후 <b>최종 순자산</b>이 매수와 같아지는 지점입니다. 즉 현재의 실지출 월비용이 아니라 순자산 기준 손익분기선입니다.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
