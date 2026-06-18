// src/lib/attendance.ts
// Place this file in: src/lib/attendance.ts

import { supabase } from './supabase';
import { AttendanceRecord, CheckInData } from '../types/attendance';

// ─────────────────────────────────────────
// Upload photo to Supabase Storage
// ─────────────────────────────────────────
export const uploadAttendancePhoto = async (photoUri: string, userId: string): Promise<string | null> => {
  try {
    // Convert photo URI to blob
    const response = await fetch(photoUri);
    const blob = await response.blob();

    // Create unique filename
    const fileName = `${userId}/${Date.now()}.jpg`;

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('attendance-photos')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('Photo upload error:', error.message);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('attendance-photos')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Upload failed:', error);
    return null;
  }
};

// ─────────────────────────────────────────
// Save attendance check-in record
// ─────────────────────────────────────────
export const saveAttendance = async (checkInData: CheckInData): Promise<{ success: boolean; error?: string }> => {
  try {
    // Get current logged in user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'User not logged in' };
    }

    // Upload photo first
    const photoUrl = await uploadAttendancePhoto(checkInData.photoUri, user.id);

    // Determine status based on time (before 9AM = present, after = late)
    const now = new Date();
    const hour = now.getHours();
    const status = hour < 9 ? 'present' : 'late';

    // Insert attendance record into Supabase
    const { error } = await supabase.from('attendance').insert({
      user_id: user.id,
      latitude: checkInData.latitude,
      longitude: checkInData.longitude,
      photo_url: photoUrl,
      address: checkInData.address || null,
      status: status,
      check_in_time: now.toISOString(),
    });

    if (error) {
      console.error('Save attendance error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Attendance save failed:', error);
    return { success: false, error: 'Something went wrong' };
  }
};

// ─────────────────────────────────────────
// Fetch attendance records for current user
// ─────────────────────────────────────────
export const fetchMyAttendance = async (limit: number = 10): Promise<AttendanceRecord[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', user.id)
      .order('check_in_time', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Fetch attendance error:', error.message);
      return [];
    }

    return data as AttendanceRecord[];
  } catch (error) {
    console.error('Fetch failed:', error);
    return [];
  }
};

// ─────────────────────────────────────────
// Check if user already checked in today
// ─────────────────────────────────────────
export const hasCheckedInToday = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('attendance')
      .select('id')
      .eq('user_id', user.id)
      .gte('check_in_time', today.toISOString())
      .limit(1);

    if (error) return false;

    return data.length > 0;
  } catch {
    return false;
  }
};
