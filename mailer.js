import nodemailer from 'nodemailer';
import { renderMarkdown } from './markdown.js';

// Define the MailEngine class
export default function MailEngine(config, logger) {
  async function mailAdminComment(comment, hash) {
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport(config.mail.mailer);
    // send mail with defined transport object
    let info = await transporter.sendMail({
      from: config.mail.from,
      to: config.mail.adminEmails,
      subject: `[NEW COMMENT] User: ${comment.username}`,
      html: `
<p>
  Comment from ${comment.username}, email: ${comment.userEmail}
</p>
<p>
Message:
</p>
${renderMarkdown(comment.message)}
<p>
  ${comment.commentUrl}
</p>
<p>
  <a href="${config.mail.adminDomain}/comments-api/comments/delete/${comment.commentId}/${hash}">Delete this comment</a>
</p>
`,
    });
    logger.info(`Message sent: ${info.messageId}`);
  }

  return {
    mailAdminComment,
  };
}
