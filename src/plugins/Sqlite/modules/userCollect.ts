/**
 * @file plugins/Sqlite/modules/userCollect.ts
 * @description 用户收藏模块
 * @since Beta v0.4.5
 */

import type DataBase from "tauri-plugin-sql-api";

/**
 * @description 获取单个帖子的收藏信息
 * @since Beta v0.4.5
 * @param {DataBase} db 数据库
 * @param {string} postId 文章 id
 * @return {Promise<TGApp.Sqlite.UserCollection.UFMap[]|boolean>} 返回收藏信息
 */
async function getCollectPost(
  db: DataBase,
  postId: string,
): Promise<TGApp.Sqlite.UserCollection.UFMap[] | boolean> {
  const sql = "SELECT * FROM UFMap WHERE postId = ?";
  const res: TGApp.Sqlite.UserCollection.UFMap[] = await db.select(sql, [postId]);
  if (res.length > 0) {
    return res;
  }
  const unclassifiedSql = "SELECT * FROM UFPost WHERE id = ?";
  const unclassifiedRes: TGApp.Sqlite.UserCollection.UFPost[] = await db.select(unclassifiedSql, [
    postId,
  ]);
  return unclassifiedRes.length > 0;
}

/**
 * @description 获取收藏合集列表
 * @since Beta v0.4.5
 * @param {DataBase} db 数据库
 * @return {Promise<TGApp.Sqlite.UserCollection.UFCollection[]>} 返回收藏合集列表
 */
async function getCollectList(db: DataBase): Promise<TGApp.Sqlite.UserCollection.UFCollection[]> {
  const sql = "SELECT * FROM UFCollection";
  return await db.select(sql);
}

/**
 * @description 获取收藏合集中的帖子列表
 * @since Beta v0.4.5
 * @param {DataBase} db 数据库
 * @param {string} collection 收藏合集标题
 * @return {Promise<TGApp.Sqlite.UserCollection.UFPost[]>} 返回收藏合集中的帖子列表
 */
async function getCollectPostList(
  db: DataBase,
  collection: string,
): Promise<TGApp.Sqlite.UserCollection.UFPost[]> {
  const sql = "SELECT * FROM UFMap WHERE collection = ?";
  const res: TGApp.Sqlite.UserCollection.UFMap[] = await db.select(sql, [collection]);
  const postList: TGApp.Sqlite.UserCollection.UFPost[] = [];
  for (let i = 0; i < res.length; i++) {
    const postSql = "SELECT * FROM UFPost WHERE id = ?";
    const postRes: TGApp.Sqlite.UserCollection.UFPost[] = await db.select(postSql, [res[i].postId]);
    postList.push(postRes[0]);
  }
  return postList;
}

/**
 * @description 获取未分类的收藏帖子列表
 * @since Beta v0.4.5
 * @param {DataBase} db 数据库
 * @return {Promise<TGApp.Sqlite.UserCollection.UFPost[]>} 返回未分类的收藏帖子列表
 */
async function getUnCollectPostList(db: DataBase): Promise<TGApp.Sqlite.UserCollection.UFPost[]> {
  const sql = "SELECT * FROM UFPost WHERE id NOT IN (SELECT postId FROM UFMap)";
  return await db.select(sql);
}

/**
 * @description 新建收藏合集
 * @since Beta v0.4.5
 * @param {DataBase} db 数据库
 * @param {string} title 收藏合集标题
 * @param {string} desc 收藏合集描述
 * @return {Promise<boolean>} 返回收藏合集 id
 */
async function createCollect(db: DataBase, title: string, desc: string): Promise<boolean> {
  if (title === "未分类" || title === "") return false;
  const sql = "SELECT id FROM UFCollection WHERE title = ?";
  const res: Array<{ id: number }> = await db.select(sql, [title]);
  if (res.length > 0) {
    return false;
  }
  const insertSql = "INSERT INTO UFCollection (title, desc,updated) VALUES (?, ?,?)";
  await db.execute(insertSql, [title, desc, new Date().getTime()]);
  return true;
}

/**
 * @description 删除收藏合集
 * @since Beta v0.4.5
 * @param {DataBase} db 数据库
 * @param {string} title 收藏合集标题
 * @return {Promise<boolean>} 返回是否删除成功
 */
async function deleteCollect(db: DataBase, title: string): Promise<boolean> {
  const sql = "SELECT id FROM UFCollection WHERE title = ?";
  const res: Array<{ id: number }> = await db.select(sql, [title]);
  if (res.length === 0) {
    return false;
  }
  const deleteSql = "DELETE FROM UFCollection WHERE title = ?";
  await db.execute(deleteSql, [title]);
  const deleteRefSql = "DELETE FROM UFMap WHERE collectionId = ?";
  await db.execute(deleteRefSql, [res[0].id]);
  return true;
}

/**
 * @description 更新收藏合集信息，标题/描述
 * @since Beta v0.4.5
 * @param {DataBase} db 数据库
 * @param {string} title 收藏合集标题
 * @param {string} newTitle 新标题
 * @param {string} newDesc 新描述
 * @return {Promise<boolean>} 返回是否更新成功
 */
