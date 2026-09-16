import { sample, PAKET_META } from './soal-bank.js';

// --- STATE ---
const state = {
    nama: '', currentPaket: 1, currentQ: 0,
    answers: { 1: Array(50).fill(null), 2: Array(50).fill(null), 3: Array(50).fill(null) },
    submitted: { 1: false, 2: false, 3: false },
    scores: { 1: null, 2: null, 3: null },
    times: { 1: null, 2: null, 3: null },
    elapsed: 0, timerInterval: null, activeInput: 0
};
const allQuestions = { 1: null, 2: null, 3: null };
const poolCache = { 1: null, 2: null, 3: null };
const resView = { tab: 1, filter: 'semua' };
let paketPage = 0;

// --- DOM REFS ---
const $ = (id) => document.getElementById(id);
const loginScreen = $('login-screen');
const paketScreen = $('paket-screen');
const quizScreen = $('quiz-screen');
const resultScreen = $('result-screen');
const inputContainer = $('input-container');
const accordionContainer = $('accordion-container');
const paketCarousel = $('paket-carousel');
const resultCarousel = $('result-carousel');
const btnLihatHasil = $('btn-lihat-hasil');
const navOverlay = $('nav-overlay');
const navGrids = [$('nav-grid'), $('nav-grid-sidebar')];
const btnPaketPrev = $('btn-paket-prev');
const btnPaketNext = $('btn-paket-next');
const lblPaketPage = $('lbl-paket-page');

const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// --- LOGIN -> PAKET PICKER ---
function startTest() {
    const inputNama = $('input-nama').value.trim();
    if (!inputNama) { alert('Silakan masukkan nama Anda!'); return; }
    state.nama = inputNama;
    $('lbl-nama').textContent = state.nama;
    $('lbl-nama-paket').textContent = state.nama;
    loginScreen.style.display = 'none';
    paketScreen.style.display = 'flex';
    renderPaketScreen();
}

function renderPaketScreen() {
    paketCarousel.innerHTML = PAKET_META.map((meta, idx) => {
        const done = state.submitted[meta.id];
        const statusHtml = done
            ? `<div class="paket-card-status done">✓ Selesai • ${state.scores[meta.id]}/${meta.total}</div>`
            : `<div class="paket-card-status pending">Belum dikerjakan</div>`;
        const tagsHtml = meta.previewTags.map((t) => `<span class="paket-tag">${t}</span>`).join('');
        return `
            <div class="paket-card" data-paket-page="${idx}">
                <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
                <div class="paket-card-top">
                    <div class="paket-card-index">${String(meta.id).padStart(2, '0')}</div>
                    <div class="paket-card-badge">${meta.total} SOAL</div>
                </div>
                <div class="paket-card-title">${meta.title}</div>
                <div class="paket-card-desc">${meta.desc}</div>
                ${statusHtml}
                <div class="paket-tag-row">${tagsHtml}</div>
                <div class="paket-card-actions">
                    <button class="btn-luxury paket-card-btn" data-start-paket="${meta.id}">${done ? 'ULANGI' : 'MULAI'}</button>
                    ${done ? `<button class="btn-luxury btn-secondary paket-card-btn" data-review-paket="${meta.id}">PEMBAHASAN</button>` : ''}
                </div>
            </div>
        `;
    }).join('');

    btnLihatHasil.classList.toggle('hidden', !PAKET_META.some((m) => state.submitted[m.id]));
    paketPage = 0;
    paketCarousel.scrollTop = 0;
    updatePaketPageLabel();
}

function updatePaketPageLabel() {
    lblPaketPage.textContent = `${paketPage + 1}/${PAKET_META.length}`;
    btnPaketPrev.disabled = paketPage === 0;
    btnPaketNext.disabled = paketPage === PAKET_META.length - 1;
}

