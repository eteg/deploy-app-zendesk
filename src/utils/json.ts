import { echo } from 'shelljs';
import { readFileSync, writeFileSync } from 'fs';

export const fileToJSON = (filePath: string) => {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch (error) {
    echo(`🔎 No file found in path ${filePath}`);
    return {};
  }
};

export const jsonToFile = (filePath: string, json: any) => {
  writeFileSync(filePath, JSON.stringify(json));
};
