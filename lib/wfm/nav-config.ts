export const WFM_NAV_TABS = [
  { href: '/wfm', key: 'occupancy' as const, requiresManage: false },
  { href: '/wfm/roster', key: 'roster' as const, requiresManage: false },
  { href: '/wfm/swaps', key: 'swaps' as const, requiresManage: false },
  { href: '/wfm/shifts', key: 'shifts' as const, requiresManage: true },
  { href: '/wfm/skills', key: 'skills' as const, requiresManage: true },
  { href: '/wfm/oncall', key: 'oncall' as const, requiresManage: true },
  { href: '/wfm/forecast', key: 'forecast' as const, requiresManage: false },
  { href: '/wfm/reviews', key: 'reviews' as const, requiresManage: false },
] as const;

export type WfmNavTabKey = (typeof WFM_NAV_TABS)[number]['key'];

export function wfmNavTabsForRole(canManageWfm: boolean) {
  return WFM_NAV_TABS.filter((tab) => !tab.requiresManage || canManageWfm);
}

export const WFM_SIDEBAR_LABEL_KEYS = {
  occupancy: 'wfmOccupancy',
  roster: 'wfmMyRoster',
  swaps: 'wfmSwaps',
  shifts: 'wfmShifts',
  skills: 'wfmSkills',
  oncall: 'wfmOncall',
  forecast: 'wfmForecast',
  reviews: 'wfmReviews',
} as const satisfies Record<WfmNavTabKey, string>;
