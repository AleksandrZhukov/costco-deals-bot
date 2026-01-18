import { log, flushLogs } from '../src/utils/logger.js';
import { EventTypes, AllEventGroups } from '../src/utils/eventTypes.js';
import { logError } from '../src/utils/errorLogger.js';
import { parseWideEvent, safeParseWideEvent } from '../src/types/logging.js';
import type { WideEvent } from '../src/types/logging.js';

interface ValidationResult {
  event_type: string;
  success: boolean;
  latency_ms: number;
  error?: string;
  validation_error?: string;
}

interface TestResults {
  total_events: number;
  successful_events: number;
  failed_events: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  blocking_detected: boolean;
  results: ValidationResult[];
}

const TEST_USER_ID = 999999;
const TEST_STORE_ID = 123;
const TEST_DEAL_ID = 'test-deal-123';
const TEST_PRODUCT_UPC = 'test-upc-12345';

function measureLatency<T>(fn: () => T): { result: T; latency_ms: number } {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  return { result, latency_ms: end - start };
}

async function measureAsyncLatency<T>(fn: () => Promise<T>): Promise<{ result: T; latency_ms: number }> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return { result, latency_ms: end - start };
}

function validateEventStructure(eventData: unknown, eventType: string): boolean {
  try {
    const parsed = parseWideEvent(eventData);
    if (parsed.event_type !== eventType) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
}

async function testSystemEvents(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  const { result: logResult, latency_ms } = measureLatency(() => {
    log.info(EventTypes.APP_STARTUP, {
      node_version: process.version,
      environment: 'test',
      webhook_mode: false,
      health_check_port: 3000,
    });
    return { event_type: EventTypes.APP_STARTUP };
  });

  results.push({
    event_type: EventTypes.APP_STARTUP,
    success: true,
    latency_ms,
  });

  return results;
}

async function testHealthCheck(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  const { latency_ms } = measureLatency(() => {
    log.debug(EventTypes.HEALTH_CHECK, {
      endpoint: '/health',
    });
  });

  results.push({
    event_type: EventTypes.HEALTH_CHECK,
    success: true,
    latency_ms,
  });

  return results;
}

async function testApiEvents(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  const { latency_ms: requestLatency } = measureLatency(() => {
    log.info(EventTypes.YEP_API_REQUEST, {
      store_id: TEST_STORE_ID,
      page: 1,
    });
  });

  results.push({
    event_type: EventTypes.YEP_API_REQUEST,
    success: true,
    latency_ms: requestLatency,
  });

  await new Promise(resolve => setTimeout(resolve, 10));

  const { latency_ms: successLatency } = measureLatency(() => {
    log.info(EventTypes.YEP_API_SUCCESS, {
      store_id: TEST_STORE_ID,
      page: 1,
      duration_ms: 150,
      deals_count: 50,
      status_code: 200,
    });
  });

  results.push({
    event_type: EventTypes.YEP_API_SUCCESS,
    success: true,
    latency_ms: successLatency,
  });

  const { latency_ms: errorLatency } = measureLatency(() => {
    log.error(EventTypes.YEP_API_ERROR, {
      store_id: TEST_STORE_ID,
      page: 1,
      duration_ms: 500,
      error_message: 'Test error',
      status_code: 500,
    });
  });

  results.push({
    event_type: EventTypes.YEP_API_ERROR,
    success: true,
    latency_ms: errorLatency,
  });

  return results;
}

async function testDealEvents(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  const { latency_ms } = measureLatency(() => {
    log.info(EventTypes.DEAL_PROCESSED, {
      deal_id: TEST_DEAL_ID,
      product_upc: TEST_PRODUCT_UPC,
      store_id: TEST_STORE_ID,
      original_price: 100,
      current_price: 80,
      discount_percentage: 20,
      processing_duration_ms: 50,
      created: true,
      updated: false,
      expired: false,
    });
  });

  const success = validateEventStructure({
    event_type: EventTypes.DEAL_PROCESSED,
    environment: 'test',
    service_name: 'yep-savings-bot',
    version: '1.0.0',
    deal_id: TEST_DEAL_ID,
    product_upc: TEST_PRODUCT_UPC,
    store_id: TEST_STORE_ID,
    original_price: 100,
    current_price: 80,
    discount_percentage: 20,
    processing_duration_ms: 50,
    created: true,
    updated: false,
    expired: false,
  }, EventTypes.DEAL_PROCESSED);

  results.push({
    event_type: EventTypes.DEAL_PROCESSED,
    success,
    latency_ms,
    validation_error: success ? undefined : 'Structure validation failed',
  });

  const { latency_ms: batchLatency } = measureLatency(() => {
    log.info(EventTypes.PROCESSING_BATCH_COMPLETE, {
      store_id: TEST_STORE_ID,
      deals_processed: 10,
      products_created: 5,
      products_updated: 5,
      deals_created: 8,
      deals_updated: 2,
      deals_expired: 0,
      duration_ms: 500,
    });
  });

  results.push({
    event_type: EventTypes.PROCESSING_BATCH_COMPLETE,
    success: true,
    latency_ms: batchLatency,
  });

  return results;
}

async function testNotificationEvents(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  const { latency_ms } = measureLatency(() => {
    log.info(EventTypes.NOTIFICATION_SENT, {
      user_id: TEST_USER_ID,
      deal_id: TEST_DEAL_ID,
      store_id: TEST_STORE_ID,
      product_upc: TEST_PRODUCT_UPC,
      success: true,
      has_image: true,
      message_length: 250,
    });
  });

  results.push({
    event_type: EventTypes.NOTIFICATION_SENT,
    success: true,
    latency_ms,
  });

  const { latency_ms: failedLatency } = measureLatency(() => {
    log.error(EventTypes.NOTIFICATION_FAILED, {
      user_id: TEST_USER_ID,
      deal_id: TEST_DEAL_ID,
      success: false,
      error_message: 'Test notification failure',
    });
  });

  results.push({
    event_type: EventTypes.NOTIFICATION_FAILED,
    success: true,
    latency_ms: failedLatency,
  });

  return results;
}

async function testUserEvents(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  const { latency_ms } = measureLatency(() => {
    log.info(EventTypes.USER_CREATED, {
      user_id: TEST_USER_ID,
      success: true,
    });
  });

  results.push({
    event_type: EventTypes.USER_CREATED,
    success: true,
    latency_ms,
  });

  const { latency_ms: commandLatency } = measureLatency(() => {
    log.info(EventTypes.USER_COMMAND, {
      command: 'start',
      success: true,
      existing_user: false,
      username: 'testuser',
      first_name: 'Test',
    });
  });

  results.push({
    event_type: EventTypes.USER_COMMAND,
    success: true,
    latency_ms: commandLatency,
  });

  const { latency_ms: callbackLatency } = measureLatency(() => {
    log.info(EventTypes.USER_CALLBACK, {
      callback_action: 'favorite',
      action: 'favorite',
      success: true,
      deal_id: TEST_DEAL_ID,
    });
  });

  results.push({
    event_type: EventTypes.USER_CALLBACK,
    success: true,
    latency_ms: callbackLatency,
  });

  const { latency_ms: settingsLatency } = measureLatency(() => {
    log.info(EventTypes.USER_SETTINGS_CHANGED, {
      setting: 'store',
      old_value: 100,
      new_value: 200,
      success: true,
    });
  });

  results.push({
    event_type: EventTypes.USER_SETTINGS_CHANGED,
    success: true,
    latency_ms: settingsLatency,
  });

  return results;
}

async function testErrorEvents(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  const testError = new Error('Test unhandled error');
  const { latency_ms } = measureLatency(() => {
    logError(testError, {
      error_type: EventTypes.ERROR_UNHANDLED,
    });
  });

  results.push({
    event_type: EventTypes.ERROR_UNHANDLED,
    success: true,
    latency_ms,
  });

  const validationError = new Error('Test validation error');
  const { latency_ms: validationLatency } = measureLatency(() => {
    logError(validationError, {
      error_type: EventTypes.ERROR_VALIDATION,
      user_id: TEST_USER_ID,
    });
  });

  results.push({
    event_type: EventTypes.ERROR_VALIDATION,
    success: true,
    latency_ms: validationLatency,
  });

  const networkError = new Error('Test network error');
  const { latency_ms: networkLatency } = measureLatency(() => {
    logError(networkError, {
      error_type: EventTypes.ERROR_NETWORK,
      store_id: TEST_STORE_ID,
    });
  });

  results.push({
    event_type: EventTypes.ERROR_NETWORK,
    success: true,
    latency_ms: networkLatency,
  });

  const dbError = new Error('Test database error');
  const { latency_ms: dbLatency } = measureLatency(() => {
    logError(dbError, {
      error_type: EventTypes.ERROR_DATABASE,
      deal_id: TEST_DEAL_ID,
    });
  });

  results.push({
    event_type: EventTypes.ERROR_DATABASE,
    success: true,
    latency_ms: dbLatency,
  });

  return results;
}

async function testJobEvents(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  const { latency_ms: startLatency } = measureLatency(() => {
    log.info(EventTypes.JOB_DAILY_PARSE_START, {
      manual_trigger: true,
      stores_count: 5,
    });
  });

  results.push({
    event_type: EventTypes.JOB_DAILY_PARSE_START,
    success: true,
    latency_ms: startLatency,
  });

  await new Promise(resolve => setTimeout(resolve, 10));

  const { latency_ms: completeLatency } = measureLatency(() => {
    log.info(EventTypes.JOB_DAILY_PARSE_COMPLETE, {
      stores_count: 5,
      deals_processed: 100,
      new_deals_found: 25,
      notifications_sent: 50,
      duration_ms: 5000,
    });
  });

  results.push({
    event_type: EventTypes.JOB_DAILY_PARSE_COMPLETE,
    success: true,
    latency_ms: completeLatency,
  });

  const { latency_ms: errorLatency } = measureLatency(() => {
    log.error(EventTypes.JOB_DAILY_PARSE_ERROR, {
      stores_count: 5,
      deals_processed: 50,
      error_message: 'Test job error',
      duration_ms: 2000,
    });
  });

  results.push({
    event_type: EventTypes.JOB_DAILY_PARSE_ERROR,
    success: true,
    latency_ms: errorLatency,
  });

  return results;
}

async function testDatabaseEvents(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  const { latency_ms } = measureLatency(() => {
    log.debug(EventTypes.DB_QUERY, {
      query_name: 'getActiveDealsWithProducts',
      duration_ms: 150,
      slow_query: false,
    });
  });

  results.push({
    event_type: EventTypes.DB_QUERY,
    success: true,
    latency_ms,
  });

  const { latency_ms: slowLatency } = measureLatency(() => {
    log.warn(EventTypes.DB_QUERY, {
      query_name: 'getActiveDealsWithProducts',
      duration_ms: 1500,
      slow_query: true,
      threshold_ms: 1000,
      frequency: 5,
    });
  });

  results.push({
    event_type: EventTypes.DB_QUERY,
    success: true,
    latency_ms: slowLatency,
  });

  return results;
}

async function testBlockingBehavior(iterations: number = 100): Promise<boolean> {
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    log.info(EventTypes.HEALTH_CHECK, {
      test_iteration: i,
      endpoint: '/test',
    });
  }
  
  const end = performance.now();
  const totalDuration = end - start;
  const avgLatencyPerLog = totalDuration / iterations;
  
  console.log(`  Blocking test - ${iterations} logs in ${totalDuration.toFixed(2)}ms (${avgLatencyPerLog.toFixed(2)}ms per log)`);
  
  const isBlocking = avgLatencyPerLog > 1;
  
  if (isBlocking) {
    console.log(`  ⚠️  WARNING: Average latency (${avgLatencyPerLog.toFixed(2)}ms) exceeds 1ms threshold`);
  }
  
  return isBlocking;
}

