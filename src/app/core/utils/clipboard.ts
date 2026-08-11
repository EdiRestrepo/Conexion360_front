export function copyToClipboard(value: string): Promise<boolean> {
  const clipboard = globalThis.navigator?.clipboard;

  if (!clipboard) {
    return Promise.resolve(false);
  }

  return clipboard.writeText(value).then(
    () => true,
    () => false,
  );
}
