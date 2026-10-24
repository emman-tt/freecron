// jest.setup.ts
import { beforeEach, jest } from "@jest/globals";
import { createFetchMock } from "jest-fetch-mock/factory";

const fetchMock = createFetchMock(jest);
fetchMock.enableMocks();

beforeEach(() => {
  fetchMock.resetMocks();
});
