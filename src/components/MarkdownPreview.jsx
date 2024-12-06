import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Box } from '@mui/material';
import 'github-markdown-css';

const MarkdownPreview = ({ content, darkMode }) => {
  return (
    <Box
      sx={{
        height: '100%',
        overflow: 'auto',
        padding: '20px',
        bgcolor: darkMode ? '#1e1e1e' : '#ffffff',
      }}
      className={`markdown-body ${darkMode ? 'markdown-dark' : ''}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </Box>
  );
};

export default MarkdownPreview;
