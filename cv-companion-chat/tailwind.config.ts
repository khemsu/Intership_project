import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		fontFamily: {
			sans: ['var(--font-sans)'],
			heading: ['var(--font-heading)'],
			mono: ['var(--font-mono)']
		},
		extend: {
			fontSize: {
				'xs': '0.6875rem',	/* 11px */
				'sm': '0.75rem',	/* 12px */
				'base': '0.8125rem',	/* 13px */
				'lg': '0.9375rem',	/* 15px */
				'xl': '1.0625rem',	/* 17px */
				'2xl': '1.25rem',	/* 20px */
				'3xl': '1.5rem',	/* 24px */
				'4xl': '1.75rem',	/* 28px */
				'5xl': '2rem',	/* 32px */
				'6xl': '2.25rem',	/* 36px */
			},
			colors: {
        // Base colors
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        
        // Primary Colors - Main brand color
        primary: {
          DEFAULT: 'hsl(221, 83%, 53%)',    // Blue-600
          foreground: 'hsl(0, 0%, 100%)',   // White text
          light: 'hsl(213, 94%, 68%)',      // Lighter blue
          dark: 'hsl(224, 76%, 48%)'        // Darker blue
        },
        
        // Secondary Colors - For secondary actions
        secondary: {
          DEFAULT: 'hsl(210, 40%, 96.1%)',  // Light gray
          foreground: 'hsl(222.2, 47.4%, 11.2%)', // Dark text
          light: 'hsl(210, 40%, 99%)',      // Lighter gray
          dark: 'hsl(214.3, 31.8%, 91.4%)'  // Border gray
        },
        
        // Accent Colors - For highlights
        accent: {
          DEFAULT: 'hsl(210, 40%, 96.1%)',  // Light gray
          foreground: 'hsl(222.2, 47.4%, 11.2%)'  // Dark text
        },
        
        // Status Colors
        success: {
          DEFAULT: 'hsl(142.1, 76.2%, 36.3%)',  // Green-600
          foreground: 'hsl(0, 0%, 100%)'    // White text
        },
        warning: {
          DEFAULT: 'hsl(38, 92%, 50%)',     // Amber-500
          foreground: 'hsl(0, 0%, 100%)'    // White text
        },
        error: {
          DEFAULT: 'hsl(0, 84.2%, 60.2%)',  // Red-500
          foreground: 'hsl(0, 0%, 100%)'    // White text
        },
        info: {
          DEFAULT: 'hsl(199, 89%, 48%)',    // Blue-600
          foreground: 'hsl(0, 0%, 100%)'    // White text
        },
        
        // Neutral Colors
        muted: {
          DEFAULT: 'hsl(210, 40%, 96.1%)',  // Light gray
          foreground: 'hsl(215.4, 16.3%, 46.9%)' // Gray text
        },
        
        // UI Colors
        popover: {
          DEFAULT: 'hsl(0, 0%, 100%)',      // White
          foreground: 'hsl(222.2, 84%, 4.9%)' // Dark text
        },
        card: {
          DEFAULT: 'hsl(0, 0%, 100%)',      // White
          foreground: 'hsl(222.2, 84%, 4.9%)' // Dark text
        },
        sidebar: {
          DEFAULT: 'hsl(210, 40%, 98%)',    // Light gray
          foreground: 'hsl(240, 5.3%, 26.1%)', // Dark gray text
          primary: 'hsl(240, 5.9%, 10%)',   // Very dark gray
          'primary-foreground': 'hsl(0, 0%, 98%)', // Off-white text
          accent: 'hsl(240, 4.8%, 95.9%)',  // Very light gray
          'accent-foreground': 'hsl(240, 5.9%, 10%)', // Very dark gray text
          border: 'hsl(220, 13%, 91%)',     // Light gray border
          ring: 'hsl(217.2, 91.2%, 59.8%)'  // Blue ring
        }
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
