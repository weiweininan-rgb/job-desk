import * as XLSX from 'xlsx';
import { classifyBatch, createFingerprint, isPreferredCity, isMajorCompany, isRelevantJob, normalizeSourceDate, splitPositions, stripSalaryReference } from './jobMatcher.js';

const cellText = (sheet, row, column) => {
  const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
  return cell ? String(cell.w ?? cell.v ?? '').trim() : '';
};

const cellUrl = (sheet, row, column) => {
  const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
  if (cell?.l?.Target?.startsWith('http')) return cell.l.Target;
  return cellText(sheet, row, column).match(/https?:\/\/\S+/)?.[0] ?? '';
};

export const parseJobWorkbook = async (file, settings = {}) => {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheetName = workbook.SheetNames.find((name) => /秋招/.test(name)) ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1:A1');
  const jobs = [];
  let sourceRowCount = 0;
  let splitPositionCount = 0;
  let filteredCount = 0;

  for (let row = range.s.r; row <= range.e.r; row += 1) {
    const company = cellText(sheet, row, 1);
    const positions = cellText(sheet, row, 2);
    if (!company || !positions || (row === range.s.r && /^(公司|公司名称)$/.test(company) && /^(职位|岗位|职位名称)$/.test(positions))) continue;
    sourceRowCount += 1;

    const batchText = cellText(sheet, row, 3);
    const location = cellText(sheet, row, 4);
    const notes = stripSalaryReference([cellText(sheet, row, 6), cellText(sheet, row, 9)].filter(Boolean).join('\n'));
    splitPositions(positions).forEach((position) => {
      splitPositionCount += 1;
      if (!isRelevantJob(position, `${notes} ${batchText}`, settings.profile_keywords)) {
        filteredCount += 1;
        return;
      }
      jobs.push({
        fingerprint: createFingerprint({ company, position, applyUrl: cellUrl(sheet, row, 8) }),
        company_name: company,
        position,
        batch: classifyBatch(batchText || positions),
        location,
        apply_url: cellUrl(sheet, row, 8),
        article_url: cellUrl(sheet, row, 7),
        notes,
        published_at: normalizeSourceDate(cellText(sheet, row, 5)),
        source_updated_at: normalizeSourceDate(cellText(sheet, row, 0)),
        is_chengdu: isPreferredCity(location, settings.preferred_cities ?? []),
        is_major_company: isMajorCompany(company, settings.major_companies),
      });
    });
  }

  const unique = new Map(jobs.map((job) => [job.fingerprint, job]));
  return { jobs: [...unique.values()], sheetName, sourceRowCount, splitPositionCount, filteredCount };
};
