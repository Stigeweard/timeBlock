// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Get the current URL.
 *
 * @param {function(string)} callback called when the URL of the current tab
 *   is found.
 */
function getCurrentTabUrl(callback) {
    // Query filter to be passed to chrome.tabs.query - see
    // https://developer.chrome.com/extensions/tabs#method-query
    var queryInfo = {
        active: true,
        currentWindow: true
    };

    chrome.tabs.query(queryInfo, (tabs) => {
        // chrome.tabs.query invokes the callback with a list of tabs that match the
        // query. When the popup is opened, there is certainly a window and at least
        // one tab, so we can safely assume that |tabs| is a non-empty array.
        // A window can only have one active tab at a time, so the array consists of
        // exactly one tab.
        var tab = tabs[0];
        // A tab is a plain object that provides information about the tab.
        // See https://developer.chrome.com/extensions/tabs#type-Tab
        console.log('tab', tab);
        var url = tab.url;
        let id = tab.id;
        // tab.url is only available if the "activeTab" permission is declared.
        // If you want to see the URL of other tabs (e.g. after removing active:true
        // from |queryInfo|), then the "tabs" permission is required to see their
        // "url" properties.
        console.assert(typeof url == 'string', 'tab.url should be a string');

        callback(url, id);
    });

    // Most methods of the Chrome extension APIs are asynchronous. This means that
    // you CANNOT do something like this:
    //
    // var url;
    // chrome.tabs.query(queryInfo, (tabs) => {
    //   url = tabs[0].url;
    // });
    // alert(url); // Shows "undefined", because chrome.tabs.query is async.
}


function changeBackgroundColor(color) {
    var script = 'document.body.style.backgroundColor="' + color + '";';
    // See https://developer.chrome.com/extensions/tabs#method-executeScript.
    // chrome.tabs.executeScript allows us to programmatically inject JavaScript
    // into a page. Since we omit the optional first argument "tabId", the script
    // is inserted into the active tab of the current window, which serves as the
    // default.
    chrome.tabs.executeScript({
        code: script
    });
}

function getSavedBlockedSites(callback) {
    chrome.storage.sync.get((items) => {
        callback(chrome.runtime.lastError ? null : items);
    });
}

function getSavedBackgroundColor(url, callback) {
    // See https://developer.chrome.com/apps/storage#type-StorageArea. We check
    // for chrome.runtime.lastError to ensure correctness even when the API call
    // fails.
    chrome.storage.sync.get(url, (items) => {
        callback(chrome.runtime.lastError ? null : items[url]);
    });
}


function saveBlockedSite(url, replace) {
    var items = {};
    items[url] = replace;
    // See https://developer.chrome.com/apps/storage#type-StorageArea. We omit the
    // optional callback since we don't need to perform any action once the
    // background color is saved.
    console.log(chrome.storage);
    chrome.storage.sync.set(items);
}

// This extension loads the saved background color for the current tab if one
// exists. The user can select a new background color from the dropdown for the
// current page, and it will be saved as part of the extension's isolated
// storage. The chrome.storage API is used for this purpose. This is different
// from the window.localStorage API, which is synchronous and stores data bound
// to a document's origin. Also, using chrome.storage.sync instead of
// chrome.storage.local allows the extension data to be synced across multiple
// user devices.
document.addEventListener('DOMContentLoaded', () => {
    let name = document.getElementById('siteForm');
    name.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('submitted!', e.target.name.value);
        saveBlockedSite(e.target.name.value, 'https://news.ycombinator.com/');
    });

    getCurrentTabUrl((url, id) => {
        getSavedBlockedSites((items) => {
            if (items.hasOwnProperty(url)) {

                chrome.tabs.update(id, {
                    'url': items[url]
                })
                // chrome.runtime.sendMessage({
                //     redirect: items[url]
                // });
                // chrome.runtime.onMessage.addListener(function(request, sender) {
                //     chrome.tabs.update(sender.tab.id, {
                //         url: request.redirect
                //     });
                // });
            }
        });
        // var dropdown = document.getElementById('dropdown');

        // Load the saved background color for this page and modify the dropdown
        // value, if needed.
        // getSavedBackgroundColor(url, (savedColor) => {
        //     if (savedColor) {
        //         changeBackgroundColor(savedColor);
        //         dropdown.value = savedColor;
        //     }
        // });

        // Ensure the background color is changed and saved when the dropdown
        // selection changes.
        // dropdown.addEventListener('change', () => {
        //     changeBackgroundColor(dropdown.value);
        //     saveBackgroundColor(url, dropdown.value);
        // });
    });
});
