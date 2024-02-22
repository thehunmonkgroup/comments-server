var config = {};

// List of valid API keys, any call to the comment server with an API key not
// in this list will be rejected.
config.validApiKeys = [
  'example.com',
]

// Used to create secure hashes of comment IDs.
config.hashSecret = 'some_random_string';

// Port to listen on.
config.port = 3434;

// Recaptcha secret key, optional. If set, recaptcha will be enforced.
config.recaptchaSecretKey = '';

// Storage engine, currently only 'mysql' is supported.
config.storageEngine = 'mysql';

// Database connection config.
config.mysql = {
  host: 'localhost',
  user: 'example',
  password: 'supersecret',
  database: 'comments',
}

// Mailer config for receiving admin emails.
config.mail = {
  from: '"Comments Server" <noreply@example.com>',
  // Who gets the admin emails.
  adminEmails: "info@example.one",
  // Set this to the external domain/path where the comment server is running.
  // Used to provide a full URL to the comment server in emails.
  adminDomain: "https://example.com:3434",
  // These settings are passed directly to nodemailer.
  // See https://nodemailer.com/smtp/ for configuration instructions.
  mailer: {
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    auth: {
      user: 'apikey',
      pass: 'aptString',
    },
  },
}

/***** END *****/
// Following lines are always needed.
export default config;

// vi: ft=javascript
