import React, { useState, DragEvent } from 'react';
import {
  Drawer, List, ListItem, ListItemButton, ListItemText,
  Box, Typography, IconButton, Tooltip, TextField, InputAdornment,
  Menu, MenuItem, Collapse, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import DeleteIcon from '@mui/icons-material/Delete';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SearchIcon from '@mui/icons-material/Search';
import { useNotes } from '@/contexts/NoteContext';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import DeleteFolderDialog from './DeleteFolderDialog';
import { Folder, Note } from '@/types';

const DRAWER_WIDTH = 280;

export default function NotesSidebar() {
  const {
    notes, folders, expandedFolders, createNote, deleteNote, updateNote,
    activeNoteId, setActiveNoteId, createFolder, renameFolder,
    deleteFolder, moveNote, toggleFolder,
  } = useNotes();

  const [search, setSearch] = useState('');

  // Note deletion
  const [deleteNoteTarget, setDeleteNoteTarget] = useState<string | null>(null);

  // Folder deletion
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<Folder | null>(null);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    target: Folder | Note;
    type: 'folder' | 'note';
  } | null>(null);

  // Move note via context menu
  const [moveNoteTarget, setMoveNoteTarget] = useState<Note | null>(null);
  const [moveMenuPosition, setMoveMenuPosition] = useState<{ mouseX: number; mouseY: number } | null>(null);

  // Active folder for new note creation
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  // Drag-and-drop state
  const [dragActive, setDragActive] = useState(false);
  const [dropTarget, setDropTarget] = useState<{
    folderId: string | null;
    noteIndex: number;
  } | null>(null);

  // Inline rename
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const filtered = search
    ? notes.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()))
    : notes;

  const quickNotes = filtered.filter((n) => !n.folderId);

  const handleCreate = async () => {
    let targetFolderId = activeFolderId ?? undefined;
    let position: number | undefined;

    if (activeNoteId) {
      const selectedNote = notes.find((n) => n._id === activeNoteId);
      if (selectedNote) {
        targetFolderId = selectedNote.folderId;
        const siblings = notes
          .filter((n) => n.folderId === selectedNote.folderId)
          .sort((a, b) => a.position - b.position);
        const idx = siblings.findIndex((n) => n._id === activeNoteId);
        const nextNote = siblings[idx + 1];
        position = nextNote
          ? (selectedNote.position + nextNote.position) / 2
          : selectedNote.position + 1000;
      }
    }

    const note = await createNote({ title: 'Untitled Note', folderId: targetFolderId, position });
    if (note) setActiveNoteId(note._id);
  };

  const handleCreateFolder = async () => {
    const folder = await createFolder('New Folder');
    if (folder) {
      setRenamingId(folder._id);
      setRenameValue(folder.name);
      toggleFolder(folder._id);
    }
  };

  const handleDeleteNote = async () => {
    if (!deleteNoteTarget) return;
    await deleteNote(deleteNoteTarget);
    if (activeNoteId === deleteNoteTarget) setActiveNoteId(null);
    setDeleteNoteTarget(null);
  };

  const handleDeleteFolder = async () => {
    if (!deleteFolderTarget) return;
    await deleteFolder(deleteFolderTarget._id);
    setDeleteFolderTarget(null);
  };

  // Inline rename
  const startRenaming = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const finishRename = async (id: string) => {
    if (!renamingId || !renameValue.trim()) {
      cancelRename();
      return;
    }
    // Check if it's a folder or note
    if (folders.some((f) => f._id === id)) {
      await renameFolder(id, renameValue.trim());
    } else {
      await updateNote(id, { title: renameValue.trim() });
    }
    cancelRename();
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue('');
  };

  // Context menu handlers
  const openFolderMenu = (e: React.MouseEvent, folder: Folder) => {
    e.preventDefault();
    setContextMenu({ mouseX: e.clientX, mouseY: e.clientY, target: folder, type: 'folder' });
  };

  const openNoteMenu = (e: React.MouseEvent, note: Note) => {
    e.preventDefault();
    setContextMenu({ mouseX: e.clientX, mouseY: e.clientY, target: note, type: 'note' });
  };

  const handleContextRename = () => {
    if (!contextMenu) return;
    startRenaming(contextMenu.target._id, (contextMenu.target as any).name || (contextMenu.target as any).title || '');
    setContextMenu(null);
  };

  const handleContextDelete = () => {
    if (!contextMenu) return;
    if (contextMenu.type === 'folder') {
      setDeleteFolderTarget(contextMenu.target as Folder);
    } else {
      setDeleteNoteTarget(contextMenu.target._id);
    }
    setContextMenu(null);
  };

  const handleContextMoveNote = () => {
    if (!contextMenu || contextMenu.type !== 'note') return;
    setMoveNoteTarget(contextMenu.target as Note);
    setMoveMenuPosition({ mouseX: contextMenu.mouseX, mouseY: contextMenu.mouseY });
    setContextMenu(null);
  };

  // Drag and drop
  const handleDragStart = (e: DragEvent, noteId: string) => {
    e.dataTransfer.setData('text/plain', noteId);
    e.dataTransfer.effectAllowed = 'move';
    setDragActive(true);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    const noteId = e.dataTransfer.getData('text/plain');
    if (noteId && dropTarget && dropTarget.folderId === targetFolderId) {
      const targetNotes = notes
        .filter((n) => targetFolderId === null ? !n.folderId : n.folderId === targetFolderId)
        .sort((a, b) => a.position - b.position);
      const { noteIndex } = dropTarget;
      let position: number;
      if (targetNotes.length === 0) {
        position = 0;
      } else if (noteIndex <= 0) {
        position = targetNotes[0].position - 1000;
      } else if (noteIndex >= targetNotes.length) {
        position = targetNotes[targetNotes.length - 1].position + 1000;
      } else {
        position = (targetNotes[noteIndex - 1].position + targetNotes[noteIndex].position) / 2;
      }
      await moveNote(noteId, targetFolderId, position);
    } else if (noteId) {
      await moveNote(noteId, targetFolderId);
    }
    setDropTarget(null);
    setDragActive(false);
  };

  const handleNoteDragOver = (e: DragEvent, noteIndex: number, parentFolderId: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const index = relativeY < rect.height / 2 ? noteIndex : noteIndex + 1;
    setDropTarget({ folderId: parentFolderId, noteIndex: index });
  };

  const handleDragEnd = () => {
    setDropTarget(null);
    setDragActive(false);
  };

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            top: ['40px', '40px', '40px'],
            height: 'auto',
            bottom: 0,
          },
        }}
      >
        {/* Sidebar header with action icons */}
        <Box
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            px: 1, py: 0.5, borderBottom: 1, borderColor: 'divider',
          }}
        >
          <Tooltip title="New Note">
            <IconButton size="small" onClick={handleCreate} sx={{ width: 28, height: 28 }}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="New Folder">
            <IconButton size="small" onClick={handleCreateFolder} sx={{ width: 28, height: 28 }}>
              <CreateNewFolderIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Search */}
        <Box sx={{ p: 1.5, pb: 0.5 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                sx: { fontSize: '0.85rem', borderRadius: 2, bgcolor: 'action.hover' },
              },
            }}
          />
        </Box>

        {/* Folder list */}
        <List dense sx={{ overflow: 'auto', flex: 1, px: 1 }}>
          {folders.map((folder) => {
            const folderNotes = filtered.filter((n) => n.folderId === folder._id);
            const isExpanded = expandedFolders.has(folder._id);

            return (
              <Box key={folder._id} onDragOver={(e) => { handleDragOver(e); setDropTarget((prev) => prev?.folderId === folder._id ? prev : null); }} onDrop={(e) => handleDrop(e, folder._id)}>
                <ListItem
                  disablePadding
                  secondaryAction={
                    <Chip label={folderNotes.length} size="small" sx={{ height: 18, fontSize: '0.7rem', mr: 0.5 }} />
                  }
                >
                  <ListItemButton
                    onClick={() => { toggleFolder(folder._id); setActiveFolderId(folder._id); }}
                    onContextMenu={(e) => openFolderMenu(e, folder)}
                    onDoubleClick={() => startRenaming(folder._id, folder.name)}
                    sx={{ borderRadius: 1.5, mx: 0.5 }}
                  >
                    {isExpanded ? (
                      <FolderOpenIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    ) : (
                      <FolderIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    )}
                    {renamingId === folder._id ? (
                      <TextField
                        size="small"
                        variant="standard"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => finishRename(folder._id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') finishRename(folder._id);
                          if (e.key === 'Escape') cancelRename();
                        }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        slotProps={{
                          input: {
                            sx: { fontSize: '1rem', fontWeight: 600 },
                          },
                        }}
                      />
                    ) : (
                      <ListItemText
                        primary={folder.name}
                        slotProps={{
                          primary: {
                            noWrap: true,
                            sx: { fontSize: '1rem', fontWeight: 600 },
                          },
                        }}
                      />
                    )}
                  </ListItemButton>
                </ListItem>

                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                  <List dense disablePadding sx={{ position: 'relative' }}>
                    {folderNotes.length === 0 && dragActive && (
                      <Box sx={{ height: 0, position: 'relative', mx: 3 }}>
                        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, bgcolor: 'primary.main', borderRadius: 0.5 }} />
                      </Box>
                    )}
                    {folderNotes.map((note, noteIndex) => (
                      <React.Fragment key={note._id}>
                        <ListItem
                          disablePadding
                          draggable
                          onDragStart={(e) => handleDragStart(e, note._id)}
                          onDragEnd={handleDragEnd}
                          secondaryAction={
                            <IconButton
                              edge="end"
                              size="small"
                              onClick={(e) => { e.stopPropagation(); setDeleteNoteTarget(note._id); }}
                              sx={{ opacity: 0, '&:hover': { opacity: 1 } }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          }
                        >
                          {dropTarget?.folderId === folder._id && dropTarget.noteIndex === noteIndex && (
                            <Box sx={{ position: 'absolute', top: 0, left: 36, right: 12, height: 3, bgcolor: 'primary.main', borderRadius: 0.5, zIndex: 10 }} />
                          )}
                          <ListItemButton
                            selected={activeNoteId === note._id}
                            onClick={() => setActiveNoteId(note._id)}
                            onContextMenu={(e) => openNoteMenu(e, note)}
                            onDoubleClick={() => startRenaming(note._id, note.title)}
                            onDragOver={(e) => handleNoteDragOver(e, noteIndex, folder._id)}
                            sx={{
                              borderRadius: 1.5,
                              ml: 3,
                              mr: 0.5,
                              '&:hover .MuiListItemSecondaryAction-root .MuiIconButton-root': {
                                opacity: 0.4,
                              },
                            }}
                      >
                        {renamingId === note._id ? (
                          <TextField
                            size="small"
                            variant="standard"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => finishRename(note._id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') finishRename(note._id);
                              if (e.key === 'Escape') cancelRename();
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            slotProps={{
                              input: {
                                sx: { fontSize: '0.85rem' },
                              },
                            }}
                          />
                        ) : (
                          <ListItemText
                            primary={note.title}
                            slotProps={{
                              primary: {
                                noWrap: true,
                                sx: { fontSize: '0.85rem' },
                              },
                            }}
                          />
                        )}
                        </ListItemButton>
                      </ListItem>
                    </React.Fragment>
                    ))}
                    {dropTarget?.folderId === folder._id && dropTarget.noteIndex === folderNotes.length && folderNotes.length > 0 && (
                      <Box sx={{ height: 0, position: 'relative' }}>
                        <Box sx={{ position: 'absolute', top: 0, left: 36, right: 12, height: 3, bgcolor: 'primary.main', borderRadius: 0.5, zIndex: 10 }} />
                      </Box>
                    )}
                  </List>
                </Collapse>
              </Box>
            );
          })}

          {/* Quick Notes section — always visible, cannot be deleted */}
          <Box
            onDragOver={(e) => { handleDragOver(e); setDropTarget((prev) => prev?.folderId === null ? prev : null); }}
            onDrop={(e) => handleDrop(e, null)}
          >
            <ListItem
              dense
              sx={{ px: 2, py: 0.5, cursor: 'pointer', borderRadius: 1.5, mx: 0.5 }}
              onClick={() => setActiveFolderId(null)}
              secondaryAction={
                <Chip label={quickNotes.length} size="small" sx={{ height: 18, fontSize: '0.7rem', mr: 0.5 }} />
              }
            >
              <FolderIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <ListItemText
                primary="Quick Notes"
                slotProps={{
                  primary: {
                    sx: { fontSize: '1rem', fontWeight: 600 },
                  },
                }}
              />
            </ListItem>
            {quickNotes.length === 0 && dragActive && (
              <Box sx={{ height: 0, position: 'relative', mx: 3 }}>
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, bgcolor: 'primary.main', borderRadius: 0.5 }} />
              </Box>
            )}
              {quickNotes.map((note, noteIndex) => (
                <React.Fragment key={note._id}>
                  <ListItem
                    disablePadding
                    draggable
                    onDragStart={(e) => handleDragStart(e, note._id)}
                    onDragEnd={handleDragEnd}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(e) => { e.stopPropagation(); setDeleteNoteTarget(note._id); }}
                        sx={{ opacity: 0, '&:hover': { opacity: 1 } }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    }
                  >
                    {dropTarget?.folderId === null && dropTarget.noteIndex === noteIndex && (
                      <Box sx={{ position: 'absolute', top: 0, left: 36, right: 12, height: 3, bgcolor: 'primary.main', borderRadius: 0.5, zIndex: 10 }} />
                    )}
                    <ListItemButton
                      selected={activeNoteId === note._id}
                      onClick={() => setActiveNoteId(note._id)}
                      onContextMenu={(e) => openNoteMenu(e, note)}
                      onDoubleClick={() => startRenaming(note._id, note.title)}
                      onDragOver={(e) => handleNoteDragOver(e, noteIndex, null)}
                      sx={{
                        borderRadius: 1.5,
                        ml: 3,
                        mr: 0.5,
                        '&:hover .MuiListItemSecondaryAction-root .MuiIconButton-root': {
                          opacity: 0.4,
                        },
                      }}
                    >
                      {renamingId === note._id ? (
                        <TextField
                          size="small"
                          variant="standard"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => finishRename(note._id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') finishRename(note._id);
                            if (e.key === 'Escape') cancelRename();
                          }}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          slotProps={{
                            input: {
                              sx: { fontSize: '0.85rem' },
                            },
                          }}
                        />
                      ) : (
                        <ListItemText
                          primary={note.title}
                          slotProps={{
                            primary: {
                              noWrap: true,
                              sx: {
                                fontSize: '0.85rem',
                              },
                            },
                          }}
                        />
                      )}
                    </ListItemButton>
                  </ListItem>
                </React.Fragment>
              ))}
              {dropTarget?.folderId === null && dropTarget.noteIndex === quickNotes.length && quickNotes.length > 0 && (
                <Box sx={{ height: 0, position: 'relative' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 36, right: 12, height: 3, bgcolor: 'primary.main', borderRadius: 0.5, zIndex: 10 }} />
                </Box>
              )}
            </Box>
        </List>
      </Drawer>

      {/* Context menu */}
      <Menu
        open={contextMenu !== null}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined
        }
      >
        {contextMenu?.type === 'folder' && [
          <MenuItem key="rename" onClick={handleContextRename}>
            <DriveFileRenameOutlineIcon fontSize="small" sx={{ mr: 1 }} /> Rename
          </MenuItem>,
          <MenuItem key="delete" onClick={handleContextDelete}>
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
          </MenuItem>,
        ]}
        {contextMenu?.type === 'note' && [
          <MenuItem key="move" onClick={handleContextMoveNote}>
            Move to folder
          </MenuItem>,
          <MenuItem key="delete" onClick={handleContextDelete}>
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
          </MenuItem>,
        ]}
      </Menu>

      {/* Move to folder submenu */}
      <Menu
        open={Boolean(moveNoteTarget)}
        onClose={() => { setMoveNoteTarget(null); setMoveMenuPosition(null); }}
        anchorReference="anchorPosition"
        anchorPosition={
          moveMenuPosition ? { top: moveMenuPosition.mouseY, left: moveMenuPosition.mouseX } : undefined
        }
      >
        <MenuItem
          onClick={async () => {
            if (moveNoteTarget) {
              await moveNote(moveNoteTarget._id, null);
              setMoveNoteTarget(null);
            }
          }}
        >
          Quick Notes
        </MenuItem>
        {folders.map((f) => (
          <MenuItem
            key={f._id}
            onClick={async () => {
              if (moveNoteTarget) {
                await moveNote(moveNoteTarget._id, f._id);
                setMoveNoteTarget(null);
              }
            }}
          >
            {f.name}
          </MenuItem>
        ))}
      </Menu>

      {/* Delete note confirmation */}
      <DeleteConfirmDialog
        open={deleteNoteTarget !== null}
        onClose={() => setDeleteNoteTarget(null)}
        onConfirm={handleDeleteNote}
      />

      {/* Delete folder confirmation */}
      <DeleteFolderDialog
        open={deleteFolderTarget !== null}
        folderName={deleteFolderTarget?.name || ''}
        notesCount={
          deleteFolderTarget
            ? notes.filter((n) => n.folderId === deleteFolderTarget._id).length
            : 0
        }
        onClose={() => setDeleteFolderTarget(null)}
        onConfirm={handleDeleteFolder}
      />
    </>
  );
}
