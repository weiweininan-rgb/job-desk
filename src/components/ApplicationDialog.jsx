import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarIcon, Link2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createNewApplicationFormData } from '@/lib/applicationForm';

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

export const ApplicationDialog = ({ open, onOpenChange, onSubmit, initialData }) => {
  const [formData, setFormData] = useState(createNewApplicationFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        company_name: initialData.company_name ?? '',
        position: initialData.position ?? '',
        salary_range: initialData.salary_range ?? '',
        location: initialData.location ?? '',
        application_date: initialData.application_date ? new Date(initialData.application_date) : new Date(),
        status: initialData.status ?? '已投递',
        notes: initialData.notes ?? '',
        job_url: initialData.job_url ?? '',
      });
    } else {
      setFormData(createNewApplicationFormData());
    }
  }, [initialData, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formattedData = {
      company_name: formData.company_name.trim(),
      position: formData.position.trim(),
      salary_range: formData.salary_range.trim(),
      location: formData.location.trim(),
      application_date: format(formData.application_date, 'yyyy-MM-dd'),
      status: formData.status,
      notes: formData.notes.trim(),
      job_url: formData.job_url.trim(),
    };
    
    try {
      await onSubmit(formattedData);
      onOpenChange(false);
    } catch {
      // 错误提示由调用方的 mutation 统一展示，保留当前输入供用户修正。
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? '编辑申请' : '添加新申请'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company_name">公司名称 *</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => updateField('company_name', e.target.value)}
              placeholder="输入公司名称"
              required
            />
          </div>
          <div className="space-y-2">
              <Label htmlFor="position">实际投递职位 *</Label>
            <Input
              id="position"
              value={formData.position}
              onChange={(e) => updateField('position', e.target.value)}
              placeholder="填写实际投递的职位名称"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salary_range">薪资范围</Label>
              <Input
                id="salary_range"
                value={formData.salary_range}
                onChange={(e) => updateField('salary_range', e.target.value)}
                placeholder="如: 15k-25k"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">工作地点</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => updateField('location', e.target.value)}
                placeholder="如: 北京"
              />
            </div>
          </div>

          {/* 官方招聘网站字段 - 无格式验证，任意文本 */}
          <div className="space-y-2">
            <Label htmlFor="job_url" className="flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              官方招聘网站
              <span className="text-xs text-muted-foreground font-normal">（选填）</span>
            </Label>
            
            <Input
              id="job_url"
              value={formData.job_url}
              onChange={(e) => updateField('job_url', e.target.value)}
              placeholder="请输入招聘网站链接，支持任意格式..."
              className="w-full"
            />
            
            {/* 输入提示 */}
            <p className="text-xs text-muted-foreground">
              支持任意格式的网址链接，可直接粘贴完整链接
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>申请日期</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.application_date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.application_date ? format(formData.application_date, 'PPP', { locale: zhCN }) : '选择日期'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.application_date}
                    onSelect={(date) => updateField('application_date', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>当前状态</Label>
              <Select value={formData.status} onValueChange={(value) => updateField('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="notes">其他信息（含内推码）</Label>
              {formData.notes && <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs text-slate-600" onClick={() => updateField('notes', '')}><X className="mr-1 h-3.5 w-3.5" />清空</Button>}
            </div>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="填写内推码、薪资参考或个人备注..."
              rows={3}
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-slate-950 hover:bg-slate-800"
              disabled={isSubmitting}
            >
              {isSubmitting ? '保存中…' : initialData ? '保存修改' : '添加申请'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
