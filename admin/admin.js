(() => {
  const list = document.querySelector('#reviews'); const status = document.querySelector('#status');
  const filter = document.querySelector('#visibility'); const more = document.querySelector('#more');
  let cursor = null;
  const node = (tag, value, className) => { const el = document.createElement(tag); if (value !== undefined) el.textContent = value; if (className) el.className = className; return el; };
  async function api(url, options) {
    const response = await fetch(url, options); const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) throw new Error('Your sign-in may have expired. Reload this page to sign in again.');
    const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Request failed.'); return data;
  }
  function render(review) {
    const card = node('article'); const title = node('h2', review.display_name);
    const meta = node('p', `${review.stars} out of 5 stars · ${new Date(review.created_at * 1000).toLocaleString()} · ${review.visibility}`);
    const comment = node('p', review.comment, 'comment');
    const label = node('label', 'Moderation reason'); const reason = node('textarea'); reason.maxLength = 500; reason.rows = 2;
    reason.id = `reason-${review.id}`; label.htmlFor = reason.id;
    const controls = node('div', undefined, 'controls'); const actions = [['hide', 'Hide'], ['show', 'Show'], ['remove', 'Remove from public listing']];
    for (const [action, text] of actions) {
      const button = node('button', text); button.type = 'button';
      button.disabled = review.visibility === ({ hide: 'hidden', show: 'visible', remove: 'removed' })[action];
      button.addEventListener('click', async () => {
        if (reason.value.trim().length < 3) { status.textContent = 'Add a moderation reason (3–500 characters).'; reason.focus(); return; }
        controls.querySelectorAll('button').forEach(b => { b.disabled = true; }); reason.disabled = true; status.textContent = 'Saving moderation…';
        try {
          await api(`/api/admin/reviews/${encodeURIComponent(review.id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, version: review.version, reason: reason.value }) });
          await load(true); status.textContent = 'Moderation saved.';
        } catch (error) { status.textContent = error.message; reason.disabled = false; controls.querySelectorAll('button').forEach(b => { b.disabled = false; }); }
      }); controls.append(button);
    }
    const auditButton = node('button', 'View moderation history'); auditButton.type = 'button';
    const history = node('div', undefined, 'history'); history.hidden = true;
    auditButton.addEventListener('click', async () => {
      if (!history.hidden) { history.hidden = true; return; }
      try {
        const { audit } = await api(`/api/admin/audit?reviewId=${encodeURIComponent(review.id)}`);
        history.replaceChildren();
        if (!audit.length) history.append(node('p', 'No moderation changes.'));
        for (const entry of audit) history.append(node('p', `${new Date(entry.changed_at * 1000).toLocaleString()} · ${entry.actor_email} · ${entry.old_visibility} → ${entry.new_visibility}: ${entry.reason}`));
        history.hidden = false;
      } catch (error) { status.textContent = error.message; }
    });
    card.append(title, meta, comment, label, reason, controls, auditButton, history); list.append(card);
  }
  async function load(reset = false) {
    more.disabled = true; status.textContent = 'Loading reviews…';
    try {
      const params = new URLSearchParams({ visibility: filter.value }); if (!reset && cursor) params.set('cursor', cursor);
      const data = await api(`/api/admin/reviews?${params}`); if (reset) list.replaceChildren();
      data.reviews.forEach(render); cursor = data.nextCursor; more.hidden = !cursor;
      status.textContent = list.children.length ? '' : 'No reviews in this view.';
    } catch (error) { status.textContent = error.message; }
    finally { more.disabled = false; }
  }
  filter.addEventListener('change', () => load(true)); document.querySelector('#refresh').addEventListener('click', () => load(true)); more.addEventListener('click', () => load()); load(true);
})();
