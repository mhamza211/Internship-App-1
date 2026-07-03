// src/lib/organization.ts

import { supabase } from './supabase';
import { Organization, Profile, OrgInviteLookup } from '../types/organization';

// Characters chosen to avoid visually ambiguous ones (0/O, 1/I, etc.)
const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateInviteCode(length: number = 8): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += INVITE_CODE_CHARS[Math.floor(Math.random() * INVITE_CODE_CHARS.length)];
  }
  return code;
}

// ─────────────────────────────────────────
// Get the logged-in user's profile row (contains org_id + role)
// ─────────────────────────────────────────
export const getMyProfile = async (): Promise<Profile | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('getMyProfile error:', error.message);
    return null;
  }
  return data as Profile | null;
};

// ─────────────────────────────────────────
// Get the logged-in user's organization (null if not in one yet)
// ─────────────────────────────────────────
export const getMyOrganization = async (): Promise<Organization | null> => {
  const profile = await getMyProfile();
  if (!profile?.org_id) return null;

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', profile.org_id)
    .single();

  if (error) {
    console.error('getMyOrganization error:', error.message);
    return null;
  }
  return data as Organization;
};

// ─────────────────────────────────────────
// Create a brand-new organization. The creator becomes its admin.
// ─────────────────────────────────────────
export const createOrganization = async (
  name: string,
  officeLatitude: number,
  officeLongitude: number,
  geofenceRadiusMeters: number = 50,
): Promise<{ success: boolean; error?: string; organization?: Organization }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not logged in' };

  const inviteCode = generateInviteCode();

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name,
      invite_code: inviteCode,
      office_latitude: officeLatitude,
      office_longitude: officeLongitude,
      geofence_radius_meters: geofenceRadiusMeters,
      owner_id: user.id,
    })
    .select()
    .single();

  if (orgError || !org) {
    return { success: false, error: orgError?.message || 'Failed to create organization' };
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: user.id,
    org_id: org.id,
    full_name: user.user_metadata?.full_name || null,
    role: 'admin',
  });

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  return { success: true, organization: org as Organization };
};

// ─────────────────────────────────────────
// Look up an org by invite code (works even before the user has
// a profile — goes through a SECURITY DEFINER RPC).
// ─────────────────────────────────────────
export const lookupOrganizationByInviteCode = async (
  inviteCode: string,
): Promise<OrgInviteLookup | null> => {
  const { data, error } = await supabase.rpc('get_org_by_invite_code', {
    code: inviteCode.trim().toUpperCase(),
  });

  if (error || !data || data.length === 0) {
    return null;
  }
  return data[0] as OrgInviteLookup;
};

// ─────────────────────────────────────────
// Join an existing organization as an employee, via invite code.
// ─────────────────────────────────────────
export const joinOrganizationByInviteCode = async (
  inviteCode: string,
): Promise<{ success: boolean; error?: string; organization?: OrgInviteLookup }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not logged in' };

  const org = await lookupOrganizationByInviteCode(inviteCode);
  if (!org) {
    return { success: false, error: 'Invalid invite code. Please check and try again.' };
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: user.id,
    org_id: org.id,
    full_name: user.user_metadata?.full_name || null,
    role: 'employee',
  });

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  return { success: true, organization: org };
};