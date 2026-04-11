# @gautric/node-red-zenbus

A [Node-RED](https://nodered.org) node that polls the [Zenbus](https://zenbus.net) real-time API and outputs next bus ETA for a configured stop.

Built on the [`zenbus`](https://www.npmjs.com/package/zenbus) client library — no scraping, no browser.

![Node-RED](https://img.shields.io/badge/Node--RED-%3E%3D2.0.0-red)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![Version](https://img.shields.io/badge/version-2.0.0-orange)

## Install

From your Node-RED user directory (typically `~/.node-red`):

```bash
npm install @gautric/node-red-zenbus
```

Restart Node-RED and the **zenbus** node will appear in the palette under the **transport** category.

## Configuration

| Property | Description | Required |
|---|---|---|
| Name | Display name for the node | no |
| Alias | Network alias (e.g. `gpso`) | yes |
| Itinerary | Itinerary ID | yes |
| Stop | Stop ID | yes |
| Interval | Poll interval in seconds (default: 10, minimum: 5) | no |

## Output

The node sends a `msg.payload` object on each poll cycle:

| Property | Type | Description |
|---|---|---|
| `payload.stop` | string | Stop name |
| `payload.line` | string | Line code |
| `payload.timestamp` | string | ISO 8601 poll timestamp |
| `payload.now` | string | Current time as `HhMM` |
| `payload.first` | object \| null | First bus info |
| `payload.first.eta` | number | ETA in minutes |
| `payload.first.distance` | number | Remaining distance in metres |
| `payload.first.estimatedArrival` | string | Estimated arrival (ISO 8601) |
| `payload.first.scheduledTime` | string \| null | Scheduled time (ISO 8601) or `null` |
| `payload.first.isLive` | boolean | `true` if live-tracked |
| `payload.next` | object \| null | Second bus (same shape as `first`) |

When a field is unavailable, it defaults to `'-'` (or `false` for `isLive`).

## Node status

- 🟢 Green dot — live ETA with minutes and arrival time
- 🟡 Yellow dot — scheduled data (not live-tracked)
- 🟡 Yellow ring — initializing
- 🟢 Green ring — connected, waiting for first poll
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

## Dependencies

| Package | Version |
|---|---|
| [zenbus](https://www.npmjs.com/package/zenbus) | ^2.1.0 |

## License

[MIT](LICENSE)
