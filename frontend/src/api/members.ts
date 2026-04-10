import { apiClient } from './client';
import type { Member, Application, IntakeFormPayload } from '../types/member';

export const membersApi = {
  getAllMembers: () => 
    apiClient<Member[]>('/members', {
      method: 'GET',
    }),
    
  getMemberById: (id: string | number) => 
    apiClient<Member>(`/members/${id}`, {
      method: 'GET',
    }),
    
  getMemberApplication: (id: string | number) => 
    apiClient<Application>(`/members/${id}/application`, {
      method: 'GET',
    }),
    
  updateMember: (id: string | number, data: Partial<Member>) =>
    apiClient<Member>(`/members/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  updateMemberApplication: (id: string | number, data: Partial<Application>) =>
    apiClient<{ message: string }>(`/members/${id}/application`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  submitIntake: (data: IntakeFormPayload) =>
    apiClient<{ message: string }>('/applications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
