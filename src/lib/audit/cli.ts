/**
 * Race Condition Audit CLI
 * 
 * Command-line interface for running race condition audits and generating reports.
 * 
 * Usage:
 *   tsx src/lib/audit/cli.ts [options]
 * 
 * Options:
 *   --format <format>  Report format: text, json, markdown (default: markdown)
 *   --output <file>    Output file path (default: stdout)
 *   --clear            Clear existing patterns before running
 */

import { detector, auditLogger, auditReporter, metricsCollector } from './index';
import type { ReportFormat } from './reporter';

/**
 * CLI options
 */
interface CliOptions {
  format: ReportFormat;
  output?: string;
  clear: boolean;
}

/**
 * Parse command-line arguments
 */
function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    format: 'markdown',
    clear: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--format' && i + 1 < args.length) {
      options.format = args[++i] as ReportFormat;
    } else if (arg === '--output' && i + 1 < args.length) {
      options.output = args[++i];
    } else if (arg === '--clear') {
      options.clear = true;
    }
  }

  return options;
}

/**
 * Run the audit CLI
 */
export async function runCli() {
  const options = parseArgs();

  auditLogger.info('Race Condition Audit CLI');
  auditLogger.info('========================');
  auditLogger.info('');

  if (options.clear) {
    auditLogger.info('Clearing existing patterns...');
    detector.clear();
    auditLogger.clear();
  }

  auditLogger.info('Generating audit result...');
  const result = detector.generateAuditResult();

  auditLogger.info(`Found ${result.totalFound} race condition patterns`);
  auditLogger.info('');

  // Calculate metrics
  const metrics = metricsCollector.calculateMetrics(result.patterns);
  const completion = metricsCollector.getCompletionPercentage(metrics);

  auditLogger.info('Metrics Summary:');
  auditLogger.info(`  Total: ${metrics.totalPatterns}`);
  auditLogger.info(`  Fixed: ${metrics.fixedCount}`);
  auditLogger.info(`  Verified: ${metrics.verifiedCount}`);
  auditLogger.info(`  Pending: ${metrics.pendingCount}`);
  auditLogger.info(`  Completion: ${completion}%`);
  auditLogger.info('');

  // Generate report
  auditLogger.info(`Generating ${options.format} report...`);
  const report = auditReporter.generateReport(result, options.format);

  // Output report
  if (options.output) {
    const fs = await import('fs');
    fs.writeFileSync(options.output, report, 'utf-8');
    auditLogger.info(`Report written to: ${options.output}`);
  } else {
    console.log('');
    console.log(report);
  }

  auditLogger.info('');
  auditLogger.info('Audit complete!');
}

// Run CLI if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((error) => {
    console.error('Error running audit CLI:', error);
    process.exit(1);
  });
}
