// src/hooks/useChannelMessages.js
import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../context/SocketProvider';

export default function useChannelMessages(channelId, initialLoad = 30) {
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const oldestRef = useRef(null);

  // Fetch initial messages + join channel
  useEffect(() => {
    if (!channelId || !socket) return;
    let mounted = true;

    socket.emit('join:channel', { channelId });

    const fetchInitial = async () => {
      setLoadingHistory(true);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/messages/${channelId}?limit=${initialLoad}`
        );
        if (!res.ok) throw new Error('Failed to fetch messages');
        let data = await res.json();
        data = data.reverse();
        if (!mounted) return;

        setMessages(data);
        if (data.length > 0) {
          oldestRef.current = data[0].createdAt;
        }
        setHasMore(data.length === initialLoad);
      } catch (err) {
        console.error('Initial fetch error:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchInitial();

    const onMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on('message:received', onMessage);

    return () => {
      mounted = false;
      socket.off('message:received', onMessage);
      socket.emit('leave:channel', { channelId });
    };
  }, [channelId, socket, initialLoad]);

  // Pagination load older messages
  const loadMore = async (limit = 20) => {
    if (!channelId || !oldestRef.current || !hasMore) return;

    setLoadingHistory(true);
    try {
      const before = encodeURIComponent(oldestRef.current);
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/messages/${channelId}?before=${before}&limit=${limit}`
      );
      if (!res.ok) throw new Error('Failed to load more');
      let data = await res.json();
      data = data.reverse();

      if (data.length === 0) {
        setHasMore(false);
        return;
      }

      setMessages((prev) => [...data, ...prev]);
      oldestRef.current = data[0].createdAt;
      setHasMore(data.length === limit);
    } catch (err) {
      console.error('Load more error:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // send message
  const sendMessage = ({ text, attachments }) => {
    if (!socket) return;

    const optimistic = {
      _id: `temp-${Date.now()}`,
      channel: channelId,
      sender: { username: 'You', _id: 'me' },
      text,
      createdAt: new Date().toISOString(),
      optimistic: true,
    };

    setMessages((prev) => [...prev, optimistic]);

    socket.emit('message:new', {
      channelId,
      text,
      attachments: attachments || [],
    });
  };

  return { messages, loadingHistory, hasMore, loadMore, sendMessage };
}
