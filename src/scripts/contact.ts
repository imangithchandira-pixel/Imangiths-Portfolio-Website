/* Contact: a short stepped note, sent by email through Web3Forms. If no access
   key is set or sending fails, it opens the visitor's own email app instead. */
import { SITE } from '../data/site';

const form = document.querySelector<HTMLFormElement>('[data-form]');
if (form) start(form);

function start(form: HTMLFormElement) {
  const steps = Array.from(form.querySelectorAll<HTMLElement>('.form__step'));
  const last = steps.length - 2; // the final panel is the thank-you
  const count = form.querySelector<HTMLElement>('[data-count]')!;
  const label = form.querySelector<HTMLElement>('[data-label]')!;
  const dotsBox = form.querySelector<HTMLElement>('.form__dots')!;
  const actions = form.querySelector<HTMLElement>('.form__actions')!;
  const back = form.querySelector<HTMLButtonElement>('[data-back]')!;
  const next = form.querySelector<HTMLButtonElement>('[data-next]')!;
  let current = 0;
  let sending = false;

  const dots = steps.slice(0, last + 1).map((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'form__dot';
    b.setAttribute('aria-label', 'Go to step ' + (i + 1));
    b.addEventListener('click', () => {
      if (i < current) return show(i);
      for (let s = current; s < i; s++) if (!valid(s)) return show(s);
      show(i);
    });
    dotsBox.appendChild(b);
    return b;
  });

  function valid(i: number) {
    let ok = true;
    steps[i].querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea').forEach((field) => {
      const good = field.checkValidity();
      if (field.type !== 'radio') field.setAttribute('aria-invalid', good ? 'false' : 'true');
      if (!good && ok) {
        ok = false;
        if (i === current) field.focus();
      }
    });
    return ok;
  }

  function show(i: number) {
    current = i;
    const done = i > last;
    steps.forEach((step, s) => {
      step.hidden = s !== i;
      step.classList.toggle('is-active', s === i);
    });
    count.textContent = done ? '' : i + 1 + '/' + (last + 1);
    label.textContent = steps[i].getAttribute('data-title');
    dots.forEach((d, s) => {
      if (s === i) d.setAttribute('aria-current', 'step');
      else d.removeAttribute('aria-current');
    });
    dotsBox.hidden = done;
    actions.hidden = done;
    back.hidden = i === 0;
    next.textContent = i === last ? 'Send' : 'Continue';
    if (!done) {
      const first = steps[i].querySelector<HTMLElement>('input:not([type="radio"]), textarea, input:checked');
      if (first && document.activeElement !== document.body) first.focus({ preventScroll: true });
    }
  }

  function value(name: string) {
    const field = form.elements.namedItem(name) as HTMLInputElement | RadioNodeList | null;
    return field && field.value ? String(field.value).trim() : '';
  }

  const subject = () => value('reason') + ' — via your portfolio';

  function mailto() {
    const lines = [value('message'), '', '— ' + value('name'), value('email')];
    if (value('place')) lines.push(value('place'));
    return 'mailto:' + SITE.email + '?subject=' + encodeURIComponent(subject()) + '&body=' + encodeURIComponent(lines.join('\n'));
  }

  form.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.getAttribute('aria-invalid') === 'true' && t.checkValidity()) t.setAttribute('aria-invalid', 'false');
  });

  back.addEventListener('click', () => {
    if (current > 0) show(current - 1);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!valid(current)) return;
    if (current < last) return show(current + 1);
    if (sending) return;

    const key = SITE.formKey;
    if (!key) return finish(false);

    sending = true;
    next.disabled = true;
    next.textContent = 'Sending…';

    // Give up after 15 s and fall back to the visitor's email app.
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 15000);

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'omit',
      referrerPolicy: 'strict-origin-when-cross-origin',
      signal: abort.signal,
      body: JSON.stringify({
        access_key: key,
        subject: subject(),
        from_name: value('name'),
        name: value('name'),
        email: value('email'),
        place: value('place'),
        reason: value('reason'),
        message: value('message'),
        botcheck: (form.elements.namedItem('botcheck') as HTMLInputElement).checked
      })
    })
      .then((r) => (r.ok ? r.json() : { success: false }))
      .then((res: { success?: unknown }) => finish(res.success === true))
      .catch(() => finish(false))
      .finally(() => clearTimeout(timer));
  });

  // sent: true when Web3Forms accepted the note; false falls back to mailto.
  function finish(sent: boolean) {
    sending = false;
    next.disabled = false;
    form.querySelector('[data-thanks]')!.textContent = 'Thank you, ' + value('name').split(/\s+/)[0] + '.';
    form.querySelector<HTMLElement>('[data-sent]')!.hidden = !sent;
    form.querySelector<HTMLElement>('[data-opened]')!.hidden = sent;
    if (!sent) window.location.href = mailto();
    show(last + 1);
  }

  // Enter moves on to the next step instead of doing nothing mid-form.
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
      e.preventDefault();
      next.click();
    }
  });

  show(0);
}
