import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import type { Request, Response, NextFunction } from "express";
import { JobController } from "../job.controller.js";
import type { JobService } from "../job.service.js";
import type { CronService } from "../../../shared/lib/cron.service.js";
import type { jobResponseDTO } from "../job.types.js";
import { ValidationError } from "../../../shared/errors/business.errors.js";
import type { Logger } from "pino";

describe("Job Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cronManager.validateCron.mockReturnValue(true);
  });

  const USER_ID = "123e4567-e89b-12d3-a456-426614174000";

  const jobDTO: jobResponseDTO = {
    id: 5,
    name: "astroverse",
    description: null,
    cronExpression: "*/5 * * * *",
    httpCommand: "https://google.com",
    httpMethod: "GET",
    isActive: true,
    lastRunAt: null,
    nextRunAt: new Date("2026-09-14T06:30:00.000Z"),
  };

  const jobService = {
    createJob:
      jest.fn<
        (data: unknown, userId: string, log: Logger) => Promise<jobResponseDTO>
      >(),
    findJobUser:
      jest.fn<
        (jobId: number, userId: string, log: Logger) => Promise<jobResponseDTO>
      >(),
    findAllJobsUser: jest.fn<
      (
        userId: string,
        pagination: unknown,
        filters: unknown,
        log: Logger,
      ) => Promise<{
        data: jobResponseDTO[];
        meta: unknown;
      }>
    >(),
    toggleActive:
      jest.fn<
        (jobId: number, userId: string, log: Logger) => Promise<jobResponseDTO>
      >(),
    updateJob:
      jest.fn<
        (
          jobId: number,
          payload: unknown,
          userId: string,
          log: Logger,
        ) => Promise<jobResponseDTO>
      >(),
    runJobNow:
      jest.fn<(jobId: number, userId: string, log: Logger) => Promise<void>>(),
    deleteJob:
      jest.fn<(jobId: number, userId: string, log: Logger) => Promise<void>>(),
  };

  const mockLog = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as Logger;

  const cronManager = {
    validateCron: jest.fn<(cron: string) => boolean>(),
  };

  const controller = new JobController(
    cronManager as unknown as CronService,
    jobService as unknown as JobService,
  );

  // userId mirrors what authMiddleware attaches from the session —
  // controllers never read it from query/body anymore.
  function mockReq(parts: {
    params?: Record<string, unknown>;
    query?: Record<string, unknown>;
    body?: Record<string, unknown>;
  }): Request {
    return {
      params: parts.params ?? {},
      query: parts.query ?? {},
      body: parts.body ?? {},
      log: mockLog,
      userId: USER_ID,
    } as unknown as Request;
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

  // CREATE

  it("should create a job and return 201", async () => {
    //Arrange
    jobService.createJob.mockResolvedValue(jobDTO);
    const req = mockReq({
      body: {
        name: "astroverse",
        cronExpression: "*/5 * * * *",
        httpMethod: "GET",

        description: null,
        httpBody: {},
        httpHeader: {},
        httpCommand: "https://google.com",
      },
    });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.create(req, res, next as unknown as NextFunction);

    //Assert
    expect(jobService.createJob).toHaveBeenCalledWith(
      expect.objectContaining({ name: "astroverse" }),
      USER_ID,
      mockLog,
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      data: jobDTO,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should forward body validation errors to next", async () => {
    //Arrange (missing name)
    const req = mockReq({
      body: {
        cronExpression: "*/5 * * * *",
        httpMethod: "GET",

        description: null,
        httpBody: {},
        httpHeader: {},
        httpCommand: "https://google.com",
      },
    });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.create(req, res, next as unknown as NextFunction);

    //Assert
    expect(jobService.createJob).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(ValidationError);
  });

  it("should reject an invalid cron expression", async () => {
    //Arrange
    cronManager.validateCron.mockReturnValue(false);
    const req = mockReq({
      body: {
        name: "astroverse",
        cronExpression: "not-a-cron",
        httpMethod: "GET",

        description: null,
        httpBody: {},
        httpHeader: {},
        httpCommand: "https://google.com",
      },
    });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.create(req, res, next as unknown as NextFunction);

    //Assert
    expect(jobService.createJob).not.toHaveBeenCalled();
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(ValidationError);
  });

  // FIND ONE

  it("should find a job from params id and authenticated user", async () => {
    //Arrange
    jobService.findJobUser.mockResolvedValue(jobDTO);
    const req = mockReq({ params: { jobId: "5" } });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.findJob(req, res, next as unknown as NextFunction);

    //Assert
    expect(jobService.findJobUser).toHaveBeenCalledWith(5, USER_ID, mockLog);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      data: jobDTO,
    });
  });

  it("should forward missing jobId to next", async () => {
    //Arrange
    const req = mockReq({ params: {} });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.findJob(req, res, next as unknown as NextFunction);

    //Assert
    expect(jobService.findJobUser).not.toHaveBeenCalled();
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(ValidationError);
  });

  it("should forward service errors to next", async () => {
    //Arrange
    jobService.findJobUser.mockRejectedValue(new Error("db down"));
    const req = mockReq({ params: { jobId: "5" } });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.findJob(req, res, next as unknown as NextFunction);

    //Assert
    expect(next).toHaveBeenCalledWith(expect.objectContaining({}));
    expect(res.status).not.toHaveBeenCalled();
  });

  // FIND ALL

  it("should list with pagination defaults and empty filters", async () => {
    //Arrange
    const paginated = {
      data: [jobDTO],
      meta: { page: 1, limit: 20, total: 1 },
    };
    jobService.findAllJobsUser.mockResolvedValue(paginated);
    const req = mockReq({});
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.findAllJobs(req, res, next as unknown as NextFunction);

    //Assert
    expect(jobService.findAllJobsUser).toHaveBeenCalledWith(
      USER_ID,
      { page: 1, limit: 20 },
      {},
      mockLog,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      data: paginated.data,
      meta: paginated.meta,
    });
  });

  it("should parse flat filter params with real booleans", async () => {
    //Arrange
    const paginated = {
      data: [jobDTO],
      meta: { page: 1, limit: 20, total: 1 },
    };
    jobService.findAllJobsUser.mockResolvedValue(paginated);
    const req = mockReq({
      query: {

        isActive: "false",
        httpMethod: "POST",
        name: "back",
      },
    });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.findAllJobs(req, res, next as unknown as NextFunction);

    //Assert ("false" must become boolean false, not truthy string)
    expect(jobService.findAllJobsUser).toHaveBeenCalledWith(
      USER_ID,
      { page: 1, limit: 20 },
      { isActive: false, httpMethod: "POST", name: "back" },
      mockLog,
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should reject an invalid httpMethod filter", async () => {
    //Arrange
    const req = mockReq({ query: { httpMethod: "FETCH" } });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.findAllJobs(req, res, next as unknown as NextFunction);

    //Assert
    expect(jobService.findAllJobsUser).not.toHaveBeenCalled();
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(ValidationError);
  });

  // TOGGLE

  it("should toggle a job from params id", async () => {
    //Arrange
    jobService.toggleActive.mockResolvedValue({ ...jobDTO, isActive: false });
    const req = mockReq({ params: { jobId: "5" } });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.toggleActive(req, res, next as unknown as NextFunction);

    //Assert
    expect(jobService.toggleActive).toHaveBeenCalledWith(5, USER_ID, mockLog);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      data: { ...jobDTO, isActive: false },
    });
  });

  // UPDATE

  it("should update from params id, authenticated user and body payload", async () => {
    //Arrange
    jobService.updateJob.mockResolvedValue({ ...jobDTO, name: "renamed" });
    const req = mockReq({
      params: { jobId: "5" },
      body: { name: "renamed" },
    });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.update(req, res, next as unknown as NextFunction);

    //Assert
    expect(jobService.updateJob).toHaveBeenCalledWith(
      5,
      { name: "renamed" },
      USER_ID,
      mockLog,
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should forward invalid update body to next", async () => {
    //Arrange
    const req = mockReq({
      params: { jobId: "5" },
      body: { name: "   " },
    });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.update(req, res, next as unknown as NextFunction);

    //Assert
    expect(jobService.updateJob).not.toHaveBeenCalled();
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(ValidationError);
  });

  // RUN NOW + DELETE

  it("should run a job now and return true", async () => {
    //Arrange
    jobService.runJobNow.mockResolvedValue(undefined);
    const req = mockReq({ params: { jobId: "5" } });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.runNow(req, res, next as unknown as NextFunction);

    //Assert
    expect(jobService.runJobNow).toHaveBeenCalledWith(5, USER_ID, mockLog);
    expect(res.json).toHaveBeenCalledWith({ status: "success", data: true });
  });

  it("should delete a job and return true", async () => {
    //Arrange
    jobService.deleteJob.mockResolvedValue(undefined);
    const req = mockReq({ params: { jobId: "5" } });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.delete(req, res, next as unknown as NextFunction);

    //Assert
    expect(jobService.deleteJob).toHaveBeenCalledWith(5, USER_ID, mockLog);
    expect(res.json).toHaveBeenCalledWith({ status: "success", data: true });
  });

  it("should forward delete service errors to next", async () => {
    //Arrange
    jobService.deleteJob.mockRejectedValue(new Error("db down"));
    const req = mockReq({ params: { jobId: "5" } });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.delete(req, res, next as unknown as NextFunction);

    //Assert
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
