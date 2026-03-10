export const sanitizeHexColor = (value?: string | null): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)
    ? trimmed
    : undefined;
};
