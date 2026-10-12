import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { StatusBadge } from './StatusBadge';
import { ProcessList } from './ProcessList';
import { Building2, MapPin, Calendar, DollarSign, Pencil, Trash2, ExternalLink, Link2, ChevronDown, ChevronUp, Loader2, Pin, Star } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ApplicationAbandonButton } from './ApplicationAbandonButton';

// 获取平台图标或默认图标
const getPlatformIcon = (url) => {
  if (!url) return null;
  if (url.includes('zhaopin.com')) return '智联';
  if (url.includes('51job.com')) return '前程';
  if (url.includes('zhipin.com')) return 'Boss';
  if (url.includes('lagou.com')) return '拉勾';
  if (url.includes('liepin.com')) return '猎聘';
  if (url.includes('nowcoder.com')) return '牛客';
  if (url.includes('shixiseng.com')) return '实习僧';
  return null;
};

export const ApplicationCard = ({ 
  application, 
  onEdit, 
  onDelete, 
  onTogglePinned,
  onToggleAbandoned,
  isSelected, 
  onSelect,
  showCheckbox = false 
}) => {
  const [showProcesses, setShowProcesses] = useState(() => Boolean(application.has_processes));
  const [isPreloading, setIsPreloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const queryClient = useQueryClient();
  const applicationDate = new Date(application.application_date);
  const notesTooLong = application.notes?.length > 20;
  const visibleNotes = notesTooLong && !showNotes ? `${application.notes.slice(0, 20)}…` : application.notes;
  const articleUrl = Array.isArray(application.job_sources)
    ? application.job_sources[0]?.article_url
    : application.job_sources?.article_url;
  const toHref = (url) => url?.startsWith('http://') || url?.startsWith('https://') ? url : `https://${url}`;
  const renderNotes = (notes) => notes.split(/(https?:\/\/[^\s]+)/g).map((part, index) => {
    if (!/^https?:\/\//.test(part)) return part;

    return (
      <a
        key={`${part}-${index}`}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-amber-800 underline underline-offset-2 hover:text-amber-950"
      >
        {part}
      </a>
    );
  });

  useEffect(() => {
    if (application.has_processes) setShowProcesses(true);
  }, [application.has_processes]);

  // 预加载流程数据
  const preloadProcesses = useCallback(() => {
    if (!showProcesses && !isPreloading) {
      setIsPreloading(true);
      queryClient.prefetchQuery({
        queryKey: ['interviews', application.id],
        queryFn: async () => {
          const { supabase } = await import('@/integrations/supabase/client');
          const { data, error } = await supabase
            .from('application_interviews')
            .select('*')
            .eq('application_id', application.id)
            .order('scheduled_time', { ascending: true });
          
          if (error) throw error;
          return data || [];
        },
        staleTime: 5 * 60 * 1000,
      }).finally(() => setIsPreloading(false));
    }
  }, [application.id, showProcesses, isPreloading, queryClient]);

  const handleToggleProcesses = useCallback(() => {
    if (!showProcesses) {
      setIsPreloading(true);
    }
    setShowProcesses(prev => !prev);
  }, [showProcesses]);

  // 点击删除按钮时显示确认对话框
  const handleDeleteClick = useCallback((e) => {
    // 阻止事件冒泡和默认行为，防止触发其他点击事件或表单提交
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // 防止重复点击
    if (isDeleting) {
      return;
    }
    
    // 检查 onDelete 回调是否存在
    if (!onDelete) {
      toast.error('删除功能未配置，请刷新页面重试');
      console.error('Error: onDelete callback is not provided');
      return;
    }
    
    // 检查 application.id 是否存在
    if (!application || !application.id) {
      toast.error('无法获取申请记录ID，请刷新页面重试');
      console.error('Error: application or application.id is missing', application);
      return;
    }
    
    // 显示自定义确认对话框（替代 window.confirm，避免被浏览器阻止）
    console.log('Opening delete confirm dialog for application:', application.id);
    setShowDeleteConfirm(true);
  }, [onDelete, application, isDeleting]);

  // 确认删除后执行实际删除操作
  const handleConfirmDelete = useCallback(async () => {
    console.log('Confirm delete clicked, closing dialog and starting delete');
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    
    try {
      console.log('Calling delete for application:', application.id);
      // 调用删除回调（现在是 Promise）
      await onDelete(application.id);
      console.log('Delete completed successfully');
      // 注意：成功提示由 useApplications hook 中的 onSuccess 处理
    } catch (error) {
      console.error('Delete operation failed in card:', error);
      // 错误提示由 useApplications hook 中的 onError 处理
      // 但这里也捕获一次以确保显示
      if (error.message && !error.message.includes('删除失败')) {
        toast.error('删除失败：' + error.message);
      }
    } finally {
      setIsDeleting(false);
    }
  }, [onDelete, application]);

  // 取消删除
  const handleCancelDelete = useCallback(() => {
    console.log('Delete cancelled by user');
    setShowDeleteConfirm(false);
  }, []);

  const handleOpenLink = useCallback((e, url) => {
    e.preventDefault();
    e.stopPropagation();
    if (url) {
      // 确保URL有协议前缀
      let finalUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        finalUrl = 'https://' + url;
      }
      window.open(finalUrl, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const platformName = getPlatformIcon(application.job_url);

  return (
    <>
      <Card className={`border-slate-200 bg-white/95 transition-all hover:shadow-md ${application.is_abandoned ? 'bg-slate-100 opacity-65 grayscale' : ''} ${application.is_pinned ? 'border-amber-200 shadow-sm shadow-amber-100/70' : ''} ${application.is_chengdu ? 'border-l-4 border-l-rose-500' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {showCheckbox && (
                  <Checkbox 
                    checked={isSelected}
                    onCheckedChange={() => onSelect(application.id)}
                    className="mt-1"
                  />
                )}
                <h3 className="font-semibold text-lg truncate">{application.company_name}</h3>
                {application.job_url && (
                  <button
                    onClick={(e) => handleOpenLink(e, application.job_url)}
                    className="group relative flex-shrink-0 text-amber-700 transition-colors hover:text-amber-900"
                    title={`打开招聘网站: ${application.job_url}`}
                  >
                    <div className="flex items-center gap-1">
                      <ExternalLink className="w-4 h-4" />
                      {platformName && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900">
                          {platformName}
                        </span>
                      )}
                    </div>
                  </button>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{application.position}</p>
              {application.is_abandoned && <Badge className="mt-2 bg-slate-200 text-slate-700 hover:bg-slate-200">已主动放弃</Badge>}
              {(application.batch || application.is_chengdu || application.is_major_company || application.is_pinned) && <div className="mt-2 flex flex-wrap gap-1.5">
                {application.batch && <Badge className={application.batch === '提前批' ? 'bg-amber-100 text-amber-900 hover:bg-amber-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-100'}>{application.batch}</Badge>}
                {application.is_chengdu && <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50"><MapPin className="mr-1 h-3 w-3" />优先城市</Badge>}
                {application.is_major_company && <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100"><Star className="mr-1 h-3 w-3" />行业大厂</Badge>}
                {application.is_pinned && <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100"><Pin className="mr-1 h-3 w-3" />已置顶</Badge>}
              </div>}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {onTogglePinned && <button
                type="button"
                aria-label={application.is_pinned ? '取消置顶' : '置顶申请'}
                title={application.is_pinned ? '取消置顶' : '置顶申请'}
                data-pinned={application.is_pinned}
                className="tracking-pin-button grid h-8 w-8 place-items-center rounded-full border transition"
                onClick={() => onTogglePinned(application)}
              >
                <Pin className={`h-3.5 w-3.5 ${application.is_pinned ? 'fill-current' : ''}`} />
              </button>}
              <StatusBadge status={application.status} />
              <ApplicationAbandonButton application={application} onToggle={onToggleAbandoned} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2 text-sm">
            {application.job_url && (
              <div className="flex items-center rounded-md bg-amber-50 p-2 text-amber-800">
                <Link2 className="w-4 h-4 mr-2 flex-shrink-0" />
                <a 
                  href={toHref(application.job_url)}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="truncate hover:underline flex-1"
                  title={application.job_url}
                  onClick={(e) => e.stopPropagation()}
                >
                  {application.job_url.length > 35 
                    ? application.job_url.substring(0, 35) + '...' 
                    : application.job_url}
                </a>
                <span className="ml-2 text-xs font-medium text-amber-900">投递官网</span>
              </div>
            )}
            {articleUrl && (
              <div className="flex items-center bg-slate-50 p-2 text-slate-700 rounded-md">
                <Link2 className="w-4 h-4 mr-2 flex-shrink-0" />
                <a
                  href={toHref(articleUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate hover:underline flex-1"
                  title={articleUrl}
                  onClick={(e) => e.stopPropagation()}
                >
                  {articleUrl.length > 35 ? `${articleUrl.substring(0, 35)}...` : articleUrl}
                </a>
                <span className="ml-2 text-xs font-medium text-slate-600">官方推送</span>
              </div>
            )}
            {application.salary_range && (
              <div className="flex items-center text-muted-foreground">
                <DollarSign className="w-4 h-4 mr-2" />
                <span>{application.salary_range}</span>
              </div>
            )}
            {application.location && (
              <div className="flex items-center text-muted-foreground">
                <MapPin className="w-4 h-4 mr-2" />
                <span>{application.location}</span>
              </div>
            )}
            <div className="flex items-center text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2" />
              <span>申请于 {Number.isNaN(applicationDate.getTime()) ? '日期待确认' : format(applicationDate, 'MM/dd', { locale: zhCN })}</span>
            </div>
          </div>
          {application.notes && (
            <div className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-slate-700">
              <p className="font-medium text-amber-900">备注与其他信息</p>
              <p className="mt-1 whitespace-pre-wrap break-all">{renderNotes(visibleNotes)}</p>
              {notesTooLong && <button type="button" className="mt-1 text-xs text-amber-900 underline-offset-2 hover:underline" onClick={() => setShowNotes((value) => !value)}>{showNotes ? '收起' : '展开'}</button>}
            </div>
          )}
          
          {/* 流程进度子表 */}
          <div className="mt-4 border-t pt-3">
            <button
              onClick={handleToggleProcesses}
              onMouseEnter={preloadProcesses}
              className="group flex w-full items-center gap-2 text-sm text-slate-700 transition-colors hover:text-amber-800"
            >
              <span className="flex items-center gap-1 flex-1">
                {showProcesses ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                流程进度（测评/笔试/面试）
              </span>
            </button>
            
            <div 
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                showProcesses ? 'max-h-[600px] opacity-100 mt-2' : 'max-h-0 opacity-0'
              }`}
            >
              {showProcesses && (
                <ProcessList 
                  applicationId={application.id} 
                  application={application}
                  isPreloading={isPreloading && !showProcesses}
                />
              )}
            </div>
          </div>

          {/* 操作按钮区域 - 修复删除按钮事件绑定和加载状态 */}
          <div className="flex gap-2 mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1" 
              onClick={() => onEdit(application)}
              type="button"
              disabled={isDeleting}
            >
              <Pencil className="w-4 h-4 mr-1" />
              编辑
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50" 
              onClick={handleDeleteClick}
              type="button"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1" />
              )}
              {isDeleting ? '删除中...' : '删除'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 自定义确认删除对话框 - 替代 window.confirm，避免被浏览器阻止 */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除申请记录</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 <strong>{application?.company_name}</strong> 的 <strong>{application?.position}</strong> 申请记录吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
