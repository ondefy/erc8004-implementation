import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ZyFI Brand Colors
        zyfi: {
          bg: '#0D131C',
          'bg-secondary': '#182739',
          'bg-tertiary': '#101924',
          'border': '#253B49',
          'accent-blue': '#6C92C2',
          'accent-light': '#AFCAEE',
          'accent-cyan': '#138DBA',
          'accent-bright': '#58E3FE',
          'gradient-start': '#6373D2',
          'gradient-end': '#55B3D1',
          'glow': '#33b4d9',
        },
        // Semantic colors matching ZyFI theme
        brand: {
          1: '#6C92C2',
          2: '#AFCAEE',
          3: '#138DBA',
          4: '#58E3FE',
          5: '#6373D2',
          6: '#55B3D1',
        },
      },
      backgroundImage: {
        'gradient-zyfi-primary': 'linear-gradient(94deg, #6C92C2 3.44%, #AFCAEE 88.73%)',
        'gradient-zyfi-secondary': 'linear-gradient(0deg, #B0B6BC 90%, #747B81 95%)',
        'gradient-zyfi-quaternary': 'linear-gradient(98deg, #138DBA 0%, #58E3FE 100%)',
        'gradient-zyfi-border': 'linear-gradient(90deg, #6373D2 1.13%, #55B3D1 100%)',
      },
      boxShadow: {
        'zyfi-glow': '0 0 10px #33b4d9',
        'zyfi-glow-lg': '0 0 20px #33b4d9',
      },
      borderRadius: {
        'zyfi': '12.5px',
        'zyfi-lg': '18px',
      },
    },
  },
  plugins: [],
};

export default config;
