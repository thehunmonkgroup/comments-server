import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const schema = {
  $id: 'https://comments-server.com/comment-input.json',
  type: 'object',
  definitions: {},
  $schema: 'http://json-schema.org/draft-06/schema#',
  properties: {
    itemId: {
      $id: '/properties/itemId',
      type: 'string',
      title: 'The Itemid Schema ',
      default: '',
      examples: ['127.0.0.1/demo.html'],
      minLength: 1,
      maxLength: 2048,
    },
    commentId: {
      $id: '/properties/commentId',
      type: 'string',
      title: 'The Commentid Schema ',
      default: '',
      minLength: 1,
      maxLength: 128,
      examples: ['9f6c226d-f754-48e6-a8b0-d957719fd23c'],
    },
    message: {
      $id: '/properties/message',
      type: 'string',
      title: 'The Message Schema',
      default: '',
      minLength: 1,
      maxLength: 5000,
      examples: ['comment message'],
    },
    website: {
      $id: '/properties/website',
      type: 'string',
      title: 'The Website Schema ',
      default: '',
      examples: ['https://just-comments.com'],
      format: 'uri',
    },
    captchaResult: {
      $id: '/properties/captchaResult',
      type: 'string',
      title: 'captchaResult schema',
    },
    pageUrl: {
      $id: '/properties/pageUrl',
      type: 'string',
      title: 'pageUrl schema',
    },
  },
  required: ['itemId', 'message'],
};

const ajv = new Ajv();
addFormats(ajv);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonSchemaDraft06 = JSON.parse(fs.readFileSync(path.join(__dirname, 'node_modules', 'ajv', 'lib', 'refs', 'json-schema-draft-06.json'), 'utf-8'));

ajv.addMetaSchema(jsonSchemaDraft06);

const validateComment = ajv.compile(schema);

export default validateComment;
