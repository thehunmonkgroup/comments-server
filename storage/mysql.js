'use strict';

const util = require('util');
const format = util.format;
const mysql = require('mysql');

const StorageEngine = function(config, logger) {
  logger.info("Initializing storage engine: mysql");

  function castComment(data) {
    const createdAt = new Date(format("%s", data.created_at)).toISOString();
    return {
      itemId: data.item_id,
      commentUrl: data.comment_url,
      commentId: data.comment_id,
      replyTo: data.reply_to || null,
      parentId: data.parent_id || null,
      userId: data.user_id,
      username: data.username,
      userPic: data.user_pic || null,
      userUrl: data.user_url || null,
      message: data.message,
      createdAt: createdAt,
      hidden: data.hidden === 1 ? true : false,
    }
  }

  function makeDb(config) {
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
      original_item_id,
      item_protocol,
      item_port,
      message,
      parent_id,
      reply_to,
      page_url,
      page_title,
      email_notifications,
      locale,
      timezone,
      login_provider,
      user_id,
      username,
      user_pic,
      user_url,
      user_email,
      comment_id,
      comment_url,
      hidden
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const args = [
      apiKey,
      createdAt,
      comment.itemId,
      comment.originalItemId,
      comment.itemProtocol,
      comment.itemPort,
      comment.message,
      comment.parentId || "",
      comment.replyTo || "",
      comment.pageUrl,
      comment.pageTitle,
      emailNotifications,
      comment.locale,
      comment.timezone,
      comment.loginProvider || "",
      comment.userId || "",
      comment.username || "",
      comment.userPic || "",
      comment.userUrl || "",
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

module.exports = StorageEngine;
