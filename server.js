'use strict';

const express = require('express');
const cors = require('cors');
const uuid = require('uuid');
const url = require('url');
const util = require('util');
const format = util.format;
const got = require('got');
const crypto = require('crypto');

const { validateComment } = require('./validation');
const { renderMarkdown } = require('./markdown');
const config = require('./config');
const winston = require("winston");

const logger = winston.createLogger();

const cliLogFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.cli()
);

if (process.env.NODE_ENV === "production") {
  //var logDir = config.logDir || __dirname;
  //logger.add(new winston.transports.File({
  //  filename: logDir + '/server.log',
  //  level: 'info'
  //}));
  logger.add(new winston.transports.Console({
    level: 'debug',
    format: cliLogFormat,
  }));
}
else {
  logger.add(new winston.transports.Console({
    level: 'debug',
    format: cliLogFormat,
  }));
}

const app = express();
const port = config.port;
const storageEngine = config.storageEngine || 'file';
const { storeComment, readComments, deleteCommentById, dbMonitor } = require(format("./storage/%s", storageEngine))(config, logger);
const { mailAdminComment } = require('./mailer')(config, logger);

app.use(cors());
app.use(express.json());

function makeHashForId(id) {
  const idWithHashSecret = format("%s:%s", id, config.hashSecret);
  return crypto
    .createHash('md5')
    .update(idWithHashSecret)
    .digest('hex');
}

async function validateAdminHash(id, hash) {
  const validHash = makeHashForId(id);
  if (hash == validHash) {
    logger.debug(format("Valid admin hash for comment ID %d: %s", id, hash));
  }
  else {
    const message = format("Invalid admin hash for comment ID %d: %s", id, hash);
    logger.warn(message);
    throw new Error(message);
  }
}

function checkApiKey(apiKey) {
  if(config.validApiKeys && !config.validApiKeys.includes(apiKey)) {
    const message = format("Invalid API key: %s", apiKey);
    logger.warn(message);
    throw new Error(message);
  }
}

async function getComments(req) {
  const apiKey = req.query.apiKey;
  checkApiKey(apiKey);
  const pageId = req.query.pageId;
  const comments = await readComments(apiKey, pageId);
  logger.debug(format("Got comments for page ID: %s", pageId));
  return {
    comments: comments.map(mapComment),
  };
}

function getUserData(req) {
  const data = req.headers.authorization.split('===')[1];
  return JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
}

async function validateCaptcha(req) {
  const captchaResult = req.body.captchaResult;
  if(captchaResult === undefined || captchaResult === '' || captchaResult === null) {
    throw new Error(`Request validation failed: Please select captcha`);
  }
  try {
    const secretKey = config.recaptchaSecretKey;
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    // req.connection.remoteAddress will provide IP address of connected user.
    var verificationUrl = format("https://www.google.com/recaptcha/api/siteverify?secret=%s&response=%s&remoteip=%s", secretKey, captchaResult, ip);
    const response = await got(verificationUrl);
    const data = JSON.parse(response.body);
    // Success will be true or false depending upon captcha validation.
    if(data.success) {
      logger.debug(format("Recaptcha validated for IP: %s", ip));
    }
    else {
      logger.warn(format("Request validation failed on IP %s: Failed captcha verification", ip));
      throw new Error(`Request validation failed: Failed captcha verification`);
    }
  } catch (error) {
    logger.warn(format("Request validation failed: Failed captcha verification on IP %s: %s", ip, error));
    throw new Error(`Request validation failed: captcha verification error: ${error}`);
  }
}

async function deleteComment(id) {
  await deleteCommentById(id);
  logger.info(format("Deleted comment: %d", id));
  return {
    success: true,
    commentId: id,
  }
}

async function createComment(req) {
  const apiKey = req.query.apiKey;
  checkApiKey(apiKey);
  const comment = req.body;

  const { userId, username, userPic, userUrl, userEmail } = getUserData(req);

  const valid = validateComment(comment);

  if (!valid) {
    throw new Error(
      `Request validation failed: ${JSON.stringify(comment)} ${JSON.stringify(
        validateComment.errors,
      )}`,
    );
  }

  comment.userId = userId;
  comment.username = username;
  comment.userPic = userPic;
  comment.userUrl = userUrl;
  comment.userEmail = userEmail;
  comment.commentId = comment.commentId || uuid.v4();
  comment.createdAt = new Date().toISOString();
  comment.commentUrl = getCommentUrl(comment);

  const id = await storeComment(apiKey, comment);
  logger.info(format("Created new comment for username: %s, email: %s, id: %d", username, userEmail, id));
  const hash = makeHashForId(id);
  await mailAdminComment(comment, id, hash);
  return mapComment(comment);
}

function previewComment(req) {
  return {
    htmlMessage: renderMarkdown(req.body.message),
  };
}

function getCommentUrl(comment) {
  const commentItemId = comment.originalItemId;
  const parsedCommentUrl = url.parse(
    comment.itemProtocol + '//' + commentItemId + '#jc' + comment.commentId,
  );
  parsedCommentUrl.port = comment.itemPort;
  delete parsedCommentUrl.href;
  delete parsedCommentUrl.host;
  return url.format(parsedCommentUrl);
}

function mapComment(data) {
  return {
    itemId: data.itemId,
    commentUrl: data.commentUrl,
    commentId: data.commentId,
    replyTo: data.replyTo,
    parentId: data.parentId,
    userId: data.userId,
    username: data.username,
    userPic: data.userPic,
    userUrl: data.userUrl,
    message: data.message,
    htmlMessage: renderMarkdown(data.message),
    htmlContent: renderMarkdown(data.message),
    createdAt: data.createdAt,
    hidden: false,
  };
}

app.get('/monitor/', function(_req, res) {
  dbMonitor().then((count) => {
    logger.debug(format("Monitor request succeeded, %d comments", count));
    return res.send('up')
  }).catch((err) => next(err));
});

app.get('/v2/comments', (req, res, next) =>
  getComments(req)
    .then((response) => res.json(response))
    .catch((err) => next(err)),
);

app.get('/comments/delete/:comment_id/:hash', (req, res, next) => {
  const id = req.params.comment_id;
  const hash = req.params.hash;
  validateAdminHash(id, hash).then(() => deleteComment(id)).then((response) => res.json(response)).catch((err) => next(err));
});

app.post('/comments/create', (req, res, next) =>
  validateCaptcha(req).then(() => createComment(req)).then((response) => res.json(response)).catch((err) => next(err)),
);

app.post('/comments/preview', (req, res, next) =>
  res.json(previewComment(req)),
);

app.listen(port, () => logger.info(format("JustComments listening on port: %d", port)));
