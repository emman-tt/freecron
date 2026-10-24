import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import type { Request, Response, NextFunction } from "express";
import { UserController } from "../user.controller.js";
import type { UserService } from "../user.service.js";
import type { userResponseDTO } from "../user.types.js";
import { ValidationError } from "../../../shared/errors/business.errors.js";
import type { Logger } from "pino";

describe("User Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const USER_ID = "123e4567-e89b-12d3-a456-426614174000";

  const userDTO: userResponseDTO = {
    id: USER_ID,
    name: "Emma",
    email: "emma@example.com",
    emailVerified: true,
    image: null,
  };

  const userService = {
    find: jest.fn<(userId: string, log: Logger) => Promise<userResponseDTO>>(),
    update: jest.fn<
      (
        userId: string,
        payload: unknown,
        log: Logger,
      ) => Promise<userResponseDTO>
    >(),
    delete: jest.fn<(userId: string, log: Logger) => Promise<userResponseDTO>>(),
  };

  const mockLog = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as Logger;

  const controller = new UserController(
    userService as unknown as UserService,
  );

  // userId mirrors what authMiddleware attaches from the session —
  // controllers never read it from query/body anymore.
  function mockReq(parts: {
    body?: Record<string, unknown>;
  } = {}): Request {
    return {
      params: {},
      query: {},
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

  // FIND

  it("should return the authenticated user profile", async () => {
    //Arrange
    userService.find.mockResolvedValue(userDTO);
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.find(req, res, next as unknown as NextFunction);

    //Assert
    expect(userService.find).toHaveBeenCalledWith(USER_ID, mockLog);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      data: userDTO,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should forward find service errors to next", async () => {
    //Arrange
    userService.find.mockRejectedValue(new Error("db down"));
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.find(req, res, next as unknown as NextFunction);

    //Assert
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  // UPDATE

  it("should update the authenticated user from body payload", async () => {
    //Arrange
    userService.update.mockResolvedValue({ ...userDTO, name: "Emmanuel" });
    const req = mockReq({ body: { name: "Emmanuel" } });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.update(req, res, next as unknown as NextFunction);

    //Assert
    expect(userService.update).toHaveBeenCalledWith(
      USER_ID,
      { name: "Emmanuel" },
      mockLog,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      data: { ...userDTO, name: "Emmanuel" },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should clear the image when null is sent", async () => {
    //Arrange
    userService.update.mockResolvedValue({ ...userDTO, image: null });
    const req = mockReq({ body: { image: null } });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.update(req, res, next as unknown as NextFunction);

    //Assert
    expect(userService.update).toHaveBeenCalledWith(
      USER_ID,
      { image: null },
      mockLog,
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should forward invalid update body to next", async () => {
    //Arrange
    const req = mockReq({ body: { name: "   " } });
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.update(req, res, next as unknown as NextFunction);

    //Assert
    expect(userService.update).not.toHaveBeenCalled();
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(ValidationError);
  });

  // DELETE

  it("should delete the authenticated account and return its profile", async () => {
    //Arrange
    userService.delete.mockResolvedValue(userDTO);
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.delete(req, res, next as unknown as NextFunction);

    //Assert
    expect(userService.delete).toHaveBeenCalledWith(USER_ID, mockLog);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      data: userDTO,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should forward delete service errors to next", async () => {
    //Arrange
    userService.delete.mockRejectedValue(new Error("db down"));
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    //Act
    await controller.delete(req, res, next as unknown as NextFunction);

    //Assert
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
