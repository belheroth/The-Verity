/**
 * Checks if a classroom object is a phantom/dummy classroom.
 */
export const isPhantomClassroom = (c) => {
  if (!c || !c.name) return true;
  const name = String(c.name).trim();
  const hasDummyName = /^Classroom \d+$/i.test(name);
  const hasNoDetails = (!c.section || !String(c.section).trim()) && (!c.subject || !String(c.subject).trim());
  return hasDummyName && hasNoDetails;
};

/**
 * Merges freshly fetched server classrooms into the existing classroom list while
 * STRICTLY preserving the user's current display order.
 *
 * 1. Existing items stay at their exact indices in currentList, updated with fresh server properties.
 * 2. Genuinely new items from the server (not present in currentList) are appended to the end.
 * 3. Deleted items on the server are removed.
 */
export const mergeClassroomsPreservingOrder = (currentList, serverList) => {
  if (!Array.isArray(serverList) || serverList.length === 0) {
    return Array.isArray(currentList) ? currentList.filter(c => !isPhantomClassroom(c)) : [];
  }
  const validServerList = serverList.filter(c => !isPhantomClassroom(c));
  if (!Array.isArray(currentList) || currentList.length === 0) {
    return validServerList;
  }

  const serverMap = new Map();
  validServerList.forEach(c => serverMap.set(String(c.id), c));

  // 1. Keep existing classes in their exact current order, updating with latest server attributes
  const updated = currentList
    .filter(c => !isPhantomClassroom(c) && serverMap.has(String(c.id)))
    .map(c => ({
      ...c,
      ...serverMap.get(String(c.id))
    }));

  // 2. Append any new classes that exist on the server but weren't in currentList yet
  const existingIds = new Set(updated.map(c => String(c.id)));
  const newClasses = validServerList.filter(c => !existingIds.has(String(c.id)));

  return [...updated, ...newClasses];
};
