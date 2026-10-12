import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, Clock, MapPin, CheckCircle2, XCircle, HelpCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useInterviews } from '@/hooks/useInterviews';
import { InterviewDialog } from './InterviewDialog';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const statusIcons = {
  '待面试': <HelpCircle className="w-4 h-4 text-amber-500" />,
  '已完成': <CheckCircle2 className="w-4 h-4 text-green-500" />,
  '已取消': <XCircle className="w-4 h-4 text-red-500" />,
  '已推迟': <Clock className="w-4 h-4 text-blue-500" />,
};

const statusColors = {
  '待面试': 'bg-amber-100 text-amber-700 border-amber-200',
  '已完成': 'bg-green-100 text-green-700 border-green-200',
  '已取消': 'bg-red-100 text-red-700 border-red-200',
  '已推迟': 'bg-blue-100 text-blue-700 border-blue-200',
};

// 加载状态组件 - 带动画效果
const LoadingState = () => (
  <div className="space-y-3 animate-in fade-in duration-300">
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
      <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
      <span>正在加载面试进度...</span>
    </div>
    <div className="space-y-2">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  </div>
);

// 空状态组件
const EmptyState = ({ onAdd }) => (
  <div className="text-sm text-muted-foreground text-center py-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
      <Clock className="w-5 h-5 text-gray-400" />
    </div>
    <p>暂无面试记录</p>
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={onAdd}
      className="mt-2 text-teal-600 hover:text-teal-700"
    >
      <Plus className="w-4 h-4 mr-1" />
      添加第一条面试记录
    </Button>
  </div>
);

export const InterviewList = ({ applicationId, isPreloading = false }) => {
  const { interviews, isLoading, isFetching, createInterview, updateInterview, deleteInterview } = useInterviews(applicationId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInterview, setEditingInterview] = useState(null);

  const handleAdd = () => {
    setEditingInterview(null);
    setDialogOpen(true);
  };

  const handleEdit = (interview) => {
    setEditingInterview(interview);
    setDialogOpen(true);
  };

  const handleSubmit = (data) => {
    if (editingInterview) {
      updateInterview({ id: editingInterview.id, ...data });
    } else {
      createInterview(data);
    }
  };

  const handleDelete = (id) => {
    if (confirm('确定要删除这条面试记录吗？')) {
      deleteInterview(id);
    }
  };

  // 如果是预加载状态或正在加载，显示加载状态
  if (isLoading || isPreloading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          面试进度
          {isFetching && (
            <Loader2 className="w-3 h-3 animate-spin text-teal-600" />
          )}
        </h4>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleAdd}
          className="h-8 px-2 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
        >
          <Plus className="w-4 h-4 mr-1" />
          添加
        </Button>
      </div>

      {interviews.length === 0 ? (
        <EmptyState onAdd={handleAdd} />
      ) : (
        <div className="space-y-2">
          {interviews.map((interview, index) => (
            <div
              key={interview.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200 animate-in fade-in slide-in-from-left-2"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{interview.round}</span>
                  <Badge variant="outline" className={statusColors[interview.status]}>
                    <span className="flex items-center gap-1">
                      {statusIcons[interview.status]}
                      {interview.status}
                    </span>
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {interview.scheduled_time ? format(new Date(interview.scheduled_time), 'MM/dd HH:mm', { locale: zhCN }) : '未设置'}
                  </span>
                  {interview.location && (
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3" />
                      {interview.location}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 ml-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 hover:bg-white hover:shadow-sm transition-all" 
                  onClick={() => handleEdit(interview)}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 transition-all" 
                  onClick={() => handleDelete(interview.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <InterviewDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        initialData={editingInterview}
        applicationId={applicationId}
      />
    </div>
  );
};
