/**
 * 用户养成计划数据库模块
 * @since Beta v0.11.2
 */

import type Database from "@tauri-apps/plugin-sql";

import TGSqlite from "../index.js";

type SqlStatement = {
  query: string;
  values?: Array<unknown>;
};

let transactionQueue: Promise<void> = Promise.resolve();

function parseProject(raw: TGApp.Sqlite.Cultivation.ProjectRaw): TGApp.Sqlite.Cultivation.Project {
  return { ...raw, isChosen: Boolean(raw.isChosen) };
}

function parseEntry(raw: TGApp.Sqlite.Cultivation.EntryRaw): TGApp.Sqlite.Cultivation.Entry {
  return {
    ...raw,
    allowCrafting: Boolean(raw.allowCrafting),
    currentState: <TGApp.Sqlite.Cultivation.EntryState>JSON.parse(raw.currentState),
    targetState: <TGApp.Sqlite.Cultivation.EntryState>JSON.parse(raw.targetState),
    useDust: Boolean(raw.useDust),
    useSolvent: Boolean(raw.useSolvent),
  };
}

/**
 * 获取已有养成计划的全部 UID
 * @since Beta v0.11.2
 * @returns UID 列表
 */
async function getAllUid(): Promise<Array<number>> {
  const db = await TGSqlite.getDB();
  const rows = await db.select<Array<{ uid: number }>>(
    "SELECT DISTINCT uid FROM CultivationProject ORDER BY uid ASC;",
  );
  return rows.map((row) => row.uid);
}

async function withTransaction(
  operation: (db: Database, statements: Array<SqlStatement>) => Promise<void>,
): Promise<void> {
  const previousTransaction = transactionQueue;
  let releaseTransaction: () => void = () => undefined;
  transactionQueue = new Promise<void>((resolve) => {
    releaseTransaction = resolve;
  });
  await previousTransaction;

  try {
    const db = await TGSqlite.getDB();
    const statements: Array<SqlStatement> = [];
    await operation(db, statements);
    await TGSqlite.executeTransaction(statements);
  } finally {
    releaseTransaction();
  }
}

/**
 * 获取指定 UID 的养成计划
 * @since Beta v0.11.2
 * @param uid - 游戏 UID
 * @returns 养成计划列表
 */
async function getProjects(uid: number): Promise<Array<TGApp.Sqlite.Cultivation.Project>> {
  const db = await TGSqlite.getDB();
  const rows = await db.select<Array<TGApp.Sqlite.Cultivation.ProjectRaw>>(
    `SELECT * FROM CultivationProject
     WHERE uid = $1
     ORDER BY isChosen DESC, updated DESC;`,
    [uid],
  );
  return rows.map(parseProject);
}

/**
 * 获取各 UID 当前选中的养成计划
 * @since Beta v0.11.2
 * @returns 当前养成计划列表
 */
async function getChosenProjects(): Promise<Array<TGApp.Sqlite.Cultivation.Project>> {
  const db = await TGSqlite.getDB();
  const rows = await db.select<Array<TGApp.Sqlite.Cultivation.ProjectRaw>>(
    `SELECT * FROM CultivationProject
     WHERE isChosen = 1
     ORDER BY updated DESC;`,
  );
  return rows.map(parseProject);
}

/**
 * 新建养成计划并将其设为当前计划
 * @since Beta v0.11.2
 * @param uid - 游戏 UID
 * @param name - 计划名称
 * @param timezone - 服务器时区偏移
 * @returns 新建计划
 */
async function createProject(
  uid: number,
  name: string,
  timezone: number,
): Promise<TGApp.Sqlite.Cultivation.Project> {
  const normalizedName = name.trim();
  if (normalizedName.length === 0) throw new Error("计划名称不能为空");

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await withTransaction(async (_db, statements) => {
    statements.push(
      {
        query: "UPDATE CultivationProject SET isChosen = 0 WHERE uid = $1;",
        values: [uid],
      },
      {
        query: `INSERT INTO CultivationProject(id, uid, name, isChosen, timezone, created, updated)
                VALUES ($1, $2, $3, 1, $4, $5, $5);`,
        values: [id, uid, normalizedName, timezone, now],
      },
    );
  });
  return { id, uid, name: normalizedName, isChosen: true, timezone, created: now, updated: now };
}

