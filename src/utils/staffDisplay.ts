import { StaffProfile } from '../types';

/**
 * Resolves the canonical display name for an authenticated staff member.
 * 
 * Flow:
 * auth.uid()
 *   → public.staff_profiles.auth_user_id
 *   → staff_profiles.full_name
 *   → dashboard display
 * 
 * Strict Fallback Hierarchy:
 * 1. public.staff_profiles.full_name (canonical application display name)
 * 2. Auth user_metadata.full_name (only if legitimately populated, not matching email prefix)
 * 3. 'Clinical User'
 * 
 * CRITICAL RULE:
 * Absolutely NEVER derive a display name from the email address or email prefix (e.g. split('@')[0]).
 * If staff_profiles.full_name is empty or whitespace for an existing user, report/warn it rather
 * than silently defaulting to an email-derived string.
 */
export function getStaffDisplayName(
  staffProfile?: StaffProfile | null,
  userMetadata?: Record<string, any> | null
): string {
  const profileFullName = staffProfile?.full_name?.trim();
  const staffEmail = staffProfile?.email?.trim().toLowerCase();
  const emailPrefix = staffEmail ? staffEmail.split('@')[0]?.trim().toLowerCase() : '';

  // 1. Check staff_profiles.full_name
  if (profileFullName && profileFullName.length > 0) {
    // If the full_name in the database was an artifact of the legacy split_part trigger
    // (i.e. identical to the email prefix), treat it as an unpopulated display name
    if (emailPrefix && profileFullName.toLowerCase() === emailPrefix) {
      console.warn(
        `[StaffDisplay] staff_profiles.full_name for user '${staffProfile?.email}' contains an email prefix artifact ('${profileFullName}'). Checking user_metadata.`
      );
      // Check user_metadata fallback
      const metaName = userMetadata?.full_name?.trim();
      if (metaName && metaName.length > 0 && metaName.toLowerCase() !== emailPrefix) {
        return metaName;
      }
      return 'Clinical User';
    }
    return profileFullName;
  }

  // If staff_profiles.full_name is empty for an existing user, report it
  if (staffProfile) {
    console.warn(
      `[StaffDisplay] staff_profiles.full_name is empty for staff member id: ${staffProfile.id} (${staffProfile.email}).`
    );
  }

  // 2. Auth user_metadata.full_name (only if legitimately populated and not an email prefix)
  const metaFullName = userMetadata?.full_name?.trim();
  if (metaFullName && metaFullName.length > 0) {
    if (!emailPrefix || metaFullName.toLowerCase() !== emailPrefix) {
      return metaFullName;
    }
  }

  // 3. Final canonical fallback: "Clinical User"
  return 'Clinical User';
}

/**
 * Returns a human-friendly formatted role string (e.g. "Doctor", "Nurse", "Staff", "Super Admin")
 */
export function formatStaffRole(role?: string | null): string {
  if (!role) return 'Clinical Staff';
  switch (role.toLowerCase()) {
    case 'super_admin':
      return 'Super Administrator';
    case 'doctor':
      return 'Attending Physician';
    case 'nurse':
      return 'Registered Nurse';
    case 'staff':
      return 'Clinical Administrator';
    default:
      return role.charAt(0).toUpperCase() + role.slice(1);
  }
}
