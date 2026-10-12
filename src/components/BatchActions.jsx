import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Trash2, CheckSquare } from 'lucide-react';
import { useState } from 'react';

const statusOptions = [
  '已投递',
  '简历筛选',
  '笔试',
  '一面',
  '二面',
  'HR面',
  'Offer',
  '已拒绝',
];

export const BatchActions = ({ 
  selectedIds, 
  onClearSelection, 
  onBatchUpdateStatus, 
  onBatchDelete,
  filteredTotalCount
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [batchStatus, setBatchStatus] = useState('');

  const handleBatchUpdate = () => {
    if (batchStatus && selectedIds.length > 0) {
      onBatchUpdateStatus(selectedIds, batchStatus);
      setBatchStatus('');
    }
  };

  const handleBatchDelete = () => {
    onBatchDelete(selectedIds);
    setShowDeleteConfirm(false);
  };

  const hasSelection = selectedIds.length > 0;

  // 如果没有选择，不显示批量操作栏（导出按钮已移至主工具栏）
  if (!hasSelection) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 animate-in fade-in slide-in-from-top-2 sm:flex-row sm:items-center">
        {/* 左侧：选择状态提示 */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
            <CheckSquare className="h-5 w-5 text-amber-800" />
          </div>
          <div>
            <p className="font-medium text-amber-950">
              已选择 {selectedIds.length} 条记录
            </p>
            <p className="text-sm text-amber-800">
              可对选中项执行批量操作
            </p>
          </div>
        </div>

        {/* 右侧：批量操作按钮 */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 批量更新状态 */}
          <div className="flex items-center gap-2">
            <Select value={batchStatus} onValueChange={setBatchStatus}>
              <SelectTrigger className="w-[140px] h-10 bg-white">
                <SelectValue placeholder="更新状态" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              size="default" 
              variant="outline"
              disabled={!batchStatus}
              onClick={handleBatchUpdate}
              className="h-10 bg-white hover:bg-gray-50"
            >
              更新
            </Button>
          </div>

          {/* 批量删除 */}
          <Button
            variant="destructive"
            size="default"
            onClick={() => setShowDeleteConfirm(true)}
            className="h-10 gap-2 px-4"
          >
            <Trash2 className="h-4 w-4" />
            <span>删除</span>
          </Button>

          {/* 取消选择 */}
          <Button
            variant="ghost"
            size="default"
            onClick={onClearSelection}
            className="h-10 text-amber-900 hover:bg-amber-100 hover:text-amber-950"
          >
            取消选择
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除选中的 {selectedIds.length} 条申请记录吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchDelete} className="bg-red-600 hover:bg-red-700">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
