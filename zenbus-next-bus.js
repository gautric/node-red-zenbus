var zenbusReady = import('zenbus/core');

module.exports = function (RED) {

    function ZenbusNextBusNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var timer = null;
        var client = null;
        var closing = false;
        var interval = (parseInt(config.interval, 10) || 10) * 1000;

        node.status({ fill: 'yellow', shape: 'ring', text: 'initializing...' });

        zenbusReady.then(function (mod) {
            return mod.createClient({
                alias: config.alias,
                itinerary: config.itinerary,
                stop: config.stop
            });
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
                if (data.first) {
                    node.status({
                        fill: data.first.isLive ? 'green' : 'yellow',
                        shape: 'dot',
                        text: data.first.etaMinutes + ' min (' + data.first.estimatedArrival + ')'
                    });
                } else {
                    node.status({ fill: 'grey', shape: 'ring', text: 'no bus' });
                }
            }).catch(function (e) {
                node.error('Poll error: ' + e.message, {});
                node.status({ fill: 'red', shape: 'ring', text: 'error' });
            });
        }

        node.on('close', function (removed, done) {
            closing = true;
            if (timer) { clearTimeout(timer); timer = null; }
            client = null;
            done();
        });
    }

    RED.nodes.registerType('zenbus-next-bus', ZenbusNextBusNode);
};
