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
import { CalendarIcon, Clock, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

const roundOptions = ['一面', '二面', '终面', 'HR面'];
const statusOptions = ['待面试', '已完成', '已取消', '已推迟'];

const initialFormData = {
  round: '一面',
  scheduled_time: new Date(),
  location: '',
  status: '待面试',
  notes: '',
};

export const InterviewDialog = ({ open, onOpenChange, onSubmit, initialData, applicationId }) => {
  const [formData, setFormData] = useState(initialFormData);
  const [selectedTime, setSelectedTime] = useState('09:00');

  useEffect(() => {
    if (initialData) {
      const date = new Date(initialData.scheduled_time);
      setFormData({
        ...initialData,
        scheduled_time: date,
      });
      setSelectedTime(format(date, 'HH:mm'));
    } else {
      setFormData({
        ...initialFormData,
        scheduled_time: new Date(),
      });
      setSelectedTime('09:00');
    }
  }, [initialData, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const [hours, minutes] = selectedTime.split(':');
    const scheduledDateTime = new Date(formData.scheduled_time);
    scheduledDateTime.setHours(parseInt(hours), parseInt(minutes));

    onSubmit({
      ...formData,
      application_id: applicationId,
      scheduled_time: format(scheduledDateTime, 'yyyy-MM-dd HH:mm:ss'),
    });
    onOpenChange(false);
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData ? '编辑面试' : '添加面试'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>面试轮次</Label>
            <Select value={formData.round} onValueChange={(value) => updateField('round', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roundOptions.map((round) => (
                  <SelectItem key={round} value={round}>{round}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>面试日期</Label>
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
                    {formData.scheduled_time ? format(formData.scheduled_time, 'PPP', { locale: zhCN }) : '选择日期'}
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
              <Label>面试时间</Label>
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                <Input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                面试地点/链接
              </span>
            </Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder="如：会议室A 或 https://zoom.com/..."
            />
          </div>

          <div className="space-y-2">
            <Label>面试状态</Label>
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

          <div className="space-y-2">
            <Label htmlFor="notes">备注</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="添加面试备注..."
              rows={3}
            />
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700">
              {initialData ? '保存修改' : '添加面试'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
