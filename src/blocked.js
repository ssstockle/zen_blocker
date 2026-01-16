import {getRandomQuote} from "./quotes.js";

const elements = {
    challengeDisplay: document.getElementById("challenge"),
    authorDisplay: document.getElementById("author"),
    input: document.getElementById("challenge-input"),
    feedback: document.getElementById("feedback"),
    progress: document.getElementById("progress"),
    total: document.getElementById("total"),
    accuracy: document.getElementById("accuracy"),
    correctCount: document.getElementById("correct-count"),
    incorrectCount: document.getElementById("incorrect-count"),
    successMsg: document.getElementById("success-msg"),
    timer: document.getElementById("timer"),
    retriesDisplay: document.getElementById("retries-display"),
    blockOverlay: document.getElementById("block-overlay"),
    blockTimer: document.getElementById("block-timer")
};

let MAX_TIME_TO_SOLVE = 20 * 1000;
let MAX_RETRIES = 3;
let BLOCK_DURATION = 15 * 60 * 1000;

let targetChallenge = "";
let author = "";
let timerIntervalId = null;
let blockTimerIntervalId = null;
let timerEndTime = 0;
let currentRetries = 0;
let blockedUntil = 0;

function normalizeText(text) {
    return text
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/\u2014/g, "-")
        .replace(/\u2013/g, "-")
        .replace(/\u2026/g, "...")
        .trim();
}

function getTimeRemaining() {
    return Math.max(0, timerEndTime - Date.now());
}

function updateTimerDisplay() {
    const seconds = Math.ceil(getTimeRemaining() / 1000);
    elements.timer.textContent = `${seconds}s`;
    elements.timer.classList.toggle("warning", seconds <= 10);
}

function updateRetriesDisplay() {
    const remaining = MAX_RETRIES - currentRetries;
    elements.retriesDisplay.textContent = `Retries: ${remaining}/${MAX_RETRIES}`;
    elements.retriesDisplay.classList.toggle("warning", remaining <= 1);
}

