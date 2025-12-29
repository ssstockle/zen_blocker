const allowedTabs = new Map();

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    if (details.frameId !== 0) return;

    const {blacklist = []} = await chrome.storage.local.get(["blacklist"]);
    const url = new URL(details.url);

    const isBlocked = blacklist.some(pattern =>
        url.hostname === pattern || url.hostname.endsWith(`.${pattern}`)
    );

    if (!isBlocked) return;

    const allowedUrl = allowedTabs.get(details.tabId);
    if (allowedUrl === details.url) {
        allowedTabs.delete(details.tabId);
        return;
    }

    const blockedUrl = chrome.runtime.getURL("/pages/blocked.html");
    chrome.tabs.update(details.tabId, {
        url: `${blockedUrl}?url=${encodeURIComponent(details.url)}`
    });
});

chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.type === "allowRedirect" && sender.tab) {
        allowedTabs.set(sender.tab.id, message.url);
    }
});

