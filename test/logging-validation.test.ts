import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SRC_DIR = join(__dirname, '..', 'src');

interface ValidationResult {
  event_type: string;
  success: boolean;
  error?: string;
}

interface TestResults {
  total_events: number;
  successful_events: number;
  failed_events: number;
  results: ValidationResult[];
}

function getAllTsFiles(dir: string, basePath: string = dir): string[] {
  const files: string[] = [];
  
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
        files.push(...getAllTsFiles(fullPath, basePath));
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  return files;
}

function extractEventTypesFromFile(filePath: string): string[] {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const matches = content.match(/event_type:\s*['"]([^'"]+)['"]/g);
    
    if (!matches) {
      return [];
    }
    
    return matches.map(match => {
      const m = match.match(/['"]([^'"]+)['"]/);
      return m ? m[1] : '';
    }).filter(Boolean);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return [];
  }
}

function validateEventTypeDefinitions(): ValidationResult[] {
  const results: ValidationResult[] = [];
  const eventTypesFilePath = join(SRC_DIR, 'utils', 'eventTypes.ts');
  
  try {
    const content = readFileSync(eventTypesFilePath, 'utf-8');
    
    const eventConstants = content.match(/export const EventTypes = \{([\s\S]*?)\}/);
    if (!eventConstants) {
      results.push({
        event_type: 'EventTypes',
        success: false,
        error: 'EventTypes constant not found',
      });
      return results;
    }
    
    const eventTypeMatches = eventConstants[1].matchAll(/([A-Z_]+):\s*['"]([^'"]+)['"]/g);
    const eventTypes: Record<string, string> = {};
    
    for (const match of eventTypeMatches) {
      eventTypes[match[1]] = match[2];
      results.push({
        event_type: match[2],
        success: true,
      });
    }
    
    console.log(`✅ Found ${Object.keys(eventTypes).length} event type constants`);
    results.unshift({
      event_type: 'EventTypes',
      success: true,
    });
    
  } catch (error) {
    results.push({
      event_type: 'EventTypes',
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  
  return results;
}

function validateLoggingTypes(): ValidationResult[] {
  const results: ValidationResult[] = [];
  const loggingTypesFilePath = join(SRC_DIR, 'types', 'logging.ts');
  
  try {
    const content = readFileSync(loggingTypesFilePath, 'utf-8');
    
    const hasBaseEvent = content.includes('interface BaseEvent') || content.includes('const BaseEventSchema');
    const hasEventContext = content.includes('interface EventContext') || content.includes('const EventContextSchema');
    const hasWideEvent = content.includes('type WideEvent') || content.includes('const WideEventSchema');
    const hasParseFunction = content.includes('parseWideEvent');
    
    if (!hasBaseEvent) {
      results.push({
        event_type: 'BaseEvent',
        success: false,
        error: 'BaseEvent interface/schema not found',
      });
    } else {
      results.push({
        event_type: 'BaseEvent',
        success: true,
      });
    }
    
    if (!hasEventContext) {
      results.push({
        event_type: 'EventContext',
        success: false,
        error: 'EventContext interface/schema not found',
      });
    } else {
      results.push({
        event_type: 'EventContext',
        success: true,
      });
    }
    
    if (!hasWideEvent) {
      results.push({
        event_type: 'WideEvent',
        success: false,
        error: 'WideEvent type/schema not found',
      });
    } else {
      results.push({
        event_type: 'WideEvent',
        success: true,
      });
    }
    
    if (!hasParseFunction) {
      results.push({
        event_type: 'parseWideEvent',
        success: false,
        error: 'parseWideEvent function not found',
      });
    } else {
      results.push({
        event_type: 'parseWideEvent',
        success: true,
      });
    }
    
  } catch (error) {
    results.push({
      event_type: 'LoggingTypes',
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  
  return results;
}

function validateLoggerUtilities(): ValidationResult[] {
  const results: ValidationResult[] = [];
  const loggerFilePath = join(SRC_DIR, 'utils', 'logger.ts');
  
  try {
    const content = readFileSync(loggerFilePath, 'utf-8');
    
    const hasLogObject = content.includes('export const log = {');
    const hasFlushLogs = content.includes('export function flushLogs') || content.includes('export async function flushLogs');
    const hasEventTypes = content.includes("from './eventTypes.js'");
    const hasAxiomConfigImport = content.includes("from '../config/axiom.js'");
    
    if (!hasLogObject) {
      results.push({
        event_type: 'log export',
        success: false,
        error: 'log export object not found',
      });
    } else {
      results.push({
        event_type: 'log export',
        success: true,
      });
    }
    
    if (!hasFlushLogs) {
      results.push({
        event_type: 'flushLogs',
        success: false,
        error: 'flushLogs function not found',
      });
    } else {
      results.push({
        event_type: 'flushLogs',
        success: true,
      });
    }
    
    if (!hasEventTypes) {
      results.push({
        event_type: 'EventTypes import',
        success: false,
        error: 'EventTypes not imported in logger',
      });
    } else {
      results.push({
        event_type: 'EventTypes import',
        success: true,
      });
    }
    
    if (!hasAxiomConfigImport) {
      results.push({
        event_type: 'Axiom config import',
        success: false,
        error: 'Axiom config not imported in logger (should import from ../config/axiom.js)',
      });
    } else {
      results.push({
        event_type: 'Axiom config import',
        success: true,
      });
    }
    
  } catch (error) {
    results.push({
      event_type: 'LoggerUtilities',
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  
  return results;
}

function validateErrorLogger(): ValidationResult[] {
  const results: ValidationResult[] = [];
  const errorLoggerFilePath = join(SRC_DIR, 'utils', 'errorLogger.ts');
  
  try {
    const content = readFileSync(errorLoggerFilePath, 'utf-8');
    
    const hasLogError = content.includes('export function logError');
    const hasValidationError = content.includes('export function logValidationError');
    const hasNetworkError = content.includes('export function logNetworkError');
    const hasDatabaseError = content.includes('export function logDatabaseError');
    
    if (!hasLogError) {
      results.push({
        event_type: 'logError',
        success: false,
        error: 'logError function not found',
      });
    } else {
      results.push({
        event_type: 'logError',
        success: true,
      });
    }
    
    if (!hasValidationError) {
      results.push({
        event_type: 'logValidationError',
        success: false,
        error: 'logValidationError function not found',
      });
    } else {
      results.push({
        event_type: 'logValidationError',
        success: true,
      });
    }
    
    if (!hasNetworkError) {
      results.push({
        event_type: 'logNetworkError',
        success: false,
        error: 'logNetworkError function not found',
      });
    } else {
      results.push({
        event_type: 'logNetworkError',
        success: true,
      });
    }
    
    if (!hasDatabaseError) {
      results.push({
        event_type: 'logDatabaseError',
        success: false,
        error: 'logDatabaseError function not found',
      });
    } else {
      results.push({
        event_type: 'logDatabaseError',
        success: true,
      });
    }
    
  } catch (error) {
    results.push({
      event_type: 'ErrorLogger',
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  
  return results;
}

function validateAxiomConfig(): ValidationResult[] {
  const results: ValidationResult[] = [];
  const axiomConfigFilePath = join(SRC_DIR, 'config', 'axiom.ts');
  const envConfigFilePath = join(SRC_DIR, 'config', 'env.ts');
  
  try {
    const axiomContent = readFileSync(axiomConfigFilePath, 'utf-8');
    const envContent = readFileSync(envConfigFilePath, 'utf-8');
    
    const hasLogger = axiomContent.includes('export const logger');
    const hasFlushLogs = axiomContent.includes('export function flushLogs') || axiomContent.includes('export async function flushLogs');
    const hasAxiomImport = axiomContent.includes('@axiomhq/logging') || axiomContent.includes('@axiomhq/js');
    const hasAxiomToken = envContent.includes('AXIOM_TOKEN');
    const hasAxiomDataset = envContent.includes('AXIOM_DATASET');
    const hasLogLevel = envContent.includes('LOG_LEVEL');
    
    if (!hasLogger) {
      results.push({
        event_type: 'logger export',
        success: false,
        error: 'logger export not found in axiom config',
      });
    } else {
      results.push({
        event_type: 'logger export',
        success: true,
      });
    }
    
    if (!hasFlushLogs) {
      results.push({
        event_type: 'flushLogs in axiom',
        success: false,
        error: 'flushLogs function not found in axiom config',
      });
    } else {
      results.push({
        event_type: 'flushLogs in axiom',
        success: true,
      });
    }
    
    if (!hasAxiomImport) {
      results.push({
        event_type: 'Axiom package',
        success: false,
        error: '@axiomhq/logging or @axiomhq/js not imported',
      });
    } else {
      results.push({
        event_type: 'Axiom package',
        success: true,
      });
    }
    
    if (!hasAxiomToken) {
      results.push({
        event_type: 'AXIOM_TOKEN env var',
        success: false,
        error: 'AXIOM_TOKEN not in env config',
      });
    } else {
      results.push({
        event_type: 'AXIOM_TOKEN env var',
        success: true,
      });
    }
    
    if (!hasAxiomDataset) {
      results.push({
        event_type: 'AXIOM_DATASET env var',
        success: false,
        error: 'AXIOM_DATASET not in env config',
      });
    } else {
      results.push({
        event_type: 'AXIOM_DATASET env var',
        success: true,
      });
    }
    
    if (!hasLogLevel) {
      results.push({
        event_type: 'LOG_LEVEL env var',
        success: false,
        error: 'LOG_LEVEL not in env config',
      });
    } else {
      results.push({
        event_type: 'LOG_LEVEL env var',
        success: true,
      });
    }
    
  } catch (error) {
    results.push({
      event_type: 'AxiomConfig',
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  
  return results;
}

function validateIndexIntegration(): ValidationResult[] {
  const results: ValidationResult[] = [];
  const indexFilePath = join(SRC_DIR, 'index.ts');
  
  try {
    const content = readFileSync(indexFilePath, 'utf-8');
    
    const hasLogImport = content.includes('logger.js') || content.includes("from './utils/logger'");
    const hasErrorLogImport = content.includes('errorLogger.js') || content.includes("from './utils/errorLogger'");
    const hasEventTypesImport = content.includes('eventTypes.js') || content.includes("from './utils/eventTypes'");
    const hasStartupLog = content.includes('EventTypes.APP_STARTUP');
    const hasShutdownLog = content.includes('EventTypes.APP_SHUTDOWN');
    const hasFlushLogs = content.includes('flushLogs()') || content.includes('await flushLogs');
    const hasHealthCheckLog = content.includes('EventTypes.HEALTH_CHECK');
    
    if (!hasLogImport) {
      results.push({
        event_type: 'logger import in index',
        success: false,
        error: 'logger not imported in index.ts',
      });
    } else {
      results.push({
        event_type: 'logger import in index',
        success: true,
      });
    }
    
    if (!hasErrorLogImport) {
      results.push({
        event_type: 'errorLogger import in index',
        success: false,
        error: 'errorLogger not imported in index.ts',
      });
    } else {
      results.push({
        event_type: 'errorLogger import in index',
        success: true,
      });
    }
    
    if (!hasEventTypesImport) {
      results.push({
        event_type: 'EventTypes import in index',
        success: false,
        error: 'EventTypes not imported in index.ts',
      });
    } else {
      results.push({
        event_type: 'EventTypes import in index',
        success: true,
      });
    }
    
    if (!hasStartupLog) {
      results.push({
        event_type: 'APP_STARTUP logging',
        success: false,
        error: 'APP_STARTUP event not logged',
      });
    } else {
      results.push({
        event_type: 'APP_STARTUP logging',
        success: true,
      });
    }
    
    if (!hasShutdownLog) {
      results.push({
        event_type: 'APP_SHUTDOWN logging',
        success: false,
        error: 'APP_SHUTDOWN event not logged',
      });
    } else {
      results.push({
        event_type: 'APP_SHUTDOWN logging',
        success: true,
      });
    }
    
    if (!hasFlushLogs) {
      results.push({
        event_type: 'flushLogs call',
        success: false,
        error: 'flushLogs not called in shutdown',
      });
    } else {
      results.push({
        event_type: 'flushLogs call',
        success: true,
      });
    }
    
    if (!hasHealthCheckLog) {
      results.push({
        event_type: 'HEALTH_CHECK logging',
        success: false,
        error: 'HEALTH_CHECK event not logged',
      });
    } else {
      results.push({
        event_type: 'HEALTH_CHECK logging',
        success: true,
      });
    }
    
  } catch (error) {
    results.push({
      event_type: 'IndexIntegration',
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  
  return results;
}

function validateServiceIntegration(): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  const servicesToCheck = [
    { name: 'dealParser.ts', path: join(SRC_DIR, 'services', 'yepApi', 'dealParser.ts'), requireErrorLogger: true },
    { name: 'dealProcessor.ts', path: join(SRC_DIR, 'services', 'dealProcessor.ts'), requireErrorLogger: true },
    { name: 'notificationService.ts', path: join(SRC_DIR, 'services', 'notificationService.ts'), requireErrorLogger: false },
  ];
  
  for (const service of servicesToCheck) {
    try {
      const content = readFileSync(service.path, 'utf-8');
      const hasLoggerImport = content.includes('logger.js') || content.includes("from '../../utils/logger'") ||
                              content.includes("from '../utils/logger'");
      const hasErrorLoggerImport = content.includes('errorLogger.js') || content.includes("from '../../utils/errorLogger'") ||
                                    content.includes("from '../utils/errorLogger'");
      
      if (!hasLoggerImport) {
        results.push({
          event_type: `${service.name} - logger import`,
          success: false,
          error: 'logger not imported',
        });
      } else {
        results.push({
          event_type: `${service.name} - logger import`,
          success: true,
        });
      }
      
      if (service.requireErrorLogger) {
        if (!hasErrorLoggerImport) {
          results.push({
            event_type: `${service.name} - errorLogger import`,
            success: false,
            error: 'errorLogger not imported',
          });
        } else {
          results.push({
            event_type: `${service.name} - errorLogger import`,
            success: true,
          });
        }
      } else {
        results.push({
          event_type: `${service.name} - errorLogger check`,
          success: true,
        });
      }
      
    } catch (error) {
      results.push({
        event_type: service.name,
        success: false,
        error: error instanceof Error ? error.message : 'File not found',
      });
    }
  }
  
  return results;
}

function validateBotIntegration(): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  const botFiles = [
    { name: 'start.ts', path: join(SRC_DIR, 'bot', 'commands', 'start.ts') },
    { name: 'deals.ts', path: join(SRC_DIR, 'bot', 'commands', 'deals.ts') },
    { name: 'favorites.ts', path: join(SRC_DIR, 'bot', 'commands', 'favorites.ts') },
    { name: 'settings.ts', path: join(SRC_DIR, 'bot', 'commands', 'settings.ts') },
    { name: 'callbackHandler.ts', path: join(SRC_DIR, 'bot', 'handlers', 'callbackHandler.ts') },
  ];
  
  for (const botFile of botFiles) {
    try {
      const content = readFileSync(botFile.path, 'utf-8');
      const hasLoggerImport = content.includes('logger.js') || content.includes("from '../../utils/logger'");
      const hasErrorLoggerImport = content.includes('errorLogger.js') || content.includes("from '../../utils/errorLogger'");
      
      if (!hasLoggerImport) {
        results.push({
          event_type: `${botFile.name} - logger import`,
          success: false,
          error: 'logger not imported',
        });
      } else {
        results.push({
          event_type: `${botFile.name} - logger import`,
          success: true,
        });
      }
      
      if (!hasErrorLoggerImport && botFile.name === 'callbackHandler.ts') {
        results.push({
          event_type: `${botFile.name} - errorLogger import`,
          success: false,
          error: 'errorLogger not imported (expected for callbackHandler)',
        });
      } else if (botFile.name !== 'callbackHandler.ts') {
        results.push({
          event_type: `${botFile.name} - errorLogger check`,
          success: true,
        });
      } else if (hasErrorLoggerImport) {
        results.push({
          event_type: `${botFile.name} - errorLogger import`,
          success: true,
        });
      }
      
    } catch (error) {
      results.push({
        event_type: botFile.name,
        success: false,
        error: error instanceof Error ? error.message : 'File not found',
      });
    }
  }
  
  return results;
}

function validateDailyParser(): ValidationResult[] {
  const results: ValidationResult[] = [];
  const dailyParserPath = join(SRC_DIR, 'schedulers', 'dailyParser.ts');
  
  try {
    const content = readFileSync(dailyParserPath, 'utf-8');
    const hasLoggerImport = content.includes('logger.js') || content.includes("from '../utils/logger'");
    const hasErrorLoggerImport = content.includes('errorLogger.js') || content.includes("from '../utils/errorLogger'");
    const hasJobTracker = content.includes('createJobTracker');
    
    if (!hasLoggerImport) {
      results.push({
        event_type: 'dailyParser - logger import',
        success: false,
        error: 'logger not imported',
      });
    } else {
      results.push({
        event_type: 'dailyParser - logger import',
        success: true,
      });
    }
    
    if (!hasErrorLoggerImport) {
      results.push({
        event_type: 'dailyParser - errorLogger import',
        success: false,
        error: 'errorLogger not imported',
      });
    } else {
      results.push({
        event_type: 'dailyParser - errorLogger import',
        success: true,
      });
    }
    
    if (!hasJobTracker) {
      results.push({
        event_type: 'dailyParser - jobTracker',
        success: false,
        error: 'createJobTracker not used',
      });
    } else {
      results.push({
        event_type: 'dailyParser - jobTracker',
        success: true,
      });
    }
    
  } catch (error) {
    results.push({
      event_type: 'dailyParser',
      success: false,
      error: error instanceof Error ? error.message : 'File not found',
    });
  }
  
  return results;
}

function checkEventUsageInCodebase(): ValidationResult[] {
  const results: ValidationResult[] = [];
  const files = getAllTsFiles(SRC_DIR);
  
  const eventUsages = new Map<string, string[]>();
  
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      const eventTypes = extractEventTypesFromFile(file);
      
      for (const eventType of eventTypes) {
        if (!eventUsages.has(eventType)) {
          eventUsages.set(eventType, []);
        }
        eventUsages.get(eventType)!.push(file.replace(SRC_DIR + '/', ''));
      }
    } catch (error) {
      console.error(`Error reading file ${file}:`, error);
    }
  }
  
  console.log(`\n📊 Event usage across ${files.length} TypeScript files:`);
  console.log(`   Found ${eventUsages.size} unique event types used in code\n`);
  
  const usedEventTypes = Array.from(eventUsages.keys());
  usedEventTypes.sort();
  
  results.push({
    event_type: 'Event Types Used',
    success: true,
  });
  
  if (usedEventTypes.length < 10) {
    console.log('⚠️  WARNING: Very few event types are being used in the codebase');
    results.push({
      event_type: 'Event Coverage',
      success: false,
      error: `Only ${usedEventTypes.length} event types used in code`,
    });
  } else {
    console.log(`✅ Found ${usedEventTypes.length} event types in use`);
    results.push({
      event_type: 'Event Coverage',
      success: true,
    });
  }
  
  return results;
}

async function runAllTests(): Promise<TestResults> {
  console.log('🧪 STARTING LOGGING IMPLEMENTATION VALIDATION\n');
  console.log('=' .repeat(70));
  
  const allResults: ValidationResult[] = [];
  
  console.log('\n📋 1. Validating Event Type Definitions...');
  const eventTypesResults = validateEventTypeDefinitions();
  allResults.push(...eventTypesResults);
  
  console.log('\n📋 2. Validating Logging Types...');
  const loggingTypesResults = validateLoggingTypes();
  allResults.push(...loggingTypesResults);
  
  console.log('\n📋 3. Validating Logger Utilities...');
  const loggerResults = validateLoggerUtilities();
  allResults.push(...loggerResults);
  
  console.log('\n📋 4. Validating Error Logger...');
  const errorLoggerResults = validateErrorLogger();
  allResults.push(...errorLoggerResults);
  
  console.log('\n📋 5. Validating Axiom Configuration...');
  const axiomResults = validateAxiomConfig();
  allResults.push(...axiomResults);
  
  console.log('\n📋 6. Validating Index.ts Integration...');
  const indexResults = validateIndexIntegration();
  allResults.push(...indexResults);
  
  console.log('\n📋 7. Validating Service Integration...');
  const serviceResults = validateServiceIntegration();
  allResults.push(...serviceResults);
  
  console.log('\n📋 8. Validating Bot Integration...');
  const botResults = validateBotIntegration();
  allResults.push(...botResults);
  
  console.log('\n📋 9. Validating Daily Parser...');
  const dailyParserResults = validateDailyParser();
  allResults.push(...dailyParserResults);
  
  console.log('\n📋 10. Checking Event Usage in Codebase...');
  const usageResults = checkEventUsageInCodebase();
  allResults.push(...usageResults);
  
  const successful = allResults.filter(r => r.success).length;
  const failed = allResults.filter(r => !r.success).length;
  
  return {
    total_events: allResults.length,
    successful_events: successful,
    failed_events: failed,
    results: allResults,
  };
}

function printResults(results: TestResults): void {
  console.log('\n' + '='.repeat(70));
  console.log('📊 VALIDATION RESULTS');
  console.log('='.repeat(70));
  
  console.log(`\nTotal Checks: ${results.total_events}`);
  console.log(`✅ Passed: ${results.successful_events}`);
  console.log(`❌ Failed: ${results.failed_events}\n`);
  
  const failedResults = results.results.filter(r => !r.success);
  
  if (failedResults.length > 0) {
    console.log('❌ FAILED CHECKS:\n');
    failedResults.forEach(r => {
      console.log(`  - ${r.event_type}: ${r.error}`);
    });
    console.log('');
  }
  
  const successPercent = (results.successful_events / results.total_events * 100).toFixed(1);
  
  console.log(`Success Rate: ${successPercent}%`);
  
  const allPass = results.failed_events === 0;
  
  console.log('\n' + '='.repeat(70));
  if (allPass) {
    console.log('✅ ALL VALIDATION CHECKS PASSED!');
  } else {
    console.log('❌ SOME VALIDATION CHECKS FAILED');
  }
  console.log('='.repeat(70) + '\n');
}

async function main(): Promise<void> {
  try {
    const results = await runAllTests();
    printResults(results);
    
    const exitCode = results.failed_events === 0 ? 0 : 1;
    process.exit(exitCode);
  } catch (error) {
    console.error('❌ Test suite error:', error);
    process.exit(1);
  }
}

main();
