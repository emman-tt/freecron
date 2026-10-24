import { type updateUserDTO, type userResponseDTO } from "./user.types.js";
import type { UserRepository } from "./user.repository.js";
import type { User as UserEntity } from "../../shared/types/entities.js";
import { NotFoundError } from "../../shared/errors/business.errors.js";
import type { Logger } from "pino";

export class UserService {
  private userRepo: UserRepository;

  constructor(userRepo: UserRepository) {
    this.userRepo = userRepo;
  }

  async find(userId: string, log: Logger): Promise<userResponseDTO> {
    const fetched = (await this.userRepo.findById(userId)) as UserEntity;

    if (!fetched) {
      log.warn({ userId }, "user not found");
      throw new NotFoundError();
    }

    return this.toResponseDTO(fetched);
  }

  async update(
    userId: string,
    updateDTO: updateUserDTO,
    log: Logger,
  ): Promise<userResponseDTO> {
    const fetched = (await this.userRepo.findById(userId)) as UserEntity;

    if (!fetched) {
      log.warn({ userId }, "user not found");
      throw new NotFoundError();
    }

    const [updated] = await this.userRepo.update(userId, updateDTO);

    if (!updated) {
      log.warn({ userId }, "user not found");
      throw new NotFoundError();
    }

    log.info({ userId }, "user updated");

    return this.toResponseDTO(updated);
  }

  async delete(userId: string, log: Logger): Promise<userResponseDTO> {
    const fetched = (await this.userRepo.findById(userId)) as UserEntity;

    if (!fetched) {
      log.warn({ userId }, "user not found");
      throw new NotFoundError();
    }

    await this.userRepo.delete(userId);

    log.info({ userId }, "user account deleted");

    return this.toResponseDTO(fetched);
  }

  private toResponseDTO(entity: UserEntity): userResponseDTO {
    return {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      emailVerified: entity.emailVerified,
      image: entity.image,
    };
  }
}
