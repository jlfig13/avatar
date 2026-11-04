import ptBR from './pt-BR.json';

// docs/05 §10 — every player-facing text lives in pt-BR.json.
export type MessageKey = keyof typeof ptBR;
const messages: Readonly<Record<string, string>> = ptBR;

/** Translated text; `{name}` placeholders are replaced by `params`. Missing keys return the key. */
export function t(
  key: MessageKey | (string & {}),
  params: Record<string, string | number> = {},
): string {
  const template = messages[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
