import React from "react";
import {
  AppBar,
  Toolbar as MuiToolbar,
  IconButton,
  Tooltip,
  useTheme,
} from "@mui/material";
import {
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Chat as ChatIcon,
  Menu as MenuIcon,
  ContentCopy as CopyIcon,
  Clear as ClearIcon,
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
      }}
    >
      <MuiToolbar variant="dense" sx={{ justifyContent: "space-around" }}>
        <IconButton
          onClick={onSidebarToggle}
          size="small"
          color={showSidebar ? "primary" : "default"}
        >
          <MenuIcon />
        </IconButton>

        <IconButton onClick={onDarkModeChange} size="small">
          {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>

        <IconButton onClick={onCopy} size="small">
          <CopyIcon />
        </IconButton>

        <IconButton onClick={onClear} size="small">
          <ClearIcon />
        </IconButton>

        <IconButton onClick={onChatToggle} size="small">
          <ChatIcon color={showChat ? "primary" : "inherit"} />
        </IconButton>
      </MuiToolbar>
    </AppBar>
  );
};

export default ResponsiveToolbar;
