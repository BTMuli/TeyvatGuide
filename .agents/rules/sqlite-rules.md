# SQLite 操作规则

适用于 `src/plugins/Sqlite/` 与调用 `@tauri-apps/plugin-sql` 的代码。

## 参数与 SQL

- 新增或实质修改的 SQL 优先使用 `$1`、`$2`、`$3` 等编号占位符。
- 仓库现有代码仍包含 `?` 占位符；不要为了统一格式改动任务范围外的 SQL。
- 占位符只绑定值，不能绑定表名、列名或 SQL 关键字。动态标识符必须来自受控白名单并安全拼接。
- 参数顺序必须与占位符编号一致，禁止把用户输入直接插入 SQL 字符串。

```typescript
await db.execute("DELETE FROM UserAccount WHERE uid = $1;", [uid]);

const rows = await db.select<Array<RowType>>("SELECT * FROM UserAccount WHERE uid = $1;", [uid]);
```

## 异步与类型

- `load`、`execute`、`select` 等数据库操作必须 `await` 或显式返回 Promise。
- `select<T>()` 的 `T` 表示完整返回值；多行结果使用 `Array<RowType>`。
- 对可失败操作记录或传播有意义的错误，不静默吞掉异常。

## 写入与事务

- 唯一键写入优先使用 `INSERT ... ON CONFLICT ... DO UPDATE`。
- 多步写入需要原子性时使用事务；成功后 `COMMIT`，失败时尽力 `ROLLBACK` 后重新抛出或统一处理。
- 不在事务中加入无关的网络请求或长时间计算。

```typescript
await db.execute(
  `INSERT INTO AppData (key, value, updated)
   VALUES ($1, $2, datetime('now', 'localtime'))
   ON CONFLICT(key) DO UPDATE SET
     value = $2,
     updated = datetime('now', 'localtime');`,
  [key, value],
);
```

## 路径别名

| 别名      | 目标                           |
| --------- | ------------------------------ |
| `@Sql/*`  | `src/plugins/Sqlite/*`         |
| `@Sqlm/*` | `src/plugins/Sqlite/modules/*` |
