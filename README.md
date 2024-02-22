## Comments Server

Basic implementation of a NodeJS server for comments on a static website.

## Rationale

I didn't like any of the existing comment solutions for Jekyll, so wrote this one.

It's missing a lot of features compared to more robust solutions, but is very easy to set up and should get the job done for small sites.

## Features

* Multi-site support
* Threaded commenting
* reCaptcha
* Admin email notifications
  * New comments
  * Delete a comment via a link
* MySQL storage

## Server Setup

1. Clone the repository
2. Use `comments.sql` to create the necessary database table for comments
3. Run `npm install`
4. Copy `config.example.js` to `config.js`, edit to taste
5. Run `npm start`

You should get a message `Comments server listening on port...`.

## Frontend Setup

This setup assumes a Jekyll static site.

For other configurations, you'll need to modify accordingly.

1. Copy `templates/comments.html` to the `_includes` directory in the Jekyll install
2. Add `{% include comments.html %}` to any Jekyll templates where you want comments injected
3. Copy the settings in `_config.example.yml` to `_config.yml` for the Jekyll site, and adjust as needed.
   For reCaptcha configuration instructions, see [https://www.google.com/recaptcha](https://www.google.com/recaptcha)

## Wish list

* Email alerts to users when a person replies to their comment
* Other database storage backends

## Credits

Derived from original works:

* Backend: [https://github.com/JustComments/jc-server](https://github.com/JustComments/jc-server)
* Frontend: [https://github.com/phauer/comment-sidecar](https://github.com/phauer/comment-sidecar)
