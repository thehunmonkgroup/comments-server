let globalBasePath = `${window.location.protocol}//${window.location.hostname}:3434`;
let globalApiKey = window.location.hostname;
let globalRecaptchaSiteKey;
let globalSort = 'asc';

// jsrender only provides the window.jsrender object if jQuery
// is NOT loaded. For consistency, we'll only assign the special
// jQuery variable to jsrender if jQuery is not loaded.
if (!window.jQuery) {
  const $ = window.jsrender;
}

function handleResponse(response, formDiv) {
  if (response.status === 201) {
    formDiv.querySelectorAll("input").forEach(input => input.value = "");
    formDiv.querySelectorAll("textarea").forEach(input => input.value = "");

    const element = formDiv.querySelector(".comment-form-message");
    element.innerText = "Successfully submitted comment.";
    element.classList.remove("fail");
    element.classList.add("success");

    const commentListNode = document.querySelector("#comments .comment-list");
    refresh(commentListNode);
  } else {
    const element = formDiv.querySelector(".comment-form-message");
    response.json().then(json => {
      element.innerText = `Couldn't submit your comment. Reason: ${json.message}`;
    });
    element.classList.remove("success");
    element.classList.add("fail");
  }
}

function markInvalidFieldsAndIsValid(formDiv) {
  let isValid = true;
  const inputs = formDiv.querySelectorAll(".form-control:required");
  inputs.forEach(input => {
    if (input.value.trim().length === 0) {
      input.parentNode.classList.add("has-error");
      isValid = false;
    } else {
      input.parentNode.classList.remove("has-error");
    }
  });
  return isValid;
}

function submitComment(formDiv, parentId, token) {
  if (!markInvalidFieldsAndIsValid(formDiv)) {
    return false;
  }
  const path = window.location.pathname;
  const requestUrl = `${globalBasePath}/comments/create/?apiKey=${globalApiKey}`;

  const pageUrl = window.location.origin + path;
  const itemId = window.location.hostname + path;
  const payload = {
    itemId: itemId,
    message: formDiv.querySelector(".comment-content").value,
    pageUrl: pageUrl,
    username: formDiv.querySelector(".comment-author").value,
    userEmail: formDiv.querySelector(".comment-email").value,
  };
  if (parentId !== undefined) {
    payload.parentId = parentId;
  }
  if (token) {
    payload.captchaResult = token;
  }
  fetch(requestUrl,
    {
      headers: {
        'Content-Type': 'application/json'
      },
      method: "POST",
      body: JSON.stringify(payload)
    })
    .then(response => handleResponse(response, formDiv));
  return false;
}

function createNodesForComments(comments) {
  if (comments.length === 0){
    const heading = document.createElement("p");
    var tmpl = $.templates("#template-no-comments-yet");
    var html = tmpl.render({});
    heading.setAttribute("class", "no-comments-yet");
    heading.innerText = html;
    return [heading];
  } else {
    return comments.map(createNodeForComment);
  }
}

function formatDate(datetime) {
  const agoAndUnit = getTimeSinceInBiggestUnit(datetime);
  if (agoAndUnit) {
    return "{} ago".replace("{}", agoAndUnit);
  }
  return "just now";
}

function getTimeSinceInBiggestUnit(datetime) {
  const seconds = Math.floor((new Date() - new Date(datetime)) / 1000);
  const timeUnits = [
    { unit: "year", seconds: 31536000 },
    { unit: "month", seconds: 2592000 },
    { unit: "day", seconds: 86400 },
    { unit: "hour", seconds: 3600 },
    { unit: "minute", seconds: 60 },
    { unit: "second", seconds: 1 }
  ];
  for (const timeUnit of timeUnits) {
    const interval = Math.floor(seconds / timeUnit.seconds);
    if (interval >= 1) {
      const unit = interval > 1 ? `${timeUnit.unit}s` : timeUnit.unit;
      return `${interval} ${unit}`;
    }
  }
}

