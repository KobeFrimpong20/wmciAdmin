export interface Department {
  id: number;
  name: string;
}

export interface Member {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: string;
  joined_at: string; // ISO Date String
  departments: Department[] | null;
}

export interface Application {
  id: number;
  member_id: number;
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

  pastor_signature_date: string | null;
  member_signature_date: string | null;

  created_at: string;
}

export interface IntakeFormPayload {
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
