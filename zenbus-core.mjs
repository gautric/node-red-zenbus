import protobuf from 'protobufjs';

const BASE = 'https://zenbus.net';

async function fetchProto(url, Type) {
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  return Type.decode(buf);
}

function secsToHHMM(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}h${String(m).padStart(2, '0')}`;
}

export async function createClient({ alias, itinerary, stop }) {
  const protoText = await (await fetch(`${BASE}/poll/cdn/zenbus.proto`)).text();
  const { root } = protobuf.parse(protoText);
  const StaticMessage = root.lookupType('zenbus_realtime.StaticMessage');
  const LiveMessage = root.lookupType('zenbus_realtime.LiveMessage');

  const staticData = await fetchProto(`${BASE}/publicapp/static-data?alias=${alias}`, StaticMessage);
  const shape = staticData.shape?.find(s => s.itineraryId?.toString() === itinerary);
  const stopAnchor = shape?.anchor?.find(a => a.stopId?.toString() === stop);
  const stopIndex = stopAnchor?.stopIndexInItinerary ?? -1;
  const stopDistanceM = stopAnchor?.distanceTravelled ?? 0;
  const stopName = staticData.stop?.find(s => s.stopId?.toString() === stop)?.name || 'Unknown';
  const itin = staticData.itinerary?.find(i => i.itineraryId?.toString() === itinerary);
  const lineCode = staticData.line?.find(l => l.lineId?.toString() === itin?.lineId?.toString())?.code || 'Unknown';

  const pollUrl = `${BASE}/publicapp/poll?alias=${alias}&itinerary=${itinerary}`;

  return {
    stopName, lineCode,
    async poll() {
      const liveData = await fetchProto(pollUrl, LiveMessage);
      const now = new Date();
      const midnightUtcSecs = liveData.timetable?.[0]?.midnight?.toNumber?.()
        ?? Math.floor(new Date(now).setHours(0, 0, 0, 0) / 1000);
      const nowSecs = Math.floor(now.getTime() / 1000) - midnightUtcSecs;

      const allColumns = [...(liveData.tripColumn || [])];
      for (const tt of liveData.timetable || []) {
        for (const col of tt.column || []) allColumns.push(col);
      }

      const candidates = [];
      for (const tc of allColumns) {
        const est = tc.estimactual?.find(s => s.stopIndexInItinerary === stopIndex);
        const etaSecs = est?.arrival || est?.departure || 0;
        if (!etaSecs || etaSecs <= nowSecs) continue;

        const vehicleDist = tc.distanceTravelled || 0;
        const hasStarted = tc.previousIndexInItinerary >= 0 && tc.pos?.length > 0;
        if (hasStarted && vehicleDist > stopDistanceM) continue;

        const remainingDist = hasStarted ? Math.max(0, stopDistanceM - vehicleDist) : stopDistanceM;
        const aimed = tc.aimed?.find(s => s.stopIndexInItinerary === stopIndex);
        const schedSecs = aimed?.arrival || aimed?.departure || aimed?.arriparture || 0;

        candidates.push({
          etaMinutes: Math.round((etaSecs - nowSecs) / 60),
          distanceM: Math.round(remainingDist),
          estimatedArrival: secsToHHMM(etaSecs),
          scheduledTime: schedSecs ? secsToHHMM(schedSecs) : null,
          isLive: hasStarted,
        });
      }

      candidates.sort((a, b) => a.etaMinutes - b.etaMinutes);
      const best = candidates[0] || null;
      const second = candidates.find((c, i) => i > 0 && c.isLive) || null;

      return {
        stop: stopName, line: lineCode,
        timestamp: now.toISOString(),
        now: secsToHHMM(nowSecs),
        next: best, secondBus: second,
      };
    },
  };
}
