## Comments Server

Basic implementation of a server for comments on a static website.

Derived from original work at [https://github.com/JustComments/jc-server](https://github.com/JustComments/jc-server)

The server is implemented in NodeJS.

## Features

- Threaded commenting
- reCaptcha
- Admin email notifications
- File storage
- MySQL storage

## Server Setup

- Clone the repository and run `npm install`.
- Run `node server.js`

You should get a message `Comments server listening on port 3434!`. You can change the port in `config.js`.

## Frontend Setup

TODO:

## Recommended config for the frontend

```html
<!-- TODO: -->
<div
  class="comments"
  data-locale="en"
  data-disablesociallogin="true"
  data-disablepushnotifications="true"
  data-disableemailnotifications="true"
  data-disablereactions="true"
></div>
<script src="https://your-server/jc/w2.js"></script>
```
