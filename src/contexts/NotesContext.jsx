import { createContext, useContext, useEffect, useState, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const NOTES_URL = `${API_URL}/notes`;

export const NotesContext = createContext(null);

export function NotesProvider({ children }) {
  const [allNotes, setAllNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all notes from JSON Server
  const fetchNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(NOTES_URL);
      setAllNotes(response.data);
      return response.data;
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Failed to fetch notes";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  // Create a new note
  const createNote = async (note) => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const content = note.content || note.dis || "";
      const payload = {
        title: note.title || "",
        content: content,
        dis: note.dis || content,
        color: note.color || "yellow",
        tags: note.tags || [],
        archived: note.archived ?? false,
        stock: note.stock ?? 1,
        createdAt: note.createdAt || now,
        updatedAt: now,
      };

      const response = await axios.post(NOTES_URL, payload);
      const created = response.data;
      setAllNotes((prev) => [...prev, created]);
      toast.success("Note created successfully!");
      return created;
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Failed to create note";
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update an existing note
  const updateNote = async (id, updates) => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const payload = {
        ...updates,
        updatedAt: now,
      };

      if (payload.content !== undefined && payload.dis === undefined) {
        payload.dis = payload.content;
      } else if (payload.dis !== undefined && payload.content === undefined) {
        payload.content = payload.dis;
      }

      const response = await axios.patch(`${NOTES_URL}/${id}`, payload);
      const updated = response.data;
      setAllNotes((prev) =>
        prev.map((n) => (String(n.id) === String(id) ? { ...n, ...updated } : n))
      );
      toast.success("Note updated successfully!");
      return updated;
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Failed to update note";
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete a note
  const deleteNote = async (id) => {
    setLoading(true);
    setError(null);
    try {
      await axios.delete(`${NOTES_URL}/${id}`);
      setAllNotes((prev) => prev.filter((n) => String(n.id) !== String(id)));
      toast.success("Note deleted successfully!");
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Failed to delete note";
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Toggle archive status
  const toggleArchive = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const noteToToggle = allNotes.find((n) => String(n.id) === String(id));
      const nextArchived = noteToToggle ? !noteToToggle.archived : true;
      const now = new Date().toISOString();

      const response = await axios.patch(`${NOTES_URL}/${id}`, {
        archived: nextArchived,
        updatedAt: now,
      });
      const updated = response.data;
      setAllNotes((prev) =>
        prev.map((n) => (String(n.id) === String(id) ? { ...n, ...updated } : n))
      );

      if (nextArchived) {
        toast.success("Note archived!");
      } else {
        toast.success("Note unarchived!");
      }
      return updated;
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Failed to update archive status";
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Search notes without losing original data
  const searchNotes = (query = "") => {
    setSearchQuery(query);
    const q = (query || "").trim().toLowerCase();
    if (!q) return allNotes;
    return allNotes.filter((note) => {
      const matchTitle = (note.title || "").toLowerCase().includes(q);
      const matchContent = ((note.content || note.dis) || "")
        .toLowerCase()
        .includes(q);
      const matchTags =
        Array.isArray(note.tags) &&
        note.tags.some((tag) => String(tag).toLowerCase().includes(q));
      return matchTitle || matchContent || matchTags;
    });
  };

  // Derived filtered notes based on searchQuery
  const notes = useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    if (!q) return allNotes;
    return allNotes.filter((note) => {
      const matchTitle = (note.title || "").toLowerCase().includes(q);
      const matchContent = ((note.content || note.dis) || "")
        .toLowerCase()
        .includes(q);
      const matchTags =
        Array.isArray(note.tags) &&
        note.tags.some((tag) => String(tag).toLowerCase().includes(q));
      return matchTitle || matchContent || matchTags;
    });
  }, [allNotes, searchQuery]);

  const value = {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    toggleArchive,
    searchNotes,
    fetchNotes,
    searchQuery,
  };

  return (
    <NotesContext.Provider value={value}>
      {children}
    </NotesContext.Provider>
  );
}

export const useNotes = () => {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error("useNotes must be used within a NotesProvider");
  }
  return context;
};

export default NotesContext;
