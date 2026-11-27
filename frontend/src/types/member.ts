export interface Member {
  id: string;
  full_name: string;
  date_of_birth: string;
  phone: string;
  email: string;
  address: string;
  joined_at: string;
  tags: string[];
}

export interface PatchMemberTagsPayload {
  add?: string[];
  remove?: string[];
}

export interface Application {
  id: string;
  member_id: string;

  // Immutable contact snapshot at submission time
  full_name: string;
  email: string;
  phone: string;
  address: string;

  // Demographics
  date_of_birth: string;
  marital_status: string;
  spouse_name: string;
  num_children: number;

  // Spiritual history
  born_again: boolean;
  water_baptized: boolean;
  speak_tongues: boolean;
  prev_church: string;

  // Commitments
  attendance_commitment: boolean;
  tithe_commitment: boolean;
  prayer_commitment: boolean;
  sober_commitment: boolean;
  respect_commitment: boolean;
  faith_commitment: boolean;

  // Signatures & metadata
  member_signature_date: string | null;
  pastor_signature_date: string | null;
  created_at: string;
}

export interface IntakeFormPayload {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  date_of_birth: string;
  marital_status: string;
  spouse_name: string;
  num_children: number;
  born_again: boolean;
  water_baptized: boolean;
  speak_tongues: boolean;
  prev_church: string;
  attendance_commitment: boolean;
  tithe_commitment: boolean;
  prayer_commitment: boolean;
  sober_commitment: boolean;
  respect_commitment: boolean;
  faith_commitment: boolean;
  member_signature_date: string | null;
}
