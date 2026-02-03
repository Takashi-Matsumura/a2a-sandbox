/**
 * Privacy rules configuration for schedule data
 */

export interface PrivacyRule {
  field: string;
  action: 'hide' | 'mask' | 'replace';
  replacement?: string;
  condition?: (value: unknown, context: PrivacyContext) => boolean;
}

export interface PrivacyContext {
  requesterId?: string;
  requesterType?: 'internal' | 'external' | 'owner';
  isPrivate?: boolean;
}

/**
 * Default privacy rules for schedule data
 * These rules ensure that personal information is not exposed to external agents
 */
export const SCHEDULE_PRIVACY_RULES: PrivacyRule[] = [
  {
    // Hide event titles for private events
    field: 'title',
    action: 'replace',
    replacement: 'Busy',
    condition: (_, context) => context.isPrivate === true,
  },
  {
    // Hide descriptions for all events when requested by external agents
    field: 'description',
    action: 'hide',
    condition: (_, context) => context.requesterType === 'external',
  },
  {
    // Always hide description for private events
    field: 'description',
    action: 'hide',
    condition: (_, context) => context.isPrivate === true,
  },
];

/**
 * Fields that are always safe to expose
 */
export const SAFE_FIELDS = [
  'startTime',
  'endTime',
  'status',
  'visibility',
  'available',
];

/**
 * Fields that should never be exposed to external agents
 */
export const SENSITIVE_FIELDS = [
  'description',
  'notes',
  'attendees',
  'location',
];

/**
 * Check if a field is safe to expose
 */
export function isSafeField(field: string): boolean {
  return SAFE_FIELDS.includes(field);
}

/**
 * Check if a field is sensitive
 */
export function isSensitiveField(field: string): boolean {
  return SENSITIVE_FIELDS.includes(field);
}
