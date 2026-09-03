import { eq, desc, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, valuesAssessments, InsertValuesAssessment } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Save values assessment result
 */
export async function saveValuesAssessment(data: InsertValuesAssessment) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(valuesAssessments).values(data);
  return result;
}

/**
 * Get all values assessments (for admin/analytics)
 */
export async function getAllValuesAssessments() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db.select().from(valuesAssessments).orderBy(desc(valuesAssessments.createdAt));
}

/**
 * Get values assessments by email
 */
export async function getValuesAssessmentsByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 무투영 select() 는 이메일까지 되돌려 준다. 호출자가 방금 넘긴 값이라 되돌릴 이유가 없다.
  //   행 id 는 남긴다 — delete/deleteMany 가 adminProcedure 가 된 뒤로 id 는 더 이상 권한이
  //   아니고, 이력 화면이 React key 와 펼침 상태로 쓴다.
  //   소유권 검증 자체는 §6.1 결정이 필요하다. 여기서는 나가는 컬럼만 줄인다.
  return await db
    .select({
      id: valuesAssessments.id,
      name: valuesAssessments.name,
      value1: valuesAssessments.value1,
      value2: valuesAssessments.value2,
      value3: valuesAssessments.value3,
      customValue: valuesAssessments.customValue,
      createdAt: valuesAssessments.createdAt,
    })
    .from(valuesAssessments)
    .where(eq(valuesAssessments.email, email));
}

/**
 * Delete a single values assessment by ID
 */
export async function deleteValuesAssessment(id: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db.delete(valuesAssessments).where(eq(valuesAssessments.id, id));
}

/**
 * Delete multiple values assessments by IDs
 */
export async function deleteValuesAssessments(ids: number[]) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db.delete(valuesAssessments).where(inArray(valuesAssessments.id, ids));
}
