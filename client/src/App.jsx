import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { api } from './services/api';

export default function App() {
  const { user, role, quickLogin } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [agents, setAgents] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: '', priority: '', category: '' });
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({ title: '', description: '', category: 'General', priority: 'Medium' });
  const [toast, setToast] = useState(null);

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const activeFilters = {};
      if (filters.search) activeFilters.search = filters.search;
      if (filters.status) activeFilters.status = filters.status;
      if (filters.priority) activeFilters.priority = filters.priority;
      if (filters.category) activeFilters.category = filters.category;

      const ticketRes = await api.getTickets(activeFilters);
      if (ticketRes.success) {
        setTickets(ticketRes.tickets || []);
      }

      if (role === 'admin') {
        const [statsRes, agentsRes] = await Promise.all([
          api.getStats(),
          api.getAgents()
        ]);
        if (statsRes.success) setStats(statsRes.stats);
        if (agentsRes.success) setAgents(agentsRes.agents || []);
      }
    } catch (err) {
      showToast('Error loading data', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, role, filters]);

  const openTicketDetail = async (ticket) => {
    try {
      const res = await api.getTicketById(ticket._id);
      if (res.success) {
        setSelectedTicket(res.ticket);
        const commentRes = await api.getComments(ticket._id);
        if (commentRes.success) {
          setComments(commentRes.comments || []);
        }
      } else {
        showToast(res.message, true);
      }
    } catch (err) {
      showToast('Failed to open ticket', true);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedTicket) return;
    try {
      const res = await api.addComment(selectedTicket._id, newComment.trim());
      if (res.success) {
        setNewComment('');
        const commentRes = await api.getComments(selectedTicket._id);
        if (commentRes.success) setComments(commentRes.comments || []);
        showToast('Comment appended.');
      } else {
        showToast(res.message, true);
      }
    } catch (err) {
      showToast('Failed to post comment', true);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!selectedTicket) return;
    try {
      const res = await api.updateTicketStatus(selectedTicket._id, newStatus);
      if (res.success) {
        setSelectedTicket(res.ticket);
        showToast(`Status updated to ${newStatus}`);
        loadData();
      } else {
        showToast(res.message, true);
      }
    } catch (err) {
      showToast('Status update failed', true);
    }
  };

  const handleAssignAgent = async (agentId) => {
    if (!selectedTicket || !agentId) return;
    try {
      const res = await api.assignTicket(selectedTicket._id, agentId);
      if (res.success) {
        setSelectedTicket(res.ticket);
        showToast(res.message);
        loadData();
      } else {
        showToast(res.message, true);
      }
    } catch (err) {
      showToast('Assignment failed', true);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newTicket.title.trim() || !newTicket.description.trim()) {
      showToast('Title and description are required', true);
      return;
    }
    try {
      const res = await api.createTicket(newTicket);
      if (res.success) {
        setIsCreateOpen(false);
        setNewTicket({ title: '', description: '', category: 'General', priority: 'Medium' });
        showToast('Ticket created successfully (Status Open)');
        loadData();
      } else {
        showToast(res.message, true);
      }
    } catch (err) {
      showToast('Failed to create ticket', true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-xl shadow-md">
              TF
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-extrabold text-slate-900">TicketFlow</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">MERN</span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Role-Based Customer Support Management</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs text-slate-400">Current Session:</div>
              <div className="text-sm font-bold text-slate-700">{user?.name} ({role})</div>
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button onClick={() => quickLogin('customer')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${role === 'customer' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'}`}>Customer</button>
              <button onClick={() => quickLogin('agent')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${role === 'agent' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'}`}>Agent</button>
              <button onClick={() => quickLogin('admin')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${role === 'admin' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'}`}>Admin</button>
            </div>
          </div>
        </div>
      </header>

      {/* Role Action Strip */}
      <div className="bg-indigo-900 text-white shadow-inner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 rounded-md text-xs font-extrabold uppercase bg-indigo-700 text-indigo-100">
              {role === 'customer' ? 'Customer Portal' : role === 'agent' ? 'Support Agent Workspace' : 'Administrator Control Center'}
            </span>
            <span className="text-xs text-indigo-200 hidden md:inline">
              {role === 'customer' && 'Create tickets and follow resolution status.'}
              {role === 'agent' && 'Update status, answer comments and resolve assigned tickets.'}
              {role === 'admin' && 'System overview: assign agents and review analytics.'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {role === 'customer' && (
              <button onClick={() => setIsCreateOpen(true)} className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition shadow-sm">
                + Raise New Ticket
              </button>
            )}
            <button onClick={loadData} className="px-3 py-1.5 rounded-lg bg-indigo-800 hover:bg-indigo-700 text-indigo-100 text-xs font-medium transition">
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        
        {/* Admin Analytics View */}
        {role === 'admin' && stats && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-800">Executive Performance Dashboard</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-xs font-semibold text-slate-500">Total Tickets</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.total}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-sm">
                <div className="text-xs font-semibold text-amber-700">Open Backlog</div>
                <div className="text-2xl font-extrabold text-amber-600 mt-1">{stats.open}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-sm">
                <div className="text-xs font-semibold text-blue-700">In Progress</div>
                <div className="text-2xl font-extrabold text-blue-600 mt-1">{stats.inProgress}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
                <div className="text-xs font-semibold text-emerald-700">Resolved</div>
                <div className="text-2xl font-extrabold text-emerald-600 mt-1">{stats.resolved}</div>
                <div className="text-[11px] text-emerald-600 mt-0.5">{stats.resolutionRatePercent}% rate</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 shadow-sm col-span-2 md:col-span-1">
                <div className="text-xs font-semibold text-indigo-700">Avg Resolution Time</div>
                <div className="text-2xl font-extrabold text-indigo-600 mt-1">{stats.averageResolutionFormatted}</div>
                <div className="text-[11px] text-indigo-400 mt-0.5">T_avg</div>
              </div>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search tickets..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-slate-50"
            >
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-slate-50"
            >
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Tickets Listing */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">Loading queue...</div>
          ) : tickets.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-500 text-xs">No tickets match the current filters.</div>
          ) : (
            tickets.map(t => (
              <div
                key={t._id}
                onClick={() => openTicketDetail(t)}
                className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition cursor-pointer flex flex-col sm:flex-row justify-between gap-3"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${t.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' : t.status === 'In Progress' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                      {t.status}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">{t.category}</span>
                    <span className="text-xs font-bold text-indigo-600">{t.priority}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">{t.title}</h4>
                  <p className="text-xs text-slate-500 line-clamp-1">{t.description}</p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <div>By: <span className="font-medium text-slate-700">{t.createdBy?.name || 'Customer'}</span></div>
                  <div>Agent: <span className="font-semibold text-indigo-600">{t.assignedTo?.name || 'Unassigned'}</span></div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Ticket Detail Drawer/Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl p-6 space-y-4 overflow-y-auto">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <span className="text-xs font-bold text-indigo-600">{selectedTicket.category} • {selectedTicket.priority}</span>
                <h3 className="text-base font-bold text-slate-900">{selectedTicket.title}</h3>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
            </div>

            <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
              {selectedTicket.description}
            </div>

            {/* Admin Agent Assignment */}
            {role === 'admin' && (
              <div className="p-3 bg-indigo-50 rounded-lg flex items-center space-x-2 text-xs">
                <span>Assign Agent:</span>
                <select
                  value={selectedTicket.assignedTo?._id || ''}
                  onChange={(e) => handleAssignAgent(e.target.value)}
                  className="px-2 py-1 border rounded bg-white"
                >
                  <option value="">Unassigned</option>
                  {agents.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
              </div>
            )}

            {/* Agent / Admin Status Transitions */}
            {(role === 'agent' || role === 'admin') && (
              <div className="flex items-center space-x-2 text-xs">
                <span>Set Status:</span>
                <button onClick={() => handleStatusUpdate('Open')} className="px-2 py-1 bg-amber-50 text-amber-800 border rounded">Open</button>
                <button onClick={() => handleStatusUpdate('In Progress')} className="px-2 py-1 bg-blue-50 text-blue-800 border rounded">In Progress</button>
                <button onClick={() => handleStatusUpdate('Resolved')} className="px-2 py-1 bg-emerald-50 text-emerald-800 border rounded font-bold">Resolved</button>
              </div>
            )}

            {/* Comments Thread */}
            <div className="space-y-2 pt-2 border-t">
              <h4 className="text-xs font-bold text-slate-700">Comments ({comments.length})</h4>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {comments.map(c => (
                  <div key={c._id} className="text-xs p-2.5 rounded bg-slate-50 border">
                    <div className="font-bold text-slate-800">{c.userId?.name} ({c.userId?.role})</div>
                    <div className="text-slate-600 mt-1">{c.message}</div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 px-3 py-1.5 border rounded text-xs"
                />
                <button type="submit" className="px-3 py-1.5 bg-slate-900 text-white text-xs rounded font-bold">Reply</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-base font-bold text-slate-900">Create New Ticket</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <form onSubmit={handleCreateTicket} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Title</label>
                <input
                  type="text"
                  required
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Category</label>
                  <select
                    value={newTicket.category}
                    onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                  >
                    <option value="Technical">Technical</option>
                    <option value="Billing">Billing</option>
                    <option value="Account">Account</option>
                    <option value="Hardware">Hardware</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Priority</label>
                  <select
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  rows="4"
                  required
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="px-3 py-2 text-xs text-slate-600">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs bg-indigo-600 text-white rounded-lg font-bold">Submit Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 text-xs px-4 py-2.5 rounded-xl shadow-lg text-white ${toast.isError ? 'bg-red-600' : 'bg-slate-900'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
