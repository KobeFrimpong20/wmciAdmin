import { apiClient } from './client';
import type { Member, Application, IntakeFormPayload } from '../types/member';

export const membersApi = {
  getAllMembers: () =>
    apiClient<Member[]>('/members', {
      method: 'GET',
    }),

  getMemberById: (id: string) =>
    apiClient<Member>(`/members/${id}`, {
      method: 'GET',
    }),

  getAllApplications: (memberId?: string) => {
    const query = memberId ? `?member_id=${encodeURIComponent(memberId)}` : '';
    return apiClient<Application[]>(`/applications${query}`, {
      method: 'GET',
    });
  },

  getApplicationById: (id: string) =>
    apiClient<Application>(`/applications/${id}`, {
      method: 'GET',
    }),

  submitIntake: (data: IntakeFormPayload) =>
    apiClient<Application>('/applications', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth: true,
    }),
};
