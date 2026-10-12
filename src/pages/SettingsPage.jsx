import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';

const toLines = value => [...new Set(value.split(/[\n,，]/).map(item => item.trim()).filter(Boolean))];

export default function SettingsPage() {
  const { data, isLoading, error, save, isSaving } = useSettings();
  const [keywords, setKeywords] = useState('');
  const [companies, setCompanies] = useState('');
  const [cities, setCities] = useState('');
  const supportsCities = Boolean(data && Object.hasOwn(data, 'preferred_cities'));
  useEffect(() => {
    if (!data) return;
    setKeywords((data.profile_keywords ?? []).join('\n'));
    setCompanies((data.major_companies ?? []).join('\n'));
    setCities((data.preferred_cities ?? ['成都']).join('\n'));
  }, [data]);
  const submit = async event => {
    event.preventDefault();
    try {
      await save({ profile_keywords: toLines(keywords), major_companies: toLines(companies), ...(supportsCities ? { preferred_cities: toLines(cities) } : {}) });
      toast.success('筛选规则已保存，下次导入或同步生效');
    } catch (error) { toast.error('保存失败：' + error.message); }
  };
  if (isLoading) return <p className="text-slate-500">正在读取设置…</p>;
  if (error) return <p role="alert">设置读取失败：{error.message}</p>;
  return <section className="max-w-3xl">
    <div className="mb-6"><p className="text-xs font-bold tracking-[0.2em] text-amber-700">PERSONAL RULES</p><h1 className="mt-2 font-display text-3xl font-bold">筛选与设置</h1><p className="mt-2 text-sm text-slate-600">规则仅影响后续导入和同步，不会删除已收录岗位。</p></div>
    <form onSubmit={submit} className="space-y-5 rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
      <label className="block text-sm font-semibold">岗位方向关键词<span className="mt-1 block text-xs font-normal text-slate-500">每行一个，任意关键词匹配职位、批次或备注即收录。留空收录全部方向。</span><Textarea className="mt-3 min-h-32" value={keywords} onChange={event => setKeywords(event.target.value)} /></label>
      <label className="block text-sm font-semibold">优先城市<span className="mt-1 block text-xs font-normal text-slate-500">{supportsCities ? '每行一个，匹配工作地点后标注；留空不标注。不会排除其他城市。' : '当前数据库尚未升级城市设置，仍使用原城市标注；请先由实例管理员应用升级迁移。'}</span><Textarea className="mt-3 min-h-24" disabled={!supportsCities} value={cities} onChange={event => setCities(event.target.value)} /></label>
      <label className="block text-sm font-semibold">行业大厂名单<span className="mt-1 block text-xs font-normal text-slate-500">每行一个公司或品牌名，命中后标注并参与重点优先排序；留空不标注。</span><Textarea className="mt-3 min-h-32" value={companies} onChange={event => setCompanies(event.target.value)} /></label>
      <Button type="submit" disabled={isSaving} className="bg-slate-950 hover:bg-slate-800"><Save className="mr-2 h-4 w-4" />{isSaving ? '保存中…' : '保存筛选规则'}</Button>
    </form>
    <p className="mt-4 text-xs text-slate-500">飞书是可选来源。应用密钥和表格配置只在服务端管理；不启用飞书也能手动管理岗位和导入 Excel。</p>
  </section>;
}
