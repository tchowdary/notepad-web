import React, { useState, useEffect } from "react";
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
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    let ticking = false;
    const SCROLL_THRESHOLD = 5;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const scrollDifference = currentScrollY - lastScrollY;

          // Show toolbar when scrolling up, hide when scrolling down
          if (Math.abs(scrollDifference) > SCROLL_THRESHOLD) {
            setIsVisible(scrollDifference < 0);
            setLastScrollY(currentScrollY);
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

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
        display: { xs: "block", sm: "block", md: "none" },
        zIndex: (theme) => theme.zIndex.drawer + 2,
        left: 0,
        right: 0,
        width: "100%",
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease, opacity 0.2s ease',
        visibility: isVisible ? 'visible' : 'hidden',
        pointerEvents: isVisible ? 'auto' : 'none',
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
