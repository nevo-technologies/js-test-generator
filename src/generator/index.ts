import { window } from 'vscode';
import { bypassErrorCodes, GeneratorError } from './errors';
import {
  ensureDirectoryExists,
  getTestFileInformation,
  openFileInVsCode,
  writeContentToFile,
  warnIfFileExists,
} from './fileUtils';
import { createFileContent, extractSourceCode } from './syntax';

export const generateUnitTestCommand = () => {
  // Configuration values for this extension are defined
  // in package.json. Load them here to be used in command execution
  // const config = workspace.getConfiguration('unit-test-generator');
  const { fileName: activeFileName, languageId: activeFileType } = window.activeTextEditor.document;

  // If another language is supported, add it here. For languageId documentation see
  // https://code.visualstudio.com/docs/languages/identifiers
  const supportedFileTypes = ['javascript', 'typescript'];

  if (supportedFileTypes.indexOf(activeFileType) < 0) {
    window.showErrorMessage(`${activeFileType} files are not supported at the moment. Sorry!`);
    return;
  }

  const { name, suffix, extension, directoryPath } = getTestFileInformation(activeFileName);
  // Finally, construct the path at which we will create the unit test file
  const testFileAbsolutePath = `${directoryPath}${name}.${suffix}${extension}`;

  return ensureDirectoryExists(directoryPath)
    .then(() => warnIfFileExists(testFileAbsolutePath))
    .then(() => extractSourceCode(activeFileName))
    .then(dependencies => createFileContent(dependencies, name, name))
    .then(fileContent => writeContentToFile(fileContent, testFileAbsolutePath))
    .then(() => openFileInVsCode(testFileAbsolutePath))
    .catch((error: GeneratorError) => {
      if (!bypassErrorCodes.includes(error.code)) {
        window.showErrorMessage(error.message);
      }
    });
};
