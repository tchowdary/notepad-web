import React, { useState, useEffect, useCallback } from 'react';
import GitHubService from '../services/githubService';
import { createPortal } from 'react-dom';

const CommandPalette = ({ isOpen, onClose, onFileSelect, darkMode }) => {
  const [files, setFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Theme colors
  const colors = {
    light: {
      bg: '#ffffff',
      text: '#333333',
      secondaryText: '#666666',
      selected: '#0078d4',
      selectedText: '#ffffff',
      hover: '#f0f0f0',
      border: '#e0e0e0',
      input: '#ffffff'
    },
    dark: {
      bg: '#1e1e1e',
      text: '#cccccc',
      secondaryText: '#666666',
      selected: '#04395e',
      selectedText: '#ffffff',
      hover: '#2a2d2e',
      border: '#333333',
      input: '#1e1e1e'
    }
  };

  const theme = colors[darkMode ? 'dark' : 'light'];

  useEffect(() => {
    if (isOpen) {
      loadFiles();
      setSearchTerm('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const loadFiles = async () => {
    const monthFiles = await GitHubService.getCurrentMonthFiles();
    setFiles(monthFiles);
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleKeyDown = useCallback((e) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredFiles.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredFiles[selectedIndex]) {
          onFileSelect(filteredFiles[selectedIndex]);
          onClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      default:
        break;
    }
  }, [isOpen, filteredFiles, selectedIndex, onFileSelect, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  const palette = (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '80px 20px',
        zIndex: 9999,
      }}
    >
      <div 
        style={{
          width: '600px',
          maxHeight: '60vh',
          backgroundColor: theme.bg,
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden',
        }}
      >
        <div style={{ borderBottom: `1px solid ${theme.border}` }}>
          <input
            type="text"
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: theme.input,
              border: 'none',
              color: theme.text,
              fontSize: '14px',
              outline: 'none',
            }}
            placeholder="Type to search files..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedIndex(0);
            }}
            autoFocus
          />
        </div>
        <div style={{ 
          overflowY: 'auto',
          maxHeight: 'calc(60vh - 56px)'
        }}>
          {filteredFiles.length === 0 ? (
            <div style={{ 
              padding: '12px 16px',
              fontSize: '14px',
              color: theme.secondaryText
            }}>
              No files found
            </div>
          ) : (
            filteredFiles.map((file, index) => (
              <div
                key={`${file.path}-${file.name}`}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: index === selectedIndex ? theme.selected : 'transparent',
                  color: index === selectedIndex ? theme.selectedText : theme.text,
                  ':hover': {
                    backgroundColor: index === selectedIndex ? theme.selected : theme.hover
                  }
                }}
                onClick={() => {
                  onFileSelect(file);
                  onClose();
                }}
              >
                <svg 
                  style={{
                    width: '16px',
                    height: '16px',
                    color: theme.secondaryText
                  }}
                  fill="none" 
                  strokeWidth="2" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span style={{ 
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {file.name}
                </span>
                <span style={{
                  fontSize: '12px',
                  color: theme.secondaryText
                }}>
                  {file.month}/{file.path.split('/')[0]}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(palette, document.body);
};

export default CommandPalette;
