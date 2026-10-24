import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import type { Request, Response, NextFunction } from "express";
import { NotificationController } from "../notification.controller.js";
import type { NotificationService } from "../notification.service.js";
import type {
  createNotificationDTO,
  notificationResponseDTO,
  updateNotificationDTO,
} from "../notification.types.js";
import { ValidationError } from "../../../shared/errors/business.errors.js";
import type { Logger } from "pino";

describe("Notification Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const USER_ID = "123e4567-e89b-12d3-a456-426614174000";
  const JOB_ID = 9;

  const notificationDTO: notificationResponseDTO = {
    id: 5,
    jobId: JOB_ID,
    type: "email",
    event: "failure",
    target: "owner@example.com",
    enabled: true,
  };

  const notificationService = {
    create: jest.fn<
      (
        jobId: number,
        data: createNotificationDTO,
        userId: string,
        log: Logger,
      ) => Promise<notificationResponseDTO>
    >(),
    findOne: jest.fn<
      (
        notificationId: number,
        userId: string,
        log: Logger,
      ) => Promise<notificationResponseDTO>
    >(),
    findAllByJob: jest.fn<
      (
        jobId: number,
        pagination: unknown,
        userId: string,
        log: Logger,
      ) => Promise<{
        data: notificationResponseDTO[];
        meta: unknown;
      }>
    >(),
    toggleEnabled: jest.fn<
      (
        notificationId: number,
        userId: string,
        log: Logger,
      ) => Promise<notificationResponseDTO>
    >(),
    update: jest.fn<
      (
        notificationId: number,
        payload: updateNotificationDTO,
        userId: string,
        log: Logger,
      ) => Promise<notificationResponseDTO>
    >(),
    delete: jest.fn<
      (notificationId: number, userId: string, log: Logger) => Promise<void>
    >(),
  };

  const mockLog = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as Logger;

  const controller = new NotificationController(
    notificationService as unknown as NotificationService,
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

  it("should create a notification and return 201", async () => {
    //Arrange
    notificationService.create.mockResolvedValue(notificationDTO);
    const req = mockReq({
      body: {
        jobId: JOB_ID,
        type: "email",
        event: "failure",
        target: "owner@example.com",
        channelId: "abcd"
      },
    });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.create(req, res, next as unknown as NextFunction);

    //Assert
    expect(notificationService.create).toHaveBeenCalledWith(
      JOB_ID,
      {
        type: "email",
        event: "failure",
        target: "owner@example.com",
        enabled: undefined,
        channelId:"abcd"
      },
      USER_ID,
      mockLog,
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      data: notificationDTO,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should reject a non-email target for type email", async () => {
    //Arrange
    const req = mockReq({
      body: {
        jobId: JOB_ID,
        type: "email",
        event: "failure",
        target: "not-an-email",
      },
    });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.create(req, res, next as unknown as NextFunction);

    //Assert
    expect(notificationService.create).not.toHaveBeenCalled();
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(ValidationError);
  });

  it("should reject a non-url target for type slack", async () => {
    //Arrange
    const req = mockReq({
      body: {
        jobId: JOB_ID,
        type: "slack",
        event: "success",
        target: "not-a-url",
      },
    });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.create(req, res, next as unknown as NextFunction);

    //Assert
    expect(notificationService.create).not.toHaveBeenCalled();
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(ValidationError);
  });

  // FIND ONE

  it("should find a notification from params id and authenticated user", async () => {
    //Arrange
    notificationService.findOne.mockResolvedValue(notificationDTO);
    const req = mockReq({
      params: { notificationId: "5" },
    });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.findOne(req, res, next as unknown as NextFunction);

    //Assert
    expect(notificationService.findOne).toHaveBeenCalledWith(
      5,
      USER_ID,
      mockLog,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      data: notificationDTO,
    });
  });

  it("should forward missing notificationId to next", async () => {
    //Arrange
    const req = mockReq({ params: {} });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.findOne(req, res, next as unknown as NextFunction);

    //Assert
    expect(notificationService.findOne).not.toHaveBeenCalled();
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(ValidationError);
  });

  // FIND ALL

  it("should list with pagination defaults", async () => {
    //Arrange
    const paginated = {
      data: [notificationDTO],
      meta: { page: 1, limit: 20, total: 1 },
    };
    notificationService.findAllByJob.mockResolvedValue(paginated);
    const req = mockReq({ query: { jobId: String(JOB_ID) } });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.findAll(req, res, next as unknown as NextFunction);

    //Assert
    expect(notificationService.findAllByJob).toHaveBeenCalledWith(
      JOB_ID,
      { page: 1, limit: 20 },
      USER_ID,
      mockLog,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      data: paginated.data,
      meta: paginated.meta,
    });
  });

  // TOGGLE

  it("should toggle a notification from params id", async () => {
    //Arrange
    notificationService.toggleEnabled.mockResolvedValue({
      ...notificationDTO,
      enabled: false,
    });
    const req = mockReq({
      params: { notificationId: "5" },
    });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.toggle(req, res, next as unknown as NextFunction);

    //Assert
    expect(notificationService.toggleEnabled).toHaveBeenCalledWith(
      5,
      USER_ID,
      mockLog,
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // UPDATE

  it("should update from params id, authenticated user and body payload", async () => {
    //Arrange
    notificationService.update.mockResolvedValue({
      ...notificationDTO,
      event: "success",
    });
    const req = mockReq({
      params: { notificationId: "5" },
      body: { event: "success" },
    });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.update(req, res, next as unknown as NextFunction);

    //Assert
    expect(notificationService.update).toHaveBeenCalledWith(
      5,
      { event: "success" },
      USER_ID,
      mockLog,
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should reject mismatched type and target on update", async () => {
    //Arrange
    const req = mockReq({
      params: { notificationId: "5" },
      body: { type: "slack", target: "not-a-url" },
    });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.update(req, res, next as unknown as NextFunction);

    //Assert
    expect(notificationService.update).not.toHaveBeenCalled();
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(ValidationError);
  });

  it("should require target when changing type on update", async () => {
    //Arrange (boundary cannot see the stored row, so type-only flips
    // must carry their target or slip through unvalidated)
    const req = mockReq({
      params: { notificationId: "5" },
      body: { type: "slack" },
    });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.update(req, res, next as unknown as NextFunction);

    //Assert
    expect(notificationService.update).not.toHaveBeenCalled();
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(ValidationError);
  });

  // DELETE

  it("should delete a notification and return true", async () => {
    //Arrange
    notificationService.delete.mockResolvedValue(undefined);
    const req = mockReq({
      params: { notificationId: "5" },
    });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.delete(req, res, next as unknown as NextFunction);

    //Assert
    expect(notificationService.delete).toHaveBeenCalledWith(
      5,
      USER_ID,
      mockLog,
    );
    expect(res.json).toHaveBeenCalledWith({ status: "success", data: true });
  });

  it("should forward service errors to next", async () => {
    //Arrange
    notificationService.delete.mockRejectedValue(
      new Error("db down"),
    );
    const req = mockReq({
      params: { notificationId: "5" },
    });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.delete(req, res, next as unknown as NextFunction);

    //Assert
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
