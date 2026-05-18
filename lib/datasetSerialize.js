const STORAGE_VERSION = 1;

/**
 * @param {import('./parseExcel').Student} student
 */
export function serializeStudent(student) {
  return {
    ...student,
    promotionDate: student.promotionDate?.toISOString() ?? null,
    mostRecentPromotion: student.mostRecentPromotion?.toISOString() ?? null,
  };
}

/**
 * @param {ReturnType<typeof serializeStudent>} student
 */
export function deserializeStudent(student) {
  return {
    ...student,
    promotionDate: student.promotionDate ? new Date(student.promotionDate) : null,
    mostRecentPromotion: student.mostRecentPromotion
      ? new Date(student.mostRecentPromotion)
      : null,
  };
}

/**
 * @param {{ students: import('./parseExcel').Student[], fileName?: string|null, savedAt?: string|null }} dataset
 */
export function serializeDataset(dataset) {
  return {
    version: STORAGE_VERSION,
    fileName: dataset.fileName ?? null,
    savedAt: dataset.savedAt ?? new Date().toISOString(),
    students: (dataset.students || []).map(serializeStudent),
  };
}

/**
 * @param {ReturnType<typeof serializeDataset>} data
 */
export function deserializeDataset(data) {
  if (!data || !Array.isArray(data.students)) {
    return { students: [], fileName: null, error: null, savedAt: null };
  }
  if (data.version !== STORAGE_VERSION && data.students.length === 0) {
    return { students: [], fileName: null, error: null, savedAt: null };
  }
  return {
    fileName: data.fileName ?? null,
    error: null,
    savedAt: data.savedAt ?? null,
    students: data.students.map(deserializeStudent),
  };
}

/**
 * @param {{ adults?: object, kids?: object }} payload
 */
export function deserializeSharePayload(payload) {
  if (!payload) {
    return {
      adults: deserializeDataset(null),
      kids: deserializeDataset(null),
      createdAt: null,
    };
  }
  return {
    adults: deserializeDataset(payload.adults),
    kids: deserializeDataset(payload.kids),
    createdAt: payload.createdAt ?? null,
  };
}
