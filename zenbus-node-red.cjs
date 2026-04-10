module.exports = function (RED) {
  function ZenbusNextBusNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    let timer = null;

    const interval = (config.interval || 10) * 1000;

    import('./zenbus-core.mjs').then(({ createClient }) => {
      createClient({
        alias: config.alias,
        itinerary: config.itinerary,
        stop: config.stop,
      }).then(client => {
        async function tick() {
          try {
            const data = await client.poll();
            node.send({ payload: data });
            node.status({
              fill: data.next?.isLive ? 'green' : 'yellow',
              shape: 'dot',
              text: data.next ? `${data.next.etaMinutes} min – ${data.next.distanceM} m` : 'no bus',
            });
          } catch (e) {
            node.error(e.message);
            node.status({ fill: 'red', shape: 'ring', text: e.message });
          }
          timer = setTimeout(tick, interval);
        }
        tick();
      }).catch(e => {
        node.error(e.message);
        node.status({ fill: 'red', shape: 'ring', text: 'init failed' });
      });
    });

    node.on('close', () => { if (timer) clearTimeout(timer); });
  }

  RED.nodes.registerType('zenbus-next-bus', ZenbusNextBusNode);
};
