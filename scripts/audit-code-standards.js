import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Configuration
const SRC_DIR = 'src';
const REPORT_FILE = 'STANDARDS_REPORT.md';
const THRESHOLD = 95; // 95% compliance required

// Rules definition
const RULES = [
    {
        id: 'naming-component',
        description: 'Component files naming convention (PascalCase for features, kebab-case for ui)',
        check: (file, content) => {
            // Normalize path separators for Windows
            const normalizedFile = file.split(path.sep).join('/');
            const basename = path.basename(file, path.extname(file));
            
            // Skip index.ts/tsx
            if (basename === 'index') return true;

            // Rule 1: src/components/ui/ should be kebab-case
            if (normalizedFile.includes('/components/ui/')) {
                if (!/^[a-z0-9-]+$/.test(basename)) {
                    return { line: 0, msg: `UI Component ${basename} should be kebab-case (e.g., button.tsx)` };
                }
                return true;
            }

            // Rule 2: Other components/pages should be PascalCase
            if (normalizedFile.includes('/components/') || normalizedFile.includes('/pages/')) {
                if (!/^[A-Z][a-zA-Z0-9]*$/.test(basename)) {
                    return { line: 0, msg: `Component/Page ${basename} should be PascalCase` };
                }
            }
            return true;
        }
    },
    {
        id: 'naming-hook',
        description: 'Hook files must be camelCase and start with use',
        check: (file, content) => {
             // Normalize path separators for Windows
            const normalizedFile = file.split(path.sep).join('/');
            if (normalizedFile.includes('/hooks/')) {
                const basename = path.basename(file, path.extname(file));
                if (basename === 'index') return true;
                if (!/^use[A-Z][a-zA-Z0-9]*$/.test(basename)) {
                    return { line: 0, msg: `Hook file ${basename} should be camelCase and start with 'use'` };
                }
            }
            return true;
        }
    },
    {
        id: 'no-inline-style',
        description: 'Use Tailwind classes instead of inline styles',
        check: (file, content) => {
            if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
                const lines = content.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    if (/style=\{\{/.test(lines[i])) {
                        return { line: i + 1, msg: `Avoid inline styles, use Tailwind classes` };
                    }
                }
            }
            return true;
        }
    },
    {
        id: 'prefer-export-function',
        description: 'Prefer "export function" over "export default"',
        check: (file, content) => {
            if ((file.endsWith('.tsx') || file.endsWith('.ts')) && !file.includes('.d.ts')) {
                const lines = content.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    if (/export default function/.test(lines[i]) || /export default class/.test(lines[i])) {
                        return { line: i + 1, msg: `Prefer named export 'export function' over 'export default'` };
                    }
                }
            }
            return true;
        }
    },
    {
        id: 'no-console-log',
        description: 'Remove console.log before commit',
        check: (file, content) => {
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                if (/console\.log\(/.test(lines[i])) {
                    return { line: i + 1, msg: `Remove console.log usage` };
                }
            }
            return true;
        }
    }
];

async function runAudit() {
    console.log('🔍 Starting Code Standards Audit...');
    
    // Find all TS/TSX files
    const files = await glob(`${SRC_DIR}/**/*.{ts,tsx}`, { ignore: ['**/*.d.ts', '**/node_modules/**'] });
    
    let totalFiles = 0;
    let compliantFiles = 0;
    let issues = [];

    for (const file of files) {
        totalFiles++;
        const content = fs.readFileSync(file, 'utf-8');
        let fileHasIssues = false;

        for (const rule of RULES) {
            const result = rule.check(file, content);
            if (result !== true) {
                fileHasIssues = true;
                issues.push({
                    file,
                    rule: rule.id,
                    description: rule.description,
                    line: result.line,
                    msg: result.msg
                });
            }
        }

        if (!fileHasIssues) {
            compliantFiles++;
        }
    }

    const complianceRate = totalFiles === 0 ? 100 : Math.round((compliantFiles / totalFiles) * 100);
    const passed = complianceRate >= THRESHOLD;

    // Generate Report
    let report = `# Code Standards Compliance Report\n\n`;
    report += `**Date**: ${new Date().toISOString()}\n`;
    report += `**Compliance Rate**: ${complianceRate}% (Target: ≥${THRESHOLD}%)\n`;
    report += `**Status**: ${passed ? '✅ PASSED' : '❌ FAILED'}\n\n`;
    report += `## Summary\n`;
    report += `- Total Files Scanned: ${totalFiles}\n`;
    report += `- Compliant Files: ${compliantFiles}\n`;
    report += `- Issues Found: ${issues.length}\n\n`;

    if (issues.length > 0) {
        report += `## Issues List (Blocking)\n\n`;
        report += `| File | Line | Issue | Fix Example |\n`;
        report += `|------|------|-------|-------------|\n`;
        issues.forEach(issue => {
            let fix = '';
            if (issue.rule === 'naming-component') fix = 'Rename to PascalCase (e.g., MyComponent.tsx)';
            if (issue.rule === 'naming-hook') fix = 'Rename to camelCase (e.g., useMyHook.ts)';
            if (issue.rule === 'no-inline-style') fix = 'Use className="bg-red-500"';
            if (issue.rule === 'prefer-export-function') fix = 'export function MyComponent() {}';
            if (issue.rule === 'no-console-log') fix = 'Remove line';
            
            report += `| \`${issue.file}\` | ${issue.line} | ${issue.msg} | ${fix} |\n`;
        });
    }

    fs.writeFileSync(REPORT_FILE, report);
    console.log(`📊 Report generated: ${REPORT_FILE}`);
    console.log(`📈 Compliance Rate: ${complianceRate}%`);

    if (!passed) {
        console.error(`❌ Compliance rate below threshold (${THRESHOLD}%). Please fix issues listed in ${REPORT_FILE}.`);
        process.exit(1);
    } else {
        console.log(`✅ Standards check passed!`);
        process.exit(0);
    }
}

runAudit().catch(err => {
    console.error(err);
    process.exit(1);
});
