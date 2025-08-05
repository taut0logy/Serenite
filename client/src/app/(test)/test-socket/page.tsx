"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/providers/socket-provider";

export default function SocketTestPage() {
  const socket = useSocket();
  const [log, setLog] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!socket) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleEcho = (data: any) => {
      setLog((prev) => [`[test:echo:response] ${JSON.stringify(data)}`, ...prev]);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleBroadcast = (data: any) => {
      setLog((prev) => [`[test:broadcast:response] ${JSON.stringify(data)}`, ...prev]);
    };

    socket.on("test:echo:response", handleEcho);
    socket.on("test:broadcast:response", handleBroadcast);

    return () => {
      socket.off("test:echo:response", handleEcho);
      socket.off("test:broadcast:response", handleBroadcast);
    };
  }, [socket]);

  const sendEcho = () => {
    if (socket) {
      socket.emit("test:echo", { message, clientTime: new Date().toISOString() });
      setLog((prev) => [`[test:echo] Sent: ${message}`, ...prev]);
    }
  };

  const sendBroadcast = () => {
    if (socket) {
      socket.emit("test:broadcast", { message, clientTime: new Date().toISOString() });
      setLog((prev) => [`[test:broadcast] Sent: ${message}`, ...prev]);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">Socket.IO Test & Debug</h1>
      <div className="mb-4">
        <input
          className="border px-2 py-1 rounded mr-2"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a test message"
        />
        <button className="bg-blue-600 text-white px-3 py-1 rounded mr-2" onClick={sendEcho}>
          Send Echo
        </button>
        <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={sendBroadcast}>
          Send Broadcast
        </button>
      </div>
      <div className="border border-gray-300 rounded p-4 h-64 overflow-y-auto">
        <h2 className="font-semibold mb-2">Socket Log</h2>
        <ul className="text-xs space-y-1">
          {log.map((entry, idx) => (
            <li key={idx}>{entry}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}