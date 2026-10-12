import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Pencil, 
  Trash2, 
  Plus, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Loader2,
  AlertTriangle,
  Bell,
  ClipboardCheck,
  PenTool,
  User,
  Users,
  Crown,
  Briefcase,
  Award,
  Calendar
} from 'lucide-react';
import { format, isBefore, addDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useInterviews } from '@/hooks/useInterviews';
import { ProcessDialog } from './ProcessDialog';
import { useState, useEffect, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { processTypes, statusOptions, getProcessUrgency, getUrgencyStyles, formatTimeLeft, isTerminalProcess, shouldTriggerReminder } from '@/lib/processConfig';
import { toast } from 'sonner';

const iconMap = {
  ClipboardCheck,
  PenTool,
  User,
  Users,
  Crown,
  Briefcase,
  Award,
  Clock,
};

const statusIcons = {
  '待完成': <HelpCircle className="w-4 h-4 text-amber-500" />,
  '进行中': <Clock className="w-4 h-4 text-blue-500" />,
  '已完成': <CheckCircle2 className="w-4 h-4 text-green-500" />,
  '已取消': <XCircle className="w-4 h-4 text-red-500" />,
  '已推迟': <Clock className="w-4 h-4 text-gray-500" />,
};

const formatProcessDate = (value, pattern, fallback = '未设置') => {
  if (!value) return fallback;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : format(date, pattern, { locale: zhCN });
};

// 紧急提醒按钮组件
const UrgentButton = ({ urgency, onClick }) => {
  if (!urgency.isUrgent) return null;
  
  const styles = getUrgencyStyles(urgency.urgencyLevel);
  
  return (
    <Button
      size="sm"
      onClick={onClick}
      className={cn(
        'gap-1.5 h-7 px-2 text-xs font-medium animate-pulse',
        styles.button
      )}
    >
      <Bell className="w-3.5 h-3.5" />
      {urgency.urgencyLevel === 'critical' ? '紧急' : '即将到期'}
    </Button>
  );
};

// 流程项组件
const ProcessItem = ({ 
  process, 
  index, 
  onEdit, 
  onDelete, 
  onUrgentClick,
  application,
  onReminderTriggered,
}) => {
  const processType = processTypes.find(p => p.value === process.process_type) || processTypes[2];
  const status = statusOptions.find(s => s.value === process.status) || statusOptions[0];
  const urgency = getProcessUrgency(process);
  const isTerminal = isTerminalProcess(process.status);
  const styles = getUrgencyStyles(urgency.urgencyLevel);
  const IconComponent = iconMap[processType.icon] || Clock;

  const reminderSentRef = useRef(false);

  useEffect(() => {
    if (shouldTriggerReminder(process) && !reminderSentRef.current) {
      reminderSentRef.current = true;
      toast.warning(
        <div className="space-y-1">
          <p className="font-medium">流程即将截止！</p>
          <p className="text-sm">
            {application?.company_name} - {process.process_type}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatTimeLeft(urgency.daysLeft)}
          </p>
        </div>,
        { duration: 5000 }
      );

      onReminderTriggered(process.id).catch(() => {
        reminderSentRef.current = false;
      });
    }
  }, [application?.company_name, onReminderTriggered, process, urgency.daysLeft]);

  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border-2 transition-all duration-200 animate-in fade-in slide-in-from-left-2 hover:shadow-md',
        styles.bg,
        styles.border,
        urgency.isUrgent && 'ring-2 ring-red-300 ring-offset-1'
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border',
            processType.color
          )}>
            <IconComponent className="w-3.5 h-3.5" />
            {processType.label}
          </span>
          
          <Badge variant="outline" className={cn('text-xs', status.color)}>
            <span className="flex items-center gap-1">
              {statusIcons[process.status]}
              {status.label}
            </span>
          </Badge>
          
          {urgency.isUrgent && (
            <UrgentButton 
              urgency={urgency} 
              onClick={() => onUrgentClick(process)}
            />
          )}
        </div>
        
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {formatProcessDate(process.scheduled_time, 'MM/dd HH:mm')}
          </span>
          
          {process.deadline && (
            <span className={cn(
              'flex items-center gap-1 font-medium',
              urgency.urgencyLevel === 'critical' ? 'text-red-600' : 
              urgency.urgencyLevel === 'warning' ? 'text-amber-600' : 'text-gray-600'
            )}>
              <Clock className="w-3.5 h-3.5" />
              截止: {formatProcessDate(process.deadline, 'MM/dd HH:mm')}
              {!isTerminal && <span className={cn(
                'ml-1 px-1.5 py-0.5 rounded text-[10px]',
                urgency.urgencyLevel === 'critical' ? 'bg-red-100 text-red-700' :
                urgency.urgencyLevel === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100'
              )}>
                {formatTimeLeft(urgency.daysLeft)}
              </span>}
            </span>
          )}
          
          {process.location && (
            <span className="flex items-center gap-1 truncate max-w-[150px]">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              {process.location}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex gap-1 ml-2">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0 hover:bg-white hover:shadow-sm transition-all" 
          onClick={() => onEdit(process)}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 transition-all" 
          onClick={() => onDelete(process.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

// 加载状态组件
const LoadingState = () => (
  <div className="space-y-3 animate-in fade-in duration-300">
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
      <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
      <span>正在加载流程进度...</span>
    </div>
    <div className="space-y-2">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  </div>
);

// 空状态组件
const EmptyState = ({ onAdd }) => (
  <div className="text-sm text-muted-foreground text-center py-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
      <ClipboardCheck className="w-7 h-7 text-amber-800" />
    </div>
    <p className="text-base font-medium text-gray-700">暂无流程记录</p>
    <p className="text-sm text-gray-500 mt-1">添加测评、笔试或面试节点</p>
    <Button 
      variant="outline" 
      size="sm" 
      onClick={onAdd}
      className="mt-4 border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
    >
      <Plus className="w-4 h-4 mr-1" />
      添加流程节点
    </Button>
  </div>
);

// 紧急事项汇总组件
const UrgentSummary = ({ processes, onProcessClick }) => {
  const urgentProcesses = processes.filter(p => {
    return getProcessUrgency(p).isUrgent;
  });

  if (urgentProcesses.length === 0) return null;

  return (
    <div className="mb-4 p-3 bg-gradient-to-r from-red-50 to-amber-50 rounded-lg border border-red-200 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-red-600" />
        <span className="text-sm font-medium text-red-800">
          紧急事项 ({urgentProcesses.length})
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {urgentProcesses.map(process => {
          const urgency = getProcessUrgency(process);
          return (
            <Button
              key={process.id}
              size="sm"
              variant="outline"
              onClick={() => onProcessClick(process)}
              className={cn(
                'h-7 text-xs border-red-300 hover:bg-red-100',
                urgency.urgencyLevel === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
              )}
            >
              {process.process_type}
              <span className="ml-1 text-[10px] opacity-80">
                {formatTimeLeft(urgency.daysLeft)}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export const ProcessList = ({ applicationId, application, isPreloading = false }) => {
  const { 
    interviews: processes, 
    isLoading, 
    isFetching, 
    error,
    createInterviewAsync: createProcess,
    updateInterviewAsync: updateProcess,
    markReminderTriggered,
    deleteInterview: deleteProcess 
  } = useInterviews(applicationId);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState(null);
  const [processToDelete, setProcessToDelete] = useState(null);

  const handleAdd = () => {
    setEditingProcess(null);
    setDialogOpen(true);
  };

  const handleEdit = (process) => {
    setEditingProcess(process);
    setDialogOpen(true);
  };

  const handleSubmit = async (data) => {
    if (editingProcess) {
      return updateProcess({ id: editingProcess.id, ...data });
    }
    return createProcess(data);
  };

  const handleDelete = (id) => {
    setProcessToDelete(id);
  };

  const confirmDelete = () => {
    deleteProcess(processToDelete);
    setProcessToDelete(null);
  };

  const handleUrgentClick = (process) => {
    toast.info(
      <div className="space-y-2">
        <p className="font-medium">{process.process_type} - 紧急处理</p>
        <p className="text-sm text-muted-foreground">
          截止时间: {formatProcessDate(process.deadline, 'yyyy-MM-dd HH:mm')}
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => handleEdit(process)}>立即处理</Button>
        </div>
      </div>,
      { duration: 10000 }
    );
  };

  if (isLoading || isPreloading) {
    return <LoadingState />;
  }

  if (error) {
    return <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">流程记录加载失败：{error.message}</div>;
  }

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4" />
          流程进度
          {isFetching && (
            <Loader2 className="w-3 h-3 animate-spin text-amber-700" />
          )}
        </h4>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleAdd}
          className="h-8 px-2 text-amber-800 hover:bg-amber-50 hover:text-amber-950"
        >
          <Plus className="w-4 h-4 mr-1" />
          添加
        </Button>
      </div>

      <UrgentSummary processes={processes} onProcessClick={handleUrgentClick} />

      {processes.length === 0 ? (
        <EmptyState onAdd={handleAdd} />
      ) : (
        <div className="space-y-2">
          {processes.map((process, index) => (
            <ProcessItem
              key={process.id}
              process={process}
              index={index}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onUrgentClick={handleUrgentClick}
              application={application}
              onReminderTriggered={markReminderTriggered}
            />
          ))}
        </div>
      )}

      <ProcessDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        initialData={editingProcess}
        applicationId={applicationId}
      />

      <AlertDialog
        open={Boolean(processToDelete)}
        onOpenChange={(open) => {
          if (!open) setProcessToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除流程记录？</AlertDialogTitle>
            <AlertDialogDescription>
              这条测评、笔试或面试记录会被永久删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={confirmDelete}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
