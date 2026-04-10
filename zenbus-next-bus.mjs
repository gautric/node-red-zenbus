#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createClient } from './zenbus-core.mjs';

const argv = yargs(hideBin(process.argv))
  .env('ZENBUS')
  .option('alias', { type: 'string', demandOption: true, describe: 'Network alias (e.g. gpso)' })
  .option('itinerary', { type: 'string', demandOption: true, describe: 'Itinerary ID' })
  .option('stop', { type: 'string', demandOption: true, describe: 'Stop ID' })
  .option('interval', { type: 'number', default: 10, describe: 'Poll interval in seconds' })
  .option('output', { type: 'string', choices: ['terminal', 'json'], default: 'terminal', describe: 'Output format' })
  .strict()
  .parseSync();

const client = await createClient(argv);

function renderTerminal(data) {
  process.stdout.write('\x1B[2J\x1B[H');
  console.log('🚌 ZENBUS - Live Stream (Ctrl+C to quit)\n');
  console.log('═══════════════════════════════════════');
  console.log(`  🚏 Stop:       ${data.stop}`);
  console.log(`  🚌 Line:       ${data.line}`);
  if (data.next) {
    const n = data.next;
    console.log(`  ⏱️  ETA:        ${n.etaMinutes} min${n.isLive ? ' (real-time)' : ' (scheduled)'}`);
    console.log(`  📏 Distance:   ${n.distanceM} m away`);
    console.log(`  🕐 Arrival:    ${n.estimatedArrival}`);
    if (n.scheduledTime) console.log(`  📅 Scheduled:  ${n.scheduledTime}`);
    if (data.secondBus) {
      const s = data.secondBus;
      console.log(`  ───────────────────────────────────`);
      console.log(`  2️⃣  2nd bus:    ${s.etaMinutes} min (${s.distanceM} m away)`);
      console.log(`  🕐 Arrival:    ${s.estimatedArrival}`);
    }
  } else {
    console.log(`  ⏱️  ETA:        No upcoming bus`);
  }
  console.log(`  🕑 Now:        ${data.now}`);
  console.log('═══════════════════════════════════════');
}

const render = argv.output === 'json'
  ? (data) => console.log(JSON.stringify(data))
  : renderTerminal;

while (true) {
  try { render(await client.poll()); } catch (e) { console.error('⚠️', e.message); }
  await new Promise(r => setTimeout(r, argv.interval * 1000));
}
