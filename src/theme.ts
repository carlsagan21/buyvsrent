import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#0b0e13",
      paper: "#121212", // MD standard dark surface for proper elevation overlays
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
      secondary: "#8b949e",
    },
    divider: "rgba(255, 255, 255, 0.08)",
  },
  typography: {
    fontFamily: "'DM Sans', sans-serif",
    h1: { fontSize: 24, fontWeight: 700, color: "#e6edf3" },
    subtitle1: { fontSize: 13, color: "#8b949e" },
    body2: { fontSize: 13, color: "#8b949e", lineHeight: 1.6 },
    caption: { fontSize: 11, color: "#6b7280" },
    overline: { fontSize: 11, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase" },
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
          backgroundImage: undefined, // Let MUI apply MD2 gradient overlays per elevation
          border: "none", // Remove the explicit border
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16, // MD standard chip radius
          fontWeight: 500,
          fontSize: 13,
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          color: "#4a9eff",
        },
        thumb: {
          "&:hover, &.Mui-focusVisible": {
            boxShadow: "0 0 0 8px rgba(74, 158, 255, 0.16)",
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
  },
});

export default theme;