/**
 * 获取当前计划；不存在时返回同 UID 的第一个计划
 * @since Beta v0.11.2
 * @param uid - 游戏 UID
 * @returns 当前计划
 */
async function getCurrentProject(
  uid: number,
): Promise<TGApp.Sqlite.Cultivation.Project | undefined> {
  const projects = await getProjects(uid);
  return projects.find((project) => project.isChosen) ?? projects[0];
}

/**
 * 确保 UID 至少存在一个当前计划
 * @since Beta v0.11.2
 * @param uid - 游戏 UID
 * @param timezone - 服务器时区偏移
 * @returns 当前计划
 */
async function ensureCurrentProject(
  uid: number,
  timezone: number,
): Promise<TGApp.Sqlite.Cultivation.Project> {
  const current = await getCurrentProject(uid);
  if (current) {
    if (!current.isChosen) await chooseProject(uid, current.id);
    return { ...current, isChosen: true };
  }
  return await createProject(uid, "当前养成", timezone);
}

/**
 * 选择当前养成计划
 * @since Beta v0.11.2
 * @param uid - 游戏 UID
 * @param projectId - 计划 ID
 */
async function chooseProject(uid: number, projectId: string): Promise<void> {
  await withTransaction(async (db, statements) => {
    const rows = await db.select<Array<{ id: string }>>(
      "SELECT id FROM CultivationProject WHERE id = $1 AND uid = $2;",
      [projectId, uid],
    );
    if (rows.length === 0) throw new Error("养成计划不存在或不属于当前 UID");
    statements.push(
      {
        query: "UPDATE CultivationProject SET isChosen = 0 WHERE uid = $1;",
        values: [uid],
      },
      {
        query: `UPDATE CultivationProject
                SET isChosen = 1, updated = $1
                WHERE id = $2 AND uid = $3;`,
        values: [new Date().toISOString(), projectId, uid],
      },
    );
  });
}

/**
 * 重命名养成计划
 * @since Beta v0.11.2
 * @param projectId - 计划 ID
 * @param name - 新名称
 */
async function renameProject(projectId: string, name: string): Promise<void> {
  const normalizedName = name.trim();
  if (normalizedName.length === 0) throw new Error("计划名称不能为空");
  await withTransaction(async (_db, statements) => {
    statements.push({
      query: "UPDATE CultivationProject SET name = $1, updated = $2 WHERE id = $3;",
      values: [normalizedName, new Date().toISOString(), projectId],
    });
  });
}

/**
 * 删除养成计划及其全部目标，并选择同 UID 的下一个计划
 * @since Beta v0.11.2
 * @param project - 待删除计划
 */
async function removeProject(project: TGApp.Sqlite.Cultivation.Project): Promise<void> {
  await withTransaction(async (db, statements) => {
    const remaining = await db.select<Array<{ id: string }>>(
      `SELECT id FROM CultivationProject
       WHERE uid = $1 AND id <> $2
       ORDER BY updated DESC
       LIMIT 1;`,
      [project.uid, project.id],
    );
    statements.push(
      {
        query: `DELETE FROM CultivationItem
                WHERE entryId IN (SELECT id FROM CultivationEntry WHERE projectId = $1);`,
        values: [project.id],
      },
      { query: "DELETE FROM CultivationEntry WHERE projectId = $1;", values: [project.id] },
      { query: "DELETE FROM CultivationProject WHERE id = $1;", values: [project.id] },
      {
        query: "UPDATE CultivationProject SET isChosen = 0 WHERE uid = $1;",
        values: [project.uid],
      },
    );
    if (remaining[0]) {
      statements.push({
        query: "UPDATE CultivationProject SET isChosen = 1, updated = $1 WHERE id = $2;",
        values: [new Date().toISOString(), remaining[0].id],
      });
    }
  });
}

/**
 * 获取计划的全部养成目标及材料
 * @since Beta v0.11.2
 * @param projectId - 计划 ID
 * @returns 养成目标列表
 */
