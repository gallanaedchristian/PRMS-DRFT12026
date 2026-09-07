import { Patient, DuplicateCheckResult, DuplicateMatch, DuplicateCluster } from '../types';

/**
 * Normalizes full names for comparison:
 * - Trims leading and trailing spaces
 * - Collapses repeated spaces
 * - Lowercase comparison
 */
export function normalizeName(name: string | null | undefined): string {
  if (!name) return '';
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Extracts comparable sorted word tokens from a name (ignoring commas and periods)
 * to catch inverted orders like "Orong, Ronnie John" vs "Ronnie John Orong".
 */
export function getNameTokens(name: string | null | undefined): string {
  if (!name) return '';
  const clean = name.toLowerCase().replace(/[,.]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = clean.split(' ').filter((w) => w.length > 0);
  return words.sort().join(' ');
}

/**
 * Checks if two names are equivalent under medical demographic standards.
 */
export function areNamesMatching(nameA: string, nameB: string): boolean {
  const normA = normalizeName(nameA);
  const normB = normalizeName(nameB);
  if (!normA || !normB) return false;

  // Exact normalized match
  if (normA === normB) return true;

  // Comma-stripped match
  const strippedA = normA.replace(/,/g, '').replace(/\s+/g, ' ').trim();
  const strippedB = normB.replace(/,/g, '').replace(/\s+/g, ' ').trim();
  if (strippedA === strippedB) return true;

  // Sorted tokens match for multi-word names (e.g. "Villanueva, Carlos M." vs "Carlos M. Villanueva")
  const tokensA = getNameTokens(nameA);
  const tokensB = getNameTokens(nameB);
  if (tokensA && tokensB && tokensA === tokensB) return true;

  return false;
}

/**
 * Normalizes phone numbers for comparison:
 * - Removes spaces, hyphens, parentheses, and dots
 * - Normalizes common Philippine phone formats (+639..., 639..., 09..., 9...)
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  // Remove all non-digits
  let digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  // Philippine mobile normalization to canonical 11-digit format 09XXXXXXXXX
  if (digits.startsWith('63') && digits.length === 12 && digits[2] === '9') {
    digits = '0' + digits.substring(2);
  } else if (digits.length === 10 && digits.startsWith('9')) {
    digits = '0' + digits;
  }

  return digits;
}

/**
 * Normalizes emails:
 * - Trims leading/trailing spaces
 * - Lowercase
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Scans candidate patient against existing patients in the caller's organization.
 * NEVER checks or exposes patients from other organizations.
 */
export function checkDuplicatePatient(
  candidate: Partial<Patient>,
  existingPatients: Patient[],
  organizationId?: string | null
): DuplicateCheckResult {
  const strongMatches: DuplicateMatch[] = [];
  const weakMatches: DuplicateMatch[] = [];

  const candidateName = candidate.name || '';
  const candidateDob = candidate.date_of_birth ? candidate.date_of_birth.trim() : null;
  const candidateAge = typeof candidate.age === 'number' ? candidate.age : Number(candidate.age);
  const candidateSex = candidate.sex;
  const candidatePhone = normalizePhone(candidate.phone);
  const candidateEmail = normalizeEmail(candidate.email);

  // Scope to same organization and non-archived records
  const targetPatients = existingPatients.filter((p) => {
    if (p.is_archived) return false;
    // Skip self if updating an existing record
    if (candidate.id && p.id === candidate.id) return false;

    // Multi-tenant boundary check:
    // If organizationId is provided, enforce strict match
    if (organizationId && p.organization_id && p.organization_id !== organizationId) {
      return false;
    }
    return true;
  });

  for (const existing of targetPatients) {
    const isNameMatch = areNamesMatching(candidateName, existing.name);
    const existingDob = existing.date_of_birth ? existing.date_of_birth.trim() : null;
    const existingPhone = normalizePhone(existing.phone);
    const existingEmail = normalizeEmail(existing.email);

    let isStrong = false;
    let strongReason = '';

    // =========================================================================
    // PRIMARY RULE: Strong Duplicate Detection
    // =========================================================================
    if (isNameMatch) {
      if (candidateDob && existingDob) {
        // Both records have date_of_birth
        if (candidateDob === existingDob) {
          isStrong = true;
          strongReason = 'A patient with the same name and date of birth already exists.';
        } else {
          // Different DOB proves different individuals - DO NOT BLOCK!
          isStrong = false;
        }
      } else {
        // Fallback: One or both records lack date_of_birth
        // Use the strongest reliable demographic identifiers already in the schema
        const isSameSex = candidateSex && existing.sex && candidateSex === existing.sex;
        const isSameAge =
          !isNaN(candidateAge) &&
          typeof existing.age === 'number' &&
          Math.abs(candidateAge - existing.age) <= 1;

        if (isSameSex && isSameAge) {
          isStrong = true;
          strongReason = 'A patient with the same name, age, and sex already exists.';
        } else if (candidatePhone && existingPhone && candidatePhone === existingPhone) {
          isStrong = true;
          strongReason = 'A patient with the same name and phone number already exists.';
        }
      }
    }

    if (isStrong) {
      strongMatches.push({
        patient: existing,
        matchType: candidateDob && existingDob ? 'STRONG_DOB' : 'STRONG_DEMOGRAPHICS',
        confidence: 'strong',
        reason: strongReason,
      });
      // A strong match overrides weak classification for this specific existing patient
      continue;
    }

    // =========================================================================
    // SECONDARY SIGNALS: Weak Contact Matches (Warning, not automatic duplicate)
    // =========================================================================
    let isWeak = false;
    let weakReason = '';
    let weakType: 'WEAK_PHONE' | 'WEAK_EMAIL' = 'WEAK_PHONE';

    if (candidatePhone && existingPhone && candidatePhone.length >= 7 && candidatePhone === existingPhone) {
      isWeak = true;
      weakType = 'WEAK_PHONE';
      weakReason = `Another patient (${existing.name}, ${existing.patient_number}) uses this phone number. Family members may share contact details.`;
    } else if (candidateEmail && existingEmail && candidateEmail.length >= 5 && candidateEmail === existingEmail) {
      isWeak = true;
      weakType = 'WEAK_EMAIL';
      weakReason = `Another patient (${existing.name}, ${existing.patient_number}) uses this email address. Family members may share contact details.`;
    }

    if (isWeak) {
      weakMatches.push({
        patient: existing,
        matchType: weakType,
        confidence: 'weak',
        reason: weakReason,
      });
    }
  }

  return {
    hasStrongDuplicate: strongMatches.length > 0,
    hasWeakMatch: weakMatches.length > 0,
    strongMatches,
    weakMatches,
  };
}

/**
 * Audits and identifies existing clusters of possible duplicates within an organization.
 * DOES NOT modify, merge, or delete any records automatically.
 */
export function findExistingDuplicateClusters(
  patients: Patient[],
  organizationId?: string | null
): DuplicateCluster[] {
  const scopedPatients = patients.filter((p) => {
    if (p.is_archived) return false;
    if (organizationId && p.organization_id && p.organization_id !== organizationId) {
      return false;
    }
    return true;
  });

  const clustersMap = new Map<string, Patient[]>();

  for (const patient of scopedPatients) {
    const normName = normalizeName(patient.name);
    if (!normName) continue;

    // Cluster key uses DOB if available, or age + sex
    const dobPart = patient.date_of_birth ? patient.date_of_birth : `age-${patient.age}-sex-${patient.sex}`;
    const key = `${normName}|${dobPart}`;

    const list = clustersMap.get(key) || [];
    list.push(patient);
    clustersMap.set(key, list);
  }

  const result: DuplicateCluster[] = [];
  for (const [key, clusterPatients] of clustersMap.entries()) {
    if (clusterPatients.length > 1) {
      const [name] = key.split('|');
      result.push({
        clusterKey: key,
        count: clusterPatients.length,
        patients: clusterPatients,
        reason: `${clusterPatients.length} patient records share the name "${name}" and identical demographic details.`,
      });
    }
  }

  return result;
}
