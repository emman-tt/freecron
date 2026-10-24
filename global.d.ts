import "jest-fetch-mock";
declare global {
  namespace Express {
    interface Request {
      log: Logger;
      userId:string
    }
  }
}
