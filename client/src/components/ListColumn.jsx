import { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';
import { Plus, MoreVertical, Trash2, Pencil, X } from 'lucide-react';
import api from '../api/axios';
import TaskCard from './TaskCard';

export default function ListColumn({ list, tasks, boardId, canEdit, onTaskClick, dragHandleProps }) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(list.title);
  const [menuOpen, setMenuOpen] = useState(false);

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await api.post(`/tasks/board/${boardId}`, { listId: list._id, title: newTitle });
      setNewTitle('');
      setAdding(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add task');
    }
  };

  const saveTitle = async () => {
    if (!editTitle.trim() || editTitle === list.title) {
      setEditing(false);
      setEditTitle(list.title);
      return;
    }
    try {
      await api.patch(`/lists/board/${boardId}/${list._id}`, { title: editTitle });
      setEditing(false);
    } catch (err) {
      toast.error('Failed to update title');
    }
  };

  const remove = async () => {
    if (!confirm(`Delete "${list.title}" and all its tasks?`)) return;
    try {
      await api.delete(`/lists/board/${boardId}/${list._id}`);
    } catch (err) {
      toast.error('Failed to delete list');
    }
  };

  return (
    <div className="bg-slate-100 rounded-lg p-2 max-h-[calc(100vh-7rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1" {...dragHandleProps}>
        {editing ? (
          <input
            autoFocus
            className="text-sm font-semibold bg-white border border-accent rounded px-2 py-1 flex-1"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
          />
        ) : (
          <h3
            className="text-sm font-semibold flex-1 cursor-pointer"
            onClick={() => canEdit && setEditing(true)}
          >
            {list.title}{' '}
            <span className="text-slate-400 font-normal">({tasks.length})</span>
          </h3>
        )}
        {canEdit && !editing && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-slate-400 hover:text-slate-700 p-1"
            >
              <MoreVertical size={14} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-6 bg-white border border-slate-200 rounded-lg shadow-md py-1 z-10 w-32">
                <button
                  onClick={() => {
                    setEditing(true);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 flex items-center gap-2"
                >
                  <Pencil size={12} /> Rename
                </button>
                <button
                  onClick={() => {
                    remove();
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tasks */}
      <Droppable droppableId={list._id} type="task">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 overflow-y-auto space-y-2 min-h-[20px] rounded transition ${
              snapshot.isDraggingOver ? 'bg-blue-50' : ''
            }`}
          >
            {tasks.map((task, index) => (
              <Draggable
                key={task._id}
                draggableId={task._id}
                index={index}
                isDragDisabled={!canEdit}
              >
                {(prov, snap) => (
                  <div
                    ref={prov.innerRef}
                    {...prov.draggableProps}
                    {...prov.dragHandleProps}
                    className={snap.isDragging ? 'opacity-90' : ''}
                  >
                    <TaskCard task={task} onClick={() => onTaskClick(task)} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {/* Add task */}
      {canEdit && (
        <div className="mt-2">
          {adding ? (
            <form onSubmit={addTask} className="bg-white rounded-lg p-2">
              <textarea
                autoFocus
                rows={2}
                className="w-full text-sm border-0 focus:outline-none focus:ring-0 resize-none"
                placeholder="Task title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    addTask(e);
                  }
                  if (e.key === 'Escape') {
                    setAdding(false);
                    setNewTitle('');
                  }
                }}
              />
              <div className="flex gap-2 mt-1">
                <button type="submit" className="btn-primary text-xs">
                  Add task
                </button>
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  <X size={14} />
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full p-2 text-left text-xs text-slate-600 hover:bg-white/60 rounded flex items-center gap-1"
            >
              <Plus size={12} /> Add task
            </button>
          )}
        </div>
      )}
    </div>
  );
}
