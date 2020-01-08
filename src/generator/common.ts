import { window } from 'vscode';

export interface LanguageEngine {
  create: () => Promise<any>;
}

export const generateUnitTestSuite = (
  sourceCodeFileName: string,
  engine: LanguageEngine
) => {
  engine
    .create()
    .then(() => window.showInformationMessage('Complete'))
    .catch(() => window.showErrorMessage('Error'));
};
