import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import BoardsList from './pages/BoardsList';
import BoardView from './pages/BoardView';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-sm text-slate-500">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to="/" /> : <Signup />} />
      <Route path="/" element={<Protected><BoardsList /></Protected>} />
      <Route path="/board/:id" element={<Protected><BoardView /></Protected>} />
    </Routes>
  );
}