async function getEntries(
  projectId: string,
): Promise<Array<TGApp.Sqlite.Cultivation.EntryWithItems>> {
  await TGSqlite.updateCultivationEntry();
  const db = await TGSqlite.getDB();
  const [entryRows, items] = await Promise.all([
    db.select<Array<TGApp.Sqlite.Cultivation.EntryRaw>>(
      `SELECT * FROM CultivationEntry
       WHERE projectId = $1
       ORDER BY sortOrder ASC, created ASC;`,
      [projectId],
    ),
    db.select<Array<TGApp.Sqlite.Cultivation.Item>>(
      `SELECT item.* FROM CultivationItem item
       INNER JOIN CultivationEntry entry ON entry.id = item.entryId
       WHERE entry.projectId = $1
       ORDER BY item.materialId ASC;`,
      [projectId],
    ),
  ]);
  const itemMap = new Map<string, Array<TGApp.Sqlite.Cultivation.Item>>();
  for (const item of items) {
    const entryItems = itemMap.get(item.entryId) ?? [];
    entryItems.push(item);
    itemMap.set(item.entryId, entryItems);
  }
  return entryRows.map((row) => ({ ...parseEntry(row), items: itemMap.get(row.id) ?? [] }));
}

/**
 * 批量保存或更新计划目标
 * @since Beta v0.11.2
 * @param projectId - 计划 ID
 * @param inputs - 目标输入列表
 */
async function saveEntries(
  projectId: string,
  inputs: Array<TGApp.Sqlite.Cultivation.SaveEntryInput>,
): Promise<void> {
  await TGSqlite.updateCultivationEntry();
  const validInputs = inputs.filter((input) => input.items.some((item) => item.required > 0));
  if (validInputs.length === 0) throw new Error("当前目标无需养成材料");

  await withTransaction(async (db, statements) => {
    const maxOrderRows = await db.select<Array<{ value: number }>>(
      "SELECT COALESCE(MAX(sortOrder), -1) AS value FROM CultivationEntry WHERE projectId = $1;",
      [projectId],
    );
    let nextOrder = (maxOrderRows[0]?.value ?? -1) + 1;
    const now = new Date().toISOString();
    const entryIdMap = new Map<string, string>();

    for (const input of validInputs) {
      const entryKey = `${input.type}:${input.itemId}:${input.instanceKey}`;
      const knownEntryId = entryIdMap.get(entryKey);
      const existed =
        knownEntryId === undefined
          ? await db.select<Array<{ id: string }>>(
              `SELECT id FROM CultivationEntry
               WHERE projectId = $1 AND type = $2 AND itemId = $3 AND instanceKey = $4;`,
              [projectId, input.type, input.itemId, input.instanceKey],
            )
          : [];
      const entryId = knownEntryId ?? existed[0]?.id ?? crypto.randomUUID();
      entryIdMap.set(entryKey, entryId);
      if (knownEntryId !== undefined || existed[0]) {
        statements.push({
          query: `UPDATE CultivationEntry SET
                    name = $1, icon = $2, star = $3, currentState = $4, targetState = $5,
                    allowCrafting = $6, useDust = $7, useSolvent = $8,
                    status = 'active', updated = $9
                  WHERE id = $10;`,
          values: [
            input.name,
            input.icon,
            input.star,
            JSON.stringify(input.currentState),
            JSON.stringify(input.targetState),
            Number(input.allowCrafting),
            Number(input.useDust),
            Number(input.useSolvent),
            now,
            entryId,
          ],
        });
      } else {
        statements.push({
          query: `INSERT INTO CultivationEntry(
                    id, projectId, type, itemId, instanceKey, name, icon, star,
                    currentState, targetState, status, sortOrder,
                    allowCrafting, useDust, useSolvent, created, updated
                  ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11,
                    $12, $13, $14, $15, $15
                  );`,
          values: [
            entryId,
            projectId,
            input.type,
            input.itemId,
            input.instanceKey,
            input.name,
            input.icon,
            input.star,
            JSON.stringify(input.currentState),
            JSON.stringify(input.targetState),
            nextOrder++,
            Number(input.allowCrafting),
            Number(input.useDust),
            Number(input.useSolvent),
            now,
          ],
        });
      }

      statements.push({
        query: "DELETE FROM CultivationItem WHERE entryId = $1;",
        values: [entryId],
      });
      for (const item of input.items) {
        if (item.required <= 0) continue;
        statements.push({
          query: `INSERT INTO CultivationItem(entryId, materialId, required)
                  VALUES ($1, $2, $3);`,
          values: [entryId, item.materialId, item.required],
        });
      }
    }
    statements.push({
      query: "UPDATE CultivationProject SET updated = $1 WHERE id = $2;",
      values: [now, projectId],
    });
  });
}

