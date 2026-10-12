import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, LayoutGrid, List, BarChart3, Calendar, Search, Filter, CheckSquare, Square, X, Download, MapPin, Star, ArrowDownUp } from 'lucide-react';
import { useApplications } from '@/hooks/useApplications';
import { useAllInterviews } from '@/hooks/useInterviews';
import { ApplicationCard } from '@/components/ApplicationCard';
import { ApplicationDialog } from '@/components/ApplicationDialog';
import { ProcessDialog } from '@/components/ProcessDialog';
import { StatsDashboard } from '@/components/StatsDashboard';
import { KanbanBoard } from '@/components/KanbanBoard';
import { CalendarView } from '@/components/CalendarView';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger } from
'@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BatchActions } from '@/components/BatchActions';
import { Skeleton } from '@/components/ui/skeleton';
import { exportToCSV } from '@/lib/exportUtils';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { compareApplications } from '@/lib/applicationOrder';

const statusOptions = [
{ value: 'all', label: '全部状态' },
{ value: '已投递', label: '已投递' },
{ value: '简历筛选', label: '简历筛选' },
{ value: '笔试', label: '笔试' },
{ value: '一面', label: '一面' },
{ value: '二面', label: '二面' },
{ value: 'HR面', label: 'HR面' },
{ value: 'Offer', label: 'Offer' },
{ value: '已拒绝', label: '已拒绝' }];

const defaultFilters = { status: 'all', hasInterview: 'all', batch: 'all', onlyChengdu: false, onlyMajor: false };

// 获取平台显示名称
const getPlatformLabel = (url) => {
  if (!url) return '';
  if (url.includes('zhaopin.com')) return '智联招聘';
  if (url.includes('51job.com')) return '前程无忧';
  if (url.includes('zhipin.com')) return 'Boss直聘';
  if (url.includes('lagou.com')) return '拉勾网';
  if (url.includes('liepin.com')) return '猎聘网';
  if (url.includes('nowcoder.com')) return '牛客网';
  if (url.includes('shixiseng.com')) return '实习僧';
  return '招聘网站';
};

