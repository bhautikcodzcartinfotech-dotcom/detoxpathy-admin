"use client";

import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

export function useSupportUnreadCount(role, branches) {
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const chatMetaRef = useRef({});
  const unreadByChatRef = useRef({});
  const messageUnsubsRef = useRef({});

  useEffect(() => {
    if (!db) return;

    const branchSet =
      role === "subadmin" && Array.isArray(branches) && branches.length
        ? new Set(branches.map(String))
        : null;

    const recomputeTotal = () => {
      let total = 0;
      Object.entries(unreadByChatRef.current).forEach(([chatId, count]) => {
        const meta = chatMetaRef.current[chatId];
        if (!meta) return;

        if (branchSet) {
          const chatBranch = String(meta.customerCareId || meta.branchId || "");
          if (!chatBranch || !branchSet.has(chatBranch)) return;
        }

        if (count > 0) total += 1;
      });
      setUnreadChatCount(total);
    };

    const syncMessageListeners = (chatDocs) => {
      const activeChatIds = new Set();

      chatDocs.forEach((chatDoc) => {
        const chatId = chatDoc.id;
        const chatData = chatDoc.data();
        if (!chatData.userId) return;

        activeChatIds.add(chatId);
        chatMetaRef.current[chatId] = {
          customerCareId: chatData.customerCareId || null,
          branchId: chatData.branchId || null,
        };

        if (messageUnsubsRef.current[chatId]) return;

        messageUnsubsRef.current[chatId] = onSnapshot(
          collection(db, "chats", chatId, "messages"),
          (messagesSnap) => {
            const meta = chatMetaRef.current[chatId];
            if (!meta) return;

            let unreadCount = 0;
            messagesSnap.forEach((msgDoc) => {
              const msg = msgDoc.data();
              if (msg.senderId !== meta.customerCareId && !msg.read) {
                unreadCount++;
              }
            });

            unreadByChatRef.current[chatId] = unreadCount;
            recomputeTotal();
          },
          (error) => {
            console.error(`Support unread listener error for chat ${chatId}:`, error);
          }
        );
      });

      Object.keys(messageUnsubsRef.current).forEach((chatId) => {
        if (!activeChatIds.has(chatId)) {
          messageUnsubsRef.current[chatId]();
          delete messageUnsubsRef.current[chatId];
          delete chatMetaRef.current[chatId];
          delete unreadByChatRef.current[chatId];
        }
      });

      recomputeTotal();
    };

    const chatsUnsub = onSnapshot(
      collection(db, "chats"),
      (chatsSnapshot) => {
        syncMessageListeners(chatsSnapshot.docs);
      },
      (error) => {
        console.error("Support unread chats listener error:", error);
      }
    );

    return () => {
      chatsUnsub();
      Object.values(messageUnsubsRef.current).forEach((unsub) => unsub());
      messageUnsubsRef.current = {};
      chatMetaRef.current = {};
      unreadByChatRef.current = {};
    };
  }, [role, branches]);

  return unreadChatCount;
}
