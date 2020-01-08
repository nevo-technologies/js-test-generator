import { window } from 'vscode';
import { generateUnitTestSuite } from './common';
import JavascriptEngine from './javascript';
import TypescriptEngine from './typescript';

export const generateUnitTestCommand = () => {
  // Configuration values for this extension are defined
  // in package.json. Load them here to be used in command execution
  // const config = workspace.getConfiguration('unit-test-generator');
  const {
    fileName: activeFileName,
    languageId: activeFileType,
  } = window.activeTextEditor.document;

  // If another language is supported, add it here. For languageId documentation see
  // https://code.visualstudio.com/docs/languages/identifiers
  const supportedFileTypes = ['javascript', 'typescript'];

  if (supportedFileTypes.indexOf(activeFileType) < 0) {
    window.showErrorMessage(
      `${activeFileType} files are not supported at the moment. Sorry!`
    );
    return;
  }

  switch (activeFileType) {
    case 'javascript':
      return generateUnitTestSuite(activeFileName, new JavascriptEngine());
    case 'typescript':
      return generateUnitTestSuite(activeFileName, new TypescriptEngine());
    default:
      return window.showErrorMessage(
        `${activeFileType} files are not supported at the moment. Sorry!`
      );
  }
};
