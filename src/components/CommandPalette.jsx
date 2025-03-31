import React, { useState, useEffect, useCallback } from 'react';
import GitHubService from '../services/githubService';
import DbSyncService from '../services/dbSyncService';
import { createPortal } from 'react-dom';

const CommandPalette = ({ isOpen, onClose, onFileSelect, darkMode }) => {
  const [files, setFiles] = useState([]);
  const [notes, setNotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('database'); // 'github' or 'database'
  const [isLoading, setIsLoading] = useState(false);
  const [searchType, setSearchType] = useState('name'); // 'name', 'content', or 'both'

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
      input: '#ffffff',
      tabActive: '#0078d4',
      tabInactive: '#e0e0e0'
    },
    dark: {
      bg: '#1f1a24',
      text: '#cccccc',
      secondaryText: '#666666',
      selected: '#04395e',
      selectedText: '#ffffff',
      hover: '#2a2d2e',
      border: '#333333',
      input: '#1f1a24',
      tabActive: '#04395e',
      tabInactive: '#333333'
    }
  };

  const theme = colors[darkMode ? 'dark' : 'light'];

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'github') {
        loadFiles();
      } else {
        loadNotes();
      }
      setSearchTerm('');
      setSelectedIndex(0);
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (searchTerm.length >= 3 && activeTab === 'database') {
      searchDatabaseNotes();
    }
  }, [searchTerm, activeTab, searchType]);

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const monthFiles = await GitHubService.getCurrentMonthFiles();
      setFiles(monthFiles);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotes = async () => {
    setIsLoading(true);
    try {
      const dbNotes = await DbSyncService.getAllNotes(15);
      setNotes(Array.isArray(dbNotes) ? dbNotes : []);
    } catch (error) {
      console.error('Error loading notes from database:', error);
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const searchDatabaseNotes = async () => {
    setIsLoading(true);
    try {
      if (searchTerm.length >= 3) {
        const searchResults = await DbSyncService.searchNotes(searchTerm, searchType);
        setNotes(Array.isArray(searchResults) ? searchResults : []);
      }
    } catch (error) {
      console.error('Error searching notes in database:', error);
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNoteSelect = async (note) => {
    try {
      // If we already have the full note with content from content search
      if (note.content && (searchType === 'content' || searchType === 'both')) {
        const tabData = {
          name: note.name,
          content: note.content,
          noteId: note.id
        };
        
        onFileSelect(tabData);
        onClose();
        return;
      }
      
      // Otherwise fetch the complete note data by ID
      const fullNote = await DbSyncService.getNoteById(note.id);
      
      if (fullNote) {
        // Create a tab object compatible with the app's structure
        const tabData = {
          name: note.name,
          content: fullNote.content || '',
          noteId: note.id
        };
        
        // Pass the tab data to the parent component
        onFileSelect(tabData);
        onClose();
      } else {
        console.error('Failed to fetch note details');
      }
    } catch (error) {
      console.error('Error selecting note:', error);
    }
  };

  const filteredFiles = activeTab === 'github' 
    ? files.filter(file => file.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : (Array.isArray(notes) ? notes : []);

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
          if (activeTab === 'github') {
            onFileSelect(filteredFiles[selectedIndex]);
            onClose();
          } else {
            // Handle database note selection
            handleNoteSelect(filteredFiles[selectedIndex]);
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      default:
        break;
    }
  }, [isOpen, filteredFiles, selectedIndex, onFileSelect, onClose, activeTab]);

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
        {/* Tabs */}
        <div style={{ 
          display: 'flex', 
          borderBottom: `1px solid ${theme.border}` 
        }}>
          <div 
            style={{
              flex: 1,
              padding: '8px 16px',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: activeTab === 'database' ? theme.tabActive : 'transparent',
              color: activeTab === 'database' ? theme.selectedText : theme.text,
              borderBottom: activeTab === 'database' ? `2px solid ${theme.tabActive}` : 'none'
            }}
            onClick={() => {
              setActiveTab('database');
              setSelectedIndex(0);
              loadNotes();
            }}
          >
            Database Notes
          </div>
          <div 
            style={{
              flex: 1,
              padding: '8px 16px',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: activeTab === 'github' ? theme.tabActive : 'transparent',
              color: activeTab === 'github' ? theme.selectedText : theme.text,
              borderBottom: activeTab === 'github' ? `2px solid ${theme.tabActive}` : 'none'
            }}
            onClick={() => {
              setActiveTab('github');
              setSelectedIndex(0);
            }}
          >
            GitHub Files
          </div>
          
        </div>

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
            placeholder={activeTab === 'github' ? "Type to search files..." : "Type to search notes..."}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedIndex(0);
            }}
            autoFocus
          />
        </div>
        
        {/* Search Type Selector (only visible for database tab) */}
        {activeTab === 'database' && (
          <div style={{ 
            display: 'flex', 
            borderBottom: `1px solid ${theme.border}`,
            padding: '4px 8px',
            backgroundColor: theme.bg
          }}>
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              fontSize: '12px',
              color: theme.secondaryText
            }}>
              Search in:
            </div>
            <div style={{ 
              display: 'flex',
              marginLeft: '8px'
            }}>
              <button 
                style={{
                  padding: '2px 8px',
                  marginRight: '4px',
                  backgroundColor: searchType === 'name' ? theme.selected : 'transparent',
                  color: searchType === 'name' ? theme.selectedText : theme.text,
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
                onClick={() => setSearchType('name')}
              >
                Name
              </button>
              <button 
                style={{
                  padding: '2px 8px',
                  marginRight: '4px',
                  backgroundColor: searchType === 'content' ? theme.selected : 'transparent',
                  color: searchType === 'content' ? theme.selectedText : theme.text,
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
                onClick={() => setSearchType('content')}
              >
                Content
              </button>
              <button 
                style={{
                  padding: '2px 8px',
                  backgroundColor: searchType === 'both' ? theme.selected : 'transparent',
                  color: searchType === 'both' ? theme.selectedText : theme.text,
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
                onClick={() => setSearchType('both')}
              >
                Both
              </button>
            </div>
          </div>
        )}
        
        <div style={{ 
          overflowY: 'auto',
          maxHeight: 'calc(60vh - 100px)'
        }}>
          {isLoading ? (
            <div style={{ 
              padding: '12px 16px',
              fontSize: '14px',
              color: theme.secondaryText,
              textAlign: 'center'
            }}>
              Loading...
            </div>
          ) : filteredFiles.length === 0 ? (
            <div style={{ 
              padding: '12px 16px',
              fontSize: '14px',
              color: theme.secondaryText
            }}>
              No {activeTab === 'github' ? 'files' : 'notes'} found
            </div>
          ) : (
            filteredFiles.map((item, index) => (
              <div
                key={activeTab === 'github' ? `${item.path}-${item.name}` : item.id}
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
                  if (activeTab === 'github') {
                    onFileSelect(item);
                    onClose();
                  } else {
                    // Handle database note selection
                    handleNoteSelect(item);
                  }
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
                  {item.name}
                </span>
                {activeTab === 'github' && (
                  <span style={{
                    fontSize: '12px',
                    color: theme.secondaryText
                  }}>
                    {item.month}/{item.path.split('/')[0]}
                  </span>
                )}
                {/* Show content preview for content search results */}
                {activeTab === 'database' && (searchType === 'content' || searchType === 'both') && item.content && (
                  <div style={{
                    fontSize: '12px',
                    color: theme.secondaryText,
                    marginTop: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%',
                    display: 'block'
                  }}>
                    {item.content.substring(0, 60)}...
                  </div>
                )}
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
