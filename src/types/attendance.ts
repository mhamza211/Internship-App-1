// src/types/attendance.ts

export interface AttendanceRecord {
  id: string;
  user_id: string;
  org_id: string | null;
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
  // Optional — omitted when marking Absent directly from outside
  // the geofence, since no camera step is shown in that case.
  photoUri?: string;
  address?: string;
  orgId: string;
  status: 'present' | 'late' | 'absent';
}