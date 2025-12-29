const elements = {
    blacklistInput: document.getElementById("blacklist-input"),
    status: document.getElementById("status"),
    updateSitesBtn: document.getElementById("update-sites-btn"),
    maxRetriesInput: document.getElementById("max-retries"),
    blockDurationInput: document.getElementById("block-duration"),
    updateSettingsBtn: document.getElementById("update-settings-btn")
};

const parseList = (value) => value.split(";").map(s => s.trim()).filter(Boolean);

const showStatus = (message) => {
    elements.status.textContent = message;
    setTimeout(() => elements.status.textContent = "", 1000);
};

async function init() {
    const data = await chrome.storage.local.get(["blacklist", "maxRetries", "blockDuration"]);
    elements.blacklistInput.value = (data.blacklist || []).join(";");
    elements.maxRetriesInput.value = data.maxRetries || 3;
    elements.blockDurationInput.value = data.blockDuration || 15;
}

elements.updateSitesBtn.addEventListener("click", () => {
    chrome.storage.local.set({blacklist: parseList(elements.blacklistInput.value)});
    showStatus("Blocked sites updated");
});

elements.updateSettingsBtn.addEventListener("click", () => {
    const maxRetries = parseInt(elements.maxRetriesInput.value, 10) || 3;
    const blockDuration = parseInt(elements.blockDurationInput.value, 10) || 15;

    chrome.storage.local.set({
        maxRetries: Math.max(1, Math.min(10, maxRetries)),
        blockDuration: Math.max(1, Math.min(60, blockDuration))
    });
    showStatus("Settings updated");
});

init();

