import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Briefcase, Target, TrendingUp, Award } from 'lucide-react';
import { getApplicationStats } from '@/lib/applicationStats';

const COLORS = ['#0f172a', '#b45309', '#d97706', '#ea580c', '#047857', '#dc2626', '#64748b', '#94a3b8'];

export const StatsDashboard = ({ applications }) => {
  const { total, interviewRate, offerRate, weeklyNewCount, statusData, funnelData } = getApplicationStats(applications);

  const stats = [
    { title: '总申请数', value: total, icon: Briefcase, color: 'text-slate-800', bg: 'bg-slate-100' },
    { title: '面试率', value: `${interviewRate}%`, icon: Target, color: 'text-amber-800', bg: 'bg-amber-100' },
    { title: 'Offer率', value: `${offerRate}%`, icon: Award, color: 'text-emerald-800', bg: 'bg-emerald-100' },
    { title: '本周新增', value: weeklyNewCount, icon: TrendingUp, color: 'text-orange-800', bg: 'bg-orange-100' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-slate-200 bg-white/95">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold mt-2">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-slate-200 bg-white/95">
          <CardHeader>
            <CardTitle className="text-lg">申请状态分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-45} textAnchor="end" height={80} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0f172a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white/95">
          <CardHeader>
            <CardTitle className="text-lg">转化漏斗</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {funnelData.map(({ name, count, percentage }) => {
              return (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{name}</span>
                    <span className="text-muted-foreground">{count} ({percentage}%)</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
