'use strict';

let scrollFactor = 1;

// Load scrollFactor from Chrome storage and set it when available.
chrome.storage.sync.get('scrollFactor', function (items) {
    if (items.scrollFactor !== undefined) {
        scrollFactor = items.scrollFactor;
    }
});

function wheel(event) {
    if (event.defaultPrevented || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        return; // Ignore event under certain conditions.
    }
    
    let element = overflowingAncestor(event.target, false) || getScrollRoot();

    if (element === window && window.top !== window.self) {
        // If in an iframe, post the message to the parent.
        parent.postMessage({
            deltaX: event.deltaX,
            deltaY: event.deltaY,
            CSS: 'ChangeScrollSpeed'
        }, '*');

        if (event.preventDefault) {
            event.preventDefault();
        }

        return true;
    }

    // Apply scrollFactor only to vertical scrolling
    element.scrollBy(event.deltaX, event.deltaY * scrollFactor);

    if (event.preventDefault) {
        event.preventDefault();
    }
}

function overflowingAncestor(element, horizontal) {
    const body = document.body;
    const root = document.documentElement;
    const isFrame = window.top !== window.self;

    do {
        if ((horizontal && root.scrollWidth === element.scrollWidth) ||
            (!horizontal && root.scrollHeight === element.scrollHeight)) {
            const topOverflowsNotHidden = overflowNotHidden(root, horizontal) && overflowNotHidden(body, horizontal);
            const isOverflowCSS = topOverflowsNotHidden || overflowAutoOrScroll(root, horizontal);

            if ((isFrame && isContentOverflowing(root, horizontal)) || (!isFrame && isOverflowCSS)) {
                return getScrollRoot();
            }
        } else if (isContentOverflowing(element, horizontal) && overflowAutoOrScroll(element, horizontal)) {
            return element;
        }
    } while ((element = element.parentElement));
}

function isContentOverflowing(element, horizontal) {
    const client = horizontal ? element.clientWidth : element.clientHeight;
    const scroll = horizontal ? element.scrollWidth : element.scrollHeight;

    return (client + 10 < scroll);
}

function computedOverflow(element, horizontal) {
    return getComputedStyle(element, '').getPropertyValue(horizontal ? 'overflow-x' : 'overflow-y');
}

function overflowNotHidden(element, horizontal) {
    return computedOverflow(element, horizontal) !== 'hidden';
}

function overflowAutoOrScroll(element, horizontal) {
    return /^(scroll|auto)$/.test(computedOverflow(element, horizontal));
}

function getScrollRoot() {
    return document.scrollingElement || document.body;
}

function message(message) {
    if (message.data.CSS !== 'ChangeScrollSpeed') {
        return;
    }

    let event = message.data;
    event.target = getFrameByEvent(message.source);
    wheel(event);
}

function getFrameByEvent(source) {
    const iframes = document.getElementsByTagName('iframe');

    return Array.from(iframes).find(iframe => iframe.contentWindow === source);
}

function chromeMessage(message) {
    if (message.scrollFactor) {
        scrollFactor = message.scrollFactor;
    }
}

const wheelEvent = 'onwheel' in document.createElement('div') ? 'wheel' : 'mousewheel';
const el = window.document || window.document.body || window;
el.addEventListener(wheelEvent, wheel, { passive: false });

window.addEventListener('message', message);

chrome.runtime.onMessage.addListener(chromeMessage);