export default function Index() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState(defaultFilters);
  const [sortBy, setSortBy] = useState('application_desc');
  const [selectedIds, setSelectedIds] = useState([]);

  // 流程编辑对话框状态
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState(null);
  const [editingProcessAppId, setEditingProcessAppId] = useState(null);

  const {
    applications,
    isLoading,
    createApplicationAsync,
    updateApplication,
    updateApplicationAsync,
    deleteApplication,
    isCreating,
    isUpdating,
    isDeleting
  } = useApplications();

  const { allInterviews, isLoading: isLoadingInterviews } = useAllInterviews();

  // 过滤后的申请列表
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesSearch = !searchQuery ||
      app.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.job_url?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = filters.status === 'all' || app.status === filters.status;
      const matchesBatch = filters.batch === 'all' || app.batch === filters.batch;
      const matchesChengdu = !filters.onlyChengdu || app.is_chengdu;
      const matchesMajor = !filters.onlyMajor || app.is_major_company;

      let matchesInterview = true;
      if (filters.hasInterview !== 'all') {
        const hasInterview = allInterviews.some((i) => i.application_id === app.id);
        matchesInterview = filters.hasInterview === 'has' ? hasInterview : !hasInterview;
      }

      return matchesSearch && matchesStatus && matchesBatch && matchesChengdu && matchesMajor && matchesInterview;
    }).sort((left, right) => compareApplications(left, right, sortBy));
  }, [applications, searchQuery, filters, allInterviews, sortBy]);

  const filteredInterviews = useMemo(() => {
    const applicationIds = new Set(filteredApplications.map((application) => application.id));
    return allInterviews.filter((interview) => applicationIds.has(interview.application_id));
  }, [allInterviews, filteredApplications]);

  // 批量更新状态
  const handleBatchUpdateStatus = async (ids, status) => {
    await Promise.all(ids.map((id) => updateApplicationAsync({ id, status })));
    setSelectedIds([]);
    toast.success(`已更新 ${ids.length} 条记录的状态`);
  };

  // 批量删除 - 修复：正确处理异步操作和错误
  const handleBatchDelete = async (ids) => {
    let successCount = 0;
    let failCount = 0;
    
    for (const id of ids) {
      try {
        await deleteApplication(id);
        successCount++;
      } catch (error) {
        console.error(`Failed to delete application ${id}:`, error);
        failCount++;
      }
    }
    
    setSelectedIds([]);
    
    if (successCount > 0 && failCount === 0) {
      toast.success(`已成功删除 ${successCount} 条记录`);
    } else if (successCount > 0 && failCount > 0) {
      toast.warning(`部分删除成功：${successCount} 条已删除，${failCount} 条失败`);
    } else {
      toast.error(`删除失败：${failCount} 条记录未能删除，请检查权限或网络连接`);
    }
  };

  // 导出CSV
  const handleExportCSV = () => {
    exportToCSV(filteredApplications, allInterviews);
    toast.success('数据导出成功');
  };

  // 选择/取消选择
  const toggleSelection = useCallback((id) => {
    setSelectedIds((prev) =>
    prev.includes(id) ?
    prev.filter((i) => i !== id) :
    [...prev, id]
    );
  }, []);

  // 全选当前筛选结果
  const selectAll = useCallback(() => {
    setSelectedIds(filteredApplications.map((app) => app.id));
  }, [filteredApplications]);

  // 清除选择
  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // 当筛选条件变化时，清除已选择项
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
    setSelectedIds([]);
  }, []);

  const handleSearchInput = (e) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilters(defaultFilters);
    setSelectedIds([]);
  };

  const handleEdit = (app) => {
    setEditingApp(app);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingApp(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (data) => {
    if (editingApp) {
      return updateApplicationAsync({ id: editingApp.id, ...data });
    }
    return createApplicationAsync(data);
  };

  const handleUpdateStatus = ({ id, status }) => {
    updateApplication({ id, status });
  };

  const handleTogglePinned = async (application) => {
    await updateApplicationAsync({ id: application.id, is_pinned: !application.is_pinned });
  };

  const handleToggleAbandoned = async (application) => {
    await updateApplicationAsync({ id: application.id, is_abandoned: !application.is_abandoned });
  };

  // 日历视图点击流程处理
  const handleProcessClick = (process, app) => {
    setEditingProcess(process);
    setEditingProcessAppId(process.application_id);
    setProcessDialogOpen(true);
  };

  // 流程提交处理 - 修复：实际调用 supabase 更新数据
  const handleProcessSubmit = async (data) => {
    if (!editingProcess) {
      toast.error('未找到要更新的流程');
      return;
    }

    try {
      // 移除 application_id 从更新数据中（不应该更新外键）
      const { application_id, ...updateData } = data;

      const { error } = await supabase.
      from('application_interviews').
      update({
        process_type: updateData.process_type,
        scheduled_time: updateData.scheduled_time,
        deadline: updateData.deadline,
        location: updateData.location,
        status: updateData.status,
        notes: updateData.notes,
        reminder_triggered: updateData.reminder_triggered
      }).
      eq('id', editingProcess.id);

      if (error) throw error;

      // 刷新相关查询，确保日历视图数据更新
      queryClient.invalidateQueries({ queryKey: ['allInterviews'] });
      queryClient.invalidateQueries({ queryKey: ['interviews', editingProcessAppId] });

      toast.success('流程信息更新成功');
      setEditingProcess(null);
      setEditingProcessAppId(null);
    } catch (error) {
      toast.error('更新失败: ' + error.message);
    }
  };

  // 计算活跃筛选条件数量
  const activeFilterCount =
  (filters.status !== 'all' ? 1 : 0) +
  (filters.hasInterview !== 'all' ? 1 : 0) +
  (filters.batch !== 'all' ? 1 : 0) +
  (filters.onlyChengdu ? 1 : 0) +
  (filters.onlyMajor ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0 || searchQuery;

  // 全选状态
  const isAllSelected = selectedIds.length === filteredApplications.length && filteredApplications.length > 0;
  const hasSelection = selectedIds.length > 0;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[1.75rem] bg-slate-950 px-6 py-7 text-white shadow-xl shadow-slate-900/15 sm:px-8">
        <div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-amber-300">APPLICATION TRACKER</p>
              <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">求职跟踪</h1>
              <p className="mt-2 text-sm text-slate-300">集中管理已投递岗位、流程节点和当前进度。</p>
            </div>
            <Button
              onClick={handleAdd}
              className="w-full bg-amber-400 text-slate-950 hover:bg-amber-300 sm:w-auto"
              disabled={isCreating}>
              
              <Plus className="w-4 h-4 mr-2" />
              添加申请
            </Button>
          </div>
        </div>
      </section>

      <div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 border border-slate-200 bg-white/90 shadow-sm sm:inline-flex sm:w-auto sm:justify-start">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              列表视图
            </TabsTrigger>
            <TabsTrigger value="kanban" className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              看板视图
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              日历视图
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              数据分析
            </TabsTrigger>
          </TabsList>

          {/* 整合的工具栏 - 搜索、筛选、全选、导出同一行 */}
          {activeTab === 'list' &&
          <div className="space-y-4">
              {/* 主工具栏：搜索 + 筛选（左）+ 全选 + 导出（右） */}
              <div className="flex min-h-[56px] flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm sm:flex-row sm:items-center">
                {/* 左侧：搜索和筛选 */}
                <div className="flex items-center gap-3 flex-1 flex-wrap">
                  {/* 搜索框 */}
                  <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                    placeholder="搜索公司、实际投递职位、招聘网站..."
                    value={searchQuery}
                    onChange={handleSearchInput}
                    className="pl-9 pr-9 h-10" />
                  
                    {searchQuery &&
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    
                        <X className="h-4 w-4" />
                      </button>
                  }
                  </div>

                  {/* 筛选按钮 */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                      variant={hasActiveFilters ? "secondary" : "outline"}
                      size="default"
                      className="h-10 gap-2 px-4">
                      
                        <Filter className="h-4 w-4" />
                        <span>筛选</span>
                        {activeFilterCount > 0 &&
                      <Badge variant="default" className="ml-1 h-5 min-w-[20px] bg-slate-950 px-1.5 text-xs">
                            {activeFilterCount}
                          </Badge>
                      }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72" align="start">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">申请状态</label>
                          <Select
                          value={filters.status}
                          onValueChange={(value) => handleFilterChange({ ...filters, status: value })}>
                          
                            <SelectTrigger className="h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((option) =>
                            <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                            )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">流程状态</label>
                          <Select
                          value={filters.hasInterview}
                          onValueChange={(value) => handleFilterChange({ ...filters, hasInterview: value })}>
                          
                            <SelectTrigger className="h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">全部</SelectItem>
                              <SelectItem value="has">有流程安排</SelectItem>
                              <SelectItem value="none">暂无流程</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">投递批次</label>
                          <Select
                          value={filters.batch}
                          onValueChange={(value) => handleFilterChange({ ...filters, batch: value })}>
                            <SelectTrigger className="h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">全部批次</SelectItem>
                              <SelectItem value="提前批">提前批</SelectItem>
                              <SelectItem value="秋招正式批">秋招正式批</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {hasActiveFilters &&
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-10"
                        onClick={() => {
                          setFilters(defaultFilters);
                          setSearchQuery('');
                          setSelectedIds([]);
                        }}>
                        
                            清除所有筛选
                          </Button>
                      }
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Button
                    type="button"
                    size="default"
                    variant="outline"
                    aria-pressed={filters.onlyChengdu}
                    className={`h-10 gap-1.5 px-3 ${filters.onlyChengdu ? 'border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 hover:text-rose-900' : 'text-slate-600'}`}
                    onClick={() => handleFilterChange({ ...filters, onlyChengdu: !filters.onlyChengdu })}>
                    <MapPin className="h-4 w-4" />优先城市
                  </Button>

                  <Button
                    type="button"
                    size="default"
                    variant="outline"
                    aria-pressed={filters.onlyMajor}
                    className={`h-10 gap-1.5 px-3 ${filters.onlyMajor ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:text-amber-950' : 'text-slate-600'}`}
                    onClick={() => handleFilterChange({ ...filters, onlyMajor: !filters.onlyMajor })}>
                    <Star className="h-4 w-4" />行业大厂
                  </Button>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-10 w-[148px] bg-white">
                      <ArrowDownUp className="mr-2 h-4 w-4 text-slate-500" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="application_desc">最近投递</SelectItem>
                      <SelectItem value="application_asc">最早投递</SelectItem>
                      <SelectItem value="company">公司名称</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* 筛选状态提示 */}
                  {hasActiveFilters &&
                <span className="hidden text-sm text-amber-800 md:inline-block">
                      已筛选出 {filteredApplications.length} 条结果
                    </span>
                }
                </div>

                {/* 右侧：全选按钮 + 导出CSV按钮 */}
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                  variant={isAllSelected ? "secondary" : "outline"}
                  size="default"
                  onClick={isAllSelected ? clearSelection : selectAll}
                  className="h-10 gap-2 px-4 transition-all duration-200">
                  
                    {isAllSelected ?
                  <CheckSquare className="h-4 w-4 text-amber-700" /> :

                  <Square className="h-4 w-4" />
                  }
                    <span>{isAllSelected ? '取消全选' : '全选'}</span>
                  </Button>

                  <Button
                  variant="outline"
                  size="default"
                  onClick={handleExportCSV}
                  className="h-10 gap-2 px-4">
                  
                    <Download className="h-4 w-4" />
                    <span>导出CSV</span>
                  </Button>

                  {hasSelection &&
                <Badge variant="outline" className="h-10 border-amber-200 bg-amber-50 px-3 text-sm font-medium text-amber-900">
                      已选 {selectedIds.length} 项
                    </Badge>
                }
                </div>
              </div>

              {/* 批量操作栏 */}
              <BatchActions
              selectedIds={selectedIds}
              onClearSelection={clearSelection}
              onBatchUpdateStatus={handleBatchUpdateStatus}
              onBatchDelete={handleBatchDelete}
              filteredTotalCount={filteredApplications.length} />
            
            </div>
          }

          <TabsContent value="list" className="space-y-4">
            {isLoading ?
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) =>
              <Skeleton key={i} className="h-48" />
              )}
              </div> :
            filteredApplications.length === 0 ?
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/90 py-12 text-center">
                <p className="text-muted-foreground">暂无符合条件的申请记录</p>
                {hasActiveFilters &&
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={clearAllFilters}>
                
                    清除筛选条件
                  </Button>
              }
              </div> :

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredApplications.map((app) =>
              <ApplicationCard
                key={app.id}
                application={{ ...app, has_processes: allInterviews.some((interview) => interview.application_id === app.id) }}
                onEdit={handleEdit}
                onDelete={deleteApplication}
                onTogglePinned={handleTogglePinned}
                onToggleAbandoned={handleToggleAbandoned}
                isSelected={selectedIds.includes(app.id)}
                onSelect={toggleSelection}
                showCheckbox={true} />

              )}
              </div>
            }
          </TabsContent>

          <TabsContent value="kanban">
            {isLoading ?
            <Skeleton className="h-96" /> :

            <KanbanBoard
              applications={filteredApplications}
              onEdit={handleEdit}
              onUpdateStatus={handleUpdateStatus}
              onTogglePinned={handleTogglePinned}
              onToggleAbandoned={handleToggleAbandoned} />

            }
          </TabsContent>

          <TabsContent value="calendar">
            {isLoading || isLoadingInterviews ?
            <Skeleton className="h-96" /> :

            <CalendarView
              interviews={filteredInterviews}
              applications={filteredApplications}
              onProcessClick={handleProcessClick} />

            }
          </TabsContent>

          <TabsContent value="stats">
            {isLoading ?
            <Skeleton className="h-96" /> :

            <StatsDashboard applications={applications} />
            }
          </TabsContent>
        </Tabs>
      </div>

      <ApplicationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        initialData={editingApp} />
      

      {/* 流程编辑对话框 */}
      <ProcessDialog
        open={processDialogOpen}
        onOpenChange={setProcessDialogOpen}
        onSubmit={handleProcessSubmit}
        initialData={editingProcess}
        applicationId={editingProcessAppId} />
      
    </div>);

}
