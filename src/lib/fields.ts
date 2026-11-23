import type { Detail } from './content'

/** Order and UI labels of the detail fields shown in the side panel. */
export const DETAIL_FIELDS: { key: keyof Detail; label: string }[] = [
  { key: 'whatPasses', label: 'What data or material passes' },
  { key: 'whoNeeds', label: 'Who needs it' },
  { key: 'dataSource', label: 'Source of the data' },
  { key: 'uncertainty', label: 'Uncertainty (range or note)' },
  { key: 'implementationRequirement', label: 'Requirement for implementation' },
  { key: 'expectedBenefit', label: 'Expected benefit' },
  { key: 'sourceRef', label: 'Source reference' },
]
