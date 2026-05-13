import { loadSettings } from '../../lib/appSettings';
import type { TaskRepositoryAdapter } from './types';

function createHttpTaskAdapter(options: {
  getBaseUrl: (settings: ReturnType<typeof loadSettings>) => string;
  missingConfigMessage: string;
}): TaskRepositoryAdapter {
  function getBaseUrlOrThrow() {
    const settings = loadSettings();
    const baseUrl = options.getBaseUrl(settings).trim().replace(/\/$/, '');
    if (!baseUrl) {
      throw new Error(options.missingConfigMessage);
    }
    return baseUrl;
  }

  return {
    async checkConnection() {
      const response = await fetch(`${getBaseUrlOrThrow()}/tasks`, { method: 'HEAD' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return true;
    },

    async listTasks() {
      const response = await fetch(`${getBaseUrlOrThrow()}/tasks`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return await response.json();
    },

    async createTask(task) {
      const response = await fetch(`${getBaseUrlOrThrow()}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });
      if (!response.ok) throw new Error('Failed to create task');
      return await response.json();
    },

    async updateTaskById(taskId, updates) {
      const response = await fetch(`${getBaseUrlOrThrow()}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update task');
      return await response.json();
    },

    async deleteTaskById(taskId) {
      const response = await fetch(`${getBaseUrlOrThrow()}/tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete task');
    },
  };
}

export const PostgresTaskAdapter = createHttpTaskAdapter({
  getBaseUrl: (settings) => settings.postgresUrl,
  missingConfigMessage: 'PostgreSQL proxy URL is missing. Configure it in Settings.',
});

export const NeonTaskAdapter = createHttpTaskAdapter({
  getBaseUrl: (settings) => settings.neonApiUrl,
  missingConfigMessage: 'Neon API URL is missing. Configure a backend proxy in Settings.',
});
