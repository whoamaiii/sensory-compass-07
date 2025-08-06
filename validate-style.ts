#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface ValidationResult {
  file: string;
  violations: string[];
}

async function validateCodeStyle(): Promise<void> {
  console.log('🔍 Validating code style consistency...\n');
  
  const srcPath = path.join(process.cwd(), 'src');
  const results: ValidationResult[] = [];

  // Find all TypeScript/React files
  const files = await glob('**/*.{ts,tsx}', {
    cwd: srcPath,
    ignore: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**']
  });

  for (const file of files) {
    const filePath = path.join(srcPath, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const violations: string[] = [];

    // Check for inline styles (style attribute)
    const inlineStyleRegex = /style\s*=\s*\{\{?[^}]*\}?\}/g;
    const inlineStyleMatches = content.match(inlineStyleRegex);
    if (inlineStyleMatches && !file.includes('ui/')) {
      violations.push(`Found inline styles: ${inlineStyleMatches.length} occurrences`);
    }

    // Check for default exports (except pages in src/pages)
    const defaultExportRegex = /export\s+default\s+/g;
    const hasDefaultExport = defaultExportRegex.test(content);
    if (hasDefaultExport && !file.startsWith('pages/')) {
      violations.push('Uses default export instead of named export');
    }

    // Check for 'any' type usage
    const anyTypeRegex = /:\s*any(?:[,;\s)\]]|$)/g;
    const anyMatches = content.match(anyTypeRegex);
    if (anyMatches) {
      violations.push(`Found 'any' type usage: ${anyMatches.length} occurrences`);
    }

    // Check for class components
    const classComponentRegex = /class\s+\w+\s+extends\s+(React\.)?Component/g;
    const hasClassComponent = classComponentRegex.test(content);
    if (hasClassComponent) {
      violations.push('Uses class component instead of functional component');
    }

    // Check for missing TypeScript interfaces for props (for components)
    if (file.endsWith('.tsx') && !file.includes('/ui/')) {
      const componentRegex = /(?:export\s+)?(?:const|function)\s+(\w+).*?=.*?\(.*?\)\s*(?::|=>)/g;
      const propsRegex = /interface\s+\w+Props\s*{/g;
      const components = content.match(componentRegex);
      const propsInterfaces = content.match(propsRegex);
      
      if (components && components.length > 0) {
        const componentCount = components.length;
        const interfaceCount = propsInterfaces ? propsInterfaces.length : 0;
        
        if (interfaceCount === 0 && componentCount > 0) {
          // Check if component accepts props
          const hasPropsParam = /\(\s*\{|\(\s*props\s*[,:)]/.test(content);
          if (hasPropsParam) {
            violations.push('Component accepts props but missing Props interface');
          }
        }
      }
    }

    // Check for non-Tailwind CSS classes (basic heuristic)
    const nonTailwindRegex = /className\s*=\s*["']([^"']*?)["']/g;
    let match;
    while ((match = nonTailwindRegex.exec(content)) !== null) {
      const classes = match[1].split(' ');
      for (const cls of classes) {
        // Skip dynamic classes, cn() calls, and known Tailwind patterns
        if (cls && 
            !cls.includes('{') && 
            !cls.includes('$') &&
            !cls.startsWith('font-') &&
            !cls.startsWith('text-') &&
            !cls.startsWith('bg-') &&
            !cls.startsWith('border-') &&
            !cls.startsWith('p-') &&
            !cls.startsWith('m-') &&
            !cls.startsWith('w-') &&
            !cls.startsWith('h-') &&
            !cls.startsWith('flex') &&
            !cls.startsWith('grid') &&
            !cls.startsWith('absolute') &&
            !cls.startsWith('relative') &&
            !cls.startsWith('animate-') &&
            !cls.includes(':') &&
            cls.length > 2 &&
            !/^[a-z]+-\d+$/.test(cls) &&
            !/^[a-z]+-[a-z]+$/.test(cls)) {
          // This might be a non-Tailwind class
          if (!violations.find(v => v.includes('non-Tailwind'))) {
            violations.push(`Potentially non-Tailwind CSS class: "${cls}"`);
          }
        }
      }
    }

    if (violations.length > 0) {
      results.push({ file, violations });
    }
  }

  // Print results
  if (results.length === 0) {
    console.log('✅ All files pass code style validation!');
  } else {
    console.log(`❌ Found violations in ${results.length} files:\n`);
    
    for (const result of results) {
      console.log(`\n📄 ${result.file}:`);
      for (const violation of result.violations) {
        console.log(`   ⚠️  ${violation}`);
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`   Total files checked: ${files.length}`);
    console.log(`   Files with violations: ${results.length}`);
    console.log(`   Pass rate: ${((files.length - results.length) / files.length * 100).toFixed(1)}%`);
  }
}

validateCodeStyle().catch(console.error);
