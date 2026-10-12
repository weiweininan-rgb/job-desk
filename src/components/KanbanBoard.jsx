import { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, GripVertical, Pin, MapPin, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApplicationAbandonButton } from './ApplicationAbandonButton';

const columns = [
  { id: '已投递', title: '已投递', color: 'bg-slate-100' },
  { id: '简历筛选', title: '简历筛选', color: 'bg-amber-50' },
  { id: '笔试', title: '笔试', color: 'bg-amber-100' },
  { id: '一面', title: '一面', color: 'bg-orange-50' },
  { id: '二面', title: '二面', color: 'bg-orange-100' },
  { id: 'HR面', title: 'HR面', color: 'bg-emerald-50' },
  { id: 'Offer', title: 'Offer', color: 'bg-emerald-100' },
  { id: '已拒绝', title: '已拒绝', color: 'bg-red-100' },
];

export const KanbanBoard = ({ applications, onEdit, onUpdateStatus, onTogglePinned, onToggleAbandoned }) => {
  const [draggedApp, setDraggedApp] = useState(null);
  const boardRef = useRef(null);

  const handleDragStart = (app) => {
    setDraggedApp(app);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, status) => {
    e.preventDefault();
    if (draggedApp && draggedApp.status !== status) {
      onUpdateStatus({ id: draggedApp.id, status });
    }
    setDraggedApp(null);
  };

  const getColumnApps = (status) => {
    return applications.filter(app => app.status === status);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">各列可独立上下滚动，左右切换查看其他阶段。</p>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" aria-label="向左查看阶段" onClick={() => boardRef.current?.scrollBy({ left: -304, behavior: 'smooth' })}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" aria-label="向右查看阶段" onClick={() => boardRef.current?.scrollBy({ left: 304, behavior: 'smooth' })}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <div ref={boardRef} className="overflow-x-auto pb-3" tabIndex={0} aria-label="求职阶段看板">
      <div className="flex h-[65vh] min-h-[320px] max-h-[720px] min-w-max gap-4">
        {columns.map((column) => {
          const columnApps = getColumnApps(column.id);
          
          return (
            <div
              key={column.id}
              className="h-full w-72 flex-shrink-0"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className={cn('flex h-full flex-col rounded-2xl border border-white/80 p-3 shadow-sm', column.color)}>
                <div className="mb-3 flex shrink-0 items-center justify-between">
                  <h3 className="font-semibold text-sm">{column.title}</h3>
                  <Badge variant="secondary" className="bg-white/80">
                    {columnApps.length}
                  </Badge>
                </div>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1" tabIndex={0} aria-label={`${column.title}岗位列表`}>
                  {columnApps.map((app) => (
                      <Card
                      key={app.id}
                      draggable
                      onDragStart={() => handleDragStart(app)}
                      className={cn(
                        'cursor-move border-slate-200 bg-white/95 transition-shadow hover:shadow-md',
                        app.is_abandoned && 'bg-slate-100 opacity-65 grayscale',
                        draggedApp?.id === app.id && 'opacity-50'
                      )}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{app.company_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{app.position}</p>
                            {app.is_abandoned && <Badge className="mt-1 bg-slate-200 text-slate-700 hover:bg-slate-200">已主动放弃</Badge>}
                            {(app.batch || app.is_chengdu || app.is_major_company) && <div className="mt-1 flex flex-wrap gap-1"><>{app.batch && <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', app.batch === '提前批' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700')}>{app.batch}</span>}{app.is_chengdu && <span className="inline-flex items-center rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700"><MapPin className="mr-0.5 h-2.5 w-2.5" />优先城市</span>}{app.is_major_company && <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900"><Star className="mr-0.5 h-2.5 w-2.5" />大厂</span>}</></div>}
                          </div>
                          {app.is_pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-amber-700" />}
                          <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        </div>
                        <div className="flex gap-1 mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => onEdit(app)}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          {onTogglePinned && <Button variant="ghost" size="sm" className="h-7 px-2 text-amber-800 hover:bg-amber-50 hover:text-amber-900" onClick={() => onTogglePinned(app)} title={app.is_pinned ? '取消置顶' : '置顶'}><Pin className="w-3 h-3" /></Button>}
                          <ApplicationAbandonButton application={app} onToggle={onToggleAbandoned} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
};
