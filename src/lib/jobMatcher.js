export const EMBEDDED_PROFILE_KEYWORDS = [
  '嵌入式', '嵌入式 Linux', 'Linux', 'RTOS', '驱动', 'BSP', '系统软件',
  '底层软件', '板级软件', '固件', 'MCU', 'C++', 'C语言', '智能硬件',
  'AIoT', '边缘 AI', '嵌入式 AI', '智能感知',
];

export const EXAMPLE_MAJOR_COMPANIES = [
  '华为', '海思', '荣耀', '小米', 'OPPO', 'vivo', '联想', '大疆', '海康威视',
  '腾讯', '阿里', '字节跳动', '百度', '京东', '美团', '滴滴', '快手', '网易',
  '比亚迪', '理想汽车', '小鹏汽车', '蔚来', '吉利', '中兴', '联发科技', '高通',
  '英伟达', 'NVIDIA', 'AMD', '特斯拉', '宁德时代', '传音',
];

export const DEFAULT_PROFILE_KEYWORDS = [];
export const DEFAULT_MAJOR_COMPANIES = [];

const normalize = (value = '') => value.toString().trim().replace(/\s+/g, ' ').toLowerCase();

export const stripSalaryReference = (value = '') => String(value)
  .split('\n')
  .map(line => /薪资统计表/.test(line) ? line.replace(/\[[^\]]*\]\(https?:\/\/[^)]*\)/g, '').replace(/https?:\/\/[^\s]+/g, '').replace(/嵌入式校招薪资统计表/g, '') : line)
  .join('\n').replace(/\n{3,}/g, '\n\n').trim();

export const normalizeSourceDate = (value = '', defaultYear = new Date().getFullYear()) => {
  const text = String(value).trim();
  const match = text.match(/(?:(\d{4})[./-])?(\d{1,2})[./-](\d{1,2})/);
  if (!match) return text;

  const year = Number(match[1] ?? defaultYear);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return text;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const formatSourceDate = (value = '') => {
  const match = String(value).match(/^\d{4}-(\d{2})-(\d{2})$/);
  return match ? `${match[1]}/${match[2]}` : String(value);
};

export const splitPositions = (value = '') => value
  .toString()
  .split(/[\n、；;|]/)
  .map((item) => item.trim())
  .filter(Boolean);

export const isRelevantJob = (position, context, keywords = DEFAULT_PROFILE_KEYWORDS) => {
  const haystack = normalize(`${position} ${context}`);
  return !keywords.length || keywords.some((keyword) => haystack.includes(normalize(keyword)));
};

export const classifyBatch = (value = '') => /提前批/.test(value) ? '提前批' : '秋招正式批';
export const isChengdu = (location = '') => /成都/.test(location);
export const isPreferredCity = (location = '', cities = []) => cities.some(city => normalize(location).includes(normalize(city)));
export const isMajorCompany = (company = '', companies = DEFAULT_MAJOR_COMPANIES) =>
  companies.some((name) => normalize(company).includes(normalize(name)));

export const createFingerprint = ({ company, position, applyUrl }) =>
  [normalize(company), normalize(position), normalize(applyUrl)].join('|');
