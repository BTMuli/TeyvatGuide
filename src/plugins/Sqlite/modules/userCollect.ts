/**
 * 用户收藏模块
 * @since Beta v0.5.5
 */

import TGSqlite from "../index.js";

/**
 * 获取单个帖子的收藏信息
 * @since Beta v0.4.5
 * @param postId - 文章 id
 * @returns 返回收藏信息
 */
async function getPostCollect(
  postId: string,
): Promise<Array<TGApp.Sqlite.Collection.PcMap> | boolean> {
  const db = await TGSqlite.getDB();
  const sql = "SELECT * FROM UFMap WHERE postId = ?";
  const res: Array<TGApp.Sqlite.Collection.PcMap> = await db.select(sql, [postId]);
  if (res.length > 0) return res;
  const unclassifiedSql = "SELECT * FROM UFPost WHERE id = ?";
  const unclassifiedRes: Array<TGApp.Sqlite.Collection.PostRaw> = await db.select(unclassifiedSql, [
    postId,
  ]);
  return unclassifiedRes.length > 0;
}

/**
 * 获取收藏合集列表
 * @since Beta v0.4.5
 * @returns 返回收藏合集列表
 */
async function getCollectList(): Promise<Array<TGApp.Sqlite.Collection.Collection>> {
  const db = await TGSqlite.getDB();
  const sql = "SELECT * FROM UFCollection";
  return await db.select(sql);
}

/**
 * 获取收藏合集中的帖子列表
 * @since Beta v0.5.5
 * @param collection - 收藏合集标题
 * @returns 返回收藏合集中的帖子列表
 */
async function getCollectPostList(
  collection: string,
): Promise<Array<TGApp.Sqlite.Collection.PostRaw>> {
  const db = await TGSqlite.getDB();
  const sql = "SELECT * FROM UFMap WHERE collection = ?";
  const res: Array<TGApp.Sqlite.Collection.PcMap> = await db.select(sql, [collection]);
  const postList: Array<TGApp.Sqlite.Collection.PostRaw> = [];
  for (let i = 0; i < res.length; i++) {
    const postSql = "SELECT * FROM UFPost WHERE id = ?";
    const postRes: Array<TGApp.Sqlite.Collection.PostRaw> = await db.select(postSql, [
      res[i].postId,
    ]);
    if (postRes.length > 0) postList.push(postRes[0]);
  }
  return postList;
}

/**
 * 获取未分类的收藏帖子列表
 * @since Beta v0.4.5
 * @returns 返回未分类的收藏帖子列表
 */
async function getUnCollectPostList(): Promise<Array<TGApp.Sqlite.Collection.PostRaw>> {
  const db = await TGSqlite.getDB();
  const sql = "SELECT * FROM UFPost WHERE id NOT IN (SELECT postId FROM UFMap)";
  return await db.select(sql);
}

/**
 * 新建收藏合集
 * @since Beta v0.4.5
 * @param title - 收藏合集标题
 * @param desc - 收藏合集描述
 * @returns 返回收藏合集 id
 */
async function createCollect(title: string, desc: string): Promise<boolean> {
  if (title === "未分类" || title === "") return false;
  const db = await TGSqlite.getDB();
  const sql = "SELECT id FROM UFCollection WHERE title = ?";
  const res: Array<{ id: number }> = await db.select(sql, [title]);
  if (res.length > 0) return false;
  const insertSql = "INSERT INTO UFCollection (title, desc,updated) VALUES (?, ?,?)";
  await db.execute(insertSql, [title, desc, new Date().getTime()]);
  return true;
}

/**
 * 删除收藏合集
 * @since Beta v0.5.1
 * @param title - 收藏合集标题
 * @param force - 是否强制删除
 * @returns 返回是否删除成功
 */
async function deleteCollect(title: string, force: boolean): Promise<boolean> {
  const db = await TGSqlite.getDB();
  const sql = "SELECT id FROM UFCollection WHERE title = ?";
  const res: Array<{ id: number }> = await db.select(sql, [title]);
  if (res.length === 0) return false;
  if (force) {
    const deleteSql = "DELETE FROM UFCollection WHERE title = ?";
    await db.execute(deleteSql, [title]);
    const deletePostSql =
      "DELETE FROM UFPost WHERE id IN (SELECT postId FROM UFMap WHERE collectionId = ?)";
    await db.execute(deletePostSql, [res[0].id]);
  }
  const deleteRefSql = "DELETE FROM UFMap WHERE collectionId = ?";
  await db.execute(deleteRefSql, [res[0].id]);
  return true;
}

