import { randomUUID } from "crypto";
import { type InsertUser, type User } from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class MemStorage implements IStorage {
  private readonly users: Map<string, User>;

  constructor() {
    this.users = new Map<string, User>();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();

    const user: User = {
      ...insertUser,
      id,
    };

    this.users.set(id, user);
    return user;
  }
}

export const storage: IStorage = new MemStorage();
