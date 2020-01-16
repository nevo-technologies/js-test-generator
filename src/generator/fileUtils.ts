import { mkdir, readFile, writeFile } from 'fs';
import { Uri, window } from 'vscode';

export const ensureDirectoryExists = (path: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    mkdir(path, error => {
      if (error) {
        if (error.code === 'EEXIST') {
          // directory already exists, proceed
          resolve();
        } else {
          reject(new Error(error.message));
        }
      } else {
        resolve();
      }
    });
  });
};

export const writeContentToFile = (content: string, path: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    writeFile(path, content, error => {
      if (error) {
        reject(new Error(error.message));
      } else {
        resolve();
      }
    });
  });
};

export const readContentFromFile = (path: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    readFile(path, (error, data) => {
      if (error) {
        reject(new Error(error.message));
      } else {
        resolve(data.toString());
      }
    });
  });
};

export const openFileInVsCode = (path: string) => {
  const document = Uri.file(path);
  return window.showTextDocument(document);
};