function createNodeForComment(comment) {
  const postDiv = document.createElement('div');
  postDiv.setAttribute("class", "comment-post");
  postDiv.setAttribute("id", `comment-${comment.commentId}`);
  postDiv.innerHTML = `
    <div class="comment-avatar">${createAvatarSvg()}</div>
    <div class="comment-body">
      <header class="comment-header">
        <span class="comment-author">${comment.username}</span>
        <span class="comment-date">${formatDate(comment.createdAt)}</span>
      </header>
      <div class="comment-content">${comment.htmlContent}</div>
      <button class="comment-expand-button btn btn-link btn-sm">Reply</button>
      <div class="comment-form"></div>
      <div class="comment-replies"></div>
    </div>
  `;
  postDiv.querySelector("button").onclick = (event) => expandForm(event.target, postDiv, comment.commentId);
  if (comment.nested !== undefined){
    const repliesDiv = postDiv.querySelector(".comment-replies");
    comment.nested.map(createNodeForComment).forEach(node => repliesDiv.appendChild(node));
  }
  return postDiv;
}

function expandForm(expandButton, formDiv, commentId) {
  if (expandButton.classList.contains("comment-collapsed")) {
    clearReplyForm(formDiv);
    expandButton.classList.remove("comment-collapsed")
  } else {
    expandReplyForm(formDiv, commentId);
    expandButton.classList.add("comment-collapsed")
    const author = formDiv.querySelector(".form-control.comment-author")
    author.focus();
  }
}

function clearReplyForm(postDiv) {
  const replyForm = postDiv.querySelector(".comment-form");
  replyForm.innerHTML = ""
}

function configureRecaptchaSubmit(replyForm, parentCommentId) {
  let widgetID
  function onRecaptchaSubmitCallback(token) {
    submitComment(replyForm, parentCommentId, token);
    grecaptcha.enterprise.reset(widgetID);
  };
  const recaptchaDiv = document.createElement('div');
  const recaptchaContainer = replyForm.querySelector(".recaptcha-container");
  recaptchaContainer.appendChild(recaptchaDiv);
  widgetID = grecaptcha.enterprise.render(recaptchaDiv, {
    'sitekey': globalRecaptchaSiteKey,
    'size': 'invisible',
    'callback': onRecaptchaSubmitCallback
  });
  const submitButton = replyForm.querySelector("button");
  submitButton.addEventListener('click', function(event) {
    event.preventDefault();
    grecaptcha.enterprise.execute(widgetID);
  });
}

function expandReplyForm(postDiv, parentCommentId) {
  const replyForm = postDiv.querySelector(".comment-form");
  replyForm.innerHTML = createFormHtml();
  if (globalRecaptchaSiteKey) {
    configureRecaptchaSubmit(replyForm, parentCommentId);
  }
  else {
    const submitButton = replyForm.querySelector("button");
    submitButton.addEventListener('click', function(event) {
      event.preventDefault();
      submitComment(replyForm, parentCommentId, null);
    });
  }
}

function createFormHtml() {
  var tmpl = $.templates("#template-comment-form");
  var html = tmpl.render({recaptchaSiteKey: globalRecaptchaSiteKey});
  return html;
}

function createFormNode() {
  const mainFormDiv = document.createElement('div');
  mainFormDiv.setAttribute("class", "comment-form-root");
  mainFormDiv.innerHTML = `
    <button class="comment-expand-button btn btn-link">Click Here to Write a Comment...</button>
    <div class="comment-form"></div>
  `;
  mainFormDiv.querySelector("button").onclick = (event) => expandForm(event.target, mainFormDiv);
  return mainFormDiv;
}

