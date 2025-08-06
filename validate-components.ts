#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

interface ValidationResult {
  file: string;
  issues: string[];
  isValid: boolean;
}

interface ComponentInfo {
  isFunctional: boolean;
  hasPropsInterface: boolean;
  hasNamedExport: boolean;
  hasDefaultExport: boolean;
  hasTypeScriptTypes: boolean;
  usesHooks: boolean;
  isPageComponent: boolean;
}

const COMPONENT_DIRS = [
  'src/components',
  'src/components/ui',
  'src/components/optimized',
  'src/components/lazy',
  'src/components/charts',
  'src/components/profile-sections'
];

const HOOKS_DIR = 'src/hooks';
const PAGES_DIR = 'src/pages';

function analyzeFile(filePath: string, content: string): ComponentInfo {
  const isPageComponent = filePath.includes('/pages/');
  
  // Check if it's a functional component
  const functionalComponentRegex = /(?:export\s+)?(?:const|function)\s+\w+.*?=.*?(?:\(|:).*?=>/;
  const functionDeclarationRegex = /(?:export\s+)?function\s+\w+\s*\(/;
  const isFunctional = functionalComponentRegex.test(content) || functionDeclarationRegex.test(content);
  
  // Check for Props interface
  const propsInterfaceRegex = /interface\s+\w*Props\s*(?:extends\s+\w+\s*)?{/;
  const hasPropsInterface = propsInterfaceRegex.test(content);
  
  // Check for named exports
  const namedExportRegex = /export\s+(?:const|function|{)/;
  const hasNamedExport = namedExportRegex.test(content);
  
  // Check for default exports
  const defaultExportRegex = /export\s+default\s+/;
  const hasDefaultExport = defaultExportRegex.test(content);
  
  // Check for TypeScript types (basic check)
  const hasTypeAnnotations = /:\s*(?:string|number|boolean|any|unknown|void|null|undefined|\w+(?:<.*?>)?|\{.*?\}|\[.*?\]|'.*?'|".*?")/g.test(content);
  const hasTypeScriptTypes = hasTypeAnnotations || content.includes('interface') || content.includes('type ');
  
  // Check if it uses hooks
  const hooksRegex = /use[A-Z]\w*\s*\(/;
  const usesHooks = hooksRegex.test(content);
  
  return {
    isFunctional,
    hasPropsInterface,
    hasNamedExport,
    hasDefaultExport,
    hasTypeScriptTypes,
    usesHooks,
    isPageComponent
  };
}

function validateComponent(filePath: string, content: string): ValidationResult {
  const issues: string[] = [];
  const info = analyzeFile(filePath, content);
  
  // Skip validation for non-component files (like index.ts, types, etc.)
  if (filePath.endsWith('index.ts') || filePath.endsWith('index.tsx')) {
    return { file: filePath, issues: [], isValid: true };
  }
  
  // Skip validation for UI components that might be third-party wrappers
  if (filePath.includes('/ui/') && !info.isFunctional && !info.hasNamedExport) {
    // UI components might export only types or be re-exports
    return { file: filePath, issues: [], isValid: true };
  }
  
  // Rule 1: All components must be functional components
  if (!info.isFunctional && content.includes('React') && !content.includes('class ')) {
    issues.push('Component should be a functional component');
  }
  
  // Rule 2: Components should have Props interface (if they likely accept props)
  if (info.isFunctional && !info.hasPropsInterface && content.includes('props') && !filePath.includes('/ui/')) {
    issues.push('Component uses props but missing Props interface');
  }
  
  // Rule 3: Use named exports (except for page components)
  if (!info.isPageComponent) {
    if (!info.hasNamedExport && info.isFunctional) {
      issues.push('Component should use named export instead of default export');
    }
    if (info.hasDefaultExport && !filePath.includes('App.tsx')) {
      issues.push('Non-page components should not use default exports');
    }
  } else {
    // Page components should use default exports
    if (!info.hasDefaultExport) {
      issues.push('Page components should use default exports');
    }
  }
  
  // Rule 4: TypeScript types should be explicit
  if (!info.hasTypeScriptTypes && info.isFunctional) {
    issues.push('Component should have explicit TypeScript types');
  }
  
  return {
    file: filePath,
    issues,
    isValid: issues.length === 0
  };
}

function validateHook(filePath: string, content: string): ValidationResult {
  const issues: string[] = [];
  
  // Check if hook name starts with 'use'
  const hookNameMatch = content.match(/export\s+(?:const|function)\s+(use\w+)/);
  if (!hookNameMatch) {
    issues.push('Hook should be named with "use" prefix and be exported');
  }
  
  // Check for TypeScript types
  const hasTypeAnnotations = /:\s*(?:string|number|boolean|any|unknown|void|null|undefined|\w+(?:<.*?>)?|\{.*?\}|\[.*?\])/g.test(content);
  if (!hasTypeAnnotations) {
    issues.push('Hook should have explicit TypeScript types');
  }
  
  // Check for named export
  const hasNamedExport = /export\s+(?:const|function)/g.test(content);
  if (!hasNamedExport) {
    issues.push('Hook should use named export');
  }
  
  return {
    file: filePath,
    issues,
    isValid: issues.length === 0
  };
}

function scanDirectory(dir: string, validator: (filePath: string, content: string) => ValidationResult): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  if (!fs.existsSync(dir)) {
    console.log(`Directory ${dir} does not exist, skipping...`);
    return results;
  }
  
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      results.push(...scanDirectory(filePath, validator));
    } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
      const content = fs.readFileSync(filePath, 'utf-8');
      results.push(validator(filePath, content));
    }
  }
  
  return results;
}

function main() {
  console.log('🔍 Validating component structure and exports...\n');
  
  const allResults: ValidationResult[] = [];
  
  // Validate components
  console.log('📦 Checking components...');
  for (const dir of COMPONENT_DIRS) {
    allResults.push(...scanDirectory(dir, validateComponent));
  }
  
  // Validate hooks
  console.log('\n🪝 Checking hooks...');
  allResults.push(...scanDirectory(HOOKS_DIR, validateHook));
  
  // Validate pages (with different rules)
  console.log('\n📄 Checking pages...');
  allResults.push(...scanDirectory(PAGES_DIR, validateComponent));
  
  // Summary
  const invalidResults = allResults.filter(r => !r.isValid);
  const validCount = allResults.filter(r => r.isValid).length;
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Valid files: ${validCount}`);
  console.log(`❌ Files with issues: ${invalidResults.length}`);
  console.log(`📁 Total files checked: ${allResults.length}`);
  
  if (invalidResults.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('⚠️  ISSUES FOUND');
    console.log('='.repeat(80));
    
    for (const result of invalidResults) {
      console.log(`\n📄 ${result.file}`);
      for (const issue of result.issues) {
        console.log(`   ❌ ${issue}`);
      }
    }
    
    console.log('\n💡 Recommendations:');
    console.log('   - Convert class components to functional components');
    console.log('   - Add Props interfaces for all components that accept props');
    console.log('   - Use named exports for non-page components');
    console.log('   - Add explicit TypeScript types to all functions and variables');
    console.log('   - Ensure hooks follow naming convention and are properly typed');
  } else {
    console.log('\n✨ All components follow the project rules!');
  }
  
  // Check file organization
  console.log('\n' + '='.repeat(80));
  console.log('📂 FILE ORGANIZATION CHECK');
  console.log('='.repeat(80));
  
  const organizationIssues: string[] = [];
  
  // Check if components are in the right directories
  const componentFiles = fs.readdirSync('src/components', { withFileTypes: true })
    .filter(f => f.isFile() && (f.name.endsWith('.tsx') || f.name.endsWith('.ts')));
  
  for (const file of componentFiles) {
    const content = fs.readFileSync(path.join('src/components', file.name), 'utf-8');
    
    // Check if it's a UI primitive
    if (file.name.toLowerCase().includes('button') || 
        file.name.toLowerCase().includes('card') ||
        file.name.toLowerCase().includes('input')) {
      organizationIssues.push(`${file.name} appears to be a UI primitive and should be in src/components/ui/`);
    }
    
    // Check if it's performance-critical
    if (file.name.includes('Optimized')) {
      organizationIssues.push(`${file.name} should be in src/components/optimized/`);
    }
    
    // Check if it's lazy-loaded
    if (file.name.includes('Lazy')) {
      organizationIssues.push(`${file.name} should be in src/components/lazy/`);
    }
  }
  
  if (organizationIssues.length > 0) {
    console.log('⚠️  Organization issues found:');
    for (const issue of organizationIssues) {
      console.log(`   ❌ ${issue}`);
    }
  } else {
    console.log('✅ All files are properly organized!');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Validation complete!');
  console.log('='.repeat(80));
}

// Run the validation
main();
