import fs from 'node:fs';
import path from 'node:path';

interface LogRecord {
  req?: {
    method?: string;
    url?: string;
  };
  res?: {
    statusCode?: number;
  };
  type?: string;
  error?: string;
  code?: number | string;
}

interface AggregatedKey {
  method: string;
  path: string;
}

interface AggregatedStats {
  total: number;
  non2xx: number;
  statusCounts: Record<string, number>;
  errorCounts: Record<string, number>;
}

const LOG_FILE = process.env.BACKEND_LOG_FILE ?? path.join(process.cwd(), 'server.log');

const normalizePath = (url: string | undefined): string => {
  if (!url) return 'UNKNOWN';
  // 去掉 query 部分
  const [pathPart] = url.split('?');
  // 简单把看起来像 ID 的段归一化为 :id
  return pathPart
    .split('/')
    .map((segment) => {
      if (!segment) return '';
      if (/^[0-9a-fA-F-]{8,}$/.test(segment)) return ':id';
      return segment;
    })
    .join('/');
};

const readLines = (filePath: string): string[] => {
  if (!fs.existsSync(filePath)) {
    // eslint-disable-next-line no-console
    console.error(`日志文件不存在: ${filePath}`);
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf8');
  return content.split(/\r?\n/).filter((line) => line.trim().length > 0);
};

const shouldCount = (rec: LogRecord): boolean => {
  const status = rec.res?.statusCode;
  if (typeof status === 'number' && status >= 400) return true;
  if (rec.type && rec.type.endsWith('_error')) return true;
  return false;
};

const aggregate = (lines: string[]): Map<string, AggregatedStats> => {
  const result = new Map<string, AggregatedStats>();

  for (const line of lines) {
    let rec: LogRecord;
    try {
      rec = JSON.parse(line) as LogRecord;
    } catch {
      continue;
    }

    if (!shouldCount(rec)) continue;

    const method = (rec.req?.method ?? 'UNKNOWN').toUpperCase();
    const normPath = normalizePath(rec.req?.url);
    const key = `${method} ${normPath}`;

    const status = rec.res?.statusCode ?? 0;
    const errorKey = rec.error ?? rec.type ?? 'UNKNOWN';

    let stats = result.get(key);
    if (!stats) {
      stats = {
        total: 0,
        non2xx: 0,
        statusCounts: {},
        errorCounts: {}
      };
      result.set(key, stats);
    }

    stats.total += 1;
    if (status >= 400 || status === 0) {
      stats.non2xx += 1;
    }

    const sKey = String(status || 'unknown');
    stats.statusCounts[sKey] = (stats.statusCounts[sKey] ?? 0) + 1;
    stats.errorCounts[errorKey] = (stats.errorCounts[errorKey] ?? 0) + 1;
  }

  return result;
};

const printReport = (map: Map<string, AggregatedStats>) => {
  const entries = Array.from(map.entries()).sort(
    (a, b) => b[1].non2xx - a[1].non2xx
  );

  // eslint-disable-next-line no-console
  console.log('🔎 API 异常扫描报告');
  // eslint-disable-next-line no-console
  console.log(`日志文件: ${LOG_FILE}`);
  // eslint-disable-next-line no-console
  console.log('');

  if (entries.length === 0) {
    // eslint-disable-next-line no-console
    console.log('未发现非 2xx / error 类型的日志记录。');
    return;
  }

  for (const [key, stats] of entries) {
    // eslint-disable-next-line no-console
    console.log(`• ${key}`);
    // eslint-disable-next-line no-console
    console.log(
      `  总异常次数: ${stats.total}, 其中非 2xx: ${stats.non2xx}`
    );
    // 状态码分布
    const statusSummary = Object.entries(stats.statusCounts)
      .map(([s, c]) => `${s}: ${c}`)
      .join(', ');
    // 错误码/类型分布
    const errorSummary = Object.entries(stats.errorCounts)
      .map(([e, c]) => `${e}: ${c}`)
      .join(', ');

    // eslint-disable-next-line no-console
    console.log(`  状态码分布: ${statusSummary}`);
    // eslint-disable-next-line no-console
    console.log(`  错误类型分布: ${errorSummary}`);
    // eslint-disable-next-line no-console
    console.log('');
  }
};

const main = () => {
  const lines = readLines(LOG_FILE);
  const aggregated = aggregate(lines);
  printReport(aggregated);
};

main();

