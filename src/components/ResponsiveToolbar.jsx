import React from "react";
import { Button } from "./ui/button";
import {
  Sun,
  Moon,
  MessageSquare,
  Menu,
  Copy,
  Trash,
  Settings,
  Plus,
  Search,
  GitBranch
} from "lucide-react";

const ResponsiveToolbar = ({
  darkMode,
  toggleDarkMode,
  focusMode,
  toggleFocusMode,
  showPreview,
  togglePreview,
  showSidebar,
  toggleSidebar,
  wordWrap,
  toggleWordWrap,
  splitView,
  toggleSplitView,
  showChat,
  toggleChat,
  showApiSettings,
  setShowApiSettings,
  handleGitHubSettings,
  handleQuickAdd,
  handleCommandPalette,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden">
      <div className="flex h-12 items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            className="h-8 w-8"
          >
            {darkMode ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCommandPalette}
            className="h-8 w-8"
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleQuickAdd}
            className="h-8 w-8"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleGitHubSettings}
            className="h-8 w-8"
          >
            <GitBranch className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleChat}
            className="h-8 w-8"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowApiSettings(true)}
            className="h-8 w-8"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResponsiveToolbar;