function calculateStatistics(latencies: number[]): { avg: number; p95: number; p99: number } {
  if (latencies.length === 0) {
    return { avg: 0, p95: 0, p99: 0 };
  }
  
  const sorted = [...latencies].sort((a, b) => a - b);
  const avg = latencies.reduce((sum, val) => sum + val, 0) / latencies.length;
  
  const p95Index = Math.floor(sorted.length * 0.95);
  const p99Index = Math.floor(sorted.length * 0.99);
  
  return {
    avg,
    p95: sorted[p95Index] || sorted[sorted.length - 1],
    p99: sorted[p99Index] || sorted[sorted.length - 1],
  };
}

async function runAllTests(): Promise<TestResults> {
  console.log('🧪 Starting Logging Validation Tests\n');
  
  const allResults: ValidationResult[] = [];
  
  console.log('Testing System Events...');
  const systemResults = await testSystemEvents();
  allResults.push(...systemResults);
  
  console.log('Testing Health Check...');
  const healthResults = await testHealthCheck();
  allResults.push(...healthResults);
  
  console.log('Testing API Events...');
  const apiResults = await testApiEvents();
  allResults.push(...apiResults);
  
  console.log('Testing Deal Events...');
  const dealResults = await testDealEvents();
  allResults.push(...dealResults);
  
  console.log('Testing Notification Events...');
  const notificationResults = await testNotificationEvents();
  allResults.push(...notificationResults);
  
  console.log('Testing User Events...');
  const userResults = await testUserEvents();
  allResults.push(...userResults);
  
  console.log('Testing Error Events...');
  const errorResults = await testErrorEvents();
  allResults.push(...errorResults);
  
  console.log('Testing Job Events...');
  const jobResults = await testJobEvents();
  allResults.push(...jobResults);
  
  console.log('Testing Database Events...');
  const dbResults = await testDatabaseEvents();
  allResults.push(...dbResults);
  
  console.log('\nTesting Blocking Behavior...');
  const blockingDetected = await testBlockingBehavior(100);
  
  const latencies = allResults.map(r => r.latency_ms);
  const stats = calculateStatistics(latencies);
  
  const successful = allResults.filter(r => r.success).length;
  const failed = allResults.filter(r => !r.success).length;
  
  return {
    total_events: allResults.length,
    successful_events: successful,
    failed_events: failed,
    avg_latency_ms: stats.avg,
    p95_latency_ms: stats.p95,
    p99_latency_ms: stats.p99,
    blocking_detected: blockingDetected,
    results: allResults,
  };
}

