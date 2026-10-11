(() => {
  const list = document.querySelector('#reviews'), status = document.querySelector('#status'), filter = document.querySelector('#visibility'), more = document.querySelector('#more'), signOut = document.querySelector('#sign-out');
  const draftRoot = 'jija-owner-reply-draft:';
  const memoryDrafts = new Map(), draftRevisions = new Map();
  let draftChangeSequence = 0;
  let adminIdentity = '', storageAvailable = true;
  let cursor = null, loadGeneration = 0;
  const pendingReviewIds = new Set(), pendingCardControls = new Map();
  const node = (tag, value, className) => { const el = document.createElement(tag); if (value !== undefined) el.textContent = value; if (className) el.className = className; return el; };
  const draftKeyFor = (identity, id) => draftRoot + identity + ':' + id;
  const draftKey = id => draftKeyFor(adminIdentity, id);
  function getDraftFor(identity, id) {
    const key = draftKeyFor(identity, id);
    if (memoryDrafts.has(key)) return memoryDrafts.get(key);
    try {
      const value = sessionStorage.getItem(key);
      if (value !== null) memoryDrafts.set(key, value);
      return value;
    } catch { storageAvailable = false; return null; }
  }
  function getDraft(id) { return getDraftFor(adminIdentity, id); }
  function removeDraft(key) {
    memoryDrafts.delete(key);
    try { sessionStorage.removeItem(key); } catch { storageAvailable = false; }
  }
  function saveDraftFor(identity, id, value) {
    const key = draftKeyFor(identity, id);
    draftRevisions.set(key, ++draftChangeSequence);
    if (value) {
      memoryDrafts.set(key, value);
      try { sessionStorage.setItem(key, value); } catch { storageAvailable = false; }
    } else removeDraft(key);
  }
  function saveDraft(id, value) { saveDraftFor(adminIdentity, id, value); }
  function clearDraftsExcept(identity) {
    const keep = draftRoot + identity + ':';
    for (const key of memoryDrafts.keys()) if (key.startsWith(draftRoot) && !key.startsWith(keep)) memoryDrafts.delete(key);
    for (const key of draftRevisions.keys()) if (key.startsWith(draftRoot) && !key.startsWith(keep)) draftRevisions.delete(key);
    try {
      const keys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(draftRoot) && !key.startsWith(keep)) keys.push(key);
      }
      keys.forEach(key => sessionStorage.removeItem(key));
    } catch { storageAvailable = false; }
  }
  function selectIdentity(actor) {
    if (typeof actor !== 'string' || !actor.includes('@')) throw new Error('Administrator identity was not returned. Reload the page to sign in again.');
    const next = actor.trim().toLowerCase();
    if (adminIdentity && adminIdentity !== next) clearDrafts();
    else if (!adminIdentity) clearDraftsExcept(next);
    adminIdentity = next;
  }
  function clearDrafts() {
    memoryDrafts.clear(); draftRevisions.clear();
    try {
      const keys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(draftRoot)) keys.push(key);
      }
      keys.forEach(key => sessionStorage.removeItem(key));
    } catch { storageAvailable = false; }
  }
  function draftRecoveryMessage() {
    return storageAvailable ? 'Your reply draft is saved in this tab.' : 'Your reply draft is kept on this page; copy it before reloading.';
  }
  function draftSavedMessage() {
    return storageAvailable ? 'Draft saved in this tab. Publish it when ready.' : 'Draft kept on this page; copy it before reloading.';
  }
  async function api(url, options) {
    let response;
    try { response = await fetch(url, options); } catch { throw new Error('Could not connect. ' + draftRecoveryMessage() + ' Try again.'); }
    if (!(response.headers.get('content-type') || '').includes('application/json')) throw new Error('Your sign-in may have expired. Reload this page to sign in again.');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed. ' + draftRecoveryMessage());
    return data;
  }
  function render(review, replyMessage = '', moderationMessage = '') {
    const card = node('article'); card.dataset.reviewId = review.id;
    let mutationPending = pendingReviewIds.has(review.id);
    function setCardPending(pending) {
      mutationPending = pending;
      if (pending) {
        pendingReviewIds.add(review.id);
        pendingCardControls.set(review.id, setCardPending);
      } else {
        pendingReviewIds.delete(review.id);
        if (pendingCardControls.get(review.id) === setCardPending) pendingCardControls.delete(review.id);
      }
      const buttons = card.querySelectorAll('.reply-controls button,.moderation-controls button');
      buttons.forEach(button => { button.disabled = pending; });
      if (!pending) {
        const replyField = card.querySelector('.reply-panel textarea');
        const publishButton = card.querySelector('.reply-controls .primary-action');
        if (replyField && publishButton) {
          const value = replyField.value.trim();
          publishButton.disabled = !value || review.owner_reply === value;
        }
        const moderationButtons = card.querySelectorAll('.moderation-controls button');
        [review.visibility === 'hidden', review.visibility === 'visible', review.visibility === 'removed'].forEach((disabled, index) => {
          if (moderationButtons[index]) moderationButtons[index].disabled = disabled;
        });
      }
    }
    const visibilityLabel = { visible: 'On the website', hidden: 'Hidden', removed: 'Removed from website' }[review.visibility] || 'Status unavailable';
    card.append(node('h2', review.display_name), node('p', review.stars + ' out of 5 stars · ' + new Date(review.created_at * 1000).toLocaleString() + ' · ' + visibilityLabel, 'review-meta'), node('p', review.comment, 'comment'));
    const replyPanel = node('section', undefined, 'reply-panel');
    replyPanel.append(node('h3', 'Reply to customer'), node('p', 'Your response is public as “Reply from JIJA Services.” Hiding or removing this review also hides its saved reply; restoring the review shows the saved reply again.'));
    const savedDraft = review.visibility === 'visible' ? getDraft(review.id) : null;
    if (review.owner_reply) {
      const published = node('div', undefined, 'published-reply');
      published.append(node('p', 'Current public reply', 'published-label'), node('p', review.owner_reply));
      if (review.owner_reply_updated_at) published.append(node('p', 'Last updated ' + new Date(review.owner_reply_updated_at * 1000).toLocaleString()));
      replyPanel.append(published);
    }
    const replyStatus = node('p', replyMessage || (review.visibility === 'visible' ? (review.owner_reply ? 'Reply is published. Changes stay as a draft until you save them.' : 'No reply has been published. ' + (storageAvailable ? 'A draft stays in this tab if you change views or reload.' : 'A draft stays on this page; copy it before reloading.')) : 'This reply is hidden with the review. Restore the review before changing its reply.'), 'card-status reply-status');
    replyStatus.setAttribute('role', 'status'); replyStatus.setAttribute('aria-live', 'polite'); replyPanel.append(replyStatus);
    if (review.visibility === 'visible') {
      const label = node('label', 'Your public reply'), reply = node('textarea'), controls = node('div', undefined, 'controls reply-controls');
      reply.id = 'reply-' + review.id; reply.maxLength = 1000; reply.rows = 4; reply.setAttribute('aria-describedby', 'reply-help-' + review.id); reply.value = savedDraft ?? review.owner_reply ?? ''; label.htmlFor = reply.id;
      const help = node('p', 'Replies can be 1–1,000 characters. They appear publicly under this review.', 'reply-draft-note'); help.id = 'reply-help-' + review.id;
      const publish = node('button', review.owner_reply ? 'Save reply changes' : 'Publish reply'); publish.type = 'button'; publish.className = 'primary-action';
      const remove = review.owner_reply ? node('button', 'Remove reply from website') : null;
      if (remove) { remove.type = 'button'; remove.className = 'danger-action'; }
      const historyButton = node('button', 'View reply history'); historyButton.type = 'button';
      const history = node('div', undefined, 'history'); history.hidden = true;
      historyButton.addEventListener('click', async () => {
        if (!history.hidden) { history.hidden = true; return; }
        try {
          const result = await api('/api/admin/reply-audit?reviewId=' + encodeURIComponent(review.id)); history.replaceChildren();
          if (!result.audit.length) history.append(node('p', 'No reply changes have been recorded.'));
          for (const entry of result.audit) {
            const action = entry.action === 'publish' ? 'published a reply' : entry.action === 'edit' ? 'edited the reply' : 'removed the reply';
            history.append(node('p', new Date(entry.changed_at * 1000).toLocaleString() + ' · ' + entry.actor_email + ' ' + action));
            if (entry.old_reply) history.append(node('p', 'Previous reply: ' + entry.old_reply));
            if (entry.new_reply) history.append(node('p', 'New reply: ' + entry.new_reply));
          }
          history.hidden = false;
        } catch (error) { replyStatus.textContent = error.message; }
      });
      function updatePublishButton() { const value = reply.value.trim(); publish.disabled = mutationPending || !value || review.owner_reply === value; }
      reply.addEventListener('input', () => {
        saveDraft(review.id, reply.value); updatePublishButton();
        if (!replyStatus.textContent.startsWith('Could not') && !replyStatus.textContent.includes('changed elsewhere')) replyStatus.textContent = draftSavedMessage();
      });
      publish.addEventListener('click', async () => {
        const value = reply.value.trim();
        if (mutationPending) return;
        if ([...value].length < 1 || [...value].length > 1000) { replyStatus.textContent = 'Enter a reply between 1 and 1,000 characters.'; reply.focus(); return; }
        const hadReply = Boolean(review.owner_reply), submittedDraft = reply.value;
        const actorAtSave = adminIdentity, draftKeyAtSave = draftKeyFor(actorAtSave, review.id);
        const draftRevisionAtSave = draftRevisions.get(draftKeyAtSave) || 0;
        setCardPending(true); publish.disabled = true; reply.disabled = true; if (remove) remove.disabled = true; historyButton.disabled = true; replyStatus.textContent = 'Publishing your reply…';
        try {
          const result = await api('/api/admin/reviews/' + encodeURIComponent(review.id) + '/reply', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ version: review.version, reply: value }) });
          review.owner_reply = result.owner_reply; review.owner_reply_updated_at = result.owner_reply_updated_at; review.version = result.version;
          if (adminIdentity === actorAtSave && (draftRevisions.get(draftKeyAtSave) || 0) === draftRevisionAtSave && getDraftFor(actorAtSave, review.id) === submittedDraft) saveDraftFor(actorAtSave, review.id, '');
          const successMessage = hadReply ? 'Reply updated on the website.' : 'Reply published on the website.';
          const refreshed = await load(true, successMessage);
          if (refreshed !== true) {
            const recovery = successMessage + ' This card shows the saved result; refresh to check the latest details.';
            const current = [...list.querySelectorAll('article')].find(item => item.dataset.reviewId === review.id);
            if (current) current.replaceWith(render(review, recovery));
            status.textContent = recovery;
          }
          const release = pendingCardControls.get(review.id); if (release) release(false);
        } catch (error) {
          replyStatus.textContent = error.message; if (!card.isConnected) status.textContent = error.message;
          setCardPending(false); const release = pendingCardControls.get(review.id); if (release) release(false);
          reply.disabled = false; historyButton.disabled = false; updatePublishButton();
        }
      });
      if (remove) remove.addEventListener('click', async () => {
        if (mutationPending || !window.confirm('Remove this reply from the public website?')) return;
        setCardPending(true); publish.disabled = true; remove.disabled = true; reply.disabled = true; historyButton.disabled = true; replyStatus.textContent = 'Removing the public reply…';
        try {
          const actorAtSave = adminIdentity;
          const hadDraft = Boolean(getDraftFor(actorAtSave, review.id));
          const result = await api('/api/admin/reviews/' + encodeURIComponent(review.id) + '/reply', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ version: review.version }) });
          review.owner_reply = result.owner_reply; review.owner_reply_updated_at = result.owner_reply_updated_at; review.version = result.version;
          const message = hadDraft ? 'Reply removed from the website. Your unpublished draft is ' + (storageAvailable ? 'still saved in this tab.' : 'kept on this page; copy it before reloading.') : 'Reply removed from the website.';
          const refreshed = await load(true, message);
          if (refreshed !== true) {
            const recovery = message + ' This card shows the saved result; refresh to check the latest details.';
            const current = [...list.querySelectorAll('article')].find(item => item.dataset.reviewId === review.id);
            if (current) current.replaceWith(render(review, recovery));
            status.textContent = recovery;
          }
          const release = pendingCardControls.get(review.id); if (release) release(false);
        } catch (error) {
          replyStatus.textContent = error.message; if (!card.isConnected) status.textContent = error.message;
          setCardPending(false); const release = pendingCardControls.get(review.id); if (release) release(false);
          reply.disabled = false; historyButton.disabled = false; updatePublishButton();
        }
      });
      controls.append(publish); if (remove) controls.append(remove); controls.append(historyButton);
      replyPanel.append(label, reply, help, controls, history); updatePublishButton();
    } else replyPanel.append(node('p', 'Your saved reply remains private while this review is hidden or removed.', 'reply-draft-note'));
    card.append(replyPanel);

    const moderation = node('section', undefined, 'moderation-panel');
    moderation.append(node('h3', 'Review visibility'), node('p', 'These controls change whether the customer review appears on the website. They do not edit your reply. Keep ordinary negative feedback visible.', 'moderation-note'));
    const moderationStatus = node('p', moderationMessage, 'card-status moderation-status'); moderationStatus.setAttribute('role', 'status'); moderationStatus.setAttribute('aria-live', 'polite');
    const reasonLabel = node('label', 'Reason for visibility change'), reason = node('textarea'), controls = node('div', undefined, 'controls moderation-controls');
    reason.maxLength = 500; reason.rows = 2; reason.placeholder = 'For example: spam or personal information'; reason.id = 'reason-' + review.id; reasonLabel.htmlFor = reason.id;
    const actions = [['hide', 'Hide review', 'hidden'], ['show', 'Restore review to website', 'visible'], ['remove', 'Remove review from website', 'removed']];
    for (const [action, label, resultVisibility] of actions) {
      const button = node('button', label); button.type = 'button'; button.disabled = review.visibility === resultVisibility; if (action === 'remove') button.className = 'danger-action';
      button.addEventListener('click', async () => {
        if (mutationPending) return;
        if (reason.value.trim().length < 3) { moderationStatus.textContent = 'Add a reason (3–500 characters) for this visibility change.'; reason.focus(); return; }
        setCardPending(true); controls.querySelectorAll('button').forEach(item => { item.disabled = true; }); reason.disabled = true; moderationStatus.textContent = 'Updating review visibility…';
        try {
          const result = await api('/api/admin/reviews/' + encodeURIComponent(review.id), { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, version: review.version, reason: reason.value }) });
          review.visibility = result.visibility; review.version = result.version;
          const message = result.visibility === 'visible' ? 'Review restored to the website. Its saved reply is public again.' : 'Review ' + (result.visibility === 'hidden' ? 'hidden' : 'removed from the website') + '. Its saved reply is hidden too.';
          const refreshed = await load(true, message);
          if (refreshed !== true) {
            const recovery = message + ' This card shows the saved result; refresh to check the latest details.';
            const current = [...list.querySelectorAll('article')].find(item => item.dataset.reviewId === review.id);
            if (current) current.replaceWith(render(review, '', recovery));
            status.textContent = recovery;
          }
          const release = pendingCardControls.get(review.id); if (release) release(false);
        } catch (error) {
          moderationStatus.textContent = error.message; if (!card.isConnected) status.textContent = error.message;
          setCardPending(false); const release = pendingCardControls.get(review.id); if (release) release(false);
          reason.disabled = false;
        }
      });
      controls.append(button);
    }
    const auditButton = node('button', 'View visibility history'); auditButton.type = 'button';
    const history = node('div', undefined, 'history'); history.hidden = true;
    auditButton.addEventListener('click', async () => {
      if (!history.hidden) { history.hidden = true; return; }
      try {
        const result = await api('/api/admin/audit?reviewId=' + encodeURIComponent(review.id)); history.replaceChildren();
        if (!result.audit.length) history.append(node('p', 'No visibility changes have been recorded.'));
        for (const entry of result.audit) history.append(node('p', new Date(entry.changed_at * 1000).toLocaleString() + ' · ' + entry.actor_email + ' · ' + entry.old_visibility + ' → ' + entry.new_visibility + ': ' + entry.reason));
        history.hidden = false;
      } catch (error) { moderationStatus.textContent = error.message; }
    });
    moderation.append(moderationStatus, reasonLabel, reason, controls, auditButton, history); card.append(moderation);
    if (mutationPending) setCardPending(true);
    return card;
  }

  async function load(reset = false, completionMessage = '') {
    const generation = ++loadGeneration;
    more.disabled = true; status.textContent = 'Loading reviews…';
    try {
      const params = new URLSearchParams({ visibility: filter.value }); if (!reset && cursor) params.set('cursor', cursor);
      const data = await api('/api/admin/reviews?' + params);
      if (generation !== loadGeneration) return null;
      selectIdentity(data.actor);
      if (reset) list.replaceChildren();
      data.reviews.forEach(review => list.append(render(review)));
      cursor = data.nextCursor; more.hidden = !cursor;
      status.textContent = completionMessage || (list.children.length ? 'Reviews loaded.' : 'No reviews in this view.');
      return true;
    } catch (error) {
      if (generation === loadGeneration) status.textContent = error.message;
      return generation === loadGeneration ? false : null;
    } finally {
      if (generation === loadGeneration) more.disabled = false;
    }
  }
  filter.addEventListener('change', () => load(true));
  document.querySelector('#refresh').addEventListener('click', () => load(true));
  more.addEventListener('click', () => load());
  signOut.addEventListener('click', clearDrafts);
  load(true);
})();
