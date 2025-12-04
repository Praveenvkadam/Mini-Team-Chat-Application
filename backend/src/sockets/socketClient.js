import { io } from 'socket.io-client';

function getToken() {
  try {
    const t = localStorage.getItem('token');
    if (t) return t;
  } catch (e) {}

  try {
    const matches = document.cookie.match(/(?:^|; )token=([^;]+)/);
    if (matches) return matches[1];
  } catch (e) {}

  return null;
}

export function createSocket() {
  const token = getToken();
  if (!token) throw new Error('No auth token found for socket');
  return io(process.env.REACT_APP_API_URL || 'http://localhost:3002', {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
  });
}
