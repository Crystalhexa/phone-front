export const stringToSubcategories = (
  subcategoriesString: string, 
  separator: string = '|'
): string[] => {
  if (!subcategoriesString.trim()) return [];
  return subcategoriesString
    .split(separator)
    .map(sub => sub.trim())
    .filter(sub => sub.length > 0);
};

export const subcategoriesToString = (
  subcategories: string[] | string | undefined, 
  separator: string = '|'
): string => {
  if (!subcategories) return '';
  if (typeof subcategories === 'string') return subcategories;
  return subcategories.join(` ${separator} `);
};

export const checkDuplicateSubcategories = (subcategories: string[]): string[] => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  
  subcategories.forEach(sub => {
    const normalized = sub.toLowerCase().trim();
    if (seen.has(normalized)) {
      duplicates.add(sub);
    }
    seen.add(normalized);
  });
  
  return Array.from(duplicates);
};

export const reorderSubcategories = (
  subcategories: string[], 
  startIndex: number, 
  endIndex: number
): string[] => {
  const result = Array.from(subcategories);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};