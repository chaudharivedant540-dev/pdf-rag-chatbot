import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import AdminPanel from '../components/AdminPanel';
import { Upload, Send, LogOut, Settings, Download, X, AlertCircle, CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Source {
  page: number;
  source: string;
  snippet: string;
}

export default function ChatPage() {
  const { username, role, token, logout } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfProcessed, setPdfProcessed] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [showSources, setShowSources] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleProcessPDFs = async () => {
    if (files.length === 0) {
      setError('Please select PDF files');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));

      const response = await api.post('/rag/process', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess('PDFs processed successfully!');
      setPdfProcessed(true);
      setFiles([]);
      setMessages([]);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to process PDFs');
    } finally {
      setProcessing(false);
    }
  };

  const handleLoadSaved = async () => {
    setProcessing(true);
    setError('');

    try {
      await api.post('/rag/load');
      setSuccess('Vectorstore loaded!');
      setPdfProcessed(true);
      setMessages([]);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load vectorstore');
    } finally {
      setProcessing(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/rag/ask', {
        question: input,
        chat_history: messages,
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.answer,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setSources(response.data.sources || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to get response');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== username) {
      setError('Username does not match');
      return;
    }

    setDeleting(true);
    setError('');

    try {
      await api.delete('/auth/me/delete');
      setSuccess('Account deleted successfully');
      setTimeout(() => {
        logout();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">📄 PDF Q&A Chatbot</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">
              👤 <strong>{username}</strong> ({role})
            </span>
            <div className="relative group">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                <Settings size={20} className="text-gray-600" />
              </button>
              <div className="absolute right-0 mt-0 w-48 bg-white shadow-lg rounded-lg hidden group-hover:block z-50">
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 border-b"
                >
                  🗑️ Delete Account
                </button>
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-600 flex items-center gap-2"
                >
                  <LogOut size={18} /> Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sidebar */}
        <div className="md:col-span-1 bg-white rounded-lg shadow-md p-6 h-fit">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📁 Upload PDFs</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <AlertCircle className="text-red-600 flex-shrink-0" size={18} />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex gap-2">
              <CheckCircle className="text-green-600 flex-shrink-0" size={18} />
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select PDF Files
            </label>
            <input
              type="file"
              multiple
              accept=".pdf"
              onChange={handleFileChange}
              className="w-full"
            />
            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                {files.map((file, idx) => (
                  <p key={idx} className="text-sm text-gray-600">
                    📄 {file.name}
                  </p>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleProcessPDFs}
            disabled={processing || files.length === 0}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {processing ? (
              <>🔄 Processing...</>
            ) : (
              <>
                <Upload size={18} /> Process PDFs
              </>
            )}
          </button>

          <div className="my-4 border-t border-gray-200"></div>

          <button
            onClick={handleLoadSaved}
            disabled={processing || pdfProcessed}
            className="w-full bg-gray-200 text-gray-800 py-2 rounded-lg font-semibold hover:bg-gray-300 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Download size={18} /> Load Saved
          </button>

          {role === 'admin' && (
            <>
              <div className="my-4 border-t border-gray-200"></div>
              <button
                onClick={() => setShowAdminPanel(true)}
                className="w-full bg-purple-100 text-purple-700 py-2 rounded-lg font-semibold hover:bg-purple-200 transition flex items-center justify-center gap-2"
              >
                👑 Admin Panel
              </button>
            </>
          )}
        </div>

        {/* Chat Area */}
        <div className="md:col-span-2 bg-white rounded-lg shadow-md p-6 flex flex-col h-96">
          <div className="flex-1 overflow-y-auto mb-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-10">
                <p className="text-lg">👈 Upload PDFs to start chatting</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-gray-200 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    <ReactMarkdown className="text-sm">{msg.content}</ReactMarkdown>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg rounded-bl-none">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {sources.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <button
                onClick={() => setShowSources(!showSources)}
                className="text-blue-600 font-semibold text-sm"
              >
                {showSources ? '▼' : '▶'} 📄 Sources ({sources.length})
              </button>
              {showSources && (
                <div className="mt-2 space-y-2">
                  {sources.map((source, idx) => (
                    <div key={idx} className="text-xs text-gray-700">
                      <p className="font-semibold">Page {source.page}</p>
                      <p className="text-gray-600">...{source.snippet}...</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your PDF..."
              disabled={!pdfProcessed}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={!pdfProcessed || loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>

      {/* Admin Panel Modal */}
      {showAdminPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">👑 Admin Panel</h2>
              <button
                onClick={() => setShowAdminPanel(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                <X size={24} />
              </button>
            </div>
            <AdminPanel />
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-red-600 mb-2">⚠️ Delete Account?</h2>
            <p className="text-gray-600 mb-4">
              This action is <strong>permanent</strong> and cannot be undone.
            </p>

            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                To confirm, type your username: <strong>{username}</strong>
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Type your username to confirm"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:border-red-500"
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirm('');
                  setError('');
                }}
                className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg font-semibold hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== username || deleting}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleting ? '🔄 Deleting...' : '🗑️ Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
