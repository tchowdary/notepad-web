import React, { useEffect, useState } from 'react';
import { Controlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material.css';
import 'codemirror/mode/markdown/markdown';
import { Box } from '@mui/material';
import MarkdownPreview from './MarkdownPreview';

const Editor = ({ content, onChange, wordWrap, darkMode, showPreview }) => {
  const [editorInstance, setEditorInstance] = useState(null);

  useEffect(() => {
    if (editorInstance) {
      editorInstance.setOption('lineWrapping', wordWrap);
      editorInstance.refresh();
    }
  }, [wordWrap, editorInstance]);

  const handleChange = (editor, data, value) => {
    onChange(value);
  };

  const editorComponent = (
    <Box sx={{ 
      height: '100%', 
      width: '100%',
      position: 'relative',
      '& .CodeMirror': { 
        height: '100% !important',
        width: '100% !important',
        fontSize: '16px',
        lineHeight: '1.6'
      }
    }}>
      <CodeMirror
        value={content}
        options={{
          mode: 'markdown',
          theme: darkMode ? 'material' : 'default',
          lineNumbers: true,
          lineWrapping: wordWrap,
          autofocus: true,
          scrollbarStyle: 'native',
          lineHeight: '1.6',
        }}
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
};

export default Editor;
