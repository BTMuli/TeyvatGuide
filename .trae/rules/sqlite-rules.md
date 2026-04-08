---
alwaysApply: false
description: SQLite 数据库操作规范，包括参数占位符、异步模式、插入/更新模式等规则
---

# SQLite 数据库操作规则

## 参数占位符

使用 `$1, $2, $3...` 作为参数占位符，**禁止使用 `?`**：

```typescript
// 正确
await db.execute("INSERT INTO Table(key, value) VALUES ($1, $2)", [key, value]);

// 错误
await db.execute("INSERT INTO Table(key, value) VALUES (?, ?)", [key, value]);
```

## 异步模式

所有数据库操作返回 Promise，必须使用 `await`：

```typescript
// 正确
const result = await db.execute(sql, params);

// 错误 - 不处理 Promise
db.execute(sql, params);
```

## 插入/更新模式

使用 `ON CONFLICT` 处理插入或更新：

```typescript
await db.execute(
  `INSERT INTO Table(key, value, updated)
   VALUES ($1, $2, datetime('now', 'localtime'))
   ON CONFLICT(key) DO UPDATE SET value = $2, updated = datetime('now', 'localtime');`,
  [key, value],
);
```

## 查询模式

```typescript
const rows = await db.select<RowType>("SELECT * FROM Table WHERE id = $1", [id]);
```

## 路径别名

数据库相关代码使用以下别名：

| 别名      | 路径                             |
| --------- | -------------------------------- |
| `@Sql/*`  | `./src/plugins/Sqlite/*`         |
| `@Sqlm/*` | `./src/plugins/Sqlite/modules/*` |