function goToPaketPage(idx) {
    const clamped = Math.max(0, Math.min(PAKET_META.length - 1, idx));
    paketPage = clamped;
    updatePaketPageLabel();
    const card = paketCarousel.querySelector(`[data-paket-page="${clamped}"]`);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function syncPaketPageFromScroll() {
    const cards = [...paketCarousel.querySelectorAll('.paket-card')];
    if (!cards.length) return;
    const mid = paketCarousel.scrollTop + paketCarousel.clientHeight / 2;
    let closest = 0, closestDist = Infinity;
    cards.forEach((card, idx) => {
        const dist = Math.abs((card.offsetTop + card.offsetHeight / 2) - mid);
        if (dist < closestDist) { closestDist = dist; closest = idx; }
    });
    if (closest !== paketPage) { paketPage = closest; updatePaketPageLabel(); }
}

async function startPaket(id) {
    if (!poolCache[id]) {
        const res = await fetch(`data/paket-${id}.json`);
        poolCache[id] = await res.json();
    }
    allQuestions[id] = sample(poolCache[id], 50);
    state.answers[id] = Array(50).fill(null);
    state.submitted[id] = false;
    state.scores[id] = null;
    state.currentPaket = id;
    state.currentQ = 0;
    state.elapsed = 0;
    $('lbl-poin').textContent = `PAKET ${id}`;

    paketScreen.style.display = 'none';
    quizScreen.style.display = 'flex';

    clearInterval(state.timerInterval);
    $('lbl-timer').textContent = '00:00';
    state.timerInterval = setInterval(() => {
        state.elapsed++;
        $('lbl-timer').textContent = fmtTime(state.elapsed);
    }, 1000);

    renderQuestion();
}

// --- QUIZ ---
function renderQuestion() {
    const p = state.currentPaket, qIdx = state.currentQ, qData = allQuestions[p][qIdx];
    $('lbl-progress').textContent = `SOAL ${qIdx + 1} DARI 50`;
    $('soal-text').innerHTML = qData.text;

    inputContainer.innerHTML = '';
    if (p !== 3) {
        state.activeInput = 0;
        const val = state.answers[p][qIdx] || '';
        inputContainer.innerHTML = `<div class="ans-box active" id="in-0">${val}</div>`;
    } else {
        state.activeInput = 0;
        const valP = state.answers[p][qIdx] ? state.answers[p][qIdx].p : '';
        const valQ = state.answers[p][qIdx] ? state.answers[p][qIdx].q : '';
        inputContainer.innerHTML = `
            <div class="ans-box active" id="in-0" data-input-idx="0">${valP}</div>
            <div class="frac-line">/</div>
            <div class="ans-box" id="in-1" data-input-idx="1">${valQ}</div>
        `;
    }

    const btnPrev = $('btn-prev'), btnNext = $('btn-next'), btnSubmit = $('btn-submit');
    btnPrev.disabled = qIdx === 0;

    if (qIdx === 49) {
        btnNext.style.display = 'none';
        btnSubmit.style.display = 'block';
        btnSubmit.textContent = `SUBMIT PAKET ${p}`;
    } else {
        btnNext.style.display = 'block';
        btnSubmit.style.display = 'none';
    }

    renderNavGrid();
}

function setActiveInput(idx) {
    state.activeInput = idx;
    $('in-0').classList.remove('active');
    $('in-1').classList.remove('active');
    $(`in-${idx}`).classList.add('active');
}

function changeQuestion(step) {
    const newQ = state.currentQ + step;
    if (newQ >= 0 && newQ < 50) { state.currentQ = newQ; renderQuestion(); }
}

function nextAction() {
    if (state.currentPaket === 3 && state.activeInput === 0) setActiveInput(1);
    else if (state.currentQ < 49) changeQuestion(1);
}

// --- NAVIGATOR SOAL (overlay mobile + pane frozen di layar lebar, selalu disinkronkan bareng) ---
function renderNavGrid() {
    const p = state.currentPaket;
    const cellsHtml = Array.from({ length: 50 }, (_, i) => {
        const ans = state.answers[p][i];
        const answered = p === 3 ? !!(ans && ans.p) : !!ans;
        const cls = 'nav-cell' + (answered ? ' answered' : '') + (i === state.currentQ ? ' current' : '');
        return `<button class="${cls}" data-jump="${i}">${i + 1}</button>`;
    }).join('');
    navGrids.forEach((grid) => { if (grid) grid.innerHTML = cellsHtml; });
}
function openNav() { navOverlay.classList.add('open'); }
function closeNav() { navOverlay.classList.remove('open'); }
function handleNavGridClick(e) {
    const cell = e.target.closest('[data-jump]');
    if (!cell) return;
    state.currentQ = Number(cell.dataset.jump);
    closeNav();
    renderQuestion();
}

// --- NUMPAD ---
function updateAnswerState(val) {
    const p = state.currentPaket, qIdx = state.currentQ;
    if (p !== 3) { state.answers[p][qIdx] = val; }
    else {
        if (!state.answers[p][qIdx]) state.answers[p][qIdx] = { p: '', q: '' };
        if (state.activeInput === 0) state.answers[p][qIdx].p = val;
        else state.answers[p][qIdx].q = val;
    }
}
function inputNum(num) {
    const el = $(`in-${state.activeInput}`);
    el.textContent += num;
    updateAnswerState(el.textContent);
}
function deleteNum() {
    const el = $(`in-${state.activeInput}`);
    el.textContent = el.textContent.slice(0, -1);
    updateAnswerState(el.textContent);
}
function clearNum() {
    const el = $(`in-${state.activeInput}`);
    el.textContent = '';
    updateAnswerState('');
}

// --- SUBMIT PAKET ---
function submitPaket() {
    if (confirm(`Yakin submit Paket ${state.currentPaket}? Jawaban akan dikunci.`)) finishPaket();
}

function finishPaket() {
    clearInterval(state.timerInterval);
    const p = state.currentPaket;
    let correct = 0;
    for (let i = 0; i < 50; i++) {
        const uAns = state.answers[p][i], rAns = allQuestions[p][i].ans;
        const isBenar = p === 3 ? !!(uAns && uAns.p === rAns.p && uAns.q === rAns.q) : uAns === rAns;
        if (isBenar) correct++;
    }
    state.submitted[p] = true;
    state.scores[p] = correct;
    state.times[p] = state.elapsed;

    quizScreen.style.display = 'none';
    paketScreen.style.display = 'flex';
    renderPaketScreen();
}

// --- HASIL & REVIEW ---
function backToPaket() {
    resultScreen.style.display = 'none';
    paketScreen.style.display = 'flex';
    renderPaketScreen();
}

function openResult(paketId) {
    if (paketId && state.submitted[paketId]) {
        resView.tab = paketId;
    } else if (!state.submitted[resView.tab]) {
        const firstDone = PAKET_META.find((m) => state.submitted[m.id]);
        resView.tab = firstDone ? firstDone.id : 1;
    }
    paketScreen.style.display = 'none';
    resultScreen.style.display = 'flex';
    renderResultScreen();
}

function renderResultScreen() {
    $('res-nama').textContent = state.nama;

    let totalScore = 0, totalMax = 0, totalTime = 0;
    PAKET_META.forEach((m) => {
        if (state.submitted[m.id]) {
            $(`score-p${m.id}`).textContent = `${state.scores[m.id]}/${m.total}`;
            totalScore += state.scores[m.id]; totalMax += m.total; totalTime += state.times[m.id];
        } else {
            $(`score-p${m.id}`).textContent = '-';
        }
    });
    $('res-total').textContent = `${totalScore}/${totalMax}`;
    $('res-waktu').textContent = fmtTime(totalTime);

    resultCarousel.innerHTML = PAKET_META.map((m) => `
        <div class="paket-card ${m.id === resView.tab ? 'active' : ''}" data-tab-paket="${m.id}">
            <div class="paket-card-badge">${state.submitted[m.id] ? `${state.scores[m.id]}/${m.total}` : 'BELUM'}</div>
            <h3>PAKET ${m.id}</h3>
            <div class="paket-card-title">${m.title}</div>
        </div>
    `).join('');

    renderReview();
}

function switchTab(p) {
    resView.tab = p;
    document.querySelectorAll('#result-carousel .paket-card').forEach((el) => {
        el.classList.toggle('active', Number(el.dataset.tabPaket) === p);
    });
    renderReview();
}

function setFilter(f) {
    resView.filter = f;
    const btns = document.querySelectorAll('.filter-btn');
    btns[0].classList.toggle('active', f === 'semua');
    btns[1].classList.toggle('active', f === 'benar');
    btns[2].classList.toggle('active', f === 'salah');
    renderReview();
}

function toggleAccordion(head) {
    head.classList.toggle('open');
    head.nextElementSibling.classList.toggle('open');
}

function renderReview() {
    accordionContainer.innerHTML = '';
    const p = resView.tab;

    if (!state.submitted[p]) {
        accordionContainer.innerHTML = `<div class="text-center py-8 px-4 text-[var(--text-muted)] text-sm">Paket ini belum dikerjakan.</div>`;
        return;
    }

    for (let i = 0; i < 50; i++) {
        const q = allQuestions[p][i], userAns = state.answers[p][i], realAns = q.ans;
        let uText = '-', rText = '-', isBenar = false;

        if (p !== 3) {
            uText = userAns || '-'; rText = realAns; isBenar = (uText === rText);
        } else {
            uText = (userAns && userAns.p) ? `${userAns.p}/${userAns.q}` : '-';
            rText = `${realAns.p}/${realAns.q}`;
            isBenar = !!(userAns && userAns.p === realAns.p && userAns.q === realAns.q);
        }

        if (resView.filter === 'benar' && !isBenar) continue;
        if (resView.filter === 'salah' && isBenar) continue;

        const stripQText = q.text.replace(/<br>/g, ' ');
        const userChip = isBenar ? `<span class="chip right">✓ ${uText}</span>` : `<span class="chip wrong">✗ ${uText}</span>`;
        const keyChip = isBenar ? '' : `<span class="chip key">Kunci: ${rText}</span>`;

        const acc = document.createElement('div');
        acc.className = 'accordion-item';
        acc.innerHTML = `
            <div class="acc-head ${isBenar ? 'correct' : 'wrong'}">
                <div class="acc-head-left">
                    <span class="num">#${String(i + 1).padStart(2, '0')}</span>
                    <span class="soal">${stripQText}</span>
                </div>
                <div class="acc-chevron">▼</div>
            </div>
            <div class="acc-body">
                <div class="mb-2.5">${userChip} ${keyChip}</div>
                <div class="bahas-text">${q.bahas}</div>
            </div>
        `;
        accordionContainer.appendChild(acc);
    }

    if (accordionContainer.innerHTML === '') {
        accordionContainer.innerHTML = `<div class="text-center py-8 px-4 text-[var(--text-muted)] text-sm">Tidak ada data untuk filter ini.</div>`;
    }
}

// --- EVENT WIRING ---
$('btn-start').addEventListener('click', startTest);

paketCarousel.addEventListener('click', (e) => {
    const reviewBtn = e.target.closest('[data-review-paket]');
    if (reviewBtn) { openResult(Number(reviewBtn.dataset.reviewPaket)); return; }
    const startBtn = e.target.closest('[data-start-paket]');
    if (startBtn) startPaket(Number(startBtn.dataset.startPaket));
});
btnLihatHasil.addEventListener('click', () => openResult());

btnPaketPrev.addEventListener('click', () => goToPaketPage(paketPage - 1));
btnPaketNext.addEventListener('click', () => goToPaketPage(paketPage + 1));
let paketScrollTimer;
paketCarousel.addEventListener('scroll', () => {
    clearTimeout(paketScrollTimer);
    paketScrollTimer = setTimeout(syncPaketPageFromScroll, 100);
});

$('btn-prev').addEventListener('click', () => changeQuestion(-1));
$('btn-next').addEventListener('click', () => changeQuestion(1));
$('btn-submit').addEventListener('click', submitPaket);

$('btn-nav-open').addEventListener('click', openNav);
$('btn-nav-close').addEventListener('click', closeNav);
navOverlay.addEventListener('click', (e) => { if (e.target === navOverlay) closeNav(); });
navGrids.forEach((grid) => { if (grid) grid.addEventListener('click', handleNavGridClick); });

inputContainer.addEventListener('click', (e) => {
    const box = e.target.closest('[data-input-idx]');
    if (box) setActiveInput(Number(box.dataset.inputIdx));
});

document.querySelector('.luxury-numpad').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.num !== undefined) inputNum(btn.dataset.num);
    else if (btn.dataset.action === 'del') deleteNum();
    else if (btn.dataset.action === 'clear') clearNum();
    else if (btn.dataset.action === 'ok') nextAction();
});

