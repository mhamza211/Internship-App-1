// src/types/organization.ts

export interface Organization {
  id: string;
  name: string;
  invite_code: string;
  office_latitude: number;
  office_longitude: number;
  geofence_radius_meters: number;
  owner_id: string;
  created_at: string;
}

export interface Profile {
  id: string;
  org_id: string | null;
  full_name: string | null;
  role: 'admin' | 'employee';
  created_at: string;
}

// Slim shape returned by the get_org_by_invite_code RPC (used before
// the user has joined, so it only exposes what's needed to join).
export interface OrgInviteLookup {
  id: string;
  name: string;
  office_latitude: number;
  office_longitude: number;
  geofence_radius_meters: number;
}
