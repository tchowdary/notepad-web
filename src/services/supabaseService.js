import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase Config:', {
  url: supabaseUrl,
  keyLength: supabaseKey?.length
});

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key is missing:', { supabaseUrl, supabaseKey });
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Generate a unique ID using timestamp and random number
export const generateUniqueId = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return `${timestamp}-${random}`;
};

// Notes table operations
export const syncNotes = async (notes) => {
  try {
    if (!Array.isArray(notes)) {
      console.warn('Notes is not an array:', notes);
      return;
    }

    console.log('Syncing notes to Supabase:', notes);
    
    const sanitizedNotes = notes.map(note => ({
      id: note.id.toString(),
      name: note.name || '',
      content: note.content || '',
      type: note.type || 'markdown',
      editor_type: note.editorType || 'tiptap',
      is_archived: false
    }));

    const { data, error } = await supabase
      .from('notes')
      .upsert(sanitizedNotes, { 
        onConflict: 'id',
        ignoreDuplicates: true 
      });

    if (error) {
      console.error('Supabase sync error:', error);
      throw error;
    }

    console.log('Notes synced successfully:', data);
    return data;
  } catch (error) {
    console.error('Error syncing notes:', error);
    // Don't throw the error, just log it
    return null;
  }
};

export const fetchNotes = async () => {
  try {
    console.log('Fetching notes from Supabase');
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('is_archived', false)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Supabase fetch error:', error);
      throw error;
    }

    const transformedData = data.map(note => ({
      id: note.id,
      name: note.name || '',
      content: note.content || '',
      type: note.type || 'markdown',
      editorType: note.editor_type || 'tiptap',
      created_at: note.created_at,
      updated_at: note.updated_at
    }));

    console.log('Notes fetched successfully:', transformedData);
    return transformedData;
  } catch (error) {
    console.error('Error fetching notes:', error);
    return [];  
  }
};

// Mark a note as archived instead of deleting
export const archiveNote = async (noteId) => {
  try {
    const { data, error } = await supabase
      .from('notes')
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq('id', noteId);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error archiving note:', error);
    throw error;
  }
};

// Todo table operations
export const syncTodos = async (todos) => {
  try {
    console.log('Syncing todos to Supabase:', todos);
    const { data, error } = await supabase
      .from('todos')
      .upsert({
        id: 'todoData',
        data: todos,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase todo sync error:', error);
      throw error;
    }
    console.log('Todos synced successfully:', data);
    return data;
  } catch (error) {
    console.error('Error syncing todos:', error);
    throw error;
  }
};

export const fetchTodos = async () => {
  try {
    console.log('Fetching todos from Supabase');
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('id', 'todoData')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase todo fetch error:', error);
      throw error;
    }
    console.log('Todos fetched successfully:', data);
    return data?.data || { inbox: [], archive: [], projects: {} };
  } catch (error) {
    console.error('Error fetching todos:', error);
    throw error;
  }
};
