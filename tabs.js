//todo
//sync update every minute
//how to handle multiple windows 
//loss of conectivity/sync issues - ask if wants to replace
//restrict to computers only
//open tabs by their order
//options sync frequency

//pseudo
//window opened
//retrieve tabs from local and sync
//if cannot retrieve from sync dont do shit - open local
//if can retrieve, compare tabs and close the ones that dont matter and open the ones in sync
//if can retrieve and they mismatch ask user which version wants to use
//
//
//when tabupdates or closes, change or remove url from list
//every minute sync to cloud
//
//window closed sync to cloud

//merge changes

var localTabs = {};
var lastSyncVersion = 0;
var requestFailureCount = 0; // used for exponential backoff
var pollIntervalMin = 1;  // 1 minute
var pollIntervalMax = 60;  // 1 hour
var allTabs = {};


//because the way events work, when tabs are closed, opened, updated, just update the list - not true because tab closed is fired when window is closed
//when window is closed save all tabs

function tabClosedListener(tabId, removeInfo) { //gets fired when window or tab closes
    //alert("Tab Closed");

    //chrome.tabs.query({currentWindow: false}, function(tabs) {
    //	console.log("updated all tabs - tab closed");
    //	//allTabs = tabs;
    //});


}
function tabCreatedListener(tab) {
    return;
    chrome.tabs.query({currentWindow: false}, function (tabs) {
        //update the others tabs

        var idsToRemove = Object.keys(localTabs);//array with keys

        for (var i = 0; i < tabs.length; i++) {
            if (changeInfo.url.indexOf("chrome://") == -1) {//maybe unneeded
                localTabs[tab.id] = tab.url;
                if (idsToRemove.indexOf(tab.id) > -1) {//remove this id from idsToRemove
                    idsToRemove = idsToRemove.splice(idsToRemove.indexOf(tab.id), 1);
                }
            }

        }

        //update localtabs, by removing the remaining ids (tabs closed)
        for (var i = 0; i < idsToRemove.length; i++) {
            delete localTabs[idsToRemove[i]];
        }
        //deep copy
        console.log(localTabs.length);
        console.log(localTabs);
        allTabs = JSON.parse(JSON.stringify(localTabs));
        console.log(allTabs.length);
        console.log(allTabs);
    });
}

function tabUpdatedListener(tabId, changeInfo, tab) { //this event does not get fired when tab or window closes
    //https://developer.chrome.com/extensions/tabs#event-onUpdated
    //alert("Tab Updated");
    tabUpdatedListenerB(tabId, changeInfo, tab);
    return;

    chrome.tabs.query({currentWindow: false}, function (tabs) {
        //console.log("updated all tabs - tab updated");
        //alert(oi);
        //only when loading do we have url present
        if (changeInfo.status == 'complete') {
            //if url contains chrome:// or chrome://newtab dont add
            allTabs = tabs;
            console.log("updated - alltabs len " + allTabs.length);
        }

    });
}
function tabUpdatedListenerB(tabId, changeInfo, tab) {
    //https://developer.chrome.com/extensions/tabs#event-onUpdated
    return;
    //only when loading do we have url present
    if (changeInfo.status == 'loading' && changeInfo.url) {
        //if url contains chrome:// or chrome://newtab dont add


        localTabs[tab.id] = tab.url;
        //check which tabs still exist
        chrome.tabs.query({currentWindow: false}, function (tabs) {
            //update the others tabs

            var idsToRemove = Object.keys(localTabs);//array with keys

            for (var i = 0; i < tabs.length; i++) {
                if (changeInfo.url.indexOf("chrome://") == -1) {//maybe unneeded
                    localTabs[tab.id] = tab.url;
                    if (idsToRemove.indexOf(tab.id) > -1) {//remove this id from idsToRemove
                        idsToRemove = idsToRemove.splice(idsToRemove.indexOf(tab.id), 1);
                    }
                }

            }

            //update localtabs, by removing the remaining ids (tabs closed)
            for (var i = 0; i < idsToRemove.length; i++) {
                delete localTabs[idsToRemove[i]];
            }
            //deep copy
            console.log(localTabs.length);
            console.log(localTabs);
            allTabs = JSON.parse(JSON.stringify(localTabs));
            console.log(allTabs.length);
            console.log(allTabs);
        });
    }


}


