import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import type { User } from "../../../shared/types/entities.js";
import type {
  updateUserDTO,
  userResponseDTO,
} from "../user.types.js";
import { UserService } from "../user.service.js";
import type { UserRepository } from "../user.repository.js";
import { NotFoundError } from "../../../shared/errors/business.errors.js";
import type { Logger } from "pino";

describe("User Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const userId = "123e4567-e89b-12d3-a456-426614174000";

  const dbUser = {
    id: userId,
    name: "Emma",
    email: "emma@example.com",
    emailVerified: true,
    image: null,
  } as User;

  const userDTO: userResponseDTO = {
    id: userId,
    name: "Emma",
    email: "emma@example.com",
    emailVerified: true,
    image: null,
  };

  const userRepo = {
    findById: jest.fn<(id: string) => Promise<User | undefined>>(),
    update: jest.fn<(id: string, dto: updateUserDTO) => Promise<User[]>>(),
    delete: jest.fn<(id: string) => Promise<void>>(),
  };

  const mockLog = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as Logger;

  const userService = new UserService(
    userRepo as unknown as UserRepository,
  );

  // FIND

  it("should find a user by id", async () => {
    //Arrange
    userRepo.findById.mockResolvedValue(dbUser);

    //Act
    const result = await userService.find(userId, mockLog);

    //Assert
    expect(userRepo.findById).toHaveBeenCalledWith(userId);
    expect(result).toEqual(userDTO);
  });

  it("should throw when the user does not exist", async () => {
    //Arrange
    userRepo.findById.mockResolvedValue(undefined);

    //Act + Assert
    await expect(userService.find(userId, mockLog)).rejects.toThrow(
      NotFoundError,
    );
    expect(mockLog.warn).toHaveBeenCalledWith(
      expect.objectContaining({ userId }),
      expect.any(String),
    );
  });

  // UPDATE

  it("should update a user and return the updated profile", async () => {
    //Arrange
    const update = { name: "Emmanuel" };
    const updated = { ...dbUser, name: "Emmanuel" };
    userRepo.findById.mockResolvedValue(dbUser);
    userRepo.update.mockResolvedValue([updated]);

    //Act
    const result = await userService.update(userId, update, mockLog);

    //Assert
    expect(userRepo.update).toHaveBeenCalledWith(userId, update);
    expect(mockLog.info).toHaveBeenCalledWith(
      expect.objectContaining({ userId }),
      "user updated",
    );
    expect(result).toMatchObject({ ...userDTO, name: "Emmanuel" });
  });

  it("should throw when updating a missing user without touching db", async () => {
    //Arrange
    userRepo.findById.mockResolvedValue(undefined);

    //Act + Assert
    await expect(
      userService.update(userId, { name: "x" }, mockLog),
    ).rejects.toThrow(NotFoundError);
    expect(userRepo.update).not.toHaveBeenCalled();
  });

  // DELETE

  it("should delete an account and return its profile", async () => {
    //Arrange
    userRepo.findById.mockResolvedValue(dbUser);
    userRepo.delete.mockResolvedValue(undefined);

    //Act
    const result = await userService.delete(userId, mockLog);

    //Assert
    expect(userRepo.delete).toHaveBeenCalledWith(userId);
    expect(mockLog.info).toHaveBeenCalledWith(
      expect.objectContaining({ userId }),
      "user account deleted",
    );
    expect(result).toEqual(userDTO);
  });

  it("should throw when deleting a missing account without touching db", async () => {
    //Arrange
    userRepo.findById.mockResolvedValue(undefined);

    //Act + Assert
    await expect(
      userService.delete(userId, mockLog),
    ).rejects.toThrow(NotFoundError);
    expect(userRepo.delete).not.toHaveBeenCalled();
  });
});
