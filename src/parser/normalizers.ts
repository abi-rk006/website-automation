/**
 * Normalization utilities for fields, booleans, and navigation steps.
 */

const FIELD_MAP: Record<string, string> = {
  'user id': 'userId',
  'user_id': 'userId',
  'userid': 'userId',
  'first name': 'firstName',
  'first_name': 'firstName',
  'firstname': 'firstName',
  'last name': 'lastName',
  'last_name': 'lastName',
  'lastname': 'lastName',
  'department': 'department',
  'dept': 'department',
  'email': 'email',
  'email address': 'email',
  'email_address': 'email',
  'active checkbox': 'active',
  'active': 'active',
  'is active': 'active',
  'is_active': 'active',
  'label': 'label',
  'name': 'name',
  'application': 'application',
  'title': 'title',
  'owner': 'owner',
  'role': 'role',
  'roles': 'roles',
  'group': 'group',
  'groups': 'groups',
  'description': 'description',
};

/**
 * Normalizes field names to camelCase standard keys while preserving raw labels.
 */
export function normalizeFieldName(rawLabel: string): string {
  const cleaned = rawLabel.trim().toLowerCase().replace(/[:_]/g, ' ').replace(/\s+/g, ' ');
  if (FIELD_MAP[cleaned]) {
    return FIELD_MAP[cleaned];
  }

  // Convert "Some Field Name" to camelCase
  return rawLabel
    .trim()
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .split(/[\s_-]+/)
    .map((word, idx) =>
      idx === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join('');
}

/**
 * Normalizes boolean string values.
 * Returns boolean if recognized, otherwise returns original value.
 */
export function normalizeBooleanValue(val: any): any {
  if (typeof val === 'boolean') return val;
  if (typeof val !== 'string') return val;

  const cleaned = val.trim().toLowerCase().replace(/[.,!]/g, '');

  const TRUE_VALUES = new Set(['enabled', 'checked', 'true', 'yes', 'on', '1']);
  const FALSE_VALUES = new Set(['disabled', 'unchecked', 'false', 'no', 'off', '0']);

  if (TRUE_VALUES.has(cleaned)) return true;
  if (FALSE_VALUES.has(cleaned)) return false;

  return val.trim();
}

/**
 * Extracts and normalizes navigation path from text like:
 * "To begin, navigate to All > User Administration > Users and select New."
 * or "All > User Administration > Users > New"
 */
export function extractNavigationSteps(text: string): string[] | undefined {
  if (!text) return undefined;

  let cleaned = text.trim();
  const navIdx = cleaned.search(/navigate to\s+/i);
  if (navIdx !== -1) {
    cleaned = cleaned.slice(navIdx).replace(/^navigate to\s+/i, '');
  }

  // Pattern 1: Path with chevron separator: e.g. "All > User Administration > Users and select New"
  const chevronMatch = cleaned.match(/([A-Za-z0-9_\s]+(?:\s*>\s*[A-Za-z0-9_\s]+)+(?:\s+and\s+select\s+[A-Za-z0-9_\s]+)?)/i);
  if (chevronMatch) {
    const rawPath = chevronMatch[1];
    const steps: string[] = [];

    // Split by '>'
    const parts = rawPath.split(/\s*>\s*/);
    for (let i = 0; i < parts.length; i++) {
      let part = parts[i].trim();
      part = part.replace(/^navigate to\s+/i, '').trim();
      // If the last part has "and select <target>"
      const selectMatch = part.match(/^(.*?)\s+and\s+select\s+(.*)$/i);
      if (selectMatch) {
        if (selectMatch[1].trim()) steps.push(selectMatch[1].trim());
        if (selectMatch[2].trim()) steps.push(selectMatch[2].trim());
      } else {
        if (part) steps.push(part);
      }
    }

    if (steps.length > 0) {
      return steps.map((s) => s.replace(/[.,]$/, '').trim()).filter(Boolean);
    }
  }

  // Pattern 2: "navigate to X and select Y"
  const selectOnlyMatch = text.match(/navigate to\s+([A-Za-z0-9_\s]+)\s+and\s+select\s+([A-Za-z0-9_\s]+)/i);
  if (selectOnlyMatch) {
    return [selectOnlyMatch[1].trim(), selectOnlyMatch[2].trim()];
  }

  return undefined;
}
