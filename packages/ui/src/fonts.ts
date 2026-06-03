export const queue2Fonts = {
  display: {
    family: 'var(--font-display)',
    name: "Archivo Black",
    fallback: 'Impact, Haettenschweiler, "Arial Black", sans-serif'
  },
  body: {
    family: 'var(--font-body)',
    name: "Inter Tight",
    fallback: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  },
  mono: {
    family: 'var(--font-mono)',
    name: "JetBrains Mono",
    fallback: '"SFMono-Regular", Consolas, "Liberation Mono", monospace'
  }
} as const;

export const queue2FontVariables = {
  display: "--font-display",
  body: "--font-body",
  mono: "--font-mono"
} as const;
