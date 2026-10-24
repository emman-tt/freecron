import { User } from "../../database/db.schema.js";
import db from "../../database/db.config.js";
import { eq } from "drizzle-orm";
import type { updateUserDTO } from "./user.types.js";

export class UserRepository {
  async findById(id: string) {
    const [found] = await db.select().from(User).where(eq(User.id, id));
    return found;
  }

  async update(id: string, updateDTO: updateUserDTO) {
    const updateData: Record<string, any> = {};
    let length = 0;

    for (const [key, value] of Object.entries(updateDTO)) {
      if (value !== undefined) {
        length++;
        updateData[key] = value;
      }
    }
    if (!length) {
      return await db.select().from(User).where(eq(User.id, id));
    }

    const updated = await db
      .update(User)
      .set(updateData)
      .where(eq(User.id, id))
      .returning();
    return updated;
  }

  async delete(id: string) {
    await db.delete(User).where(eq(User.id, id));
  }
}

export const userRepo = new UserRepository();