function scrollToComment(commentId) {
  if (commentId) {
    var commentElement = document.getElementById(commentId);
    if (commentElement) {
      commentElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

async function loadComments() {
  const requestUrl = `${globalBasePath}/comments/?apiKey=${globalApiKey}&pageId=${window.location.hostname}${window.location.pathname}&sort=${globalSort}`;
  try {
    const response = await fetch(requestUrl);
    if (!response.ok) {
      throw new Error(`HTTP error, status: ${response.status}`);
    }
    const data = await response.json();
    console.log(data);
    return data.comments;
  } catch (error) {
    console.error('Error fetching comments:', error);
  }
}

function createAvatarSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 482.9 482.9" fill="currentColor"><path d="M239.7 260.2h3.2c29.3-.5 53-10.8 70.5-30.5 38.5-43.4 32.1-117.8 31.4-124.9-2.5-53.3-27.7-78.8-48.5-90.7C280.8 5.2 262.7.4 242.5 0h-1.7c-11.1 0-32.9 1.8-53.8 13.7-21 11.9-46.6 37.4-49.1 91.1-.7 7.1-7.1 81.5 31.4 124.9 17.4 19.7 41.1 30 70.4 30.5zm-75.1-152.9c0-.3.1-.6.1-.8 3.3-71.7 54.2-79.4 76-79.4h1.2c27 .6 72.9 11.6 76 79.4 0 .3 0 .6.1.8.1.7 7.1 68.7-24.7 104.5-12.6 14.2-29.4 21.2-51.5 21.4h-1c-22-.2-38.9-7.2-51.4-21.4-31.7-35.6-24.9-103.9-24.8-104.5zm282.2 276.3v-.3l-.1-2.5c-.6-19.8-1.9-66.1-45.3-80.9-.3-.1-.7-.2-1-.3-45.1-11.5-82.6-37.5-83-37.8-6.1-4.3-14.5-2.8-18.8 3.3s-2.8 14.5 3.3 18.8c1.7 1.2 41.5 28.9 91.3 41.7 23.3 8.3 25.9 33.2 26.6 56 0 .9 0 1.7.1 2.5.1 9-.5 22.9-2.1 30.9-16.2 9.2-79.7 41-176.3 41-96.2 0-160.1-31.9-176.4-41.1-1.6-8-2.3-21.9-2.1-30.9 0-.8.1-1.6.1-2.5.7-22.8 3.3-47.7 26.6-56 49.8-12.8 89.6-40.6 91.3-41.7 6.1-4.3 7.6-12.7 3.3-18.8s-12.7-7.6-18.8-3.3c-.4.3-37.7 26.3-83 37.8-.4.1-.7.2-1 .3-43.4 14.9-44.7 61.2-45.3 80.9 0 .9 0 1.7-.1 2.5v.3c-.1 5.2-.2 31.9 5.1 45.3a12.83 12.83 0 0 0 5.2 6.3c3 2 74.9 47.8 195.2 47.8s192.2-45.9 195.2-47.8c2.3-1.5 4.2-3.7 5.2-6.3 5-13.3 4.9-40 4.8-45.2z"/></svg>
  `
}

const refresh = (commentListNode) => {
  commentListNode.innerHTML = '';
  loadComments().then(createNodesForComments).then(commentDomNodes => {
    commentDomNodes.forEach(node => commentListNode.appendChild(node));
    scrollToComment(window.location.hash.substring(1));
  });
};

function setGlobals(commentAreaNode) {
  if (commentAreaNode.dataset.basepath) {
    globalBasePath = commentAreaNode.dataset.basepath;
  }
  if (commentAreaNode.dataset.apikey) {
    globalApiKey = commentAreaNode.dataset.apikey;
  }
  if (commentAreaNode.dataset.recaptchasitekey) {
    globalRecaptchaSiteKey = commentAreaNode.dataset.recaptchasitekey;
  }
  if (commentAreaNode.dataset.sort) {
    globalSort = commentAreaNode.dataset.sort;
  }
}

function initComments() {
  const commentAreaNode = document.querySelector("#comments");
  setGlobals(commentAreaNode);
  commentAreaNode.appendChild(createFormNode());
  const commentListNode = document.createElement("div");
  commentListNode.className = 'comment-list';
  commentAreaNode.appendChild(commentListNode);
  refresh(commentListNode);
};
