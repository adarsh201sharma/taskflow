import { useState } from 'react';
import toast from 'react-hot-toast';
import { X, UserPlus, Crown, Trash2 } from 'lucide-react';
import api from '../api/axios';
import UserAvatar from './UserAvatar';

export default function MembersPanel({ board, isOwner, onClose, onUpdate }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [inviting, setInviting] = useState(false);

  const invite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    try {
      await api.post(`/boards/${board._id}/members`, { email, role });
      toast.success(`Invited ${email}!`);
      setEmail('');
      onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invite failed');
    } finally {
      setInviting(false);
    }
  };

  const removeMember = async (userId) => {
    if (!confirm('Remove this member?')) return;
    try {
      await api.delete(`/boards/${board._id}/members/${userId}`);
      toast.success('Member removed');
      onUpdate();
    } catch (err) {
      toast.error('Remove failed');
    }
  };

  const changeRole = async (userId, newRole) => {
    try {
      await api.patch(`/boards/${board._id}/members/${userId}`, { role: newRole });
      onUpdate();
    } catch (err) {
      toast.error('Role update failed');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-md w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-semibold">Board members</h2>
          <button onClick={onClose} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded">
            <X size={18} />
          </button>
        </div>

        {isOwner && (
          <div className="p-5 border-b border-slate-200">
            <h3 className="text-sm font-medium mb-2">Invite a collaborator</h3>
            <form onSubmit={invite} className="space-y-2">
              <input
                type="email"
                className="input"
                placeholder="teammate@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <div className="flex gap-2">
                <select
                  className="input flex-1"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button type="submit" className="btn-primary flex items-center gap-1" disabled={inviting}>
                  <UserPlus size={14} /> {inviting ? 'Inviting...' : 'Invite'}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                The user must already have a TaskFlow account.
              </p>
            </form>
          </div>
        )}

        <div className="p-5">
          <h3 className="text-sm font-medium mb-3">
            Members ({board.members.length + 1})
          </h3>
          <div className="space-y-2">
            {/* Owner */}
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
              <UserAvatar user={board.owner} size={36} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm flex items-center gap-1">
                  {board.owner.name}
                  <Crown size={12} className="text-amber-500" />
                </div>
                <div className="text-xs text-slate-500 truncate">{board.owner.email}</div>
              </div>
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                Owner
              </span>
            </div>

            {/* Other members */}
            {board.members.map((m) => (
              <div
                key={m.user._id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50"
              >
                <UserAvatar user={m.user} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{m.user.name}</div>
                  <div className="text-xs text-slate-500 truncate">{m.user.email}</div>
                </div>
                {isOwner ? (
                  <>
                    <select
                      className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                      value={m.role}
                      onChange={(e) => changeRole(m.user._id, e.target.value)}
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      onClick={() => removeMember(m.user._id)}
                      className="text-red-500 hover:bg-red-50 p-1.5 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                ) : (
                  <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded capitalize">
                    {m.role}
                  </span>
                )}
              </div>
            ))}

            {board.members.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-3">
                No members yet. Invite someone to collaborate!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