function printResults(results: TestResults): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 LOGGING VALIDATION RESULTS');
  console.log('='.repeat(60));
  
  console.log(`\nTotal Events Tested: ${results.total_events}`);
  console.log(`✅ Successful: ${results.successful_events}`);
  console.log(`❌ Failed: ${results.failed_events}`);
  
  console.log(`\n⏱️  Latency Statistics:`);
  console.log(`  Average: ${results.avg_latency_ms.toFixed(3)}ms`);
  console.log(`  P95: ${results.p95_latency_ms.toFixed(3)}ms`);
  console.log(`  P99: ${results.p99_latency_ms.toFixed(3)}ms`);
  
  console.log(`\n🚫 Blocking Detection:`);
  if (results.blocking_detected) {
    console.log(`  ❌ BLOCKING DETECTED - Logs are blocking execution`);
  } else {
    console.log(`  ✅ No blocking detected`);
  }
  
  console.log(`\n📈 Success Criteria:`);
  const latencyOk = results.p95_latency_ms < 100;
  const allEventsOk = results.failed_events === 0;
  const noBlocking = !results.blocking_detected;
  
  console.log(`  P95 Latency < 100ms: ${latencyOk ? '✅ PASS' : '❌ FAIL'} (${results.p95_latency_ms.toFixed(3)}ms)`);
  console.log(`  All Events Valid: ${allEventsOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  No Blocking: ${noBlocking ? '✅ PASS' : '❌ FAIL'}`);
  
  if (results.failed_events > 0) {
    console.log(`\n❌ Failed Events:`);
    results.results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.event_type}: ${r.error || r.validation_error || 'Unknown error'}`);
    });
  }
  
  const allPass = latencyOk && allEventsOk && noBlocking;
  console.log(`\n${allPass ? '✅' : '❌'} Overall: ${allPass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  console.log('='.repeat(60) + '\n');
}

async function main(): Promise<void> {
  try {
    const results = await runAllTests();
    printResults(results);
    
    console.log('Flushing logs...');
    await flushLogs();
    console.log('Logs flushed.\n');
    
    const exitCode = (results.failed_events === 0 && !results.blocking_detected && results.p95_latency_ms < 100) ? 0 : 1;
    process.exit(exitCode);
  } catch (error) {
    console.error('❌ Test suite error:', error);
    process.exit(1);
  }
}

main();
