var protobuf = require('protobufjs');

var BASE = 'https://zenbus.net';

function fetchProto(url, Type) {
    return fetch(url)
        .then(function (r) { return r.arrayBuffer(); })
        .then(function (ab) { return Type.decode(Buffer.from(ab)); });
}

function secsToHHMM(secs) {
    var s = ((secs % 86400) + 86400) % 86400;
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    return h + 'h' + String(m).padStart(2, '0');
}

function createClient(opts) {
    var alias = opts.alias, itinerary = opts.itinerary, stop = opts.stop;
    return fetch(BASE + '/poll/cdn/zenbus.proto')
        .then(function (r) { return r.text(); })
        .then(function (protoText) {
            var root = protobuf.parse(protoText).root;
            var StaticMessage = root.lookupType('zenbus_realtime.StaticMessage');
            var LiveMessage = root.lookupType('zenbus_realtime.LiveMessage');

            return fetchProto(BASE + '/publicapp/static-data?alias=' + alias, StaticMessage)
                .then(function (staticData) {
                    var shape = (staticData.shape || []).find(function (s) { return s.itineraryId && s.itineraryId.toString() === itinerary; });
                    var stopAnchor = shape && (shape.anchor || []).find(function (a) { return a.stopId && a.stopId.toString() === stop; });
                    var stopIndex = stopAnchor ? (stopAnchor.stopIndexInItinerary != null ? stopAnchor.stopIndexInItinerary : -1) : -1;
                    var stopDistanceM = stopAnchor ? (stopAnchor.distanceTravelled || 0) : 0;
                    var stopEntry = (staticData.stop || []).find(function (s) { return s.stopId && s.stopId.toString() === stop; });
                    var stopName = stopEntry ? stopEntry.name : 'Unknown';
                    var itin = (staticData.itinerary || []).find(function (i) { return i.itineraryId && i.itineraryId.toString() === itinerary; });
                    var lineEntry = (staticData.line || []).find(function (l) { return itin && l.lineId && l.lineId.toString() === (itin.lineId && itin.lineId.toString()); });
                    var lineCode = lineEntry ? lineEntry.code : 'Unknown';
                    var pollUrl = BASE + '/publicapp/poll?alias=' + alias + '&itinerary=' + itinerary;

                    return {
                        stopName: stopName,
                        lineCode: lineCode,
                        poll: function () {
                            return fetchProto(pollUrl, LiveMessage).then(function (liveData) {
                                var now = new Date();
                                var midnightUtcSecs = (liveData.timetable && liveData.timetable[0] && liveData.timetable[0].midnight && liveData.timetable[0].midnight.toNumber)
                                    ? liveData.timetable[0].midnight.toNumber()
                                    : Math.floor(new Date(now).setHours(0, 0, 0, 0) / 1000);
                                var nowSecs = Math.floor(now.getTime() / 1000) - midnightUtcSecs;

                                var allColumns = (liveData.tripColumn || []).slice();
                                (liveData.timetable || []).forEach(function (tt) {
                                    (tt.column || []).forEach(function (col) { allColumns.push(col); });
                                });

                                var candidates = [];
                                allColumns.forEach(function (tc) {
                                    var est = (tc.estimactual || []).find(function (s) { return s.stopIndexInItinerary === stopIndex; });
                                    var etaSecs = est ? (est.arrival || est.departure || 0) : 0;
                                    if (!etaSecs || etaSecs <= nowSecs) return;

                                    var vehicleDist = tc.distanceTravelled || 0;
                                    var hasStarted = tc.previousIndexInItinerary >= 0 && tc.pos && tc.pos.length > 0;
                                    if (hasStarted && vehicleDist > stopDistanceM) return;

                                    var remainingDist = hasStarted ? Math.max(0, stopDistanceM - vehicleDist) : stopDistanceM;
                                    var aimed = (tc.aimed || []).find(function (s) { return s.stopIndexInItinerary === stopIndex; });
                                    var schedSecs = aimed ? (aimed.arrival || aimed.departure || aimed.arriparture || 0) : 0;

                                    candidates.push({
                                        etaMinutes: Math.round((etaSecs - nowSecs) / 60),
                                        distanceM: Math.round(remainingDist),
                                        estimatedArrival: secsToHHMM(etaSecs),
                                        scheduledTime: schedSecs ? secsToHHMM(schedSecs) : null,
                                        isLive: hasStarted
                                    });
                                });

                                candidates.sort(function (a, b) { return a.etaMinutes - b.etaMinutes; });
                                var best = candidates[0] || null;
                                var second = candidates.find(function (c, i) { return i > 0 && c.isLive; }) || null;

                                return {
                                    stop: stopName,
                                    line: lineCode,
                                    timestamp: now.toISOString(),
                                    now: secsToHHMM(nowSecs),
                                    next: best,
                                    secondBus: second
                                };
                            });
                        }
                    };
                });
        });
}

module.exports = function (RED) {

    function ZenbusNextBusNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var timer = null;
        var client = null;
        var closing = false;
        var interval = (parseInt(config.interval, 10) || 10) * 1000;

        node.status({ fill: 'yellow', shape: 'ring', text: 'initializing...' });

        createClient({
            alias: config.alias,
            itinerary: config.itinerary,
            stop: config.stop
        }).then(function (c) {
            if (closing) return;
            client = c;
            node.log('Client ready – stop=' + client.stopName + ' line=' + client.lineCode);
            node.status({ fill: 'green', shape: 'ring', text: 'connected' });
            scheduleTick();
        }).catch(function (e) {
            node.error('Init failed: ' + e.message);
            node.status({ fill: 'red', shape: 'ring', text: 'init failed' });
        });

        function scheduleTick() {
            if (closing) return;
            tick().then(function () {
                if (!closing) timer = setTimeout(scheduleTick, interval);
            });
        }

        function tick() {
            if (!client || closing) return Promise.resolve();
            return client.poll().then(function (data) {
                node.send({ payload: data });
                if (data.next) {
                    node.status({
                        fill: data.next.isLive ? 'green' : 'yellow',
                        shape: 'dot',
                        text: data.next.etaMinutes + ' min (' + data.next.estimatedArrival + ')'
                    });
                } else {
                    node.status({ fill: 'grey', shape: 'ring', text: 'no bus' });
                }
            }).catch(function (e) {
                node.error('Poll error: ' + e.message, {});
                node.status({ fill: 'red', shape: 'ring', text: 'error' });
            });
        }

        node.on('input', function (msg, send, done) {
            send = send || function () { node.send.apply(node, arguments); };
            done = done || function (err) { if (err) node.error(err, msg); };
            if (!client) { done(new Error('Client not initialized')); return; }
            client.poll().then(function (data) {
                send({ payload: data });
                done();
            }).catch(function (e) { done(e); });
        });

        node.on('close', function (removed, done) {
            closing = true;
            if (timer) { clearTimeout(timer); timer = null; }
            client = null;
            done();
        });
    }

    RED.nodes.registerType('zenbus-next-bus', ZenbusNextBusNode);
};
