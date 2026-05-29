import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { X, Trash2, Send, Calendar, User, Tag } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';

const PRIORITIES = ['low', 'medium', 'high'];

export default function TaskModal({ task, board, canEdit, onClose }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: task.title,
    description: task.description || '',
    priority: task.priority || 'medium',
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
    assignedTo: task.assignedTo?._id || '',
    completed: task.completed,
    labels: task.labels?.join(', ') || '',
  });
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  // Members eligible for assignment
  const allMembers = [
    { _id: board.owner._id, name: board.owner.name, email: board.owner.email, avatarColor: board.owner.avatarColor },
    ...board.members.map((m) => m.user),
  ];

  // Auto-save on change (debounced via blur for simplicity)
  const save = async (overrides = {}) => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        ...overrides,
        labels: (overrides.labels ?? form.labels)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        dueDate: (overrides.dueDate ?? form.dueDate) || null,
        assignedTo: (overrides.assignedTo ?? form.assignedTo) || null,
      };
      await api.patch(`/tasks/board/${board._id}/${task._id}`, payload);
    } catch (err) {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await api.post(`/tasks/board/${board._id}/${task._id}/comments`, { text: comment });
      setComment('');
    } catch (err) {
      toast.error('Failed to add comment');
    }
  };

  const removeTask = async () => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/board/${board._id}/${task._id}`);
      onClose();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const removeComment = async (commentId) => {
    try {
      await api.delete(`/tasks/board/${board._id}/${task._id}/comments/${commentId}`);
    } catch (err) {
      toast.error('Failed to delete comment');
    }
  };

  // Close on ESC
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-200 flex justify-between items-start gap-3">
          <input
            disabled={!canEdit}
            className="text-lg font-semibold flex-1 bg-transparent border-0 focus:outline-none focus:ring-0"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            onBlur={() => save()}
          />
          <div className="flex items-center gap-2">
            {saving && <span className="text-xs text-slate-400">Saving...</span>}
            {canEdit && (
              <button onClick={removeTask} className="text-red-500 hover:bg-red-50 p-1.5 rounded">
                <Trash2 size={16} />
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Meta row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-slate-500 flex items-center gap-1 mb-1">
                <Tag size={12} /> Priority
              </label>
              <select
                disabled={!canEdit}
                className="input text-xs py-1.5"
                value={form.priority}
                onChange={(e) => {
                  setForm({ ...form, priority: e.target.value });
                  save({ priority: e.target.value });
                }}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-500 flex items-center gap-1 mb-1">
                <Calendar size={12} /> Due
              </label>
              <input
                type="date"
                disabled={!canEdit}
                className="input text-xs py-1.5"
                value={form.dueDate}
                onChange={(e) => {
                  setForm({ ...form, dueDate: e.target.value });
                  save({ dueDate: e.target.value });
                }}
              />
            </div>
            <div>
              <label className="text-slate-500 flex items-center gap-1 mb-1">
                <User size={12} /> Assignee
              </label>
              <select
                disabled={!canEdit}
                className="input text-xs py-1.5"
                value={form.assignedTo}
                onChange={(e) => {
                  setForm({ ...form, assignedTo: e.target.value });
                  save({ assignedTo: e.target.value });
                }}
              >
                <option value="">Unassigned</option>
                {allMembers.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-500 mb-1 block">Status</label>
              <button
                disabled={!canEdit}
                onClick={() => {
                  const next = !form.completed;
                  setForm({ ...form, completed: next });
                  save({ completed: next });
                }}
                className={`w-full text-xs py-1.5 rounded-lg border ${
                  form.completed
                    ? 'bg-green-100 text-green-800 border-green-300'
                    : 'bg-white border-slate-300'
                }`}
              >
                {form.completed ? '✓ Done' : 'In progress'}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 mb-1 block">Labels (comma separated)</label>
            <input
              disabled={!canEdit}
              className="input text-sm"
              value={form.labels}
              onChange={(e) => setForm({ ...form, labels: e.target.value })}
              onBlur={() => save()}
              placeholder="bug, urgent, frontend"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500 mb-1 block">Description</label>
            <textarea
              disabled={!canEdit}
              rows={4}
              className="input text-sm"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              onBlur={() => save()}
              placeholder="Add a description..."
            />
          </div>

          {/* Comments */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Comments ({task.comments?.length || 0})</h4>
            <div className="space-y-2 mb-3 max-h-60 overflow-y-auto">
              {task.comments?.map((c) => (
                <div key={c._id} className="flex gap-2 group">
                  <UserAvatar user={c.user} size={28} />
                  <div className="flex-1 bg-slate-50 rounded-lg p-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{c.user.name}</span>
                        <span className="text-slate-400">
                          {format(new Date(c.createdAt), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      {c.user._id === user?.id && (
                        <button
                          onClick={() => removeComment(c._id)}
                          className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    <p className="text-sm mt-0.5">{c.text}</p>
                  </div>
                </div>
              ))}
              {!task.comments?.length && (
                <p className="text-xs text-slate-400 text-center py-3">No comments yet</p>
              )}
            </div>

            <form onSubmit={addComment} className="flex gap-2">
              <input
                className="input text-sm flex-1"
                placeholder="Write a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <button type="submit" className="btn-primary flex items-center gap-1">
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
