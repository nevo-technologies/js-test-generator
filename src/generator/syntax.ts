import {
  createSourceFile,
  ExportAssignment,
  forEachChild,
  NamedDeclaration,
  Node,
  ScriptTarget,
  SyntaxKind,
  VariableStatement,
  SourceFile,
} from 'typescript';
import { readContentFromFile } from './fileUtils';

export interface ModuleDependencies {
  namedExports: Array<string>;
  hasDefaultExport: boolean;
}

export const createFileContent = (dependencies: ModuleDependencies, moduleName: string, fileName: string) => {
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

export const extractSourceCode = (sourceCodeFilePath: string): Promise<ModuleDependencies> =>
  readContentFromFile(sourceCodeFilePath)
    .then(fileContent => createSourceFile(sourceCodeFilePath, fileContent, ScriptTarget.ES2015, true))
    .then(inspectSourceFile);

const inspectSourceFile = (sourceFile: SourceFile): ModuleDependencies => {
  const dependencies: ModuleDependencies = {
    namedExports: [],
    hasDefaultExport: false,
  };
  extractNode(sourceFile, dependencies);
  return dependencies;
};

const extractNode = (node: Node, sourceFileExports: ModuleDependencies) => {
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
