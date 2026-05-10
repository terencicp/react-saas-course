// Shared per-card controller for <MultipleChoice>.
// Runs the same way whether the card is standalone in a lesson or sitting
// inside a <Quiz> shell. The Quiz observes `mcq:answered` events to roll
// individual results into the score bar / summary.

export interface MCQAnsweredDetail {
  correct: boolean;
  picked: number[];
  src: string;
}

const CLAIMED = 'mcq-claimed';

export function setupCard(card: HTMLElement, opts: { shuffle?: boolean } = {}) {
  if (card.classList.contains(CLAIMED)) return;
  card.classList.add(CLAIMED);

  const shouldShuffle = opts.shuffle ?? true;
  const body = card.querySelector<HTMLElement>('.mcq-body')!;
  const why = body.querySelector<HTMLElement>('.mcq-why');
  const choices = Array.from(body.querySelectorAll<HTMLElement>('.mcq-choice'));
  if (choices.length === 0) return;

  const correctIdxs = choices
    .map((c, i) => (c.dataset.correct === 'true' ? i : -1))
    .filter((i) => i >= 0);
  const isMulti = correctIdxs.length > 1;
  card.dataset.correct = JSON.stringify(correctIdxs);
  card.dataset.multi = String(isMulti);

  // Wrap choices so reorders (shuffle) stay scoped — without this, moving a
  // choice would walk past the Why block that follows the choices.
  const wrap = document.createElement('div');
  wrap.className = 'mcq-choices';
  body.insertBefore(wrap, choices[0]);
  choices.forEach((c, i) => {
    c.dataset.origIdx = String(i);
    c.setAttribute('role', isMulti ? 'checkbox' : 'radio');
    c.setAttribute('aria-checked', 'false');
    c.setAttribute('tabindex', '0');
    wrap.appendChild(c);
  });

  // Multi-correct needs an explicit Check button — selection is a multi-step
  // commit. Single-correct reveals on the first click, like the old Quiz.
  let checkBtn: HTMLButtonElement | null = null;
  if (isMulti) {
    checkBtn = document.createElement('button');
    checkBtn.type = 'button';
    checkBtn.className = 'mcq-check';
    checkBtn.textContent = 'Check answer';
    checkBtn.disabled = true;
    if (why) body.insertBefore(checkBtn, why);
    else body.appendChild(checkBtn);
  }

  const inQuiz = !!card.closest('.starlight-quiz');
  if (inQuiz) card.classList.add('mcq-in-quiz');

  let picked: number[] = [];
  let answered = false;

  function shuffleChoices() {
    const order = choices.slice();
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    order.forEach((c) => wrap.appendChild(c));
  }

  function setSelected(c: HTMLElement, sel: boolean) {
    c.classList.toggle('selected', sel);
    c.setAttribute('aria-checked', String(sel));
  }

  function onChoiceActivate(c: HTMLElement) {
    if (answered) return;
    const oi = parseInt(c.dataset.origIdx!, 10);
    if (isMulti) {
      const i = picked.indexOf(oi);
      if (i >= 0) picked.splice(i, 1);
      else picked.push(oi);
      setSelected(c, picked.includes(oi));
      if (checkBtn) checkBtn.disabled = picked.length === 0;
    } else {
      picked = [oi];
      reveal();
    }
  }

  choices.forEach((c) => {
    c.addEventListener('click', () => onChoiceActivate(c));
    c.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onChoiceActivate(c);
      }
    });
  });

  if (checkBtn) checkBtn.addEventListener('click', () => reveal());

  function reveal() {
    if (answered || picked.length === 0) return;
    answered = true;
    if (checkBtn) checkBtn.hidden = true;

    const correctSet = new Set(correctIdxs);
    const pickedSet = new Set(picked);
    const isCorrect = isMulti
      ? correctSet.size === pickedSet.size && [...correctSet].every((i) => pickedSet.has(i))
      : pickedSet.has(correctIdxs[0]);

    choices.forEach((c) => {
      const oi = parseInt(c.dataset.origIdx!, 10);
      const wasPicked = pickedSet.has(oi);
      const isAnswer = correctSet.has(oi);
      c.setAttribute('aria-disabled', 'true');
      c.removeAttribute('tabindex');
      c.classList.remove('selected');
      if (isAnswer) c.classList.add('correct');
      if (wasPicked && !isAnswer) c.classList.add('wrong');
      if (wasPicked) c.classList.add('picked');
    });

    card.dataset.state = isCorrect ? 'correct' : 'wrong';
    if (why) why.hidden = false;

    card.dispatchEvent(
      new CustomEvent<MCQAnsweredDetail>('mcq:answered', {
        bubbles: true,
        detail: {
          correct: isCorrect,
          picked: picked.slice(),
          src: card.dataset.src || '',
        },
      })
    );
  }

  function restore(savedPicked: number[]) {
    if (!Array.isArray(savedPicked) || savedPicked.length === 0) return;
    if (answered) reset({ shuffle: false });
    picked = savedPicked.slice();
    reveal();
  }

  function reset(o: { shuffle?: boolean } = {}) {
    answered = false;
    picked = [];
    delete card.dataset.state;
    choices.forEach((c) => {
      c.classList.remove('correct', 'wrong', 'picked', 'selected');
      c.removeAttribute('aria-disabled');
      c.setAttribute('aria-checked', 'false');
      c.setAttribute('tabindex', '0');
    });
    if (why) why.hidden = true;
    if (checkBtn) {
      checkBtn.hidden = false;
      checkBtn.disabled = true;
    }
    if (o.shuffle ?? shouldShuffle) shuffleChoices();
  }

  card.addEventListener('mcq:reset', () => reset());
  card.addEventListener('mcq:restore', (e) => restore((e as CustomEvent).detail?.picked));

  if (shouldShuffle) shuffleChoices();
}

// Auto-claim any standalone cards on the page. Cards inside a <Quiz> are
// claimed by the Quiz script instead so it can drive shuffle / restore.
export function autoClaimStandalone() {
  document.querySelectorAll<HTMLElement>('.mcq-card').forEach((card) => {
    if (card.classList.contains(CLAIMED)) return;
    if (card.closest('.starlight-quiz')) {
      card.classList.add('mcq-in-quiz');
      return;
    }
    setupCard(card);
  });
}
