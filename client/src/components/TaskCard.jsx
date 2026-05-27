import { Calendar, MessageSquare, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import UserAvatar from './UserAvatar';

const PRIORITY_COLORS = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-red-100 text-red-700',
};

export default function TaskCard({ task, onClick }) {
  const overdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md border border-slate-200 cursor-pointer transition"
    >
      {task.labels?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {task.labels.slice(0, 3).map((label) => (
            <span
              key={label}
              className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      <p
        className={`text-sm ${
          task.completed ? 'line-through text-slate-400' : 'text-slate-900'
        }`}
      >
        {task.title}
      </p>

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {task.priority && task.priority !== 'medium' && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${PRIORITY_COLORS[task.priority]}`}>
              {task.priority}
            </span>
          )}
          {task.dueDate && (
            <span
              className={`flex items-center gap-0.5 ${
                overdue ? 'text-red-600 font-medium' : ''
              }`}
            >
              {overdue && <AlertCircle size={10} />}
              <Calendar size={10} />
              {format(new Date(task.dueDate), 'MMM d')}
            </span>
          )}
          {task.comments?.length > 0 && (
            <span className="flex items-center gap-0.5">
              <MessageSquare size={10} />
              {task.comments.length}
            </span>
          )}
        </div>

        {task.assignedTo && <UserAvatar user={task.assignedTo} size={20} />}
      </div>
    </div>
  );
}
