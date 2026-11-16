import { useCallback, useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore';
import { useFirebase } from '../contexts/FirebaseContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserNote } from '../types/app';

const STORAGE_KEY = 'nepal_patro_user_notes_v1';

const DEFAULT_NOTES: UserNote[] = [
  {
    id: 'sample-1',
    bsKey: '2083-08-04',
    title: 'Haribodhani Ekadashi & Tulsi Puja',
    note: 'Prepare marigold garland and brass diyo before dusk.',
    time: '05:30 PM',
    category: 'puja',
    createdAt: 1,
  },
];

function sanitizeNotePayload(entry: Omit<UserNote, 'id' | 'createdAt'>) {
  const allowedCategories: UserNote['category'][] = ['personal', 'puja', 'birthday', 'reminder'];
  const bsKey = /^\d{4}-\d{2}-\d{2}$/.test(entry.bsKey) ? entry.bsKey : '2083-07-30';
  const title = entry.title.trim().slice(0, 120) || 'Untitled Event';
  const note = (entry.note || '').trim().slice(0, 1000);
  const time = (entry.time || '').trim().slice(0, 32);
  const category = allowedCategories.includes(entry.category) ? entry.category : 'personal';
  return { bsKey, title, note, time, category };
}

export function useUserEvents() {
  const { user, authReady } = useFirebase();
  const [localNotes, setLocalNotes] = useState<UserNote[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore storage errors
    }
    return DEFAULT_NOTES;
  });

  const [cloudNotes, setCloudNotes] = useState<UserNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);

  // Persist local notes when signed out
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localNotes));
    } catch {
      // Ignore storage quota errors
    }
  }, [localNotes]);

  // Real-time Firestore listener when user is authenticated & verified
  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) {
      setCloudNotes([]);
      setNotesLoading(false);
      return;
    }

    setNotesLoading(true);
    const notesPath = `users/${user.uid}/notes`;
    const notesQuery = query(
      collection(db, 'users', user.uid, 'notes'),
      where('ownerUid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      notesQuery,
      (snapshot) => {
        const items: UserNote[] = snapshot.docs.map((d) => {
          const data = d.data();
          const createdTs = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
          return {
            id: d.id,
            bsKey: String(data.bsKey ?? ''),
            title: String(data.title ?? ''),
            note: String(data.note ?? ''),
            time: data.time ? String(data.time) : undefined,
            category: (data.category as UserNote['category']) || 'personal',
            createdAt: createdTs,
          };
        });
        setCloudNotes(items);
        setNotesLoading(false);
      },
      (error) => {
        setNotesLoading(false);
        handleFirestoreError(error, OperationType.LIST, notesPath);
      }
    );

    return unsubscribe;
  }, [authReady, user]);

  const isCloudSynced = Boolean(authReady && user && user.emailVerified);
  const notes = isCloudSynced ? cloudNotes : localNotes;

  const addNote = useCallback(
    async (entry: Omit<UserNote, 'id' | 'createdAt'>) => {
      const sanitized = sanitizeNotePayload(entry);

      if (isCloudSynced && user) {
        const notesPath = `users/${user.uid}/notes`;
        try {
          const docRef = await addDoc(collection(db, 'users', user.uid, 'notes'), {
            ownerUid: user.uid,
            bsKey: sanitized.bsKey,
            title: sanitized.title,
            note: sanitized.note,
            time: sanitized.time,
            category: sanitized.category,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          return {
            id: docRef.id,
            ...sanitized,
            time: sanitized.time || undefined,
            createdAt: Date.now(),
          } satisfies UserNote;
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, notesPath);
        }
      }

      const newNote: UserNote = {
        ...sanitized,
        time: sanitized.time || undefined,
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: Date.now(),
      };
      setLocalNotes((prev) => [newNote, ...prev]);
      return newNote;
    },
    [isCloudSynced, user]
  );

  const deleteNote = useCallback(
    async (id: string) => {
      if (isCloudSynced && user) {
        const notePath = `users/${user.uid}/notes/${id}`;
        try {
          await deleteDoc(doc(db, 'users', user.uid, 'notes', id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, notePath);
        }
        return;
      }

      setLocalNotes((prev) => prev.filter((n) => n.id !== id));
    },
    [isCloudSynced, user]
  );

  const getNotesForDate = useCallback(
    (bsKey: string) => notes.filter((n) => n.bsKey === bsKey),
    [notes]
  );

  return {
    notes,
    notesLoading,
    isCloudSynced,
    addNote,
    deleteNote,
    getNotesForDate,
  };
}
