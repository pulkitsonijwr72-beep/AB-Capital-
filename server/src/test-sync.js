import { API_BASE } from '../../client/src/config.js';

const localDateStr = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

async function runTests() {
  console.log('==================================================');
  console.log(' AB CAPITAL LEDGER ENGINE - SYNC SYSTEM TEST');
  console.log('==================================================');

  try {
    // Test 1: Get Current System State
    console.log('\n[TEST 1] Fetching current system state...');
    const stateRes = await fetch('http://localhost:5001/api/clock/state');
    if (!stateRes.ok) throw new Error('Failed to fetch system state');
    const state = await stateRes.json();
    console.log('System State:', JSON.stringify(state, null, 2));

    const todayStr = localDateStr(new Date());
    const systemDateStr = localDateStr(state.system_date);
    
    if (state.is_manual_override) {
      console.log('⚠️ System is currently in MANUAL OVERRIDE mode.');
    } else {
      console.log('✅ System is in AUTO SYNC mode.');
      if (systemDateStr === todayStr) {
        console.log(`✅ System Virtual Date correctly matches real-world date: ${systemDateStr}`);
      } else {
        throw new Error(`Mismatch! Virtual Date is ${systemDateStr}, Real-world is ${todayStr}`);
      }
    }

    // Test 2: Set Manual Override to a future date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const futureDateStr = localDateStr(futureDate);
    
    console.log(`\n[TEST 2] Setting manual fast-forward override to: ${futureDateStr}...`);
    const overrideRes = await fetch('http://localhost:5001/api/clock/advance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system_date: futureDateStr })
    });
    
    if (!overrideRes.ok) {
      const errorText = await overrideRes.text();
      throw new Error(`Override failed: ${errorText}`);
    }
    const overrideResult = await overrideRes.json();
    console.log('Override Result:', JSON.stringify(overrideResult, null, 2));

    if (overrideResult.is_manual_override === true) {
      console.log('✅ Override successfully activated manual mode.');
    } else {
      throw new Error('Override did not set is_manual_override to true!');
    }

    // Test 3: Reset back to Auto-Sync
    console.log('\n[TEST 3] Resetting back to Automatic Calendar Sync...');
    const syncRes = await fetch('http://localhost:5001/api/clock/sync', {
      method: 'POST'
    });
    
    if (!syncRes.ok) throw new Error('Sync request failed');
    const syncResult = await syncRes.json();
    console.log('Sync Result:', JSON.stringify(syncResult, null, 2));

    const syncedDateStr = localDateStr(syncResult.system_date);
    if (syncResult.is_manual_override === false && syncedDateStr === todayStr) {
      console.log('✅ System successfully synced back to today\'s real-world calendar!');
    } else {
      throw new Error(`Sync check failed! Synced Date: ${syncedDateStr}, Today: ${todayStr}, Override: ${syncResult.is_manual_override}`);
    }

    console.log('\n==================================================');
    console.log(' 🎉 ALL DATE SYNC AND LEDGER CLOCK TESTS PASSED!');
    console.log('==================================================');
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

runTests();