/**
 * 删除未分类帖子
 * @since Beta v0.4.5
 * @returns 返回是否删除成功
 */
async function deleteUnCollectPost(): Promise<boolean> {
  const db = await TGSqlite.getDB();
  const sql = "DELETE FROM UFPost WHERE id NOT IN (SELECT postId FROM UFMap)";
  await db.execute(sql);
  return true;
}

/**
 * 更新收藏合集信息，标题/描述
 * @since Beta v0.4.5
 * @param title - 收藏合集标题
 * @param newTitle - 新标题
 * @param newDesc - 新描述
 * @returns 返回是否更新成功
 */
async function updateCollect(title: string, newTitle: string, newDesc: string): Promise<boolean> {
  const db = await TGSqlite.getDB();
  const sql = "SELECT id FROM UFCollection WHERE title = ?";
  const res: Array<{ id: number }> = await db.select(sql, [title]);
  if (res.length === 0) return false;
  const updateSql = "UPDATE UFCollection SET title = ?, desc = ?, updated = ? WHERE id = ?";
  await db.execute(updateSql, [newTitle, newDesc, new Date().getTime(), res[0].id]);
  const updateRefSql = "UPDATE UFMap SET collection = ?,desc=?,updated=? WHERE collectionId = ?";
  await db.execute(updateRefSql, [newTitle, newDesc, new Date().getTime(), res[0].id]);
  return true;
}

/**
 * 添加收藏
 * @since Beta v0.4.5
 * @param postId - 文章 id
 * @param post - 文章信息
 * @param collection - 收藏合集标题，可能为 undefined
 * @param recursive - 是否递归添加
 * @returns 返回是否添加成功
 */
