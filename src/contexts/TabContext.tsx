import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Note } from '@/types';

interface Tab {
  noteId: string;
  title: string;
}

interface TabContextValue {
  tabs: Tab[];
  activeTabId: string | null;
  openTab: (note: Note) => void;
  closeTab: (noteId: string) => void;
  setActiveTab: (noteId: string) => void;
  updateTabTitle: (noteId: string, title: string) => void;
}

const TabContext = createContext<TabContextValue | undefined>(undefined);

export function TabProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const openTab = useCallback((note: Note) => {
    setTabs((prev) => {
      if (prev.some((t) => t.noteId === note._id)) return prev;
      return [...prev, { noteId: note._id, title: note.title }];
    });
    setActiveTabId(note._id);
  }, []);

  const closeTab = useCallback((noteId: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.noteId === noteId);
      const updated = prev.filter((t) => t.noteId !== noteId);
      if (activeTabId === noteId && updated.length > 0) {
        const newIdx = Math.min(idx, updated.length - 1);
        setActiveTabId(updated[newIdx].noteId);
      } else if (updated.length === 0) {
        setActiveTabId(null);
      }
      return updated;
    });
  }, [activeTabId]);

  const setActiveTab = useCallback((noteId: string) => {
    setActiveTabId(noteId);
  }, []);

  const updateTabTitle = useCallback((noteId: string, title: string) => {
    setTabs((prev) => prev.map((t) => t.noteId === noteId ? { ...t, title } : t));
  }, []);

  return (
    <TabContext.Provider value={{ tabs, activeTabId, openTab, closeTab, setActiveTab, updateTabTitle }}>
      {children}
    </TabContext.Provider>
  );
}

export function useTabs() {
  const ctx = useContext(TabContext);
  if (!ctx) throw new Error('useTabs must be used within TabProvider');
  return ctx;
}
