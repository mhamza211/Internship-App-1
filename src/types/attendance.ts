// src/types/attendance.ts

export interface AttendanceRecord {
  id: string;
  user_id: string;
  check_in_time: string;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
  status: 'present' | 'late' | 'absent';
  address: string | null;
  created_at: string;
}

export interface CheckInData {
  latitude: number;
  longitude: number;
  photoUri: string;
  address?: string;
}
