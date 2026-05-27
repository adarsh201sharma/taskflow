import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Users, Trash2 } from 'lucide-react';
import api from '../api/axios';
import { getSocket } from '../api/socket';
import { useAuth } from '../context/AuthContext';
import ListColumn from '../components/ListColumn';
import MembersPanel from '../components/MembersPanel';
import TaskModal from '../components/TaskModal';
import UserAvatar from '../components/UserAvatar';

export default function BoardView() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();

  const [board, setBoard] = useState(null);
  const [lists, setLists] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMembers, setShowMembers] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [newListTitle, setNewListTitle] = useState('');
  const [showNewList, setShowNewList] = useState(false);

  const isOwner = board?.owner._id === user?.id;
  const canEdit =
    isOwner ||
    board?.members.some((m) => m.user._id === user?.id && m.role === 'editor');

  // Load board data
  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/boards/${id}`);
      setBoard(data.board);
      setLists(data.lists);
      setTasks(data.tasks);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load board');
      nav('/');
    } finally {
      setLoading(false);
    }
  }, [id, nav]);

  useEffect(() => {
    load();
  }, [load]);

  // Setup socket listeners
  useEffect(() => {
    if (!board) return;
    const socket = getSocket();
    socket.emit('board:join', board._id);

    const handlers = {
      'board:online-users': setOnlineUsers,
      'user:joined': (data) => {
        toast(`${data.user.name} joined`, { icon: '👋' });
        setOnlineUsers((prev) =>
          prev.find((u) => u.id === data.user._id) ? prev : [...prev, data.user]
        );
      },
      'user:left': (data) => {
        setOnlineUsers((prev) => prev.filter((u) => u.id !== data.userId));
      },
      'board:updated': setBoard,
      'board:member-added': () => load(),
      'board:member-removed': () => load(),
      'board:member-updated': () => load(),
      'list:created': (list) => setLists((prev) => [...prev, list]),
      'list:updated': (list) =>
        setLists((prev) => prev.map((l) => (l._id === list._id ? list : l))),
      'list:deleted': ({ listId }) => {
        setLists((prev) => prev.filter((l) => l._id !== listId));
        setTasks((prev) => prev.filter((t) => t.list !== listId));
      },
      'list:reordered': ({ ordered }) => {
        setLists((prev) =>
          [...prev]
            .map((l) => {
              const o = ordered.find((x) => x.id === l._id);
              return o ? { ...l, position: o.position } : l;
            })
            .sort((a, b) => a.position - b.position)
        );
      },
      'task:created': (task) => setTasks((prev) => [...prev, task]),
      'task:updated': (task) =>
        setTasks((prev) => prev.map((t) => (t._id === task._id ? task : t))),
      'task:moved': (task) =>
        setTasks((prev) => prev.map((t) => (t._id === task._id ? task : t))),
      'task:deleted': ({ taskId }) =>
        setTasks((prev) => prev.filter((t) => t._id !== taskId)),
      'task:comment-added': (task) =>
        setTasks((prev) => prev.map((t) => (t._id === task._id ? task : t))),
      'task:comment-removed': (task) =>
        setTasks((prev) => prev.map((t) => (t._id === task._id ? task : t))),
    };

    Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));

    return () => {
      socket.emit('board:leave', board._id);
      Object.keys(handlers).forEach((event) => socket.off(event));
    };
  }, [board?._id, load]);

  // Drag-drop handler
  const onDragEnd = async (result) => {
    if (!canEdit) {
      toast.error('You only have viewer access');
      return;
    }
    const { source, destination, draggableId, type } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index)
      return;

    if (type === 'list') {
      const newLists = [...lists];
      const [moved] = newLists.splice(source.index, 1);
      newLists.splice(destination.index, 0, moved);
      const ordered = newLists.map((l, i) => ({ id: l._id, position: i }));
      setLists(newLists.map((l, i) => ({ ...l, position: i })));
      try {
        await api.patch(`/lists/board/${board._id}/reorder`, { ordered });
      } catch (err) {
        toast.error('Reorder failed');
        load();
      }
      return;
    }

    // Task move
    try {
      const newTasks = [...tasks];
      const taskIdx = newTasks.findIndex((t) => t._id === draggableId);
      newTasks[taskIdx] = {
        ...newTasks[taskIdx],
        list: destination.droppableId,
        position: destination.index,
      };
      setTasks(newTasks);
      await api.patch(`/tasks/board/${board._id}/${draggableId}/move`, {
        targetListId: destination.droppableId,
        position: destination.index,
      });
    } catch (err) {
      toast.error('Move failed');
      load();
    }
  };

  const addList = async (e) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;
    try {
      await api.post(`/lists/board/${board._id}`, { title: newListTitle });
      setNewListTitle('');
      setShowNewList(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add list');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  if (!board) return null;

  const sortedLists = [...lists].sort((a, b) => a.position - b.position);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: `${board.color}15` }}>
      {/* Top bar */}
      <header
        className="bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center"
        style={{ borderTop: `4px solid ${board.color}` }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/" className="text-slate-500 hover:text-slate-900">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="font-semibold truncate">{board.title}</h1>
          {!canEdit && (
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
              Viewer
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Online users (collaborators online right now) */}
          <div className="flex -space-x-2">
            {onlineUsers.slice(0, 5).map((u) => (
              <UserAvatar
                key={u.id}
                user={u}
                size={28}
                title={`${u.name} (online)`}
                ring
              />
            ))}
            {onlineUsers.length > 5 && (
              <div className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs">
                +{onlineUsers.length - 5}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowMembers(true)}
            className="text-sm text-slate-700 hover:text-navy flex items-center gap-1 border border-slate-300 px-3 py-1.5 rounded-lg"
          >
            <Users size={14} /> Members
          </button>
        </div>
      </header>

      {/* Board content */}
      <main className="flex-1 overflow-x-auto p-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="board" type="list" direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex gap-3 items-start"
              >
                {sortedLists.map((list, index) => (
                  <Draggable
                    key={list._id}
                    draggableId={list._id}
                    index={index}
                    isDragDisabled={!canEdit}
                  >
                    {(prov) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        className="w-72 flex-shrink-0"
                      >
                        <ListColumn
                          list={list}
                          tasks={tasks
                            .filter((t) => t.list === list._id)
                            .sort((a, b) => a.position - b.position)}
                          boardId={board._id}
                          canEdit={canEdit}
                          onTaskClick={setActiveTask}
                          dragHandleProps={prov.dragHandleProps}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}

                {/* Add list */}
                {canEdit && (
                  <div className="w-72 flex-shrink-0">
                    {showNewList ? (
                      <form onSubmit={addList} className="bg-white/80 p-2 rounded-lg">
                        <input
                          autoFocus
                          className="input mb-2"
                          placeholder="List title"
                          value={newListTitle}
                          onChange={(e) => setNewListTitle(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button type="submit" className="btn-primary text-xs">
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowNewList(false)}
                            className="btn-secondary text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        onClick={() => setShowNewList(true)}
                        className="w-full p-2 text-left text-sm text-slate-700 bg-white/60 hover:bg-white rounded-lg flex items-center gap-2"
                      >
                        <Plus size={14} /> Add a list
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </main>

      {showMembers && (
        <MembersPanel
          board={board}
          isOwner={isOwner}
          onClose={() => setShowMembers(false)}
          onUpdate={load}
        />
      )}

      {activeTask && (
        <TaskModal
          task={tasks.find((t) => t._id === activeTask._id) || activeTask}
          board={board}
          canEdit={canEdit}
          onClose={() => setActiveTask(null)}
        />
      )}
    </div>
  );
}