async function addCollect(
  postId: string,
  post: TGApp.BBS.Post.FullData,
  collection: string | undefined = undefined,
  recursive: boolean = false,
): Promise<boolean> {
  const db = await TGSqlite.getDB();
  const sql = "SELECT id FROM UFPost WHERE id = ?";
  const res: Array<{ id: number }> = await db.select(sql, [postId]);
  if (res.length > 0) await updatePostInfo(postId, post);
  else {
    const insertSql = "INSERT INTO UFPost (id, title, content, updated) VALUES (?, ?, ?, ?)";
    await db.execute(insertSql, [
      postId,
      post.post.subject,
      JSON.stringify(post),
      new Date().getTime(),
    ]);
  }
  if (collection !== undefined) {
    const collectionSql = "SELECT * FROM UFCollection WHERE title = ?";
    let collectionRes: Array<TGApp.Sqlite.Collection.Collection> = await db.select(collectionSql, [
      collection,
    ]);
    if (collectionRes.length === 0) {
      if (!recursive) return false;
      const createCollectionRes = await createCollect(collection, collection);
      if (!createCollectionRes) return false;
      collectionRes = await db.select(collectionSql, [collection]);
    }
    // 查找是否已经有了数据
    const mapSql = "SELECT * FROM UFMap WHERE postId = ? AND collectionId = ?";
    const mapRes: Array<TGApp.Sqlite.Collection.PcMap> = await db.select(mapSql, [
      postId,
      collectionRes[0].id,
    ]);
    if (mapRes.length > 0) {
      const updateMapSql =
        "UPDATE UFMap SET post = ?, collection = ?, desc = ?, updated = ? WHERE postId = ? AND collectionId = ?";
      await db.execute(updateMapSql, [
        post.post.subject,
        collection,
        collectionRes[0].desc,
        new Date().getTime(),
        postId,
        collectionRes[0].id,
      ]);
    } else {
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
  }
  return true;
}

/**
 * 更新帖子信息
 * @since Beta v0.4.5
 * @param postId - 文章 id
 * @param post - 文章信息
 * @returns 返回是否更新成功
 */
async function updatePostInfo(postId: string, post: TGApp.BBS.Post.FullData): Promise<boolean> {
  const db = await TGSqlite.getDB();
  const sql = "SELECT id FROM UFPost WHERE id = ?";
  const res: Array<{ id: number }> = await db.select(sql, [postId]);
  if (res.length === 0) return false;
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
 * 删除某个帖子的收藏，可选是否强制删除
 * @since Beta v0.4.5
 * @param postId - 文章 id
 * @param force - 是否强制删除
 * @returns 返回是否删除成功
 */
async function deletePostCollect(postId: string, force: boolean = false): Promise<boolean> {
  const db = await TGSqlite.getDB();
  const sql = "SELECT id FROM UFPost WHERE id = ?";
  const res: Array<{ id: number }> = await db.select(sql, [postId]);
  if (res.length === 0) return false;
  const selectSql = "SELECT * FROM UFMap WHERE postId = ?";
  const selectRes: Array<TGApp.Sqlite.Collection.PcMap> = await db.select(selectSql, [postId]);
  if (selectRes.length === 0 && !force) return false;
  if (force) {
    const deletePostSql = "DELETE FROM UFPost WHERE id = ?";
    await db.execute(deletePostSql, [postId]);
  }
  const deleteSql = "DELETE FROM UFMap WHERE postId = ?";
  await db.execute(deleteSql, [postId]);
  return true;
}

/**
 * 修改单个帖子的收藏合集
 * @since Beta v0.4.5
 * @param postId - 文章 id
 * @param collections - 收藏合集标题
 * @returns 返回是否修改成功
 */
async function updatePostCollect(postId: string, collections: Array<string>): Promise<boolean> {
  const db = await TGSqlite.getDB();
  const sql = "SELECT id,title FROM UFPost WHERE id = ?";
  const res: Array<{ id: number; title: string }> = await db.select(sql, [postId]);
  if (res.length === 0) return false;
  const deleteSql = "DELETE FROM UFMap WHERE postId = ?";
  await db.execute(deleteSql, [postId]);
  for (let i = 0; i < collections.length; i++) {
    const collectionSql = "SELECT * FROM UFCollection WHERE title = ?";
    const collectionRes: Array<TGApp.Sqlite.Collection.Collection> = await db.select(
      collectionSql,
      [collections[i]],
    );
    if (collectionRes.length === 0) return false;
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
 * 批量修改帖子的收藏合集
 * @since Beta v0.4.5
 * @param postIds - 文章 id
 * @param collection - 收藏合集标题
 * @param force - 是否修改的同时移除其他收藏
 * @returns 返回是否修改成功
 */
async function updatePostsCollect(
  postIds: Array<string>,
  collection: string,
  force: boolean = false,
): Promise<boolean> {
  const db = await TGSqlite.getDB();
  const collectionSql = "SELECT * FROM UFCollection WHERE title = ?";
  const collectionRes: Array<TGApp.Sqlite.Collection.Collection> = await db.select(collectionSql, [
    collection,
  ]);
  if (collectionRes.length === 0) return false;
  for (let i = 0; i < postIds.length; i++) {
    const postSql = "SELECT id,title FROM UFPost WHERE id = ?";
    const postRes: Array<{ id: number; title: string }> = await db.select(postSql, [postIds[i]]);
    if (postRes.length === 0) return false;
    const unclassifiedSql = "SELECT * FROM UFMap where postId = ?";
    const unclassifiedRes: Array<TGApp.Sqlite.Collection.PcMap> = await db.select(unclassifiedSql, [
      postIds[i],
    ]);
    if (force && unclassifiedRes.length > 0) {
      const deleteCheck = await deletePostCollect(postIds[i]);
      if (!deleteCheck) return false;
    }
    const mapSql = "SELECT * FROM UFMap WHERE postId = ? AND collectionId = ?";
    const mapRes: Array<TGApp.Sqlite.Collection.PcMap> = await db.select(mapSql, [
      postIds[i],
      collectionRes[0].id,
    ]);
    if (mapRes.length > 0) continue;
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
  getPostCollect,
  getCollectList,
  getCollectPostList,
  getUnCollectPostList,
  createCollect,
  deleteCollect,
  deleteUnCollectPost,
  updateCollect,
  addCollect,
  updatePostInfo,
  deletePostCollect,
  updatePostCollect,
  updatePostsCollect,
};

export default TSUserCollection;
