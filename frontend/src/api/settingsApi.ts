// src/api/settingsApi.ts
import axiosClient from './axiosClient';

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  preferredModel: string;
  clearHistoryOnLogout: boolean;
}

export const settingsApi = {
  getSettings: async (): Promise<UserSettings> => {
    const response = await axiosClient.get('/settings');
    return response.data;
  },

  updateSettings: async (data: Partial<UserSettings>): Promise<UserSettings> => {
    const response = await axiosClient.put('/settings', data);
    return response.data;
  }
};