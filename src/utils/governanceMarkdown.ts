/** Normalize common HTML line breaks found in on-chain governance metadata. */
export function preprocessGovernanceMarkdown(text: string): string {
  return text.replace(/<br\s*\/?>/gi, '\n\n');
}
