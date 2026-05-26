import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, LogOut, CheckSquare, Users } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function BoardsList() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [boards, setBoards] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', color: COLORS[0] });

  const load = () =>
    api.get('/boards').then((r) => setBoards(r.data)).catch((err) =>
      toast.error(err.response?.data?.error || 'Failed to load boards')
    );

  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      const { data } = await api.post('/boards', form);
      toast.success('Board created!');
      setForm({ title: '', color: COLORS[0] });
      setCreating(false);
      nav(`/board/${data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Create failed');
    }
  };

  return (
    <div className="min-h-screen">
      <nav className="bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <CheckSquare className="text-navy" size={22} />
          <span className="font-semibold text-navy">TaskFlow</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600 hidden sm:block">{user?.name}</span>
          <button
            onClick={() => {
              logout();
              nav('/login');
            }}
            className="text-sm text-slate-600 hover:text-red-600 flex items-center gap-1"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Your Boards</h1>
          <button
            onClick={() => setCreating(!creating)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> New Board
          </button>
        </div>

        {creating && (
          <form onSubmit={create} className="card mb-6">
            <h3 className="font-semibold mb-3">Create a new board</h3>
            <input
              type="text"
              className="input mb-3"
              placeholder="Board title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              autoFocus
            />
            <div className="flex gap-2 mb-3">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-8 h-8 rounded-lg ${form.color === c ? 'ring-2 ring-offset-2 ring-navy' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setForm({ ...form, color: c })}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">Create</button>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {boards.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-500 mb-3">No boards yet.</p>
            <button onClick={() => setCreating(true)} className="btn-primary">
              Create your first board
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board) => (
              <Link
                key={board._id}
                to={`/board/${board._id}`}
                className="card hover:shadow-md transition group"
              >
                <div
                  className="w-full h-3 rounded mb-3"
                  style={{ backgroundColor: board.color }}
                />
                <h3 className="font-semibold mb-1 group-hover:text-accent transition">
                  {board.title}
                </h3>
                {board.description && (
                  <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                    {board.description}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Users size={12} />
                    <span>{board.members.length + 1} member{board.members.length !== 0 ? 's' : ''}</span>
                  </div>
                  <span>
                    {board.owner._id === user?.id ? 'Owner' : 'Member'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
