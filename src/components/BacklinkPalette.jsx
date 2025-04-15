import React, { useState, useEffect, useCallback } from 'react';
import DbSyncService from '../services/dbSyncService';
import { createPortal } from 'react-dom';

const BacklinkPalette = ({ isOpen, onClose, onNoteSelect, position, darkMode }) => {
  const [notes, setNotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

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
      bg: '#1f1a24',
      text: '#cccccc',
      secondaryText: '#666666',
      selected: '#04395e',
      selectedText: '#ffffff',
      hover: '#2a2d2e',
      border: '#333333',
      input: '#1f1a24'
    }
  };

  const theme = colors[darkMode ? 'dark' : 'light'];

  useEffect(() => {
    if (isOpen) {
      loadNotes();
      setSearchTerm('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchDatabaseNotes();
    }
  }, [searchTerm]);

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
      if (searchTerm.length >= 2) {
        const searchResults = await DbSyncService.searchNotes(searchTerm, 'name');
        setNotes(Array.isArray(searchResults) ? searchResults : []);
      }
    } catch (error) {
      console.error('Error searching notes in database:', error);
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNoteSelect = (note) => {
    onNoteSelect(note);
    onClose();
  };

  const filteredNotes = Array.isArray(notes) ? notes : [];

  const handleKeyDown = useCallback((e) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredNotes.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredNotes[selectedIndex]) {
          handleNoteSelect(filteredNotes[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      default:
        break;
    }
  }, [isOpen, filteredNotes, selectedIndex, onNoteSelect, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  // Calculate position for the palette
  const paletteStyle = {
    position: 'absolute',
    zIndex: 9999,
    width: '300px',
    maxHeight: '300px',
    backgroundColor: theme.bg,
    borderRadius: '6px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    overflow: 'hidden',
    top: `${position.top}px`,
    left: `${position.left}px`,
  };

  const palette = (
    <div style={paletteStyle}>
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
          placeholder="Type to search notes..."
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
        maxHeight: '250px'
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
        ) : filteredNotes.length === 0 ? (
          <div style={{ 
            padding: '12px 16px',
            fontSize: '14px',
            color: theme.secondaryText
          }}>
            No notes found
          </div>
        ) : (
          filteredNotes.map((note, index) => (
            <div
              key={note.id}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: index === selectedIndex ? theme.selected : 'transparent',
                color: index === selectedIndex ? theme.selectedText : theme.text,
              }}
              onClick={() => handleNoteSelect(note)}
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
                {note.name}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return createPortal(palette, document.body);
};

export default BacklinkPalette;
