// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// Store CSS data in the "local" storage area.
//
// Usually we try to store settings in the "sync" area since a lot of the time
// it will be a better user experience for settings to automatically sync
// between browsers.
//
// However, "sync" is expensive with a strict quota (both in storage space and
// bandwidth) so data that may be as large and updated as frequently as the CSS
// may not be suitable.


// Get at the DOM controls used in the sample.
var resetButton = document.querySelector('button.reset');
var submitButton = document.querySelector('button.submit');
var loadButton = document.querySelector('button.load');
var textarea = document.querySelector('textarea');
// Load any CSS that may have previously been saved.
//loadChanges();

submitButton.addEventListener('click', saveChanges);
resetButton.addEventListener('click', reset);
loadButton.addEventListener('click', loadChanges);


function saveChanges() {
    return;
    // Get the current CSS snippet from the form.
    var cssCode = textarea.value;
    // Check that there's some code there.
    if (!cssCode) {
        message('Error: No CSS specified');
        return;
    }
    // Save it using the Chrome extension storage API.
    chrome.storage.sync.set({'css': cssCode}, function () {
        // Notify that we saved.
        message('Settings saved');
    });
}

function loadChanges() {

    chrome.storage.sync.get(['allTabs', 'oldTabs', 'version', 'syncversion'], function (items) {
        var links = "";
        if (!items.allTabs) {
            return;
        }

        for (var i = 0; i < items.allTabs.length; i++) {
            links = links + "\n" + items.allTabs[i].url;
        }

        if (links) {
            textarea.value = links;
            message('Loaded saved Tabs. - length allTabs ' + items.allTabs.length);
        }
    });
}
function reset() {
    // Remove the saved value from storage. storage.clear would achieve the same
    // thing.
    chrome.storage.sync.clear(function (items) {
        console.log('Cleared saved tabs');
        message('Cleared saved tabs');
    });
    // Refresh the text area.
    textarea.value = '';
}
function message(msg) {
    var message = document.querySelector('.message');
    message.innerText = msg;
    setTimeout(function () {
        message.innerText = '';
    }, 5000);
}