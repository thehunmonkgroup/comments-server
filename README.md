## Comments Server

Basic implementation of a NodeJS server for comments on a static website.

## Rationale

I didn't like any of the existing comment solutions for Jekyll, so wrote this one.

It's missing a lot of features compared to more robust solutions, but is very easy to set up and should get the job done for small sites.

## Features

* Multi-site support
* Threaded commenting
* Invisible reCaptcha v2
* Admin email notifications
  * New comments
  * Delete a comment via a link
* MySQL storage

## reCaptcha setup

Invisible reCaptchas are generated automatically, it's only necessary to add the site key and secret key to your configuration:

* Make sure the site key is included in `config.yml`
* Make sure the secret key is included in `config.js`

Set up reCaptcha site key and secret key at [https://www.google.com/recaptcha/admin](https://www.google.com/recaptcha/admin) for your site.

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

1. Copy `templates/comments.html` and `templates/comments-scripts.html` to the `_includes` directory in the Jekyll install
2. Add `{% include comments.html %}` to any Jekyll templates where you want comments injected
3. If you're not already loading the recaptcha script by some other means add `{% include comments-scripts.html %}` to any Jekyll templates where you want comments injected
4. Copy `templates/comments.scss` into a Jekyll stylesheet if you'd like the default CSS styling
5. The frontend depends on [jsrender](https://github.com/borismoore/jsrender), so load this script on any page where you want comments.
6. Copy the settings in `_config.example.yml` to `_config.yml` for the Jekyll site, and adjust as needed.

## Wish list

* Email alerts to users when a person replies to their comment
* Other database storage backends

## Credits

Derived from original works:

* Backend: [https://github.com/JustComments/jc-server](https://github.com/JustComments/jc-server)
* Frontend: [https://github.com/phauer/comment-sidecar](https://github.com/phauer/comment-sidecar)
