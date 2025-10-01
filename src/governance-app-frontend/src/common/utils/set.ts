export function setWithItemAdded<T>(set: Set<T>, item: T): Set<T> {
  const newSet = new Set(set);
  newSet.add(item);
  return newSet;
}

export function setWithItemRemoved<T>(set: Set<T>, item: T): Set<T> {
  const newSet = new Set(set);
  newSet.delete(item);
  return newSet;
}
