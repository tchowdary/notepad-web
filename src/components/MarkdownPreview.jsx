import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Box, Modal } from '@mui/material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
  oneDark,
  oneLight,
  prism
} from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'github-markdown-css';

const MarkdownPreview = ({ content, darkMode, isFullScreen = false, onClose }) => {
  const codeStyle = darkMode ? oneDark : prism;
  
  const PreviewContent = () => (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
        padding: '20px',
        bgcolor: darkMode ? '#1e1e1e' : '#fdfdf7',
      }}
      className={`markdown-body ${darkMode ? 'markdown-dark' : ''}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({node, inline, className, children, ...props}) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            return !inline && language ? (
              <SyntaxHighlighter
                style={codeStyle}
                language={language}
                PreTag="div"
                customStyle={{
                  margin: '1em 0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: darkMode ? '#1e1e1e' : '#f6f8fa',
                }}
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </Box>
  );

  if (!isFullScreen) {
    return <PreviewContent />;
  }

  return (
    <Modal
      open={isFullScreen}
      onClose={onClose}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          width: '100%',
          height: '100vh',
          overflow: 'auto',
          bgcolor: darkMode ? '#1e1e1e' : '#fdfdf7',
          outline: 'none',
          pt: '120px',
          pb: '40px',
        }}
        className={`markdown-body ${darkMode ? 'markdown-dark' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <Box sx={{ 
          maxWidth: '750px', 
          margin: '0 auto',
          px: '20px',
        }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({node, inline, className, children, ...props}) {
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : '';
                return !inline && language ? (
                  <SyntaxHighlighter
                    style={codeStyle}
                    language={language}
                    PreTag="div"
                    customStyle={{
                      margin: '1em 0',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: darkMode ? '#1e1e1e' : '#f6f8fa',
                    }}
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {content}
          </ReactMarkdown>
        </Box>
      </Box>
    </Modal>
  );
};

export default MarkdownPreview;