async function updateCollect(
  db: DataBase,
  title: string,
  newTitle: string,
  newDesc: string,
): Promise<boolean> {
  const sql = "SELECT id FROM UFCollection WHERE title = ?";
  const res: Array<{ id: number }> = await db.select(sql, [title]);
  if (res.length === 0) {
    return false;
  }
  const updateSql = "UPDATE UFCollection SET title = ?, desc = ?, updated = ? WHERE id = ?";
  await db.execute(updateSql, [newTitle, newDesc, new Date().getTime(), res[0].id]);
  const updateRefSql = "UPDATE UFMap SET collection = ?,desc=?,updated=? WHERE collectionId = ?";
  await db.execute(updateRefSql, [newTitle, newDesc, new Date().getTime(), res[0].id]);
  return true;
}

/**
 * @description 添加收藏
 * @since Beta v0.4.5
 * @param {DataBase} db 数据库
 * @param {string} postId 文章 id
 * @param {TGApp.Plugins.Mys.Post.FullData} post 文章信息
 * @param {string} collection 收藏合集标题，可能为 undefined
 * @param {boolean} recursive 是否递归添加
 * @return {Promise<boolean>} 返回是否添加成功
 */
async function addCollect(
  db: DataBase,
  postId: string,
  post: TGApp.Plugins.Mys.Post.FullData,
  collection: string | undefined = undefined,
  recursive: boolean = false,
): Promise<boolean> {
  const sql = "SELECT id FROM UFPost WHERE id = ?";
  const res: Array<{ id: number }> = await db.select(sql, [postId]);
  if (res.length > 0) {
    return false;
  }
  const insertSql = "INSERT INTO UFPost (id, title, content, updated) VALUES (?, ?, ?, ?)";
  await db.execute(insertSql, [
    postId,
    post.post.subject,
    JSON.stringify(post),
    new Date().getTime(),
  ]);
  if (collection !== undefined) {
    const collectionSql = "SELECT * FROM UFCollection WHERE title = ?";
    let collectionRes: TGApp.Sqlite.UserCollection.UFCollection[] = await db.select(collectionSql, [
      collection,
    ]);
    if (collectionRes.length === 0 || collectionRes.length > 1) {
      if (!recursive) {
        return false;
      }
      const createCollectionRes = await createCollect(db, collection, collection);
      if (!createCollectionRes) {
        return false;
      }
      collectionRes = await db.select(collectionSql, [collection]);
    }
    const insertMapSql =
      "INSERT INTO UFMap (postId, collectionId,post, collection, desc, updated) VALUES (?, ?, ?, ?, ?, ?)";
    await db.execute(insertMapSql, [
      postId,
      collectionRes[0].id,
      post.post.subject,
      collection,
      collectionRes[0].desc,
      new Date().getTime(),
    ]);
  }
  return true;
}

/**
 * @description 删除合集中的收藏
 * @since Beta v0.4.5
 * @param {DataBase} db 数据库
 * @param {string} postId 文章 id
 * @param {string} collection 收藏合集标题
 * @return {Promise<boolean>} 返回是否删除成功
 */
async function deleteCollectPost(
  db: DataBase,
  postId: string,
  collection: string,
): Promise<boolean> {
  const sql = "SELECT id FROM UFCollection WHERE title = ?";
  const res: Array<{ id: number }> = await db.select(sql, [collection]);
  if (res.length === 0) {
    return false;
  }
  const deleteSql = "DELETE FROM UFMap WHERE postId = ? AND collectionId = ?";
  await db.execute(deleteSql, [postId, res[0].id]);
  return true;
}

/**
 * @description 更新帖子信息
 * @since Beta v0.4.5
 * @param {DataBase} db 数据库
 * @param {string} postId 文章 id
 * @param {TGApp.Plugins.Mys.Post.FullData} post 文章信息
 * @return {Promise<boolean>} 返回是否更新成功
 */
async function updatePostInfo(
  db: DataBase,
  postId: string,
  post: TGApp.Plugins.Mys.Post.FullData,
): Promise<boolean> {
  const sql = "SELECT id FROM UFPost WHERE id = ?";
  const res: Array<{ id: number }> = await db.select(sql, [postId]);
  if (res.length === 0) {
    return false;
  }
  const updateSql = "UPDATE UFPost SET title = ?, content = ?, updated = ? WHERE id = ?";
  await db.execute(updateSql, [
    post.post.subject,
    JSON.stringify(post),
    new Date().getTime(),
    postId,
  ]);
  return true;
}

/**
 * @description 删除某个帖子的收藏，可选是否强制删除
 * @since Beta v0.4.5
 * @param {DataBase} db 数据库
 * @param {string} postId 文章 id
 * @param {boolean} force 是否强制删除
 * @return {Promise<boolean>} 返回是否删除成功
 */
