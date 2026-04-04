import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#0b0e13",
      paper: "#111318",
    },
    primary: {
      main: "#4a9eff",
    },
    success: {
      main: "#4ade80",
    },
    warning: {
      main: "#fbbf24",
    },
    error: {
      main: "#f87171",
    },
    text: {
      primary: "#c9d1d9",
      secondary: "#6b7280",
    },
    divider: "#1e2430",
  },
  typography: {
    fontFamily: "'DM Sans', sans-serif",
    h1: { fontSize: 22, fontWeight: 700, color: "#e6edf3" },
    subtitle1: { fontSize: 12, color: "#4b5363" },
    body2: { fontSize: 12, color: "#6b7280", lineHeight: 1.6 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { margin: 0, padding: 0 },
        body: { margin: 0, padding: 0, backgroundColor: "#0b0e13" },
        "input[type=number]": {
          MozAppearance: "textfield",
        },
        "input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button": {
          WebkitAppearance: "none",
          margin: 0,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: "1px solid #1e2430",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          fontWeight: 500,
          fontSize: 12,
          transition: "all 0.2s ease",
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          height: 4,
          color: "#4a9eff",
        },
        rail: {
          backgroundColor: "#1e2430",
          opacity: 1,
        },
        track: {
          border: "none",
        },
        thumb: {
          width: 14,
          height: 14,
          "&:hover, &.Mui-focusVisible": {
            boxShadow: "0 0 0 6px rgba(74, 158, 255, 0.16)",
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 500,
          fontSize: 11,
          borderRadius: 5,
          minWidth: 0,
          padding: "4px 10px",
        },
      },
    },
  },
});

export default theme;
