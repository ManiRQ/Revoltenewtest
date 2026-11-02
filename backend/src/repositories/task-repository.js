import { randomUUID } from "node:crypto";
import { asc, count, eq } from "drizzle-orm";
import { tasks } from "../db/schema.js";

export function createTaskRepository(db) {
  return {
    async list({ limit, offset }) {
      const [countResult, records] = await Promise.all([
        db.select({ total: count() }).from(tasks),
        db
          .select()
          .from(tasks)
          .orderBy(asc(tasks.id))
          .limit(limit)
          .offset(offset),
      ]);

      return {
        tasks: records,
        total: Number(countResult[0].total),
        limit,
        offset,
      };
    },

    async create(text) {
      const [task] = await db
        .insert(tasks)
        .values({
          id: randomUUID(),
          text,
          completed: false,
        })
        .returning();

      return task;
    },

    async setCompleted(id, completed) {
      const [task] = await db
        .update(tasks)
        .set({ completed })
        .where(eq(tasks.id, id))
        .returning();

      return task ?? null;
    },

    async delete(id) {
      const [deletedTask] = await db
        .delete(tasks)
        .where(eq(tasks.id, id))
        .returning({ id: tasks.id });

      return deletedTask !== undefined;
    },
  };
}
