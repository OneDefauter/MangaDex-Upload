const socket = io({
  transports: ['polling'],
  upgrade: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 100,
});

socket.on('connect', () => {
  console.log('[socket] connected');
  showToast("[socket] connected", "info", { delay: 2000 });
});

socket.on('disconnect', () => {
  console.log('[socket] disconnected');
  showToast("[socket] disconnected", "warning", { delay: 2000 });
});