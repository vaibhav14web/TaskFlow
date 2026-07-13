import axios from 'axios';

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({ baseURL: `${API_BASE_URL}/api/v1` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, { refresh_token: refreshToken });
          const { access_token, refresh_token } = res.data.data;
          localStorage.setItem('token', access_token);
          localStorage.setItem('refreshToken', refresh_token);
          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
          originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/auth';
          return Promise.reject(refreshError);
        }
      }
    }
    return Promise.reject(error);
  }
);

export type User       = { id: string; name: string; email: string; avatarUrl?: string; twoFactorEnabled?: boolean };
export type Workspace  = { id: string; name: string; ownerId: string; description?: string; allowedDomains?: string };
export type Project    = { id: string; name: string; workspaceId: string; description?: string };
export type Column     = { id: string; name: string; order: number; boardId: string };
export type Task       = { id: string; title: string; description?: string; priority: 'LOW'|'MEDIUM'|'HIGH'|'URGENT'; dueDate?: string; order: number; columnId: string; assignees?: User[]; createdAt: string };
export type Attachment = { id: string; filename: string; url: string; taskId: string };

// Auth
export const authApi = {
  register: (d: { name: string; email: string; password: string }) => api.post('/auth/register', d).then(r => r.data),
  login:    (d: { email: string; password: string })              => api.post('/auth/login', d).then(r => r.data),
  me:       ()                                                     => api.get('/auth/me').then(r => r.data),
  logout:   ()                                                     => api.post('/auth/logout').then(r => r.data),
};

// Workspaces
export const workspaceApi = {
  list:         ()              => api.get('/workspaces').then(r => r.data),
  create:       (name: string)  => api.post('/workspaces', { name }).then(r => r.data),
  get:          (id: string)    => api.get(`/workspaces/${id}`).then(r => r.data),
  members:      (id: string)    => api.get(`/workspaces/${id}/members`).then(r => r.data),
  update:       (id: string, data: { name?: string; description?: string; allowedDomains?: string }) =>
    api.patch(`/workspaces/${id}`, data).then(r => r.data),
  listInvites:  (id: string)    => api.get(`/workspaces/${id}/invites`).then(r => r.data),
  revokeInvite: (id: string, inviteId: string) => api.delete(`/workspaces/${id}/invites/${inviteId}`).then(r => r.data),
};

// Projects
export const projectApi = {
  list:   (wsId: string)                                            => api.get(`/workspaces/${wsId}/projects`).then(r => r.data),
  create: (wsId: string, name: string, description?: string)        => api.post(`/workspaces/${wsId}/projects`, { name, description }).then(r => r.data),
  get:    (id: string)                                              => api.get(`/projects/${id}`).then(r => r.data),
};

// Board
export const boardApi = {
  get:          (projectId: string)                                    => api.get(`/projects/${projectId}/board`).then(r => r.data),
  createColumn: (projectId: string, name: string, order: number)       => api.post(`/projects/${projectId}/columns`, { name, order }).then(r => r.data),
  updateColumn: (columnId: string, data: Partial<Column>)              => api.patch(`/columns/${columnId}`, data).then(r => r.data),
  deleteColumn: (columnId: string)                                      => api.delete(`/columns/${columnId}`).then(r => r.data),
};

// Tasks
export const taskApi = {
  create: (colId: string, data: { title: string; description?: string; priority?: string; dueDate?: string }) =>
    api.post(`/columns/${colId}/tasks`, data).then(r => r.data),
  get:    (id: string)                => api.get(`/tasks/${id}`).then(r => r.data),
  update: (id: string, data: object)  => api.patch(`/tasks/${id}`, data).then(r => r.data),
  delete: (id: string)                => api.delete(`/tasks/${id}`).then(r => r.data),
  logs:   (id: string)                => api.get(`/tasks/${id}/activity`).then(r => r.data),
};

// Attachments
export const attachmentApi = {
  list:   (taskId: string)              => api.get(`/tasks/${taskId}/attachments`).then(r => ({
    ...r.data,
    data: (r.data.data || []).map((att: any) => ({
      id: att.id,
      taskId: att.taskId,
      filename: att.fileName,
      url: att.fileUrl,
    }))
  })),
  upload: (taskId: string, file: File)  => {
    const fd = new FormData(); fd.append('file', file);
    return api.post(`/tasks/${taskId}/attachments`, fd).then(r => ({
      ...r.data,
      data: r.data.data ? {
        id: r.data.data.id,
        taskId: r.data.data.taskId,
        filename: r.data.data.fileName,
        url: r.data.data.fileUrl,
      } : undefined
    }));
  },
  delete: (id: string)                  => api.delete(`/attachments/${id}`).then(r => r.data),
};

export type TimeLog = {
  id: string;
  taskId: string;
  userId: string;
  durationSeconds: number;
  description?: string | null;
  loggedAt: string;
  user: { id: string; name: string; email: string; avatarUrl?: string | null };
};

export type BillingReport = {
  projectName: string;
  totalSeconds: number;
  logs: TimeLog[];
  taskBreakdown: { taskId: string; taskTitle: string; totalSeconds: number }[];
  userBreakdown: { userId: string; userName: string; userEmail: string; userAvatarUrl?: string | null; totalSeconds: number }[];
};

// Time Logging
export const timeLogApi = {
  list: (taskId: string) => api.get(`/tasks/${taskId}/time-logs`).then(r => r.data),
  create: (taskId: string, durationSeconds: number, description?: string) => api.post(`/tasks/${taskId}/time-logs`, { durationSeconds, description }).then(r => r.data),
  delete: (taskId: string, logId: string) => api.delete(`/tasks/${taskId}/time-logs/${logId}`).then(r => r.data),
  projectBilling: (projectId: string) => api.get(`/projects/${projectId}/billing`).then(r => r.data),
};

export default api;
