"use client";
import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase";

export function useMessages(chatId?: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId || !db) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(
      q, 
      (snap) => {
        const newMessages = snap.docs.map((d: any) => ({ id: d.id, ...d.data(), docId: d.id }));
        setMessages(newMessages);
        setLoading(false);
        setError(null);
        console.log(`Messages updated for chat ${chatId}:`, newMessages.length);
      },
      (err) => {
        console.error("Firebase error in useMessages:", err);
        setError(err.message);
        setLoading(false);
        // Set empty messages on error
        setMessages([]);
        
        // If it's a connection error, try to reconnect after a delay
        if (err.code === 'unavailable' || err.message.includes('ERR_CONNECTION_REFUSED')) {
          console.log("Connection error detected, will retry...");
          setTimeout(() => {
            // This will trigger a re-render and retry
            setLoading(true);
          }, 3000); // Reduced retry time
        }
      }
    );

    return () => {
      console.log(`Cleaning up messages listener for chat ${chatId}`);
      unsub();
    };
  }, [chatId, db]);

  return { messages, error, loading };
}