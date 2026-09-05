(function (global) {
  const CHANNEL = "warehouse-design";
  const channel =
    typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL) : null;
  const listeners = new Set();

  function broadcast(type, table) {
    const payload = { type, table };
    if (channel) channel.postMessage(payload);
  }

  function onMessage(handler) {
    listeners.add(handler);
    return () => listeners.delete(handler);
  }

  if (channel) {
    channel.onmessage = (event) => {
      listeners.forEach((fn) => fn(event.data));
    };
  }

  global.realtime = { broadcast, onMessage, CHANNEL };
})(window);
