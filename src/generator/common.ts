import {
  createSourceFile,
  forEachChild,
  ScriptTarget,
  SyntaxKind,
  Node,
  ExportAssignment,
  VariableStatement,
  NamedDeclaration,
} from 'typescript';
import { window } from 'vscode';
import { ensureDirectoryExists, openFileInVsCode, readContentFromFile, writeContentToFile } from './fileUtils';

interface Exports {
  namedExports: Array<string>;
  hasDefaultExport: boolean;
}

const extractNode = (node: Node, sourceFileExports: Exports) => {
  switch (node.kind) {
    case SyntaxKind.ClassDeclaration:
    case SyntaxKind.FunctionDeclaration:
      // Classes and functions as named exports
      const namedDeclaration = node as NamedDeclaration;
      if (
        namedDeclaration.modifiers &&
        namedDeclaration.modifiers.some(modifier => modifier.kind === SyntaxKind.ExportKeyword) &&
        namedDeclaration.name.kind === SyntaxKind.Identifier
      ) {
        sourceFileExports.namedExports.push(namedDeclaration.name.text);
      }
      break;
    case SyntaxKind.VariableStatement:
      // Variables as named exports
      const variableStatement = node as VariableStatement;
      if (
        variableStatement.modifiers &&
        variableStatement.modifiers.some(modifier => modifier.kind === SyntaxKind.ExportKeyword)
      ) {
        variableStatement.declarationList.declarations.forEach(variableDeclaration => {
          if (variableDeclaration.name.kind === SyntaxKind.Identifier) {
            sourceFileExports.namedExports.push(variableDeclaration.name.text);
          }
        });
      }
      break;
    case SyntaxKind.ExportAssignment:
      // This is an export default... clause as long as isExportEquals is falsy
      sourceFileExports.hasDefaultExport = !(node as ExportAssignment).isExportEquals;
      break;
    default:
      // By default, continue traversing the node tree
      forEachChild(node, node => extractNode(node, sourceFileExports));
      break;
  }
};

const convertDependenciesToImports = (dependencies: Exports, moduleName: string, fileName: string) => {
  // TODO: resolve name clashes between default (moduleName) and named exports
  let importClause = '';
  if (dependencies.hasDefaultExport) {
    importClause += `${moduleName}`;
  }
  if (dependencies.namedExports.length > 0) {
    importClause += `${dependencies.hasDefaultExport ? ', ' : ''}{ ${dependencies.namedExports.join(', ')} }`;
  }
  return `import ${importClause} from '../${fileName}';`;
};

const extractSourceCode = (sourceCodeFilePath: string): Promise<Exports> => {
  const dependencies: Exports = {
    namedExports: [],
    hasDefaultExport: false,
  };
  return readContentFromFile(sourceCodeFilePath)
    .then(fileContents => createSourceFile(sourceCodeFilePath, fileContents, ScriptTarget.ES2015, true))
    .then(sourceFile => {
      extractNode(sourceFile, dependencies);
      return dependencies;
    });
};

interface TestFileInformation {
  name: string;
  suffix: string;
  extension: string;
  directoryPath: string;
}

const getTestFileInformation = (sourceFilePath: string): TestFileInformation => {
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

export const generateUnitTestSuite = (sourceCodeFilePath: string) => {
  const { name, suffix, extension, directoryPath } = getTestFileInformation(sourceCodeFilePath);
  // Finally, construct the path at which we will create the unit test file
  const testFileAbsolutePath = `${directoryPath}${name}.${suffix}${extension}`;

  return ensureDirectoryExists(directoryPath)
    .then(() => extractSourceCode(sourceCodeFilePath))
    .then(dependencies => convertDependenciesToImports(dependencies, name, name))
    .then(fileContent => writeContentToFile(fileContent, testFileAbsolutePath))
    .then(() => openFileInVsCode(testFileAbsolutePath))
    .catch((error: Error) => {
      window.showErrorMessage(error.message);
    });
};
