import util from 'util';
const format = util.format;
import mysql from 'mysql';

const StorageEngine = function(config, logger) {
  logger.info("Initializing storage engine: mysql");

  function castComment(data) {
    return {
      itemId: data.item_id,
      commentUrl: data.comment_url,
      commentId: data.comment_id,
      parentId: data.parent_id || null,
      username: data.username,
      message: data.message,
      createdAt: data.created_at.toISOString(),
      hidden: data.hidden === 1 ? true : false,
    }
  }

  function makeDb(config) {
    config.timezone = 'Z';
    const connection = mysql.createConnection(config);
    return {
      query(sql, args) {
        return util.promisify(connection.query)
          .call(connection, sql, args);
      },
      close() {
        return util.promisify(connection.end).call(connection);
      },
    };
  }

  async function storeComment(apiKey, comment) {
    logger.debug(format("Storing comment, user: %s, email: %s", comment.username, comment.userEmail));
    const createdAt = comment.createdAt.substr(0, 19);
    const emailNotifications = comment.emailNotifications ? 1 : 0;
    const db = makeDb(config.mysql);
    const query = `INSERT INTO comments (
      api_key,
      created_at,
      item_id,
      message,
      parent_id,
      page_url,
      username,
      user_email,
      comment_id,
      comment_url,
      hidden
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const args = [
      apiKey,
      createdAt,
      comment.itemId,
      comment.message,
      comment.parentId || "",
      comment.pageUrl,
      comment.username || "",
      comment.userEmail || "",
      comment.commentId,
      comment.commentUrl,
      comment.hidden || 0,
    ];
    try {
      const result = await db.query(query, args);
      const id = result.insertId;
      logger.debug(format("Stored comment, user: %s, email: %s, id: %d", comment.username, comment.userEmail, id));
      return id;
    } catch (err) {
      const message = format("Could not store comment, user: %s, email: %s: %s", comment.username, comment.userEmail, err);
      logger.error(message);
      throw new Error(message);
    } finally {
      await db.close();
    }
  }

  async function readComments(apiKey, itemId, queryArgs) {
    logger.debug(format("Reading comments: %s", itemId));
    let sortKey, sortDirection;
    switch (queryArgs.sort) {
      case 'top':
        sortKey = 'id';
        sortDirection = 'ASC';
        break;
      case 'desc':
        sortKey = 'id';
        sortDirection = 'DESC';
        break;
      default:
        sortKey = 'id';
        sortDirection = 'ASC';
        break;
    }
    const db = makeDb(config.mysql);
    const query = format("SELECT * FROM comments WHERE api_key = ? AND item_id = ? ORDER BY %s %s", sortKey, sortDirection);
    const args = [apiKey, itemId];
    try {
      const comments = await db.query(query, args);
      logger.debug(format("Returning comments: %s", itemId));
      const castedComments = comments.map((comment) => castComment(comment));
      return castedComments;
    } catch (err) {
      const message = format("Could not retrieve comments, item: %s: %s", itemId, err);
      logger.error(message);
      throw new Error(message);
    } finally {
      await db.close();
    }
  }

  async function deleteCommentById(id) {
    const db = makeDb(config.mysql);
    const query = "DELETE FROM comments WHERE id = ?";
    const args = [id];
    try {
      await db.query(query, args);
    } catch (err) {
      const message = format("Could not delete comment: %d, %s", id, err);
      logger.error(message);
      throw new Error(message);
    } finally {
      await db.close();
    }
  }

  async function dbMonitor() {
    const db = makeDb(config.mysql);
    const query = "SELECT COUNT(id) AS count FROM comments";
    try {
      const result = await db.query(query);
      return result[0].count;
    } catch (err) {
      const message = format("Could not retrieve comment count: %s", err);
      logger.error(message);
      throw new Error(message);
    } finally {
      await db.close();
    }
  }

  return {
    storeComment,
    readComments,
    deleteCommentById,
    dbMonitor,
  };
}

export default StorageEngine;
