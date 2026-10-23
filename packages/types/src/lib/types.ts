export type Trek = {
  name: string;
  durationDays: number;
  level: 'Diff+' | 'Diff++' | 'Diff+++';
  region: string;
};

export const TREK_REGIONS = [
  'Everest',
  'Annapurna',
  'Langtang',
  'Manaslu',
  'Mustang',
  'Kanchenjunga',
] as const;

export const FEATURED_TREKS: Trek[] = [
  {
    name: 'Everest Base Camp',
    durationDays: 14,
    level: 'Diff++',
    region: 'Khumbu Region',
  },
  {
    name: 'Annapurna Circuit',
    durationDays: 16,
    level: 'Diff+++',
    region: 'Annapurna Region',
  },
  {
    name: 'Langtang Valley',
    durationDays: 10,
    level: 'Diff+',
    region: 'Langtang Region',
  },
];
