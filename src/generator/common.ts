import { readFile, writeFile, mkdir } from 'fs';
import {
  createSourceFile,
  forEachChild,
  ScriptTarget,
  SyntaxKind,
  Node,
  ExportAssignment,
  ExportSpecifier,
  VariableStatement,
  VariableDeclaration,
} from 'typescript';
import { commands, Uri, window } from 'vscode';

interface Dependencies {
  namedExports: Array<string>;
  hasDefaultExport: boolean;
}

const extractNode = (node: Node): Dependencies | undefined => {
  // TODO: pass dependencies down
  const dependencies: Dependencies = {
    namedExports: [],
    hasDefaultExport: false,
  };
  switch (node.kind) {
    case SyntaxKind.VariableStatement:
      // This covers the case of exported variables (named export) from the file
      if ((node as VariableStatement).modifiers.some(modifier => modifier.kind === SyntaxKind.ExportKeyword)) {
        const exportedMembers = forEachChild(node, extractNode);
        if (exportedMembers && exportedMembers.namedExports) {
          exportedMembers.namedExports.forEach(namedExport => {
            dependencies.namedExports.push(namedExport);
          });
        }
      }
      return dependencies;
    case SyntaxKind.VariableDeclaration:
      const variableDeclaration = node as VariableDeclaration;
      if (variableDeclaration.name.kind === SyntaxKind.Identifier) {
        dependencies.namedExports.push(variableDeclaration.name.text);
      }
      return dependencies;
    case SyntaxKind.ExportAssignment:
      // This is an export default... clause as long as isExportEquals is falsy
      dependencies.hasDefaultExport = !(node as ExportAssignment).isExportEquals;
      return dependencies;
    case SyntaxKind.ExportSpecifier:
      // This is a named export clause
      const namedExportExpression = node as ExportSpecifier;
      dependencies.namedExports.push(namedExportExpression.name.text);
      return dependencies;
    default:
      // If we arrive at a node that we do not care to process continue iterating over the node's children
      return forEachChild(node, extractNode);
  }
};

const convertDependenciesToImports = (dependencies: Dependencies, moduleName: string) => {
  let importClause = '';
  if (dependencies.namedExports.length > 0) {
    importClause = `import { ${dependencies.namedExports.join(', ')} }`;
    if (dependencies.hasDefaultExport) {
      importClause += `, ${moduleName}`;
    }
  } else if (dependencies.hasDefaultExport) {
    importClause = `import ${moduleName}`;
  }
  return `${importClause} from `;
};

const extractSourceCode = (sourceCodeFilePath: string): Promise<Dependencies> => {
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
    .then(extractNode);
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
    .then(dependencies => convertDependenciesToImports(dependencies, testSuiteName))
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