$('btn-back-paket').addEventListener('click', backToPaket);
resultCarousel.addEventListener('click', (e) => {
    const card = e.target.closest('[data-tab-paket]');
    if (card) switchTab(Number(card.dataset.tabPaket));
});

document.querySelector('.filter-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter]');
    if (btn) setFilter(btn.dataset.filter);
});

accordionContainer.addEventListener('click', (e) => {
    const head = e.target.closest('.acc-head');
    if (head) toggleAccordion(head);
});

// --- KEYBOARD INPUT (laptop/Mac) saat sesi quiz aktif ---
document.addEventListener('keydown', (e) => {
    if (quizScreen.style.display !== 'flex') return;

    if (navOverlay.classList.contains('open')) {
        if (e.key === 'Escape') closeNav();
        return;
    }

    if (e.key >= '0' && e.key <= '9') { inputNum(e.key); return; }
    if (e.key === 'Backspace') { e.preventDefault(); deleteNum(); return; }
    if (e.key === 'Delete') { clearNum(); return; }
    if (e.key === 'ArrowLeft') { changeQuestion(-1); return; }
    if (e.key === 'ArrowRight') { changeQuestion(1); return; }
    if (e.key === '/' && state.currentPaket === 3) { e.preventDefault(); setActiveInput(1); return; }
    if (e.key === 'Enter') {
        e.preventDefault();
        if (state.currentPaket === 3 && state.activeInput === 0) { setActiveInput(1); return; }
        if (state.currentQ === 49) { submitPaket(); return; }
        changeQuestion(1);
    }
});
