export function governanceMetadataDownloadFilename(
  title: string | null | undefined,
  proposalLabel: string,
): string {
  const base = (title?.trim() || proposalLabel).replace(/ /g, '-');
  return `${base}.json`;
}
