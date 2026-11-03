import { z } from 'zod/v4';

const SourceGeometry = z.object({
  groupSpan: z.number().int().min(1).max(100).nullable(),
  position: z.enum(['whole', 'top', 'bottom', 'unclear']),
  explicitLab: z.boolean(),
});

/** Horizontal group span and vertical week position are independent. */
export function classifyGeometry(source: unknown) {
  const geometry = SourceGeometry.parse(source);
  return {
    week: geometry.position === 'top' ? 'upper' : geometry.position === 'bottom' ? 'lower' : geometry.position === 'whole' ? 'all' : null,
    type: geometry.explicitLab ? 'lab' : geometry.groupSpan === null ? null : geometry.groupSpan >= 2 ? 'lecture' : 'seminar',
  };
}
