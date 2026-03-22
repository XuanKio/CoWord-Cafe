// Simple API client for CoWorking Cafe
const API_BASE_URL = '/api';

// Auth API
const authApi = {
  async login(username, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return response.json();
  },

  async register(data) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }
};

// User API
const userApi = {
  async getAll() {
    const response = await fetch(`${API_BASE_URL}/users`);
    return response.json();
  },

  async getById(id) {
    const response = await fetch(`${API_BASE_URL}/users/${id}`);
    return response.json();
  }
};

// Table API
const tableApi = {
  async getAll() {
    const response = await fetch(`${API_BASE_URL}/tables`);
    return response.json();
  },

  async getById(id) {
    const response = await fetch(`${API_BASE_URL}/tables/${id}`);
    return response.json();
  }
};

// Booking API
const bookingApi = {
  async getAll() {
    const response = await fetch(`${API_BASE_URL}/bookings`);
    return response.json();
  },

  async create(data) {
    const response = await fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  async update(id, data) {
    const response = await fetch(`${API_BASE_URL}/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  async delete(id) {
    const response = await fetch(`${API_BASE_URL}/bookings/${id}`, {
      method: 'DELETE'
    });
    return response.ok;
  }
};

export { authApi, userApi, tableApi, bookingApi };
