// src/hooks/useCollabTasks.js
import { useState, useEffect, useCallback } from "react";
import {
  collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc,
  query, orderBy, limit, serverTimestamp, arrayUnion, arrayRemove, where
} from "firebase/firestore";
import { db } from "../firebase/config";

/* ─── Collaborative Tasks ────────────────────────────────────────────────── */
export function useCollabTasks(squadId) {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (!squadId) return;
    const q = query(collection(db, "squads", squadId, "tasks"), orderBy("createdAt", "desc"), limit(50));
    const unsub = onSnapshot(q, snap => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, [squadId]);

  const createCollabTask = useCallback(async (squadId, profile, task) => {
    await addDoc(collection(db, "squads", squadId, "tasks"), {
      title: task.title,
      desc: task.desc || "",
      priority: task.priority || "medium",
      xp: task.xp || 20,
      dueDate: task.dueDate || "",
      createdBy: { uid: profile.uid, name: profile.name, avatar: profile.avatar },
      assignees: task.assignees || [],
      subtasks: task.subtasks || [],
      comments: [],
      done: false,
      progress: 0,
      createdAt: serverTimestamp()
    });
  }, []);

  const addSubtask = useCallback(async (squadId, taskId, subtask) => {
    await updateDoc(doc(db, "squads", squadId, "tasks", taskId), {
      subtasks: arrayUnion({ ...subtask, id: Math.random().toString(36).slice(2), done: false, createdAt: new Date().toISOString() })
    });
  }, []);

  const toggleSubtask = useCallback(async (squadId, taskId, currentSubtasks, subtaskId) => {
    const updated = currentSubtasks.map(s => s.id === subtaskId ? { ...s, done: !s.done } : s);
    const doneCount = updated.filter(s => s.done).length;
    const progress = updated.length > 0 ? Math.round((doneCount / updated.length) * 100) : 0;
    const allDone = updated.length > 0 && doneCount === updated.length;
    await updateDoc(doc(db, "squads", squadId, "tasks", taskId), {
      subtasks: updated, progress, done: allDone
    });
  }, []);

  const addComment = useCallback(async (squadId, taskId, comment) => {
    await updateDoc(doc(db, "squads", squadId, "tasks", taskId), {
      comments: arrayUnion({ ...comment, id: Math.random().toString(36).slice(2), ts: new Date().toISOString() })
    });
  }, []);

  const claimTask = useCallback(async (squadId, taskId, profile, currentAssignees) => {
    const alreadyClaimed = currentAssignees.some(a => a.uid === profile.uid);
    if (alreadyClaimed) {
      const updated = currentAssignees.filter(a => a.uid !== profile.uid);
      await updateDoc(doc(db, "squads", squadId, "tasks", taskId), { assignees: updated });
    } else {
      await updateDoc(doc(db, "squads", squadId, "tasks", taskId), {
        assignees: arrayUnion({ uid: profile.uid, name: profile.name, avatar: profile.avatar })
      });
    }
  }, []);

  const deleteCollabTask = useCallback(async (squadId, taskId) => {
    await deleteDoc(doc(db, "squads", squadId, "tasks", taskId));
  }, []);

  return { tasks, createCollabTask, addSubtask, toggleSubtask, addComment, claimTask, deleteCollabTask };
}
