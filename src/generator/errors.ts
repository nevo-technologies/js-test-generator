export enum ErrorCode {
  Unknown,
  UnableToCreateTestDirectory,
  UnitTestFileExists,
}

export const bypassErrorCodes: Array<ErrorCode> = [ErrorCode.UnitTestFileExists];

export interface GeneratorError {
  code: ErrorCode;
  message: string;
}
