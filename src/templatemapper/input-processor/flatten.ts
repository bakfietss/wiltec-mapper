import { parseStringPromise } from "xml2js";
import * as fs from "fs";

export type FlatObject = { [key: string]: any };

export function flattenObject(obj: any, prefix = ''): FlatObject {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(acc, flattenObject(value, fullKey));
    } else if (Array.isArray(value) && value.length === 1 && typeof value[0] === 'object') {
      Object.assign(acc, flattenObject(value[0], fullKey));
    } else {
      acc[fullKey] = value;
    }
    return acc;
  }, {} as FlatObject);
}

export async function loadAndFlatten(filePath: string): Promise<FlatObject[]> {
  const content = fs.readFileSync(filePath, 'utf-8');
  if (filePath.endsWith('.json')) {
    const parsed = JSON.parse(content);
    const rows = parsed.rows || parsed;
    return rows.map((r: any) => flattenObject(r));
  } else if (filePath.endsWith('.xml')) {
    const result = await parseStringPromise(content);
    const persons = result.persons?.person || [];
    return persons.map((r: any) => flattenObject(r));
  } else {
    throw new Error("Unsupported file format");
  }
}