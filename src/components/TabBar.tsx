import React from 'react';
import { Tabs, Tab, Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTabs } from '@/contexts/TabContext';

export default function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useTabs();

  if (tabs.length === 0) return null;

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Tabs
        value={activeTabId || false}
        onChange={(_, value) => setActiveTab(value)}
        variant="scrollable"
        scrollButtons="auto"
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.noteId}
            value={tab.noteId}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <span>{tab.title}</span>
                <IconButton
                  component="span"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.noteId);
                  }}
                  sx={{ ml: 0.5, p: 0.2 }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            }
            sx={{ textTransform: 'none', minHeight: 36 }}
          />
        ))}
      </Tabs>
    </Box>
  );
}
