// One stable colour per module — used for node accents, edges and the sidebar legend.
const MODULE_COLORS = {
  ACARE: '#E8503A', // Pulse Coral (matches HMS design system)
  ACC: '#2E9E8F',
  DCARE: '#7C5CFC',
  EMERG: '#E0384E',
  FACILITY: '#3B82C4',
  HRM: '#D98A2B',
  LIS: '#0EA5A0',
  OTM: '#C13FA6',
  PAMS: '#5B8DEF',
  PCARE: '#37A66B',
  PHAR: '#8B5CF6',
  QUEUE: '#64748B',
  ROUTING: '#0891B2',
  SCM: '#B45309',
  WBM: '#059669',
  RBAC: '#6366F1',
  SYSTEM: '#6B7280',
}

export const colorForModule = (name) => MODULE_COLORS[name] || '#6B7280'
