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
import { CalendarIcon, Clock, MapPin, AlertCircle, ClipboardCheck, PenTool, User, Users, Crown, Briefcase, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { processTypes, statusOptions } from '@/lib/processConfig';

const iconMap = {
  ClipboardCheck,
  PenTool,
  User,
  Users,
  Crown,
  Briefcase,
  Award,
};

const initialFormData = {
  process_type: '一面',
  scheduled_time: new Date(),
  deadline: null,
  location: '',
  status: '待完成',
  notes: '',
};

export const ProcessDialog = ({ open, onOpenChange, onSubmit, initialData, applicationId }) => {
  const [formData, setFormData] = useState(initialFormData);
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [selectedDeadlineTime, setSelectedDeadlineTime] = useState('23:59');

  useEffect(() => {
    if (initialData) {
      const candidateDate = new Date(initialData.scheduled_time);
      const date = Number.isNaN(candidateDate.getTime()) ? new Date() : candidateDate;
      const candidateDeadline = initialData.deadline ? new Date(initialData.deadline) : null;
      const deadlineDate = candidateDeadline && !Number.isNaN(candidateDeadline.getTime()) ? candidateDeadline : null;
      
      setFormData({
        ...initialData,
        scheduled_time: date,
        deadline: deadlineDate,
      });
      
      setSelectedTime(format(date, 'HH:mm'));
      if (deadlineDate) {
        setSelectedDeadlineTime(format(deadlineDate, 'HH:mm'));
      }
    } else {
      setFormData({
        ...initialFormData,
        scheduled_time: new Date(),
      });
      setSelectedTime('09:00');
      setSelectedDeadlineTime('23:59');
    }
  }, [initialData, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const [hours, minutes] = selectedTime.split(':');
    const candidateDate = new Date(formData.scheduled_time);
    const scheduledDateTime = Number.isNaN(candidateDate.getTime()) ? new Date() : candidateDate;
    scheduledDateTime.setHours(parseInt(hours), parseInt(minutes));

    let deadlineDateTime = null;
    if (formData.deadline) {
      const [deadlineHours, deadlineMinutes] = selectedDeadlineTime.split(':');
      deadlineDateTime = new Date(formData.deadline);
      deadlineDateTime.setHours(parseInt(deadlineHours), parseInt(deadlineMinutes));
    }

    try {
      await onSubmit({
        ...formData,
        application_id: applicationId,
        scheduled_time: format(scheduledDateTime, 'yyyy-MM-dd HH:mm:ss'),
        deadline: deadlineDateTime ? format(deadlineDateTime, 'yyyy-MM-dd HH:mm:ss') : null,
        reminder_triggered: false,
      });
      onOpenChange(false);
    } catch {
      // 错误提示由调用方统一展示，保留当前输入供用户修正。
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const selectedProcessType = processTypes.find(p => p.value === formData.process_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? '编辑流程' : '添加流程节点'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 流程类型 */}
          <div className="space-y-2">
            <Label>流程类型</Label>
            <Select value={formData.process_type} onValueChange={(value) => updateField('process_type', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {processTypes.map((type) => {
                  const IconComponent = iconMap[type.icon];
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        {IconComponent && <IconComponent className="w-4 h-4" />}
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          
          {/* 时间安排 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>开始时间</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.scheduled_time && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.scheduled_time ? format(formData.scheduled_time, 'MM/dd', { locale: zhCN }) : '选择日期'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.scheduled_time}
                    onSelect={(date) => updateField('scheduled_time', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>开始时刻</Label>
              <div className="flex items-center h-10 px-3 rounded-md border border-input bg-transparent">
                <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                <Input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="border-0 p-0 h-auto focus-visible:ring-0"
                />
              </div>
            </div>
          </div>

          {/* 截止时间 - 关键新功能 */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              截止时间（用于提醒）
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.deadline && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.deadline ? format(formData.deadline, 'MM/dd', { locale: zhCN }) : '选择截止日期'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.deadline}
                    onSelect={(date) => updateField('deadline', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <div className="flex items-center h-10 px-3 rounded-md border border-input bg-transparent">
                <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                <Input
                  type="time"
                  value={selectedDeadlineTime}
                  onChange={(e) => setSelectedDeadlineTime(e.target.value)}
                  className="border-0 p-0 h-auto focus-visible:ring-0"
                  disabled={!formData.deadline}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              设置截止时间后，系统将在截止前3天自动提醒
            </p>
          </div>

          {/* 地点 */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              地点/链接
            </Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder="如：会议室A 或 https://zoom.com/..."
            />
          </div>

          {/* 状态 */}
          <div className="space-y-2">
            <Label>完成状态</Label>
            <Select value={formData.status} onValueChange={(value) => updateField('status', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 备注 */}
          <div className="space-y-2">
            <Label htmlFor="notes">备注</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="添加备注信息..."
              rows={3}
            />
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" className="flex-1 bg-slate-950 hover:bg-slate-800">
              {initialData ? '保存修改' : '添加流程'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
