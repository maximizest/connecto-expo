const { hairlineWidth } = require('nativewind/theme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        // 한글 폰트: 학교안심둥근미소 (assets/fonts/에 추가 필요)
        // 영문 폰트: Inter (시스템 폰트)
        primary: ['Hakgyoansim-Dunggeunmiso', 'sans-serif'],
        secondary: ['Inter', 'sans-serif'],
      },
      fontSize: {
        // Figma 디자인 시스템 기반 타이포그래피 스케일
        // [fontSize, { lineHeight, letterSpacing }]
        'heading-1': ['24px', { lineHeight: '120%', letterSpacing: '-0.03em' }],
        'text-xl': ['20px', { lineHeight: '120%', letterSpacing: '-0.03em' }],
        'text-lg': ['16px', { lineHeight: '120%', letterSpacing: '-0.03em' }],
        'text-md': ['14px', { lineHeight: '120%', letterSpacing: '-0.03em' }],
        'text-sm': ['12px', { lineHeight: '120%', letterSpacing: '-0.03em' }],
        'text-xs': ['10px', { lineHeight: '120%', letterSpacing: '-0.03em' }],
      },
      colors: {
        // 기본 색상
        base: {
          white: 'hsl(var(--base-white))',
          black: 'hsl(var(--base-black))',
          red: 'hsl(var(--base-red))',
        },
        // Purple 스케일
        purple: {
          25: 'hsl(var(--purple-25))',
          50: 'hsl(var(--purple-50))',
          100: 'hsl(var(--purple-100))',
          200: 'hsl(var(--purple-200))',
          300: 'hsl(var(--purple-300))',
          400: 'hsl(var(--purple-400))',
          500: 'hsl(var(--purple-500))',
          600: 'hsl(var(--purple-600))',
          700: 'hsl(var(--purple-700))',
          800: 'hsl(var(--purple-800))',
          900: 'hsl(var(--purple-900))',
          950: 'hsl(var(--purple-950))',
        },
        // Yellow 스케일
        yellow: {
          25: 'hsl(var(--yellow-25))',
          50: 'hsl(var(--yellow-50))',
          100: 'hsl(var(--yellow-100))',
          200: 'hsl(var(--yellow-200))',
          300: 'hsl(var(--yellow-300))',
          400: 'hsl(var(--yellow-400))',
          500: 'hsl(var(--yellow-500))',
          600: 'hsl(var(--yellow-600))',
          700: 'hsl(var(--yellow-700))',
          800: 'hsl(var(--yellow-800))',
          900: 'hsl(var(--yellow-900))',
          950: 'hsl(var(--yellow-950))',
        },
        // Success (Green) 스케일
        success: {
          50: 'hsl(var(--success-50))',
          200: 'hsl(var(--success-200))',
          700: 'hsl(var(--success-700))',
        },
        // Semantic 색상 (기존 호환성 유지)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
