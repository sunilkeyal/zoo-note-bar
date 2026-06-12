import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';

interface DeleteFolderDialogProps {
  open: boolean;
  folderName: string;
  notesCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteFolderDialog({
  open,
  folderName,
  notesCount,
  onClose,
  onConfirm,
}: DeleteFolderDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Delete folder?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          This will permanently delete the folder <strong>"{folderName}"</strong>
          {notesCount > 0 && (
            <> and all <strong>{notesCount}</strong> notes inside it</>
          )}.
          This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
