import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Building2, 
  Calendar as CalendarIcon,
  Grid3X3,
  List,
  Clock3
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  addMonths, 
  subMonths, 
  addWeeks, 
  subWeeks,
  isSameMonth, 
  isSameDay, 
  startOfDay,
  endOfDay,
  isWithinInterval,
  parseISO
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { processTypes, getProcessUrgency, getUrgencyStyles } from '@/lib/processConfig';

// 视图类型
const VIEW_TYPES = {
  MONTH: 'month',
  WEEK: 'week',
  DAY: 'day',
};

// 流程类型图标
const ProcessTypeIcon = ({ type }) => {
  const processType = processTypes.find(p => p.value === type) || processTypes[2];
  return (
    <span className={cn(
      'inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-medium',
      processType.color
    )}>
      {type.charAt(0)}
    </span>
  );
};

export const CalendarView = ({ interviews: processes, applications, onProcessClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState(VIEW_TYPES.MONTH);
  const validDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  // 获取某天的流程
  const getProcessesForDay = (date) => {
    return processes.filter(process => {
      const processDate = validDate(process.scheduled_time);
      return processDate ? isSameDay(processDate, date) : false;
    });
  };

  // 获取某周的流程
  const getProcessesForWeek = (date) => {
    const weekStart = startOfWeek(date, { locale: zhCN });
    const weekEnd = endOfWeek(date, { locale: zhCN });
    return processes.filter(process => {
      const processDate = validDate(process.scheduled_time);
      return processDate ? isWithinInterval(processDate, { start: weekStart, end: weekEnd }) : false;
    });
  };

  // 获取应用信息
  const getApplicationForProcess = (process) => {
    return applications.find(app => app.id === process.application_id);
  };

  // 导航函数
  const previous = () => {
    if (viewType === VIEW_TYPES.MONTH) {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (viewType === VIEW_TYPES.WEEK) {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, -1));
    }
  };

  const next = () => {
    if (viewType === VIEW_TYPES.MONTH) {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewType === VIEW_TYPES.WEEK) {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const goToToday = () => setCurrentDate(new Date());

  // 获取标题
  const getTitle = () => {
    if (viewType === VIEW_TYPES.MONTH) {
      return format(currentDate, 'yyyy年MM月', { locale: zhCN });
    } else if (viewType === VIEW_TYPES.WEEK) {
      const weekStart = startOfWeek(currentDate, { locale: zhCN });
      const weekEnd = endOfWeek(currentDate, { locale: zhCN });
      return `${format(weekStart, 'MM/dd')} - ${format(weekEnd, 'MM/dd')}`;
    } else {
      return format(currentDate, 'yyyy年MM月dd日 EEEE', { locale: zhCN });
    }
  };

  // 月视图渲染
  const MonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { locale: zhCN });
    const calendarEnd = endOfWeek(monthEnd, { locale: zhCN });

    const days = [];
    let day = calendarStart;
    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }

    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
          {weekDays.map((d) => (
            <div key={d} className="bg-gray-50 p-3 text-center text-sm font-medium text-gray-600">
              {d}
            </div>
          ))}
          {days.map((dayItem, idx) => {
            const dayProcesses = getProcessesForDay(dayItem);
            const isCurrentMonth = isSameMonth(dayItem, monthStart);
            const isToday = isSameDay(dayItem, new Date());

            return (
              <div
                key={dayItem.toISOString()}
                className={cn(
                  'bg-white min-h-[100px] p-2 transition-colors hover:bg-gray-50',
                  !isCurrentMonth && 'bg-gray-50/50 text-gray-400',
                  isToday && 'bg-amber-50'
                )}
                onClick={() => {
                  setCurrentDate(dayItem);
                  setViewType(VIEW_TYPES.DAY);
                }}
              >
                <div className={cn(
                  'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1',
                  isToday ? 'bg-slate-950 text-amber-300' : 'text-gray-700'
                )}>
                  {format(dayItem, 'd')}
                </div>
                <div className="space-y-1">
                  {dayProcesses.slice(0, 3).map((process) => {
                    const app = getApplicationForProcess(process);
                    const urgency = getProcessUrgency(process);
                    const styles = getUrgencyStyles(urgency.urgencyLevel);
                    
                    return (
                      <button
                        key={process.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onProcessClick(process, app);
                        }}
                        className={cn(
                          'w-full text-left text-[10px] p-1 rounded border transition-colors truncate',
                          urgency.isUrgent ? styles.bg + ' ' + styles.border : 'border-amber-200 bg-amber-50 hover:bg-amber-100'
                        )}
                        title={`${process.process_type} - ${app?.company_name}`}
                      >
                        <span className={cn(
                          'font-medium',
                          urgency.isUrgent ? styles.icon : 'text-amber-900'
                        )}>
                          {process.process_type}
                        </span>
                      </button>
                    );
                  })}
                  {dayProcesses.length > 3 && (
                    <div className="text-[10px] text-center text-gray-500">
                      +{dayProcesses.length - 3} 更多
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 周视图渲染
  const WeekView = () => {
    const weekStart = startOfWeek(currentDate, { locale: zhCN });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dayProcesses = getProcessesForDay(day);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'bg-white rounded-lg border p-3 min-h-[300px]',
                  isToday && 'ring-2 ring-amber-400 border-amber-400'
                )}
              >
                <div className={cn(
                  'text-center pb-2 mb-2 border-b',
                  isToday ? 'border-amber-200' : 'border-gray-100'
                )}>
                  <div className={cn(
                    'text-xs text-gray-500',
                    isToday && 'font-medium text-amber-800'
                  )}>
                    {format(day, 'EEE', { locale: zhCN })}
                  </div>
                  <div className={cn(
                    'text-lg font-semibold',
                    isToday && 'text-amber-900'
                  )}>
                    {format(day, 'd')}
                  </div>
                </div>
                <div className="space-y-2">
                  {dayProcesses.map((process) => {
                    const app = getApplicationForProcess(process);
                    const urgency = getProcessUrgency(process);
                    const styles = getUrgencyStyles(urgency.urgencyLevel);

                    return (
                      <button
                        key={process.id}
                        onClick={() => onProcessClick(process, app)}
                        className={cn(
                          'w-full text-left p-2 rounded-lg border text-xs transition-all hover:shadow-md',
                          urgency.isUrgent ? styles.bg + ' ' + styles.border : 'border-gray-200 bg-white hover:border-amber-300'
                        )}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <ProcessTypeIcon type={process.process_type} />
                          <span className={cn(
                            'font-medium truncate',
                            urgency.isUrgent ? styles.icon : 'text-gray-800'
                          )}>
                            {process.process_type}
                          </span>
                        </div>
                        <div className="text-gray-600 truncate">
                          {app?.company_name}
                        </div>
                        <div className="text-gray-400 text-[10px] mt-1">
                          {format(new Date(process.scheduled_time), 'HH:mm')}
                        </div>
                        {urgency.isUrgent && (
                          <div className={cn(
                            'mt-1 text-[10px] font-medium',
                            styles.icon
                          )}>
                            ⚠️ {format(new Date(process.deadline), 'MM/dd')}截止
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 日视图渲染
  const DayView = () => {
    const dayProcesses = getProcessesForDay(currentDate);
    const sortedProcesses = [...dayProcesses].sort((a, b) => 
      new Date(a.scheduled_time) - new Date(b.scheduled_time)
    );

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-center mb-4 pb-4 border-b">
            <div className="text-2xl font-bold text-gray-800">
              {format(currentDate, 'd')}
            </div>
            <div className="text-sm text-gray-500">
              {format(currentDate, 'EEEE', { locale: zhCN })}
            </div>
          </div>
          
          {sortedProcesses.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Clock3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>当日无流程安排</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedProcesses.map((process) => {
                const app = getApplicationForProcess(process);
                const urgency = getProcessUrgency(process);
                const styles = getUrgencyStyles(urgency.urgencyLevel);

                return (
                  <button
                    key={process.id}
                    onClick={() => onProcessClick(process, app)}
                    className={cn(
                      'w-full text-left p-4 rounded-lg border-2 transition-all hover:shadow-lg',
                      urgency.isUrgent ? styles.bg + ' ' + styles.border : 'border-gray-200 bg-white hover:border-amber-300'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <ProcessTypeIcon type={process.process_type} />
                        <span className="font-semibold text-gray-800">
                          {process.process_type}
                        </span>
                        {urgency.isUrgent && (
                          <Badge className={styles.badge}>
                            ⚠️ 紧急
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {format(new Date(process.scheduled_time), 'HH:mm')}
                      </span>
                    </div>
                    
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        {app?.company_name}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="text-gray-400">职位:</span>
                        {app?.position}
                      </div>
                      {process.location && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {process.location}
                        </div>
                      )}
                      {process.deadline && (
                        <div className={cn(
                          'flex items-center gap-2 text-sm font-medium mt-2',
                          urgency.urgencyLevel === 'critical' ? 'text-red-600' :
                          urgency.urgencyLevel === 'warning' ? 'text-amber-600' : 'text-gray-600'
                        )}>
                          <Clock className="w-4 h-4" />
                          截止时间: {format(new Date(process.deadline), 'yyyy-MM-dd HH:mm')}
                          {urgency.isUrgent && (
                            <span className="ml-2 text-xs">
                              ({urgency.daysLeft < 0 ? '已逾期' : `还剩${urgency.daysLeft}天`})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="min-w-0 w-full border-slate-200 bg-white/95">
      <CardHeader className="flex flex-col items-start justify-between gap-3 space-y-0 p-3 pb-2 sm:p-6 sm:pb-2 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-wrap items-center gap-3 sm:gap-4">
          <CardTitle className="text-lg font-semibold leading-snug">
            {getTitle()}
          </CardTitle>
          <div className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 p-1">
            <Button
              variant={viewType === VIEW_TYPES.MONTH ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewType(VIEW_TYPES.MONTH)}
              className="h-7 text-xs"
            >
              <Grid3X3 className="w-3.5 h-3.5 mr-1" />
              月
            </Button>
            <Button
              variant={viewType === VIEW_TYPES.WEEK ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewType(VIEW_TYPES.WEEK)}
              className="h-7 text-xs"
            >
              <List className="w-3.5 h-3.5 mr-1" />
              周
            </Button>
            <Button
              variant={viewType === VIEW_TYPES.DAY ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewType(VIEW_TYPES.DAY)}
              className="h-7 text-xs"
            >
              <CalendarIcon className="w-3.5 h-3.5 mr-1" />
              日
            </Button>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            今天
          </Button>
          <Button variant="ghost" size="sm" onClick={previous} aria-label="上一页">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={next} aria-label="下一页">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {viewType === VIEW_TYPES.MONTH && <MonthView />}
        {viewType === VIEW_TYPES.WEEK && <WeekView />}
        {viewType === VIEW_TYPES.DAY && <DayView />}
      </CardContent>
    </Card>
  );
};
