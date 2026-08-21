export const UI_THEMES = ["base", "chatgpt", "claude", "grok", "gemini", "perplexity"] as const;
export type UiTheme = (typeof UI_THEMES)[number];

export const THEME_LABELS: Record<UiTheme, string> = {
  base: "Base",
  chatgpt: "ChatGPT",
  claude: "Claude",
  grok: "Grok",
  gemini: "Gemini",
  perplexity: "Perplexity",
};

export function loadTheme(): UiTheme {
  const saved = localStorage.getItem("codex-web-ui-theme");
  return UI_THEMES.includes(saved as UiTheme) ? saved as UiTheme : "base";
}

export function saveTheme(theme: UiTheme): void {
  localStorage.setItem("codex-web-ui-theme", theme);
}
