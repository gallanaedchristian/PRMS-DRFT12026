import { getStaffDisplayName } from './staffDisplay';
import { StaffProfile } from '../types';

/**
 * Verification test suite for staff display name resolution.
 */
export function runStaffDisplayTests() {
  const results: { description: string; passed: boolean; expected: string; actual: string }[] = [];

  const createMockStaff = (
    fullName: string,
    email: string,
    role: 'doctor' | 'nurse' | 'staff' | 'super_admin' = 'doctor'
  ): StaffProfile => ({
    id: 'mock-id-01',
    auth_user_id: 'mock-auth-01',
    organization_id: 'org-01',
    full_name: fullName,
    email,
    role,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Test 1: Doctor account with canonical staff_profiles.full_name
  {
    const staff = createMockStaff('Dr. Fausto Tancongco', 'fausto.tancongco@medrecords.cloud', 'doctor');
    const actual = getStaffDisplayName(staff);
    results.push({
      description: 'Doctor account uses staff_profiles.full_name',
      expected: 'Dr. Fausto Tancongco',
      actual,
      passed: actual === 'Dr. Fausto Tancongco',
    });
  }

  // Test 2: Nurse account with canonical staff_profiles.full_name
  {
    const staff = createMockStaff('Maria Santos', 'maria.santos@medrecords.cloud', 'nurse');
    const actual = getStaffDisplayName(staff);
    results.push({
      description: 'Nurse account uses staff_profiles.full_name',
      expected: 'Maria Santos',
      actual,
      passed: actual === 'Maria Santos',
    });
  }

  // Test 3: Staff account with canonical staff_profiles.full_name
  {
    const staff = createMockStaff('Juan Dela Cruz', 'juan.delacruz@medrecords.cloud', 'staff');
    const actual = getStaffDisplayName(staff);
    results.push({
      description: 'Staff account uses staff_profiles.full_name',
      expected: 'Juan Dela Cruz',
      actual,
      passed: actual === 'Juan Dela Cruz',
    });
  }

  // Test 4: Email prefix legacy artifact detection (e.g. ronnieljohnorong23@gmail.com where full_name was 'ronnieljohnorong23')
  {
    const staff = createMockStaff('ronnieljohnorong23', 'ronnieljohnorong23@gmail.com', 'doctor');
    // Case 4a: legitimate user_metadata exists
    const actualWithMeta = getStaffDisplayName(staff, { full_name: 'Ronniel John Orong' });
    results.push({
      description: 'Legacy email prefix artifact falls back to valid user_metadata',
      expected: 'Ronniel John Orong',
      actual: actualWithMeta,
      passed: actualWithMeta === 'Ronniel John Orong',
    });

    // Case 4b: No metadata exists -> should fall back to "Clinical User", NEVER email prefix!
    const actualWithoutMeta = getStaffDisplayName(staff, null);
    results.push({
      description: 'Legacy email prefix artifact falls back to Clinical User, never email prefix',
      expected: 'Clinical User',
      actual: actualWithoutMeta,
      passed: actualWithoutMeta === 'Clinical User',
    });
  }

  // Test 5: Empty staff_profiles.full_name with legitimate user_metadata
  {
    const staff = createMockStaff('', 'test.user@clinic.ph', 'doctor');
    const actual = getStaffDisplayName(staff, { full_name: 'Dr. Elena Ramos' });
    results.push({
      description: 'Empty full_name falls back to legitimate user_metadata',
      expected: 'Dr. Elena Ramos',
      actual,
      passed: actual === 'Dr. Elena Ramos',
    });
  }

  // Test 6: Empty staff_profiles.full_name with NO user_metadata -> Clinical User
  {
    const staff = createMockStaff('', 'unnamed.user@clinic.ph', 'nurse');
    const actual = getStaffDisplayName(staff, null);
    results.push({
      description: 'Empty full_name with no metadata falls back to Clinical User',
      expected: 'Clinical User',
      actual,
      passed: actual === 'Clinical User',
    });
  }

  // Test 7: Null staffProfile -> Clinical User
  {
    const actual = getStaffDisplayName(null, null);
    results.push({
      description: 'Null staff profile falls back to Clinical User',
      expected: 'Clinical User',
      actual,
      passed: actual === 'Clinical User',
    });
  }

  return results;
}

// Auto-run if executed directly
if (typeof process !== 'undefined' && process.argv[1]?.includes('staffDisplay.test')) {
  const tests = runStaffDisplayTests();
  let failed = 0;
  console.log('--- Staff Display Name Resolution Verification ---');
  for (const t of tests) {
    if (t.passed) {
      console.log(`✓ PASS: ${t.description} -> "${t.actual}"`);
    } else {
      console.error(`✗ FAIL: ${t.description} -> Expected "${t.expected}", got "${t.actual}"`);
      failed++;
    }
  }
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log(`\nAll ${tests.length} tests passed successfully.`);
  }
}