async function deletePostCollect(
  db: DataBase,
  postId: string,
  force: boolean = false,
): Promise<boolean> {
  const sql = "SELECT id FROM UFPost WHERE id = ?";
  const res: Array<{ id: number }> = await db.select(sql, [postId]);
  if (res.length === 0) {
    return false;
  }
  const selectSql = "SELECT * FROM UFMap WHERE postId = ?";
  const selectRes: TGApp.Sqlite.UserCollection.UFMap[] = await db.select(selectSql, [postId]);
  if (selectRes.length === 0 && !force) {
    return false;
  }
  const deleteSql = "DELETE FROM UFMap WHERE postId = ?";
  await db.execute(deleteSql, [postId]);
  if (force) {
    const deletePostSql = "DELETE FROM UFPost WHERE id = ?";
    await db.execute(deletePostSql, [postId]);
  }
  return true;
}

/**
 * @description 修改单个帖子的收藏合集
 * @since Beta v0.4.5
 * @param {DataBase} db 数据库
 * @param {string} postId 文章 id
 * @param {string[]} collections 收藏合集标题
 * @return {Promise<boolean>} 返回是否修改成功
 */
async function updatePostCollect(
  db: DataBase,
  postId: string,
  collections: string[],
): Promise<boolean> {
  const sql = "SELECT id,title FROM UFPost WHERE id = ?";
  const res: Array<{ id: number; title: string }> = await db.select(sql, [postId]);
  if (res.length === 0) {
    return false;
  }
  const deleteSql = "DELETE FROM UFMap WHERE postId = ?";
  await db.execute(deleteSql, [postId]);
  for (let i = 0; i < collections.length; i++) {
    const collectionSql = "SELECT * FROM UFCollection WHERE title = ?";
    const collectionRes: TGApp.Sqlite.UserCollection.UFCollection[] = await db.select(
      collectionSql,
      [collections[i]],
    );
    if (collectionRes.length === 0) {
      return false;
    }
    const insertSql =
      "INSERT INTO UFMap (postId, collectionId,post, collection, desc, updated) VALUES (?, ?, ?, ?, ?, ?)";
    await db.execute(insertSql, [
      postId,
      collectionRes[0].id,
      res[0].title,
      collections[i],
      collectionRes[0].desc,
      new Date().getTime(),
    ]);
  }
  return true;
}

/**
 * @description 批量修改帖子的收藏合集
 * @since Beta v0.4.5
 * @param {DataBase} db 数据库
 * @param {string[]} postIds 文章 id
 * @param {string} collection 收藏合集标题
 * @param {string} oldCollection 旧的收藏合集标题
 * @return {Promise<boolean>} 返回是否修改成功
 */
async function updatePostsCollect(
  db: DataBase,
  postIds: string[],
  collection: string,
  oldCollection: string | undefined,
): Promise<boolean> {
  const collectionSql = "SELECT * FROM UFCollection WHERE title = ?";
  const collectionRes: TGApp.Sqlite.UserCollection.UFCollection[] = await db.select(collectionSql, [
    collection,
  ]);
  if (collectionRes.length === 0) {
    return false;
  }
  let oldCollectionInfo: TGApp.Sqlite.UserCollection.UFCollection | undefined;
  if (oldCollection !== undefined) {
    const oldCollectionRes: TGApp.Sqlite.UserCollection.UFCollection[] = await db.select(
      collectionSql,
      [oldCollection],
    );
    if (oldCollectionRes.length === 0) {
      return false;
    }
    oldCollectionInfo = oldCollectionRes[0];
  }
  for (let i = 0; i < postIds.length; i++) {
    const postSql = "SELECT id,title FROM UFPost WHERE id = ?";
    const postRes: Array<{ id: number; title: string }> = await db.select(postSql, [postIds[i]]);
    if (postRes.length === 0) {
      return false;
    }
    if (oldCollectionInfo !== undefined) {
      const updateSql =
        "UPDATE UFMap SET collectionId = ?,post=?,collection=?,desc=?,updated=? WHERE postId = ? AND collectionId = ?";
      await db.execute(updateSql, [
        collectionRes[0].id,
        postRes[0].title,
        collection,
        collectionRes[0].desc,
        new Date().getTime(),
        postIds[i],
        oldCollectionInfo.id,
      ]);
      continue;
    }
    const insertSql =
      "INSERT INTO UFMap (postId, collectionId,post, collection, desc, updated) VALUES (?, ?, ?, ?, ?, ?)";
    await db.execute(insertSql, [
      postIds[i],
      collectionRes[0].id,
      postRes[0].title,
      collection,
      collectionRes[0].desc,
      new Date().getTime(),
    ]);
  }
  return true;
}

const TSUserCollection = {
  getCollectPost,
  getCollectList,
  getCollectPostList,
  getUnCollectPostList,
  createCollect,
  deleteCollect,
  updateCollect,
  addCollect,
  updatePostInfo,
  deleteCollectPost,
  deletePostCollect,
  updatePostCollect,
  updatePostsCollect,
};

export default TSUserCollection;
