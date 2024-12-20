import React from 'react';
import {
  AppBar,
  Toolbar as MuiToolbar,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Fullscreen as FullscreenIcon,
  Chat as ChatIcon,
  Menu as MenuIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

const ResponsiveToolbar = ({
  darkMode,
  onDarkModeChange,
  focusMode,
  onFocusModeChange,
  onChatToggle,
  showChat,
  onSidebarToggle,
  onApiSettingsClick,
  className,
}) => {
  const theme = useTheme();

  return (
    <AppBar 
      position="fixed" 
      color="default" 
      elevation={0}
      className={className}
      sx={{
        top: 'auto',
        bottom: 0,
        borderTop: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.background.paper,
        display: { xs: 'block', sm: 'block', md: 'none' }, // Only show on mobile and tablet
        zIndex: (theme) => theme.zIndex.drawer + 2,
        left: 0,
        right: 0,
        width: '100%',
      }}
    >
      <MuiToolbar variant="dense" sx={{ justifyContent: 'space-around' }}>
        <Tooltip title="Toggle Sidebar">
          <IconButton onClick={onSidebarToggle} size="small">
            <MenuIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title={darkMode ? "Light Mode" : "Dark Mode"}>
          <IconButton onClick={onDarkModeChange} size="small">
            {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Focus Mode">
          <IconButton onClick={onFocusModeChange} size="small">
            <FullscreenIcon color={focusMode ? 'primary' : 'inherit'} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Toggle Chat">
          <IconButton onClick={onChatToggle} size="small">
            <ChatIcon color={showChat ? 'primary' : 'inherit'} />
          </IconButton>
        </Tooltip>

        <Tooltip title="API Settings">
          <IconButton onClick={onApiSettingsClick} size="small">
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </MuiToolbar>
    </AppBar>
  );
};

export default ResponsiveToolbar;
