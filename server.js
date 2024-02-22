import util from 'util';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import got from 'got';
import { createLogger, format, transports } from 'winston';
import validateComment from './validation.js';
import { renderMarkdown } from './markdown.js';
import config from './config.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { randomUUID } from 'crypto'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = createLogger({
  format: format.combine(
    format.colorize(),
    format.cli()
  ),
  transports: [
    new transports.Console({
      level: 'debug',
    }),
  ],
});

const app = express();
const port = config.port;
const storageEngine = config.storageEngine || 'file';
const storageModule = await import(`./storage/${storageEngine}.js`);
const { storeComment, readComments, deleteCommentById, dbMonitor } = storageModule.default(config, logger);
const mailerModule = await import('./mailer.js');
const { mailAdminComment } = mailerModule.default(config, logger);

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Error handling middleware
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500; // Use the error's status code or default to 500
  res.status(statusCode).json({
    message: err.message || 'An unexpected error occurred'
  });
});

function makeHashForId(id) {
  const idWithHashSecret = `${id}:${config.hashSecret}`;
  return crypto
    .createHash('md5')
    .update(idWithHashSecret)
    .digest('hex');
}

async function validateAdminHash(id, hash) {
  const validHash = makeHashForId(id);
  if (hash === validHash) {
    logger.debug(`Valid admin hash for comment ID ${id}: ${hash}`);
  } else {
    const message = `Invalid admin hash for comment ID ${id}: ${hash}`;
    logger.warn(message);
    throw new Error(message);
  }
}

function checkApiKey(apiKey) {
  if (config.validApiKeys && !config.validApiKeys.includes(apiKey)) {
    const message = `Invalid API key: ${apiKey}`;
    logger.warn(message);
    throw new Error(message);
  }
}


function organizeComments(comments) {
  const topLevel = [];
  const parentMap = {};
  function nestComments(list) {
    list.forEach((c) =>  {
      if (parentMap[c.commentId]) {
        c.nested = nestComments(parentMap[c.commentId]);
      }
    });
    return list;
  }
  comments.forEach((comment) => {
    comment = mapComment(comment);
    if (comment.parentId) {
      if (!parentMap[comment.parentId]) {
        parentMap[comment.parentId] = [];
      }
      parentMap[comment.parentId].push(comment);
    }
    else {
      topLevel.push(comment);
    }
  });
  return nestComments(topLevel);
}

async function getComments(req) {
  const apiKey = req.query.apiKey;
  const queryArgs = {
    sort: req.query.sort,
  };
  checkApiKey(apiKey);
  const pageId = req.query.pageId;
  const comments = await readComments(apiKey, pageId, queryArgs);
  logger.debug(util.format("Got comments for page ID: %s", pageId));
  return {
    comments: organizeComments(comments),
  };
}

async function validateCaptcha(req) {
  const captchaResult = req.body.captchaResult;
  if(captchaResult === undefined || captchaResult === '' || captchaResult === null) {
    throw new Error(`Request validation failed: Please select captcha`);
  }
  try {
    const secretKey = config.recaptchaSecretKey;
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    // logger.warn(util.format("IP: %s", ip));
    // logger.warn(util.format("secretKey: %s", secretKey));
    // logger.warn(util.format("catpchaResult: %s", captchaResult));
    var verificationUrl = util.format("https://www.google.com/recaptcha/api/siteverify?secret=%s&response=%s&remoteip=%s", secretKey, captchaResult, ip);
    const response = await got(verificationUrl);
    const data = JSON.parse(response.body);
    // Success will be true or false depending upon captcha validation.
    if(data.success) {
      logger.debug(util.format("Recaptcha validated for IP: %s", ip));
    }
    else {
      logger.warn(util.format("Request validation failed on IP %s: Failed captcha verification", ip));
      throw new Error(`Request validation failed: Failed captcha verification`);
    }
  } catch (error) {
    logger.warn(util.format("Request validation failed: Failed captcha verification: %s", error));
    throw new Error(`Request validation failed: captcha verification error: ${error}`);
  }
}

async function deleteComment(id) {
  await deleteCommentById(id);
  logger.info(util.format("Deleted comment: %d", id));
  return {
    success: true,
    commentId: id,
  }
}

async function createComment(req) {
  const apiKey = req.query.apiKey;
  checkApiKey(apiKey);
  const comment = req.body;

  const valid = validateComment(comment);

  if (!valid) {
    throw new Error(
      `Request validation failed: ${JSON.stringify(comment)} ${JSON.stringify(
        validateComment.errors,
      )}`,
    );
  }

  comment.commentId = comment.commentId || randomUUID();
  comment.createdAt = new Date().toISOString();
  comment.commentUrl = getCommentUrl(comment);

  const id = await storeComment(apiKey, comment);
  logger.info(util.format("Created new comment for username: %s, email: %s, id: %d", comment.username, comment.userEmail, id));
  const hash = makeHashForId(id);
  mailAdminComment(comment, id, hash);
  return mapComment(comment);
}

function previewComment(req) {
  return {
    htmlMessage: renderMarkdown(req.body.message),
  };
}

function getCommentUrl(comment) {
  return `https://${comment.itemId}#comment-${comment.commentId}`;
}

function mapComment(data) {
  return {
    itemId: data.itemId,
    commentUrl: data.commentUrl,
    commentId: data.commentId,
    parentId: data.parentId,
    username: data.username,
    message: data.message,
    htmlContent: renderMarkdown(data.message),
    createdAt: data.createdAt,
    hidden: false,
  };
}

app.get('/monitor/', async (_req, res, next) => {
  try {
    const count = await dbMonitor();
    logger.debug(`Monitor request succeeded, ${count} comments`);
    res.send('up');
  } catch (err) {
    next(err);
  }
});

app.get('/comments', async (req, res, next) => {
  try {
    const response = await getComments(req);
    res.json(response);
  } catch (err) {
    res.status(500).json({message: err.message});
  }
});

app.get('/comments/delete/:comment_id/:hash', async (req, res, next) => {
  const id = req.params.comment_id;
  const hash = req.params.hash;
  try {
    await validateAdminHash(id, hash);
    const response = await deleteComment(id);
    res.json(response);
  } catch (err) {
    res.status(500).json({message: err.message});
  }
});

app.post('/comments/create', async (req, res, next) => {
  try {
    if (config.recaptchaSecretKey) {
      await validateCaptcha(req);
    }
    const response = await createComment(req);
    res.status(201).json(response);
  } catch (err) {
    res.status(500).json({message: err.message});
  }
});

app.post('/comments/preview', (req, res) => {
  res.json(previewComment(req));
});

app.listen(port, () => {
  logger.info(`Comments server listening on port: ${port}`);
});;
