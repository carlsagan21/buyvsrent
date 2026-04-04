import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#0b0e13",
      paper: "#121212",
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
      disabled: "#4b5363",
    },
    divider: "rgba(255, 255, 255, 0.08)",
  },
  typography: {
    fontFamily: "'DM Sans', sans-serif",
    h1: { fontSize: 24, fontWeight: 700, color: "#e6edf3" },
    h2: { fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#e6edf3" }, // For Main Inputs
    h3: { fontSize: 28, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }, // For Hero Results
    subtitle1: { fontSize: 13, color: "#8b949e" },
    subtitle2: { fontSize: 14, fontWeight: 700 }, // For "VS" or equivalent
    body2: { fontSize: 12, color: "#8b949e", lineHeight: 1.6 },
    caption: { fontSize: 12, color: "#8b949e" },
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
          backgroundImage: undefined,
          border: "none",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
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
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
      },
      styleOverrides: {
        root: {
          // Standard inner padding tweaks if necessary
        }
      }
    }
  },
});

export default theme;
