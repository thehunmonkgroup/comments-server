'use strict';

const util = require('util');
const format = util.format;
const nodemailer = require("nodemailer");

const MailEngine = function(config, logger) {
  async function mailAdminComment(comment) {
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport(config.mail.mailer);
    // send mail with defined transport object
    let info = await transporter.sendMail({
      from: config.mail.from,
      to: config.mail.adminEmails,
      subject: format("[NEW COMMENT] User: %s", comment.username),
      html: format(`<p>Comment from %s

Message: <pre>%s</pre>
`, comment.username, comment.message),
    });
    logger.info(format("Message sent: %s", info.messageId));
  }

  return {
    mailAdminComment,
  };

}
module.exports = MailEngine;
