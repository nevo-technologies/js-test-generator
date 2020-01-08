import { writeFile, mkdir } from 'fs';
import { commands, Uri, window } from 'vscode';

export interface LanguageEngine {
  createFileContents: () => Promise<string>;
}

export const generateUnitTestSuite = (sourceCodeFileName: string, engine: LanguageEngine) => {
  // Find the position in sourceCodeFileName of the parent directory containing the file
  const parentDirectoryPosition = sourceCodeFileName.lastIndexOf('/');
  const testDirectoryName = '__tests__';
  const testDirectoryAbsolutePath = sourceCodeFileName.slice(0, parentDirectoryPosition) + '/' + testDirectoryName;
  const testFileAbsolutePath = testDirectoryAbsolutePath + sourceCodeFileName.slice(parentDirectoryPosition);

  return new Promise((resolve, reject) => {
    // ensure the directory to contain the test file exists
    mkdir(testDirectoryAbsolutePath, error => {
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
  })
    .then(engine.createFileContents)
    .then(
      data =>
        new Promise((resolve, reject) => {
          // Write the generated contents to the unit test file
          writeFile(testFileAbsolutePath, data, error => {
            if (error) {
              reject(new Error(error.message));
            } else {
              resolve();
            }
          });
        })
    )
    .then(() => {
      // Finally, open the test file in VS Code
      const resource = Uri.file(testFileAbsolutePath);
      return commands.executeCommand('vscode.open', resource);
    })
    .catch((error: Error) => window.showErrorMessage(error.message));
};
