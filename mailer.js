'use strict';

const util = require('util');
const format = util.format;
const nodemailer = require("nodemailer");

const MailEngine = function(config, logger) {
  async function mailAdminComment(comment, id, hash) {
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport(config.mail.mailer);
    // send mail with defined transport object
    let info = await transporter.sendMail({
      from: config.mail.from,
      to: config.mail.adminEmails,
      subject: format("[NEW COMMENT] User: %s", comment.username),
      html: format(`
<p>
  Comment from %s, email: %s
</p>
<p>
Message: <pre>%s</pre>
</p>
<p>
  <a href="%s/jc-api/comments/delete/%d/%s">Delete this comment</a>
</p>
`, comment.username, comment.userEmail, comment.message, config.mail.adminDomain, id, hash),
    });
    logger.info(format("Message sent: %s", info.messageId));
  }

  return {
    mailAdminComment,
  };

}
module.exports = MailEngine;
