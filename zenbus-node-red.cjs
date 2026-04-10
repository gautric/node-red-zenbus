module.exports = function (RED) {
  function ZenbusNextBusNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    let timer = null;

    const interval = (config.interval || 10) * 1000;

    node.status({ fill: 'yellow', shape: 'ring', text: 'connecting...' });

    import('./zenbus-core.mjs').then(({ createClient }) => {
      createClient({
        alias: config.alias,
        itinerary: config.itinerary,
        stop: config.stop,
      }).then(client => {
        node.log('Zenbus client initialized for ' + config.alias);

        async function tick() {
          try {
            const data = await client.poll();
            node.send({ payload: data });
            if (data.next) {
              const text = data.next.etaMinutes + ' min';
              node.status({
                fill: data.next.isLive ? 'green' : 'yellow',
                shape: 'dot',
                text: text,
              });
            } else {
              node.status({ fill: 'grey', shape: 'ring', text: 'no bus' });
            }
          } catch (e) {
            node.error(e.message);
            node.status({ fill: 'red', shape: 'ring', text: 'error' });
          }
          timer = setTimeout(tick, interval);
        }
        tick();
      }).catch(e => {
        node.error('Init failed: ' + e.message);
        node.status({ fill: 'red', shape: 'ring', text: 'init failed' });
      });
    });

    node.on('close', function (removed, done) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (removed) {
        node.log('Zenbus node removed');
      }
      done();
    });
  }

  RED.nodes.registerType('zenbus-next-bus', ZenbusNextBusNode);
};
