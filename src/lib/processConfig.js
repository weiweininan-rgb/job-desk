// 流程类型配置
export const processTypes = [
  { value: '测评', label: '测评', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: 'ClipboardCheck' },
  { value: '笔试', label: '笔试', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: 'PenTool' },
  { value: '一面', label: '一面', color: 'bg-orange-50 text-orange-800 border-orange-200', icon: 'User' },
  { value: '二面', label: '二面', color: 'bg-orange-100 text-orange-900 border-orange-200', icon: 'Users' },
  { value: '终面', label: '终面', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: 'Crown' },
  { value: 'HR面', label: 'HR面', color: 'bg-green-100 text-green-700 border-green-200', icon: 'Briefcase' },
  { value: 'Offer', label: 'Offer', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: 'Award' },
];

// 面试状态选项
export const statusOptions = [
  { value: '待完成', label: '待完成', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: '进行中', label: '进行中', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: '已完成', label: '已完成', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: '已取消', label: '已取消', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: '已推迟', label: '已推迟', color: 'bg-gray-100 text-gray-700 border-gray-200' },
];

// 计算紧急状态
// 返回: { isUrgent: boolean, daysLeft: number, urgencyLevel: 'normal' | 'warning' | 'critical' }
export const calculateUrgency = (deadline) => {
  if (!deadline) {
    return { isUrgent: false, daysLeft: null, urgencyLevel: 'normal' };
  }

  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffTime = deadlineDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { isUrgent: true, daysLeft: diffDays, urgencyLevel: 'critical' };
  } else if (diffDays <= 3) {
    return { isUrgent: true, daysLeft: diffDays, urgencyLevel: 'critical' };
  } else if (diffDays <= 7) {
    return { isUrgent: false, daysLeft: diffDays, urgencyLevel: 'warning' };
  } else {
    return { isUrgent: false, daysLeft: diffDays, urgencyLevel: 'normal' };
  }
};

export const isTerminalProcess = (status) => status === '已完成' || status === '已取消';

export const getProcessUrgency = (process) => {
  const urgency = calculateUrgency(process?.deadline);
  return isTerminalProcess(process?.status)
    ? { ...urgency, isUrgent: false, urgencyLevel: 'normal' }
    : urgency;
};

export const shouldTriggerReminder = (process) => {
  const urgency = getProcessUrgency(process);
  return urgency.isUrgent && !process.reminder_triggered;
};

// 获取紧急状态样式
export const getUrgencyStyles = (urgencyLevel) => {
  switch (urgencyLevel) {
    case 'critical':
      return {
        badge: 'bg-red-100 text-red-700 border-red-200',
        button: 'bg-red-600 hover:bg-red-700 text-white animate-pulse',
        icon: 'text-red-600',
        border: 'border-red-300',
        bg: 'bg-red-50',
      };
    case 'warning':
      return {
        badge: 'bg-amber-100 text-amber-700 border-amber-200',
        button: 'bg-amber-600 hover:bg-amber-700 text-white',
        icon: 'text-amber-600',
        border: 'border-amber-300',
        bg: 'bg-amber-50',
      };
    default:
      return {
        badge: 'bg-gray-100 text-gray-700 border-gray-200',
        button: 'bg-gray-600 hover:bg-gray-700 text-white',
        icon: 'text-gray-600',
        border: 'border-gray-200',
        bg: 'bg-gray-50',
      };
  }
};

// 格式化剩余时间显示
export const formatTimeLeft = (daysLeft) => {
  if (daysLeft === null) return '无截止时间';
  if (daysLeft < 0) return `已逾期 ${Math.abs(daysLeft)} 天`;
  if (daysLeft === 0) return '今天截止';
  if (daysLeft === 1) return '明天截止';
  return `还剩 ${daysLeft} 天`;
};
