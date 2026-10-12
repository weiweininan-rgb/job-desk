export const compareApplications = (left, right, sortBy = 'application_desc') => {
  const abandoned = Number(Boolean(left.is_abandoned)) - Number(Boolean(right.is_abandoned));
  if (abandoned) return abandoned;
  const pinned = Number(Boolean(right.is_pinned)) - Number(Boolean(left.is_pinned));
  if (pinned) return pinned;
  if (sortBy === 'company') return left.company_name.localeCompare(right.company_name, 'zh-CN');
  const leftDate = new Date(left.application_date || 0).getTime() || 0;
  const rightDate = new Date(right.application_date || 0).getTime() || 0;
  return sortBy === 'application_asc' ? leftDate - rightDate : rightDate - leftDate;
};
