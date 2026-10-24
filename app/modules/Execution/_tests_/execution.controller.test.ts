import {
  describe,
  expect,
  it,
  jest,
  beforeEach,
} from "@jest/globals";
import type { Request, Response, NextFunction } from "express";
import { ExecutionController } from "../execution.controller.js";
import type { ExecutionService } from "../execution.service.js";
import { ValidationError } from "../../../shared/errors/business.errors.js";

describe("Execution Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const executionDTO = {
    id: 1,
    jobId: 3,
    startedAt: new Date("2026-09-14T06:30:00.000Z"),
    status: "success",
    completedAt: new Date("2026-09-14T06:30:05.000Z"),
    duration: 5000,
  };

  const executionService = {
    findAll: jest.fn<
      (jobId: number, pagination: unknown) => Promise<{
        data: unknown[];
        meta: unknown;
      }>
    >(),
  };

  const controller = new ExecutionController(
    executionService as unknown as ExecutionService,
  );

  function mockReq(query: Record<string, unknown>): Request {
    return { query } as unknown as Request;
  }

  function mockRes(): Response {
    const res = {
      status: jest.fn<(code: number) => unknown>(),
      json: jest.fn<(body: unknown) => unknown>(),
    };
    res.status.mockReturnValue(res);
    res.json.mockReturnValue(res);
    return res as unknown as Response;
  }

  function mockNext(): ReturnType<typeof jest.fn<(err?: unknown) => void>> {
    return jest.fn<(err?: unknown) => void>();
  }

  it("should list with pagination defaults", async () => {
    //Arrange
    const paginated = {
      data: [executionDTO],
      meta: { page: 1, limit: 20, total: 1 },
    };
    executionService.findAll.mockResolvedValue(paginated);
    const req = mockReq({ jobId: "3" });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.FindExecutions(req, res, next as unknown as NextFunction);

    //Assert
    expect(executionService.findAll).toHaveBeenCalledWith(3, {
      page: 1,
      limit: 20,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      data: paginated.data,
      meta: paginated.meta,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should coerce page and limit strings to numbers", async () => {
    //Arrange
    const paginated = { data: [], meta: { page: 2, limit: 5, total: 0 } };
    executionService.findAll.mockResolvedValue(paginated);
    const req = mockReq({ jobId: "3", page: "2", limit: "5" });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.FindExecutions(req, res, next as unknown as NextFunction);

    //Assert
    expect(executionService.findAll).toHaveBeenCalledWith(3, {
      page: 2,
      limit: 5,
    });
  });

  it("should forward missing jobId to next", async () => {
    //Arrange
    const req = mockReq({});
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.FindExecutions(req, res, next as unknown as NextFunction);

    //Assert
    expect(executionService.findAll).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(ValidationError);
  });

  it("should reject a limit above the maximum", async () => {
    //Arrange
    const req = mockReq({ jobId: "3", limit: "500" });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.FindExecutions(req, res, next as unknown as NextFunction);

    //Assert
    expect(executionService.findAll).not.toHaveBeenCalled();
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(ValidationError);
  });

  it("should forward service errors to next", async () => {
    //Arrange
    executionService.findAll.mockRejectedValue(new Error("db down"));
    const req = mockReq({ jobId: "3" });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.FindExecutions(req, res, next as unknown as NextFunction);

    //Assert
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
