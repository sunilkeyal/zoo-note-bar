import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Note, NoteInput, NoteUpdate, ApiResponse } from '@/types';

interface NoteContextValue {
  notes: Note[];
  loading: boolean;
  error: string | null;
  activeNoteId: string | null;
  activeNote: Note | null;
  setActiveNoteId: (id: string | null) => void;
  fetchNotes: () => Promise<void>;
  createNote: (input: NoteInput) => Promise<Note | null>;
  updateNote: (id: string, update: NoteUpdate) => Promise<Note | null>;
  deleteNote: (id: string) => Promise<boolean>;
}

const NoteContext = createContext<NoteContextValue | undefined>(undefined);

export function NoteProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const activeNote = notes.find((n) => n._id === activeNoteId) ?? null;

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notes');
      const json: ApiResponse<Note[]> = await res.json();
      if (json.success && json.data) {
        setNotes(json.data);
      } else {
        setError(json.error || 'Failed to fetch notes');
      }
    } catch {
      setError('Failed to fetch notes');
    } finally {
      setLoading(false);
    }
  }, []);

  const createNote = useCallback(async (input: NoteInput): Promise<Note | null> => {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const json: ApiResponse<Note> = await res.json();
      if (json.success && json.data) {
        setNotes((prev) => [json.data!, ...prev]);
        return json.data;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const updateNote = useCallback(async (id: string, update: NoteUpdate): Promise<Note | null> => {
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      const json: ApiResponse<Note> = await res.json();
      if (json.success && json.data) {
        setNotes((prev) => prev.map((n) => (n._id === id ? json.data! : n)));
        return json.data;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const deleteNote = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      const json: ApiResponse<void> = await res.json();
      if (json.success) {
        setNotes((prev) => prev.filter((n) => n._id !== id));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  return (
    <NoteContext.Provider value={{
      notes, loading, error, activeNoteId, activeNote, setActiveNoteId,
      fetchNotes, createNote, updateNote, deleteNote,
    }}>
      {children}
    </NoteContext.Provider>
  );
}

export function useNotes() {
  const ctx = useContext(NoteContext);
  if (!ctx) throw new Error('useNotes must be used within NoteProvider');
  return ctx;
}
