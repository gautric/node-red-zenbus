# zenbus-next-bus

Real-time next bus ETA from [Zenbus](https://zenbus.net) networks, streamed to your terminal.

Calls the Zenbus API directly using protobuf — no browser, no scraping.

## Install

```bash
npm install -g zenbus-next-bus
```

## CLI Usage

```bash
zenbus-next-bus --alias gpso --itinerary 5426824545828864 --stop 5366312231501824
```

### Options

| Option | Env var | Description | Required |
|---|---|---|---|
| `--alias` | `ZENBUS_ALIAS` | Network alias (e.g. `gpso`) | yes |
| `--itinerary` | `ZENBUS_ITINERARY` | Itinerary ID | yes |
| `--stop` | `ZENBUS_STOP` | Stop ID | yes |
| `--interval` | `ZENBUS_INTERVAL` | Poll interval in seconds (default: 10) | no |
| `--output` | | Output format: `terminal` or `json` (default: terminal) | no |

### Terminal output (default)

Live-updating display with real-time ETA, distance, scheduled time, and 2nd bus when available.

### JSON output

```bash
zenbus-next-bus --alias gpso --itinerary ... --stop ... --output json
```

Outputs one JSON object per poll cycle to stdout — ideal for piping to other tools.

## Programmatic Usage

```js
import { createClient } from 'zenbus-next-bus';

const client = await createClient({ alias: 'gpso', itinerary: '...', stop: '...' });
const data = await client.poll();
console.log(data.next); // { etaMinutes, distanceM, estimatedArrival, scheduledTime, isLive }
```

## Node-RED

Install in your Node-RED directory:

```bash
npm install zenbus-next-bus
```

The `zenbus-next-bus` node appears in the palette. Configure alias, itinerary, stop, and interval. It outputs `msg.payload` with the full poll data on each cycle.

### Sample flow

A ready-to-use example is bundled with the package. In Node-RED, go to **Menu → Import → Examples → zenbus-next-bus → debug-next-bus** to import a flow that wires the node to a debug output.

You can also import it manually from `examples/debug-next-bus.json`.

## Finding your IDs

Open your stop on [zenbus.net](https://zenbus.net), the URL contains the IDs:

```
https://zenbus.net/publicapp/web/{alias}?line=...&stop={stop}&itinerary={itinerary}
```

## License

MIT