function formatTime(ms) {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function showBlockOverlay() {
    elements.blockOverlay.classList.add("active");
    updateBlockTimer();

    blockTimerIntervalId = setInterval(() => {
        updateBlockTimer();
    }, 1000);
}

function hideBlockOverlay() {
    elements.blockOverlay.classList.remove("active");
    clearInterval(blockTimerIntervalId);
}

function updateBlockTimer() {
    const remaining = blockedUntil - Date.now();
    if (remaining <= 0) {
        hideBlockOverlay();
        currentRetries = 0;
        saveBlockState();
        updateRetriesDisplay();
        resetChallenge();
    } else {
        elements.blockTimer.textContent = formatTime(remaining);
    }
}

async function checkBlockStatus() {
    const data = await chrome.storage.local.get(["blockedUntil", "currentRetries", "maxRetries", "blockDuration"]);

    if (data.maxRetries) MAX_RETRIES = data.maxRetries;
    if (data.blockDuration) BLOCK_DURATION = data.blockDuration * 60 * 1000;

    blockedUntil = data.blockedUntil || 0;
    currentRetries = data.currentRetries || 0;

    if (blockedUntil > Date.now()) {
        showBlockOverlay();
        return true;
    } else if (blockedUntil > 0) {
        blockedUntil = 0;
        currentRetries = 0;
        await saveBlockState();
    }
    return false;
}

async function saveBlockState() {
    await chrome.storage.local.set({
        blockedUntil: blockedUntil,
        currentRetries: currentRetries
    });
}

async function saveChallengeState() {
    await chrome.storage.local.set({
        challengeText: targetChallenge,
        challengeAuthor: author,
        timerEndTime: timerEndTime
    });
}

async function clearChallengeState() {
    await chrome.storage.local.remove(["challengeText", "challengeAuthor", "timerEndTime"]);
}

async function handleRetry() {
    currentRetries++;
    await saveBlockState();
    updateRetriesDisplay();

    if (currentRetries >= MAX_RETRIES) {
        blockedUntil = Date.now() + BLOCK_DURATION;
        await saveBlockState();
        showBlockOverlay();
        return true;
    }
    return false;
}

function startTimer(resumeEndTime = null) {
    clearInterval(timerIntervalId);

    if (resumeEndTime && resumeEndTime > Date.now()) {
        timerEndTime = resumeEndTime;
    } else {
        timerEndTime = Date.now() + MAX_TIME_TO_SOLVE;
    }

    saveChallengeState();
    updateTimerDisplay();

    timerIntervalId = setInterval(async () => {
        updateTimerDisplay();
        if (getTimeRemaining() <= 0) {
            clearInterval(timerIntervalId);
            await clearChallengeState();
            const blocked = await handleRetry();
            if (!blocked) {
                resetChallenge();
            }
        }
    }, 1000);
}

function resetChallenge(existingChallenge = null, existingAuthor = null, existingTimerEnd = null) {
    if (existingChallenge && existingAuthor) {
        targetChallenge = existingChallenge;
        author = existingAuthor;
    } else {
        const randomQuote = getRandomQuote();
        targetChallenge = normalizeText(randomQuote.text);
        author = randomQuote.author;
    }

    elements.challengeDisplay.textContent = targetChallenge;
    elements.authorDisplay.textContent = `- ${author}`;
    elements.total.textContent = targetChallenge.length;
    elements.input.value = "";
    elements.input.disabled = false;
    elements.successMsg.textContent = "";
    renderFeedback("");
    updateStats("");
    elements.input.focus();

    startTimer(existingTimerEnd);
}

function renderFeedback(typed) {
    elements.feedback.innerHTML = [...targetChallenge].map((char, i) => {
        const typedChar = typed[i];
        if (typedChar === undefined) return `<span class="char pending">${char === " " ? "&nbsp;" : char}</span>`;
        if (typedChar === char) return `<span class="char correct">${char === " " ? "&nbsp;" : typedChar}</span>`;
        return `<span class="char incorrect">${typedChar === " " ? "&nbsp;" : typedChar}</span>`;
    }).join("");
}

function updateStats(typed) {
    const stats = [...typed].reduce((acc, char, i) => {
        char === targetChallenge[i] ? acc.correct++ : acc.incorrect++;
        return acc;
    }, {correct: 0, incorrect: 0});

    elements.progress.textContent = typed.length;
    elements.correctCount.textContent = stats.correct;
    elements.incorrectCount.textContent = stats.incorrect;

    const total = stats.correct + stats.incorrect;
    elements.accuracy.textContent = total ? `${Math.round((stats.correct / total) * 100)}%` : "100%";
}

async function checkSuccess(typed) {
    if (normalizeText(typed) !== targetChallenge) return;

    clearInterval(timerIntervalId);
    elements.timer.textContent = "";
    elements.successMsg.textContent = "Matched! Redirecting...";
    elements.input.disabled = true;

    currentRetries = 0;
    await saveBlockState();
    await clearChallengeState();

    const originalUrl = new URLSearchParams(window.location.search).get("url");
    if (!originalUrl) {
        setTimeout(() => {
            if (window.history.length > 1) {
                history.back();
            } else {
                window.close();
            }
        }, 800);
        return;
    }

    chrome.runtime.sendMessage({type: "allowRedirect", url: originalUrl});
    setTimeout(() => window.location.href = originalUrl, 800);
}

async function handleInput(e) {
    const typed = e.target.value;
    renderFeedback(typed);
    updateStats(typed);
    await checkSuccess(typed);
}

elements.input.addEventListener("input", handleInput);
elements.input.addEventListener("paste", e => e.preventDefault());

async function init() {
    const isBlocked = await checkBlockStatus();
    updateRetriesDisplay();
    if (!isBlocked) {
        const data = await chrome.storage.local.get(["challengeText", "challengeAuthor", "timerEndTime"]);

        if (data.challengeText && data.challengeAuthor && data.timerEndTime > Date.now()) {
            resetChallenge(data.challengeText, data.challengeAuthor, data.timerEndTime);
        } else {
            await clearChallengeState();
            resetChallenge();
        }
    }
}

init();
