import { apiClient } from './client';
import type {
  AcceptApplicationPayload,
  AcceptApplicationResponse,
  Application,
  IntakeFormPayload,
  Member,
  PatchMemberTagsPayload,
} from '../types/member';

export const membersApi = {
  getAllMembers: () =>
    apiClient<Member[]>('/members', {
      method: 'GET',
    }),

  getMemberById: (id: string) =>
    apiClient<Member>(`/members/${id}`, {
      method: 'GET',
    }),

  patchMemberTags: (id: string, payload: PatchMemberTagsPayload) =>
    apiClient<Member>(`/members/${id}/tags`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteMember: (id: string) =>
    apiClient<void>(`/members/${id}`, {
      method: 'DELETE',
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

  acceptApplication: (id: string, payload?: AcceptApplicationPayload) =>
    apiClient<AcceptApplicationResponse>(`/applications/${id}/accept`, {
      method: 'POST',
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    }),

  rejectApplication: (id: string) =>
    apiClient<void>(`/applications/${id}`, {
      method: 'DELETE',
    }),

  submitIntake: (data: IntakeFormPayload) =>
    apiClient<Application>('/applications', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth: true,
    }),
};
