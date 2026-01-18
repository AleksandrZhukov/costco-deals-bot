import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { EventTypes, AllEventGroups } from '../src/utils/eventTypes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SRC_DIR = join(__dirname, '..', 'src');

interface EventUsage {
  event_type: string;
  used_in: string[];
  files_checked: string[];
}

function getAllTsFiles(dir: string, basePath: string = dir): string[] {
  const files: string[] = [];
  
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relativePath = fullPath.replace(basePath + '/', '');
      
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
        files.push(...getAllTsFiles(fullPath, basePath));
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        files.push(relativePath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  return files;
}

function findEventUsageInFiles(eventType: string, files: string[]): EventUsage {
  const usedIn: string[] = [];
  
  for (const file of files) {
    const filePath = join(SRC_DIR, file);
    try {
      const content = readFileSync(filePath, 'utf-8');
      
      const patterns = [
        new RegExp(`EventTypes\\.${Object.keys(EventTypes).find(key => EventTypes[key as keyof typeof EventTypes] === eventType)}`, 'g'),
        new RegExp(`['"]${eventType}['"]`, 'g'),
      ];
      
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          usedIn.push(file);
          break;
        }
      }
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
    }
  }
  
  return {
    event_type: eventType,
    used_in: usedIn.sort(),
    files_checked: files,
  };
}

function analyzeEventCoverage(): Map<string, EventUsage> {
  console.log('📂 Scanning source files...');
  const files = getAllTsFiles(SRC_DIR);
  console.log(`   Found ${files.length} TypeScript files\n`);
  
  const coverageMap = new Map<string, EventUsage>();
  const allEventTypes = Object.values(EventTypes);
  
  for (const eventType of allEventTypes) {
    const usage = findEventUsageInFiles(eventType, files);
    coverageMap.set(eventType, usage);
  }
  
  return coverageMap;
}

function printCoverageReport(coverageMap: Map<string, EventUsage>): void {
  console.log('='.repeat(80));
  console.log('📋 EVENT COVERAGE REPORT');
  console.log('='.repeat(80));
  
  const allEvents = Array.from(coverageMap.values());
  const usedEvents = allEvents.filter(e => e.used_in.length > 0);
  const unusedEvents = allEvents.filter(e => e.used_in.length === 0);
  
  console.log(`\nTotal Event Types Defined: ${allEvents.length}`);
  console.log(`✅ Used Events: ${usedEvents.length}`);
  console.log(`⚠️  Unused Events: ${unusedEvents.length}\n`);
  
  if (unusedEvents.length > 0) {
    console.log('⚠️  UNUSED EVENTS:\n');
    unusedEvents.forEach(event => {
      console.log(`  - ${event.event_type}`);
    });
    console.log('');
  }
  
  console.log('📊 EVENT USAGE BY GROUP:\n');
  
  for (const [groupName, eventTypes] of Object.entries(AllEventGroups)) {
    console.log(`${groupName.toUpperCase()} Events:`);
    console.log('-'.repeat(80));
    
    for (const eventType of eventTypes) {
      const usage = coverageMap.get(eventType);
      if (!usage) continue;
      
      if (usage.used_in.length > 0) {
        console.log(`  ✅ ${eventType}`);
        for (const file of usage.used_in) {
          console.log(`      → ${file}`);
        }
      } else {
        console.log(`  ⚠️  ${eventType} (NOT USED)`);
      }
    }
    console.log('');
  }
  
  console.log('='.repeat(80));
  console.log('COVERAGE SUMMARY');
  console.log('='.repeat(80));
  
  const coveragePercent = (usedEvents.length / allEvents.length * 100).toFixed(1);
  console.log(`\nCoverage: ${usedEvents.length}/${allEvents.length} events (${coveragePercent}%)\n`);
  
  const allUsed = unusedEvents.length === 0;
  
  if (allUsed) {
    console.log('✅ SUCCESS: All event types are being used in the codebase!\n');
  } else {
    console.log(`❌ WARNING: ${unusedEvents.length} event type(s) are not being used:\n`);
    unusedEvents.forEach(event => {
      console.log(`  - ${event.event_type}`);
    });
    console.log('\nConsider implementing these events or removing them from EventTypes if not needed.\n');
  }
  
  console.log('='.repeat(80) + '\n');
}

function checkEventStructureValidation(): void {
  console.log('🔍 Checking Event Type Constants...\n');
  
  const allEventTypes = Object.values(EventTypes);
  const duplicates: string[] = [];
  const seen = new Set<string>();
  
  for (const eventType of allEventTypes) {
    if (seen.has(eventType)) {
      duplicates.push(eventType);
    }
    seen.add(eventType);
  }
  
  if (duplicates.length > 0) {
    console.log('⚠️  DUPLICATE EVENT TYPES FOUND:\n');
    duplicates.forEach(dup => console.log(`  - ${dup}`));
    console.log('');
  } else {
    console.log('✅ No duplicate event types found\n');
  }
  
  console.log('✅ Event type constants are properly defined\n');
}

async function main(): Promise<void> {
  try {
    console.log('🧪 EVENT COVERAGE VALIDATION\n');
    
    checkEventStructureValidation();
    
    const coverageMap = analyzeEventCoverage();
    printCoverageReport(coverageMap);
    
    const unusedEvents = Array.from(coverageMap.values()).filter(e => e.used_in.length === 0);
    const exitCode = unusedEvents.length === 0 ? 0 : 1;
    
    process.exit(exitCode);
  } catch (error) {
    console.error('❌ Error during coverage analysis:', error);
    process.exit(1);
  }
}

main();
