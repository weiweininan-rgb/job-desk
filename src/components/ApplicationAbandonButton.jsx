import { useState } from 'react';
import { CircleOff, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const ApplicationAbandonButton = ({ application, onToggle }) => {
  const [pending, setPending] = useState(false);
  if (!onToggle) return null;
  const toggle = async () => {
    setPending(true);
    try {
      await onToggle(application);
    } catch {
      // The mutation displays the failure; retain the current state for retry.
    } finally {
      setPending(false);
    }
  };
  const Icon = application.is_abandoned ? RotateCcw : CircleOff;
  return <Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs text-slate-600" disabled={pending} onClick={toggle}><Icon className="h-3 w-3" />{pending ? '保存中…' : application.is_abandoned ? '恢复推进' : '主动放弃'}</Button>;
};
