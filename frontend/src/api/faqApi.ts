// src/api/faqApi.ts
import axiosClient from './axiosClient';

export interface Faq {
  _id: string;
  peripheral: string;
  question: string;
  answer: string;
  tags: string[];
  order: number;
}

export const faqApi = {
  /**
   * Fetches the list of unique peripherals (e.g., ["STM32", "ESP32"])
   */
  getPeripherals: async (): Promise<string[]> => {
    const response = await axiosClient.get('/faqs/peripherals');
    return response.data;
  },

  /**
   * Fetches FAQs, optionally filtered by a specific peripheral
   */
  getFaqs: async (peripheral: string = 'All'): Promise<Faq[]> => {
    // If 'All' is selected, don't send the query parameter
    const query = peripheral === 'All' ? '' : `?peripheral=${peripheral}`;
    const response = await axiosClient.get(`/faqs${query}`);
    return response.data;
  }
};