/**
 * 按给定顺序更新计划目标优先级
 * @since Beta v0.11.2
 * @param projectId - 计划 ID
 * @param entryIds - 按优先级排列的目标 ID
 */
async function updateEntryOrder(projectId: string, entryIds: ReadonlyArray<string>): Promise<void> {
  const now = new Date().toISOString();
  await withTransaction(async (_db, statements) => {
    for (const [sortOrder, entryId] of entryIds.entries()) {
      statements.push({
        query: `UPDATE CultivationEntry SET sortOrder = $1, updated = $2
                WHERE id = $3 AND projectId = $4;`,
        values: [sortOrder, now, entryId, projectId],
      });
    }
    statements.push({
      query: "UPDATE CultivationProject SET updated = $1 WHERE id = $2;",
      values: [now, projectId],
    });
  });
}

/**
 * 根据最新存档批量刷新目标当前状态与材料需求
 * @since Beta v0.11.2
 * @param projectId - 计划 ID
 * @param inputs - 刷新输入列表
 */
async function refreshEntries(
  projectId: string,
  inputs: ReadonlyArray<TGApp.Sqlite.Cultivation.RefreshEntryInput>,
): Promise<void> {
  if (inputs.length === 0) return;
  const now = new Date().toISOString();
  await withTransaction(async (_db, statements) => {
    for (const input of inputs) {
      statements.push(
        {
          query: `UPDATE CultivationEntry SET currentState = $1, status = $2, updated = $3
                  WHERE id = $4 AND projectId = $5;`,
          values: [JSON.stringify(input.currentState), input.status, now, input.entryId, projectId],
        },
        {
          query: `DELETE FROM CultivationItem
                  WHERE entryId IN (
                    SELECT id FROM CultivationEntry WHERE id = $1 AND projectId = $2
                  );`,
          values: [input.entryId, projectId],
        },
      );
      for (const item of input.items) {
        if (item.required <= 0) continue;
        statements.push({
          query: `INSERT INTO CultivationItem(entryId, materialId, required)
                  SELECT $1, $2, $3
                  WHERE EXISTS (
                    SELECT 1 FROM CultivationEntry WHERE id = $1 AND projectId = $4
                  );`,
          values: [input.entryId, item.materialId, item.required, projectId],
        });
      }
    }
    statements.push({
      query: "UPDATE CultivationProject SET updated = $1 WHERE id = $2;",
      values: [now, projectId],
    });
  });
}

/**
 * 更新养成目标完成状态
 * @since Beta v0.11.2
 * @param entryId - 目标 ID
 * @param status - 新状态
 */
async function updateEntryStatus(
  entryId: string,
  status: TGApp.Sqlite.Cultivation.EntryStatus,
): Promise<void> {
  const now = new Date().toISOString();
  await withTransaction(async (_db, statements) => {
    statements.push(
      {
        query: "UPDATE CultivationEntry SET status = $1, updated = $2 WHERE id = $3;",
        values: [status, now, entryId],
      },
      {
        query: `UPDATE CultivationProject SET updated = $1
                WHERE id = (SELECT projectId FROM CultivationEntry WHERE id = $2);`,
        values: [now, entryId],
      },
    );
  });
}

/**
 * 删除养成目标及其材料
 * @since Beta v0.11.2
 * @param entryId - 目标 ID
 */
async function removeEntry(entryId: string): Promise<void> {
  await withTransaction(async (db, statements) => {
    const projects = await db.select<Array<{ projectId: string }>>(
      "SELECT projectId FROM CultivationEntry WHERE id = $1;",
      [entryId],
    );
    statements.push(
      { query: "DELETE FROM CultivationItem WHERE entryId = $1;", values: [entryId] },
      { query: "DELETE FROM CultivationEntry WHERE id = $1;", values: [entryId] },
    );
    if (projects[0]) {
      statements.push({
        query: "UPDATE CultivationProject SET updated = $1 WHERE id = $2;",
        values: [new Date().toISOString(), projects[0].projectId],
      });
    }
  });
}

const TSCultivationPlan = {
  getAllUid,
  getProjects,
  getChosenProjects,
  createProject,
  getCurrentProject,
  ensureCurrentProject,
  chooseProject,
  renameProject,
  removeProject,
  getEntries,
  saveEntries,
  updateEntryOrder,
  refreshEntries,
  updateEntryStatus,
  removeEntry,
};

export default TSCultivationPlan;