function windowCreatedListener(window) {


    console.log('loaded tabs on window created -alltabs length ' + allTabs.length);

    chrome.tabs.query({currentWindow: false}, function (tabs) {
        //disable listeners when executing this logic
        //disableListeners();

        var allTabsClone = JSON.parse(JSON.stringify(allTabs));

        //var tabURL = tabs[0].url;
        alert("hi");
        console.log("alltabs " + allTabsClone);
        console.log("tabs - " + tabs);
        var tabs_dict = {}; //url and windowId
        console.log("alltabs length " + allTabsClone.length);
        for (var i = 0; i < allTabsClone.length; i++) {
            console.log(allTabsClone[i]);
            tabs_dict[allTabsClone[i].url] = allTabsClone[i].windowId;
        }

        //debugger;
        if (tabs.length == 1 && tabs[0].url.indexOf("chrome://newtab") == -1) { //new window without tabs (session restore)
            console.log("if");
            //restore allTabs
            for (var t = 0; t < allTabsClone.length; t++) {
                try {
                    chrome.tabs.create({'url': allTabsClone[t].url});
                } catch (e) {
                    alert(e);
                }

            }
            //return;
        }
        else {
            console.log("else");
            //compare sync versions
            //compare open tabs with allTabs

            //open tabs on correct windows
            var tabs_to_close = [];

            for (var t = 0; t < tabs.length; t++) {
                try {
                    if (tabs_dict[tabs[t].url]) {//if url exists in current open tabs
                        //TODO check if same window
                        delete tabs_dict[tabs[t].url]; //we delete so at the end we can open the rest of the tabs
                    }
                    else {//if doesnt exist append id to later close tab
                        if (tabs[t].id) { //(optional) id, https://developer.chrome.com/extensions/tabs#type-Tab
                            tabs_to_close.push(tabs[t].id);
                        }

                    }
                } catch (e) {
                    alert(e);
                    console.log(e);
                }
            }
            console.log("nada");
            //close the tabs
            //chrome.tabs.remove(tabs_to_close);
            //open the rest of the tabs
            for (t in tabs_dict) {
                chrome.tabs.create({'url': t});
            }

        }

        //enable listeners
        //enableListeners();
    });


}
function windowRemovedListener(windowId) {
    chrome.storage.sync.set({'oldTabs': allTabs}, function () {
        // Notify that we saved.
        //debugger;
        //alert(allTabs.length);
        alert("settings saved on close");
        console.log('Old tabs saved');
    });

    //on exit of any windows force syncupdate and reschedule alarm
    //syncUpdate();
    //scheduleSync();
}
function loadSync() {
    chrome.storage.sync.get(['allTabs', 'oldTabs', 'version', 'syncversion'], function (items) {
        allTabs = items.allTabs;
        var s = Object.keys(allTabs);
        console.log("sync load alltabs = " + s.length);
    });
}
function syncUpdate() {
    var syncVersion = timeStamp();
    console.log('update started -sync ' + syncVersion);
    // Save it using the Chrome extension storage API.
    chrome.storage.sync.set({'allTabs': allTabs, 'syncversion': syncVersion}, function () {
        // Notify that we saved.

        lastSyncVersion = syncVersion;
        var ta = "null";
        var s = Object.keys(allTabs);
        if (allTabs) {
            t = allTabs.length;
        }
        console.log('Settings saved on sync -' + syncVersion + ' alltabs length ' + s.length);
    });
}
function scheduleSync() {//schedule requests between 1 and 60 min
    console.log('Schedule Request');
    var randomness = Math.random() * 2;
    var exponent = Math.pow(2, requestFailureCount || 0);
    var multiplier = Math.max(randomness * exponent, 1);
    var delay = Math.min(multiplier * pollIntervalMin, pollIntervalMax);
    delay = Math.round(delay);
    console.log('Scheduling for: ' + delay);


    console.log('Creating alarm');
    // Use a repeating alarm so that it fires again if there was a problem
    // setting the next alarm.
    chrome.alarms.create('syncUpdate', {periodInMinutes: delay});

}
function onAlarm(alarm) {
    console.log('Got alarm', alarm);
    var args = {currentWindow: false};
    args = {};
    chrome.tabs.query(args, function (tabs) {
        //update the others tabs

        if (tabs.length == 0) {
            return;
        }
        var idsAdded = [];
        var idsExisting = Object.keys(localTabs);//array with keys
        console.log("tabs " + tabs.length);

        for (var i = 0; i < tabs.length; i++) {
            if (tabs[i].url.indexOf("chrome://") == -1) {//maybe unneeded
                localTabs[tabs[i].id] = tabs[i].url;
                idsAdded.push(tabs[i].id.toString());
            }

        }

        //update localtabs, by removing the remaining ids (tabs closed)
        var idsToRemove = idsExisting.diff(idsAdded);
        for (var i = 0; i < idsToRemove.length; i++) {
            delete localTabs[idsToRemove[i]];
        }

        //deep copy
        allTabs = JSON.parse(JSON.stringify(localTabs));
    });

    syncUpdate();
    scheduleSync();
}
Array.prototype.diff = function (a) {
    return this.filter(function (i) {
        return a.indexOf(i) < 0;
    });
};
function timeStamp() {
    return Math.round(+new Date() / 1000);//unixTimestamp
}
function guid() {
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}
function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
}
function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}
function onInit() {

    //schedule a new alarm when starting chrome
    //load sync data


    windowCreatedListener();
}
function enableListeners() {
    chrome.windows.onCreated.addListener(windowCreatedListener);
    chrome.windows.onRemoved.addListener(windowRemovedListener);

    //chrome.tabs.onCreated.addListener(tabCreatedListener);
    chrome.tabs.onUpdated.addListener(tabUpdatedListener);
    chrome.tabs.onRemoved.addListener(tabClosedListener);

    //chrome.runtime.onInstalled.addListener(function callback)
    //open options page

    console.log("Enabled Listeners.");
}
function disableListeners() {
    //chrome.runtime.onStartup.removeListener(onInit);
    //chrome.alarms.onAlarm.removeListener(onAlarm);

    chrome.windows.onCreated.removeListener(windowCreatedListener);
    chrome.windows.onRemoved.removeListener(windowRemovedListener);

    //chrome.tabs.onCreated.removeListener(tabCreatedListener);
    chrome.tabs.onUpdated.removeListener(tabUpdatedListener);
    chrome.tabs.onRemoved.removeListener(tabClosedListener);

    //chrome.runtime.onInstalled.addListener(function callback)
    //open options page

    console.log("Disabled Listeners.");
}


console.log("Google Tabs loading started.");
//enableListeners();
chrome.runtime.onStartup.addListener(onInit);
chrome.alarms.onAlarm.addListener(onAlarm);
loadSync();
scheduleSync();
enableListeners();
console.log("Google Tabs loading complete.");