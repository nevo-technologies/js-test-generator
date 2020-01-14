import { readFile, writeFile, mkdir } from 'fs';
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
import { commands, Uri, window } from 'vscode';

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
  return new Promise<string>((resolve, reject) => {
    readFile(sourceCodeFilePath, (error, data) => {
      if (error) {
        reject(new Error(error.message));
      } else {
        resolve(data.toString());
      }
    });
  })
    .then(fileContents => createSourceFile(sourceCodeFilePath, fileContents, ScriptTarget.ES2015, true))
    .then(sourceFile => {
      extractNode(sourceFile, dependencies);
      return dependencies;
    });
};

export const generateUnitTestSuite = (sourceCodeFilePath: string) => {
  // Find the last occurrence of "/"" in the path to separate the file name from the parent directory and full path
  const fileNamePosition = sourceCodeFilePath.lastIndexOf('/') + 1;
  const extensionPosition = sourceCodeFilePath.indexOf('.', fileNamePosition);
  // By default, name the suite to match the file name (minus extension)
  const testSuiteName = sourceCodeFilePath.slice(fileNamePosition, extensionPosition);

  const testDirectoryName = '__tests__';
  // A special suffix to differentiate test files
  const testFileSuffix = 'spec';
  const testDirectoryAbsolutePath = sourceCodeFilePath.slice(0, fileNamePosition) + testDirectoryName + '/';
  const extension = sourceCodeFilePath.slice(extensionPosition);
  // Finally, construct the path at which we will create the unit test file
  const testFileAbsolutePath = `${testDirectoryAbsolutePath}${testSuiteName}.${testFileSuffix}${extension}`;

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
    .then(() => extractSourceCode(sourceCodeFilePath))
    .then(dependencies => convertDependenciesToImports(dependencies, testSuiteName, testSuiteName))
    .then(
      fileContents =>
        new Promise((resolve, reject) => {
          // Write the generated contents to the unit test file
          writeFile(testFileAbsolutePath, fileContents, error => {
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
    .catch((error: Error) => {
      window.showErrorMessage(error.message);
    });
};
