const getBaseUrl = () => {
  return window.location.origin.includes(':5173') ? 'http://localhost:5000' : '';
};

const getHeaders = () => {
  const token = localStorage.getItem('ticketflow_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const api = {
  async getTickets(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${getBaseUrl()}/api/tickets${query ? `?${query}` : ''}`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async getTicketById(id) {
    const res = await fetch(`${getBaseUrl()}/api/tickets/${id}`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async createTicket(ticketData) {
    const res = await fetch(`${getBaseUrl()}/api/tickets`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(ticketData)
    });
    return res.json();
  },

  async assignTicket(ticketId, agentId) {
    const res = await fetch(`${getBaseUrl()}/api/tickets/${ticketId}/assign`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ agentId })
    });
    return res.json();
  },

  async updateTicketStatus(ticketId, status) {
    const res = await fetch(`${getBaseUrl()}/api/tickets/${ticketId}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  async getComments(ticketId) {
    const res = await fetch(`${getBaseUrl()}/api/tickets/${ticketId}/comments`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async addComment(ticketId, message) {
    const res = await fetch(`${getBaseUrl()}/api/tickets/${ticketId}/comments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ message })
    });
    return res.json();
  },

  async getStats() {
    const res = await fetch(`${getBaseUrl()}/api/tickets/stats`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async getAgents() {
    const res = await fetch(`${getBaseUrl()}/api/auth/agents`, {
      headers: getHeaders()
    });
    return res.json();
  }
};
