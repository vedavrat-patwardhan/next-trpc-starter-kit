import tailwindAnimate from 'tailwindcss-animate';
import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    '*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // New primary brand color
        primary: {
          DEFAULT: '#4A90E2', // New default primary color
          foreground: 'hsl(var(--primary-foreground))', // Assuming this remains for contrast text
          50: '#EAF2FB',
          100: '#D5E5F8',
          200: '#ABCBF0',
          300: '#82B1E9',
          400: '#5898E3',
          500: '#4A90E2',
          600: '#3A73B5',
          700: '#2B5688',
          800: '#1C3A5A',
          900: '#0E1D2D',
        },
        // Secondary colors - grays and dark navy
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280', // Medium gray
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937', // Dark navy
          900: '#111827', // Almost black
        },
        // Background colors from the design
        background: {
          DEFAULT: 'hsl(var(--background))',
          light: '#FFFFFF',
          dark: '#0A1629', // Dark navy background from right side
          gray: '#8896AB', // Gray background from checkerboard
        },
        // Text colors
        text: {
          primary: '#111827',
          secondary: '#6B7280',
          white: '#FFFFFF',
          link: '#0066CC',
        },
        // Status colors
        status: {
          success: '#10B981',
          error: '#EF4444',
          warning: '#F59E0B',
          info: '#3B82F6',
        },
        // New Accent Color
        appAccent: {
          DEFAULT: '#F5A623',
          50: '#FEF9E9',
          100: '#FDF3D3',
          200: '#FCE7A8',
          300: '#FADCA0',
          400: '#F8C570',
          500: '#F5A623', // Default Accent
          600: '#D48F1E',
          700: '#B37819',
          800: '#926114',
          900: '#714A0F',
        },
        // shadcn/ui required colors
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        foreground: 'hsl(var(--foreground))',
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: { // This is for shadcn/ui, refers to CSS vars
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
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      borderRadius: {
        none: '0',
        sm: 'calc(var(--radius) - 4px)',
        DEFAULT: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': '1rem',
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        DEFAULT:
          '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      spacing: {
        // Custom spacing to match Figma design
        'form-gap': '1.5rem', // Gap between form elements
        'section-gap': '2rem', // Gap between sections
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
      fontFamily: {
        sans: ['var(--font-inter)', ...defaultTheme.fontFamily.sans],
        heading: ['var(--font-poppins)', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [tailwindAnimate],
};

export default config;
