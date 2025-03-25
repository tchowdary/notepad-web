import React from "react";
import {
  AppBar,
  Toolbar as MuiToolbar,
  IconButton,
  useTheme,
} from "@mui/material";
import {
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Chat as ChatIcon,
  Menu as MenuIcon,
  ContentCopy as CopyIcon,
  Clear as ClearIcon,
  Search as SearchIcon,
} from "@mui/icons-material";

const ResponsiveToolbar = ({
  darkMode,
  onDarkModeChange,
  onChatToggle,
  showChat,
  onSidebarToggle,
  showSidebar,
  onCopy,
  onClear,
  onCommandPaletteOpen,
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
        top: "auto",
        bottom: 0,
        borderTop: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.background.paper,
        display: { xs: "block", sm: "block", md: "none" }, // Only show on mobile and tablet
        zIndex: (theme) => theme.zIndex.drawer + 2,
        left: 0,
        right: 0,
        width: "100%",
        minHeight: '30px', // Reduced height
      }}
    >
      <MuiToolbar 
        variant="dense" 
        sx={{ 
          justifyContent: "space-around",
          minHeight: '30px !important', // Override default height
          padding: '0 8px', // Reduced padding
        }}
      >
        <IconButton
          onClick={onSidebarToggle}
          size="small"
          color={showSidebar ? "primary" : "default"}
          sx={{ padding: '4px' }} // Reduced padding for icons
        >
          <MenuIcon />
        </IconButton>

        <IconButton onClick={onDarkModeChange} size="small" sx={{ padding: '4px' }}>
          {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>

        <IconButton onClick={onCopy} size="small" sx={{ padding: '4px' }}>
          <CopyIcon />
        </IconButton>

        <IconButton onClick={onClear} size="small" sx={{ padding: '4px' }}>
          <ClearIcon />
        </IconButton>

        <IconButton onClick={onCommandPaletteOpen} size="small" sx={{ padding: '4px' }}>
          <SearchIcon />
        </IconButton>

        <IconButton onClick={onChatToggle} size="small" sx={{ padding: '4px' }}>
          <ChatIcon color={showChat ? "primary" : "inherit"} />
        </IconButton>
      </MuiToolbar>
    </AppBar>
  );
};

export default ResponsiveToolbar;
