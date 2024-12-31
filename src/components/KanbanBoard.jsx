import React, { useState, useEffect } from 'react';
import { Box, Typography, IconButton, Paper } from '@mui/material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { saveKanbanBoard, loadKanbanBoard } from '../utils/db';

const KanbanBoard = ({ id, content, onSave }) => {

  const [lists, setLists] = useState(() => {
    try {
      if (!content) return [];
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Error parsing kanban content:', e);
      return [];
    }
  });

  useEffect(() => {
    try {
      if (!content) {
        setLists([]);
        return;
      }
      const parsed = JSON.parse(content);
      setLists(Array.isArray(parsed) ? parsed : []);
    } catch (e) {
      console.error('Error parsing kanban content:', e);
      setLists([]);
    }
  }, [content]);

  const [editingList, setEditingList] = useState(null);
  const [editingCard, setEditingCard] = useState(null);

  const saveBoard = async (newLists) => {
    try {
      const content = JSON.stringify(newLists, null, 2);
      await saveKanbanBoard(id, content);
      if (onSave) onSave(content);
    } catch (error) {
      console.error('Error saving board:', error);
    }
  };

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    const sourceList = lists.find(list => list.id === source.droppableId);
    const destList = lists.find(list => list.id === destination.droppableId);
    
    const [movedCard] = sourceList.cards.splice(source.index, 1);
    destList.cards.splice(destination.index, 0, movedCard);
    
    const newLists = [...lists];
    setLists(newLists);
    saveBoard(newLists);
  };

  const addList = () => {
    const newList = {
      id: Date.now().toString(),
      title: 'New List',
      cards: []
    };
    const newLists = [...lists, newList];
    setLists(newLists);
    setEditingList(newList.id);
    saveBoard(newLists);
  };

  const addCard = (listId) => {
    const newLists = [...lists];
    const list = newLists.find(l => l.id === listId);
    const newCard = {
      id: Date.now().toString(),
      content: ''
    };
    list.cards.push(newCard);
    setLists(newLists);
    setEditingCard({ listId, cardId: newCard.id });
    saveBoard(newLists);
  };

  const updateListTitle = (listId, newTitle) => {
    const newLists = [...lists];
    const list = newLists.find(l => l.id === listId);
    if (list) {
      list.title = newTitle || list.title;
      setLists(newLists);
      saveBoard(newLists);
    }
    setEditingList(null);
  };

  const updateCardContent = (listId, cardId, newContent) => {
    const newLists = [...lists];
    const list = newLists.find(l => l.id === listId);
    if (list) {
      const card = list.cards.find(c => c.id === cardId);
      if (card) {
        card.content = newContent || card.content;
        setLists(newLists);
        saveBoard(newLists);
      }
    }
    setEditingCard(null);
  };

  const deleteList = (listId) => {
    const newLists = lists.filter(l => l.id !== listId);
    setLists(newLists);
    saveBoard(newLists);
  };

  const deleteCard = (listId, cardId) => {
    const newLists = [...lists];
    const list = newLists.find(l => l.id === listId);
    if (list) {
      list.cards = list.cards.filter(c => c.id !== cardId);
      setLists(newLists);
      saveBoard(newLists);
    }
  };

  return (
    <Box sx={{ p: 2, height: '100%', bgcolor: 'background.default' }}>
      <DragDropContext onDragEnd={onDragEnd}>
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', height: '100%' }}>
          {lists.map(list => (
            <Paper 
              key={list.id} 
              sx={{ 
                width: 280,
                height: 'fit-content',
                maxHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'background.paper'
              }}
            >
              <Box sx={{ p: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {editingList === list.id ? (
                  <input
                    autoFocus
                    defaultValue={list.title}
                    onBlur={(e) => updateListTitle(list.id, e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        updateListTitle(list.id, e.target.value);
                      }
                    }}
                  />
                ) : (
                  <Typography variant="h6">{list.title}</Typography>
                )}
                <Box>
                  <IconButton size="small" onClick={() => setEditingList(list.id)}>
                    <EditIcon fontSize="medium" />
                  </IconButton>
                  <IconButton size="small" onClick={() => deleteList(list.id)}>
                    <DeleteIcon fontSize="medium" />
                  </IconButton>
                </Box>
              </Box>
              
              <Droppable droppableId={list.id}>
                {(provided) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{ 
                      flex: 1,
                      minHeight: 100,
                      p: 1,
                      overflowY: 'auto'
                    }}
                  >
                    {list.cards.map((card, index) => (
                      <Draggable key={card.id} draggableId={card.id} index={index}>
                        {(provided) => (
                          <Paper
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            sx={{ 
                              p: 1,
                              mb: 1,
                              bgcolor: 'background.default'
                            }}
                          >
                            {editingCard?.listId === list.id && editingCard?.cardId === card.id ? (
                              <textarea
                                autoFocus
                                defaultValue={card.content}
                                onBlur={(e) => updateCardContent(list.id, card.id, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    updateCardContent(list.id, card.id, e.target.value);
                                  }
                                }}
                                style={{ 
                                  width: '100%',
                                  minHeight: '80px',
                                  padding: '8px',
                                  border: '1px solid rgba(0, 0, 0, 0.1)',
                                  borderRadius: '4px',
                                  resize: 'vertical'
                                }}
                              />
                            ) : (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                                <Typography sx={{ 
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  flex: 1,
                                  mr: 1
                                }}>
                                  {card.content}
                                </Typography>
                                <Box>
                                  <IconButton 
                                    size="small" 
                                    onClick={() => setEditingCard({ listId: list.id, cardId: card.id })}
                                  >
                                    <EditIcon fontSize="medium" />
                                  </IconButton>
                                  <IconButton 
                                    size="small" 
                                    onClick={() => deleteCard(list.id, card.id)}
                                  >
                                    <DeleteIcon fontSize="medium" />
                                  </IconButton>
                                </Box>
                              </Box>
                            )}
                          </Paper>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
              
              <Box sx={{ p: 1 }}>
                <IconButton size="small" onClick={() => addCard(list.id)}>
                  <AddIcon />
                </IconButton>
              </Box>
            </Paper>
          ))}
          
          <IconButton 
            onClick={addList}
            sx={{ 
              height: 'fit-content',
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'action.hover' }
            }}
          >
            <AddIcon />
          </IconButton>
        </Box>
      </DragDropContext>
    </Box>
  );
};

export default KanbanBoard;
