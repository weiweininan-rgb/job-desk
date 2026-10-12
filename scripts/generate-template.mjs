import * as XLSX from 'xlsx';
import { mkdir, writeFile } from 'node:fs/promises';
const workbook = XLSX.utils.book_new();
const sheet = XLSX.utils.aoa_to_sheet([
  ['更新日期','公司','职位','批次','地点','发布时间','业务信息','官方推送','投递官网','其他信息'],
  ['2026-10-10','示例公司（请替换）','产品经理\n软件工程师','秋招正式批','上海','2026-10-10','示例业务说明','https://example.com/news','https://example.com/jobs','仅为格式示例，请删除后填写自己的岗位'],
]);
sheet['!cols'] = [{wch:14},{wch:24},{wch:24},{wch:16},{wch:14},{wch:14},{wch:24},{wch:28},{wch:28},{wch:40}];
XLSX.utils.book_append_sheet(workbook,sheet,'岗位模板');
await mkdir(new URL('../public/',import.meta.url),{recursive:true});
await writeFile(new URL('../public/job-template.xlsx',import.meta.url),XLSX.write(workbook,{type:'buffer',bookType:'xlsx'}));
console.log('Generated public/job-template.xlsx (fictional example only).');
