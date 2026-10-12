import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const headers = [
    'ID',
    '公司名称',
    '职位',
    '薪资范围',
    '工作地点',
    '申请日期',
    '申请状态',
    '招聘网站',
    '备注',
    '创建时间',
    '流程类型',
    '流程开始时间',
    '流程截止时间',
    '流程状态',
    '流程地点',
    '流程备注',
];

const escapeCSVCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const buildCSV = (applications, interviews = []) => {

  // 准备数据行
  const rows = applications.map(app => {
    // 查找该申请的所有流程
    const appProcesses = interviews.filter(i => i.application_id === app.id);
    
    // 基础申请信息
    const baseRow = [
      app.id,
      app.company_name,
      app.position,
      app.salary_range || '',
      app.location || '',
      app.application_date || '',
      app.status || '',
      app.job_url || '',
      app.notes || '',
      app.created_at ? format(new Date(app.created_at), 'yyyy-MM-dd HH:mm', { locale: zhCN }) : '',
    ];

    if (appProcesses.length === 0) {
      // 没有流程记录，返回单行
      return [baseRow.concat(['', '', '', '', '', ''])];
    }

    // 有流程记录，每行流程信息
    return appProcesses.map((process, idx) => {
      const row = idx === 0 ? baseRow : baseRow.map(() => ''); // 后续流程行的基础信息为空
      return row.concat([
        process.process_type || '面试',
        process.scheduled_time ? format(new Date(process.scheduled_time), 'yyyy-MM-dd HH:mm', { locale: zhCN }) : '',
        process.deadline ? format(new Date(process.deadline), 'yyyy-MM-dd HH:mm', { locale: zhCN }) : '',
        process.status || '',
        process.location || '',
        process.notes || '',
      ]);
    });
  }).flat();

  return `\uFEFF${[headers, ...rows].map((row) => row.map(escapeCSVCell).join(',')).join('\r\n')}`;
};

export const exportToCSV = (applications, interviews = []) => {
  const csvContent = buildCSV(applications, interviews);

  // 创建下载链接
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `求职申请数据_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};
