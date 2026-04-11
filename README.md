# @gautric/node-red-zenbus

A [Node-RED](https://nodered.org) node that polls the [Zenbus](https://zenbus.net) real-time API and outputs next bus ETA for a configured stop.

Uses the Zenbus API directly via protobuf — no scraping, no browser.

![Node-RED](https://img.shields.io/badge/Node--RED-%3E%3D2.0.0-red)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## Install

From your Node-RED user directory (typically `~/.node-red`):

```bash
npm install @gautric/node-red-zenbus
```

Restart Node-RED and the **zenbus** node will appear in the palette under the **transport** category.

## Configuration

| Property | Description | Required |
|---|---|---|
| Alias | Network alias (e.g. `gpso`) | yes |
| Itinerary | Itinerary ID | yes |
| Stop | Stop ID | yes |
| Interval | Poll interval in seconds (default: 10) | no |

## Output

The node sends a `msg.payload` object on each poll cycle:

| Property | Type | Description |
|---|---|---|
| `payload.stop` | string | Stop name |
| `payload.line` | string | Line code |
| `payload.next` | object \| null | Next bus info |
| `payload.next.etaMinutes` | number | Minutes until arrival |
| `payload.next.distanceM` | number | Distance in metres |
| `payload.next.estimatedArrival` | string | Estimated arrival time |
| `payload.next.scheduledTime` | string | Scheduled time |
| `payload.next.isLive` | boolean | `true` if live-tracked |
| `payload.secondBus` | object \| null | Second bus (same shape as `next`) |
| `payload.timestamp` | string | ISO 8601 poll timestamp |

## Node status

- 🟢 Green dot — live ETA with minutes and arrival time
- 🟡 Yellow dot — scheduled data (not live-tracked)
- ⚪ Grey ring — no bus found
- 🔴 Red ring — error or init failure

## Example flow

A ready-to-use example is bundled with the package.

In Node-RED: **Menu → Import → Examples → zenbus-next-bus → debug-next-bus**

Or import manually from [`examples/debug-next-bus.json`](examples/debug-next-bus.json).

## Finding your IDs

Open your stop on [zenbus.net](https://zenbus.net). The URL contains the values you need:

```
https://zenbus.net/publicapp/web/{alias}?line=...&stop={stop}&itinerary={itinerary}
```

## License

[MIT](LICENSE)
