import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Trash2, RefreshCw, AlertCircle } from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
}

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { username } = useAuthStore();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/auth/users');
      setUsers(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userToDelete: string) => {
    try {
      await api.delete(`/auth/users/${userToDelete}`);
      setUsers(users.filter((u) => u.username !== userToDelete));
      setDeleteConfirm(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete user');
    }
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
          <AlertCircle className="text-red-600 flex-shrink-0" size={18} />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
        >
          <RefreshCw size={18} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No users found</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex-1">
                <p className="font-semibold text-gray-800">
                  👤 {user.username}
                  {user.username === username && <span className="text-xs bg-blue-100 text-blue-600 ml-2 px-2 py-1 rounded">(you)</span>}
                </p>
                <p className="text-sm text-gray-600">📧 {user.email}</p>
                <p className="text-sm text-gray-600">🏷️ {user.role}</p>
              </div>

              {user.username !== username && (
                <div className="relative group">
                  <button
                    onClick={() => setDeleteConfirm(deleteConfirm === user.username ? null : user.username)}
                    className="p-2 hover:bg-red-100 rounded-lg transition"
                  >
                    <Trash2 size={18} className="text-red-600" />
                  </button>

                  {deleteConfirm === user.username && (
                    <div className="absolute right-0 top-full mt-2 bg-white shadow-lg rounded-lg p-3 z-50 border border-gray-200 w-48">
                      <p className="text-sm text-gray-800 font-semibold mb-2">Confirm deletion?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="flex-1 bg-gray-200 text-gray-800 py-1 rounded text-sm hover:bg-gray-300 transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.username)}
                          className="flex-1 bg-red-600 text-white py-1 rounded text-sm hover:bg-red-700 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
