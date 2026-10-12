import { cn } from '@/lib/utils';

const statusConfig = {
  '已投递': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  '简历筛选': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  '笔试': { bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-200' },
  '一面': { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
  '二面': { bg: 'bg-orange-100', text: 'text-orange-900', border: 'border-orange-200' },
  'HR面': { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  'Offer': { bg: 'bg-emerald-100', text: 'text-emerald-900', border: 'border-emerald-200' },
  '已拒绝': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
};

export const StatusBadge = ({ status, className }) => {
  const config = statusConfig[status] || statusConfig['已投递'];
  
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
      config.bg,
      config.text,
      config.border,
      className
    )}>
      {status}
    </span>
  );
};
