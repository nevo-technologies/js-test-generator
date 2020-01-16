import { mkdir, readFile, writeFile, open } from 'fs';
import { Uri, window } from 'vscode';
import { ErrorCode } from './errors';

export const ensureDirectoryExists = (path: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    mkdir(path, error => {
      if (error) {
        if (error.code === 'EEXIST') {
          // directory already exists, proceed
          resolve();
        } else {
          reject({ code: ErrorCode.UnableToCreateTestDirectory, message: error.message });
        }
      } else {
        resolve();
      }
    });
  });
};

export const warnIfFileExists = (path: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const exclusiveWriteFlag = 'wx';
    open(path, exclusiveWriteFlag, error => {
      if (error) {
        if (error.code === 'EEXIST') {
          const yesAnswer = 'Yes';
          const noAnswer = 'No';
          // file already exists, warn user
          window
            .showWarningMessage(
              'A unit test suite already exists for this file. Do you wish to overwrite it?',
              yesAnswer,
              noAnswer
            )
            .then(answer => {
              if (answer === yesAnswer) {
                // User has chosen to overwrite. Continue.
                resolve();
              } else {
                // User has chosen not to overwrite. Open file for editing
                openFileInVsCode(path);
                reject({ code: ErrorCode.UnitTestFileExists, message: '' });
              }
            });
        } else {
          // Unexpected error. Abort further operations
          reject({ code: ErrorCode.Unknown, message: error.message });
        }
      } else {
        // File does not exist. Continue.
        resolve();
      }
    });
  });
};

export const writeContentToFile = (content: string, path: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    writeFile(path, content, error => {
      if (error) {
        reject({ code: ErrorCode.Unknown, message: error.message });
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
        reject({ code: ErrorCode.Unknown, message: error.message });
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

interface TestFileInformation {
  name: string;
  suffix: string;
  extension: string;
  directoryPath: string;
}

export const getTestFileInformation = (sourceFilePath: string): TestFileInformation => {
  // Find the last occurrence of "/"" in the path to separate the file name from the parent directory and full path
  const fileNamePosition = sourceFilePath.lastIndexOf('/') + 1;
  const extensionPosition = sourceFilePath.indexOf('.', fileNamePosition);
  // By default, name the suite to match the file name (minus extension)
  const name = sourceFilePath.slice(fileNamePosition, extensionPosition);

  const testDirectoryName = '__tests__';
  // A special suffix to differentiate test files
  const suffix = 'spec';
  const directoryPath = sourceFilePath.slice(0, fileNamePosition) + testDirectoryName + '/';
  const extension = sourceFilePath.slice(extensionPosition);

  return {
    name,
    suffix,
    extension,
    directoryPath,
  };
};
