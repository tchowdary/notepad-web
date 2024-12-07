import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Controlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material.css';
import 'codemirror/mode/markdown/markdown';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/xml/xml';
import 'codemirror/mode/css/css';
import 'codemirror/mode/python/python';
import 'codemirror/mode/sql/sql';
import 'codemirror/mode/yaml/yaml';
import 'codemirror/addon/edit/continuelist';
import { Box, IconButton, Tooltip, Menu, MenuItem } from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import MarkdownPreview from './MarkdownPreview';
import ApiKeyInput from './ApiKeyInput';
import { improveText } from '../utils/textImprovement';
import { converters } from '../utils/converters';

const Editor = forwardRef(({ 
  content, 
  onChange, 
  wordWrap = false, 
  darkMode = false,
  showLineNumbers = true,
  showPreview,
  focusMode
}, ref) => {
  const [editorInstance, setEditorInstance] = useState(null);
  const [mode, setMode] = useState('markdown');
  const [improving, setImproving] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedText, setSelectedText] = useState('');
  const [converterAnchor, setConverterAnchor] = useState(null);

  useImperativeHandle(ref, () => ({
    setConverterMenuAnchor: (anchor) => {
      const selection = editorInstance?.getSelection();
      setSelectedText(selection || content);
      setConverterAnchor(anchor);
    },
    getSelectedText: () => {
      return editorInstance?.getSelection() || content;
    }
  }));

  const handleConverterClose = () => {
    setConverterAnchor(null);
  };

  useEffect(() => {
    if (editorInstance) {
      editorInstance.setOption('lineWrapping', wordWrap);
      editorInstance.refresh();
    }
  }, [wordWrap, editorInstance]);

  useEffect(() => {
    // Detect file type based on content
    try {
      JSON.parse(content);
      setMode({ name: 'javascript', json: true });
      // Format JSON if it's valid
      const formattedJson = JSON.stringify(JSON.parse(content), null, 2);
      if (formattedJson !== content) {
        onChange(formattedJson);
      }
    } catch {
      // Check for other file types
      if (content.trim().startsWith('<?xml') || content.includes('</')) {
        setMode('xml');
      } else if (content.includes('{') && content.includes('}') && content.includes(':')) {
        setMode({ name: 'javascript', json: true });
      } else if (content.includes('def ') || content.includes('import ') || content.includes('class ')) {
        setMode('python');
      } else if (content.includes('@media') || content.includes('{') || content.includes(':')) {
        setMode('css');
      } else if (content.includes('SELECT ') || content.includes('FROM ') || content.includes('WHERE ')) {
        setMode('sql');
      } else if (content.includes('---') || content.includes(':') && !content.includes('{')) {
        setMode('yaml');
      } else {
        setMode('markdown');
      }
    }
  }, [content]);

  const handleChange = (editor, data, value) => {
    onChange(value);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    const selection = editorInstance?.getSelection();
    if (selection) {
      setSelectedText(selection);
      setContextMenu({ x: e.clientX, y: e.clientY });
    }
  };

  const handleConvert = async (converter) => {
    try {
      const result = converter.convert(selectedText);
      const newContent = content + '\n\n---\n' + result + '\n---\n';
      onChange(newContent);
    } catch (error) {
      console.error('Conversion failed:', error);
      alert(error.message);
    } finally {
      handleConverterClose();
    }
  };

  const handleImproveText = async () => {
    if (!selectedText) return;

    try {
      setImproving(true);
      setContextMenu(null);
      const improvedText = await improveText(selectedText);

      // Copy to clipboard
      await navigator.clipboard.writeText(improvedText);

      // Insert the improved text below the original text with a divider
      const newContent = content + '\n\n---\n\n' + improvedText;
      onChange(newContent);
    } catch (error) {
      console.error('Text improvement failed:', error);
      alert(error.message);
    } finally {
      setImproving(false);
    }
  };

  const options = {
    mode: mode,
    theme: darkMode ? 'material' : 'default',
    lineNumbers: !focusMode && showLineNumbers,
    lineWrapping: wordWrap,
    indentUnit: 2,
    smartIndent: true,
    gutters: !focusMode ? ["CodeMirror-linenumbers"] : [], 
    extraKeys: {
      'Enter': 'newlineAndIndentContinueMarkdownList',
      'Tab': (cm) => {
        if (cm.somethingSelected()) {
          cm.indentSelection('add');
        } else {
          const pos = cm.getCursor();
          const line = cm.getLine(pos.line);
          const isListItem = /^(\s*)([-*+]|\d+\.)\s/.test(line);
          if (isListItem) {
            cm.execCommand('indentMore');
          } else {
            cm.replaceSelection('  ');
          }
        }
      },
      'Shift-Tab': 'indentLess',
    },
  };

  const editorComponent = (
    <Box 
      sx={{ 
        height: '100%', 
        width: '100%',
        position: 'relative',
        '& .CodeMirror': { 
          height: '100% !important',
          width: '100% !important',
          fontSize: '16px',
          lineHeight: '1.6',
          ...(focusMode && {
            maxWidth: '750px',
            margin: '0 auto',
            fontFamily: '"Rubik", sans-serif',
            padding: '0 20px',
            '& .CodeMirror-lines': {
              paddingTop: '100px',
              paddingBottom: '100px'
            },
            '& .CodeMirror-line': {
              maxWidth: '650px',
              margin: '0 auto',
              padding: '0 !important'
            },
            '& .CodeMirror-cursors': {
              marginLeft: 'calc((100% - 650px) / 2)'
            },
            '& .CodeMirror-cursor': {
              marginLeft: '0'
            }
          })
        },
        '& .cm-s-material': {
          background: darkMode ? '#263238' : '#fff',
          color: darkMode ? '#eeffff' : '#000'
        },
        '& .cm-s-material .CodeMirror-gutters': {
          background: darkMode ? '#263238' : '#fdfdf7',
          border: 'none'
        },
        '& .cm-s-material .CodeMirror-linenumber': {
          color: darkMode ? '#546e7a' : '#999'
        },
        '& .cm-s-material .CodeMirror-line': {
          color: darkMode ? '#eeffff' : 'inherit'
        },
        '& .cm-s-material .cm-string': {
          color: darkMode ? '#C3E88D' : '#183691'
        },
        '& .cm-s-material .cm-property': {
          color: darkMode ? '#82AAFF' : '#0086b3'
        },
        '& .cm-s-material .cm-keyword': {
          color: darkMode ? '#c792ea' : '#a71d5d'
        },
        '& .cm-s-material .cm-variable': {
          color: darkMode ? '#eeffff' : '#000'
        },
        '& .cm-s-material .cm-url': {
          color: darkMode ? '#89DDFF' : '#0086b3'
        },
        '& .cm-s-material .cm-link': {
          color: darkMode ? '#89DDFF' : '#0086b3'
        },
        '& .cm-s-material .cm-comment': {
          color: darkMode ? '#546e7a' : '#969896'
        },
        '& .cm-s-material .cm-header': {
          color: darkMode ? '#eeffff' : '#000'
        }
      }}
      onContextMenu={handleContextMenu}
    >
      <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
        <ApiKeyInput />
      </Box>

      <Menu
        anchorEl={converterAnchor}
        open={Boolean(converterAnchor)}
        onClose={handleConverterClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        MenuListProps={{
          'aria-labelledby': 'convert-button',
        }}
      >
        {Object.entries(converters).map(([key, converter]) => (
          <MenuItem 
            key={key} 
            onClick={() => handleConvert(converter)}
          >
            {converter.name}
          </MenuItem>
        ))}
      </Menu>
      <Menu
        open={Boolean(contextMenu)}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu
            ? { top: contextMenu.y, left: contextMenu.x }
            : undefined
        }
      >
        <MenuItem
          onClick={handleImproveText}
          disabled={improving}
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            color: darkMode ? '#fff' : '#000'
          }}
        >
          <AutoFixHighIcon fontSize="small" />
          Improve Text
        </MenuItem>
      </Menu>
      <CodeMirror
        value={content}
        options={options}
        onBeforeChange={handleChange}
        editorDidMount={editor => {
          setEditorInstance(editor);
          setTimeout(() => editor.refresh(), 0);
        }}
      />
    </Box>
  );

  if (!showPreview) {
    return editorComponent;
  }

  return (
    <div className="split-view">
      <div>{editorComponent}</div>
      <div>
        <MarkdownPreview content={content} darkMode={darkMode} />
      </div>
    </div>
  );
});

export default Editor;
