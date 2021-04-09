'use strict';

const fs = require('fs');
const crypto = require('crypto');
const util = require('util');
const format = util.format;

const writeCache = {};


const StorageEngine = function(logger) {
  logger.info("Initializing storage engine: file");

  async function storeComment(comment) {
    logger.debug(format("Storing comment, user: %s, email: %s", comment.username, comment.userEmail));
    const key = comment.itemId;
    if (!writeCache[key]) {
      writeCache[key] = fs.createWriteStream(`./comments/${hash(key)}.jsonl`, {
        flags: 'a',
      });
    }

    return new Promise((resolve, reject) => {
      writeCache[key].write(`${JSON.stringify(comment)}\n`, 'utf8', (err) => {
        if (err) {
          return reject(err);
        }
        logger.debug(format("Stored comment, user: %s, email: %s", comment.username, comment.userEmail));
        resolve();
      });
    });
  }

  async function readComments(itemId) {
    logger.debug(format("Reading comments: %s", itemId));
    const key = itemId;
    const data = await new Promise((resolve, reject) => {
      fs.readFile(`./comments/${hash(key)}.jsonl`, 'utf8', (err, data) => {
        if (err) {
          console.error(err);
          return resolve(``);
        }
        logger.debug(format("Returning comments: %s", itemId));
        resolve(data);
      });
    });
    return data
      .split('\n')
      .filter((line) => line !== '')
      .map((line) => JSON.parse(line));
  }

  function hash(str) {
    return crypto
      .createHash('md5')
      .update(str)
      .digest('hex');
  }

  return {
    storeComment,
    readComments,
  };
}

module.exports = StorageEngine;
