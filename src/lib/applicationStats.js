export const statusOrder = ['已投递', '简历筛选', '笔试', '一面', '二面', 'HR面', 'Offer', '已拒绝'];

const funnelStages = [
  { name: '已投递' },
  { name: '简历筛选', statuses: ['简历筛选', '笔试', '一面', '二面', 'HR面', 'Offer'] },
  { name: '一面', statuses: ['一面', '二面', 'HR面', 'Offer'] },
  { name: 'Offer', statuses: ['Offer'] },
];

export const getApplicationStats = (applications) => {
  const total = applications.length;
  const interviewCount = applications.filter((application) =>
    ['一面', '二面', 'HR面', 'Offer'].includes(application.status),
  ).length;
  const offerCount = applications.filter((application) => application.status === 'Offer').length;
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  return {
    total,
    interviewRate: total > 0 ? Math.round((interviewCount / total) * 100) : 0,
    offerRate: total > 0 ? Math.round((offerCount / total) * 100) : 0,
    weeklyNewCount: applications.filter((application) => {
      const createdAt = new Date(application.created_at);
      return !Number.isNaN(createdAt.getTime()) && createdAt >= weekAgo;
    }).length,
    statusData: statusOrder.map((status) => ({
      name: status,
      count: applications.filter((application) => application.status === status).length,
    })).filter((item) => item.count > 0),
    funnelData: funnelStages.map((stage) => {
      const count = stage.statuses
        ? applications.filter((application) => stage.statuses.includes(application.status)).length
        : total;

      return {
        ...stage,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      };
    }),
  };
};
