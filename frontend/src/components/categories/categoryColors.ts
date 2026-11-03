/** Accent colors for categories. The backend stores the key, so keep the keys stable. */
export const CATEGORY_COLORS: Record<string, string> = {
  sky: '#4aa3df',
  rose: '#e0607e',
  emerald: '#3fb68b',
  violet: '#9a7be0',
  yellow: '#e2b93b',
  teal: '#38b2b8',
  pink: '#d96bb5',
  lime: '#9bc53d'
}

export const CATEGORY_COLOR_KEYS = Object.keys(CATEGORY_COLORS)

export function colorOf(key: string): string {
  return CATEGORY_COLORS[key] ?? CATEGORY_COLORS.yellow
}
