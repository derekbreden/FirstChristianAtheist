const reconnectWs = () => {
  const ws = new WebSocket(`wss://${window.location.host}`);
  ws.addEventListener("message", (event) => {
    if (event?.data === "UPDATE") {
      getMoreRecent();
      if (state.push_active) {
        getUnreadCount();
      }
    }
  });
  ws.addEventListener("close", (event) => {
    ws.close();
    setTimeout(reconnectWs, 10000);
  });
};
reconnectWs();