export type PrintUrlOptions = {
  answerStyle: "key-at-end" | "inline";
  showExplanations: boolean;
};

export function printQueryParams({ answerStyle, showExplanations }: PrintUrlOptions): string {
  const params = new URLSearchParams();
  if (answerStyle === "inline") params.set("style", "inline");
  if (showExplanations) params.set("explanations", "1");
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function parsePrintSearchParams(
  sp: Record<string, string | string[] | undefined>,
): PrintUrlOptions {
  const style = sp.style;
  const explanations = sp.explanations;
  return {
    answerStyle: style === "inline" ? "inline" : "key-at-end",
    showExplanations: explanations === "1" || explanations === "true",
  };
}

export const PRINT_SESSION_KEY = "opo_jex_print_job";
