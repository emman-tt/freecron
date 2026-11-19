//Header helpers. Some jobs were created with quoted header keys/values
//("'Content-type'": "'application/json'") — the API stores them verbatim,
//so the UI strips one layer of wrapping single quotes and matches names
//case-insensitively. Display only: the stored value is left untouched.
function unquote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function headerEntries(
  headers: Record<string, string>,
): Array<[string, string]> {
  return Object.entries(headers).map(([name, value]) => [unquote(name), unquote(value)]);
}

export function headerValue(
  headers: Record<string, string>,
  name: string,
): string | undefined {
  const wanted = name.toLowerCase();
  return headerEntries(headers).find(([key]) => key.toLowerCase() === wanted)?.[1];
}
