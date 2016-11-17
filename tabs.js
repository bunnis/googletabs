//TODO
//sync update every minute
//how to handle multiple windows 
//loss of conectivity/sync issues - ask if wants to replace
//restrict to computers only
//open tabs by their order
//options sync frequency

//Old pseudo, kept for future notes to self*********************
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

var lastSyncVersion = 0;
var requestFailureCount = 0; // used for exponential backoff
var pollIntervalMin = 1;  // 1 minute
var pollIntervalMax = 60;  // 1 hour
var allTabs = {};


function tabClosedListener(tabId, removeInfo) { //gets fired when window or tab closes
    //could force here an update to allTabs
    //alert("Tab Closed");
}
function tabCreatedListener(tab) {
//TESTING SHOWED THAT THIS METHOD AND UPDATE ARE CALLED WHEN A NEW TAB IS CREATED
}
function tabUpdatedListener(tabId, changeInfo, tab) { //this event does not get fired when tab or window closes
    //https://developer.chrome.com/extensions/tabs#event-onUpdated
    //alert("Tab Updated");
}
function windowCreatedListener(window) {
    console.log("Windows created event fired.");
    chrome.tabs.query({currentWindow: false}, function (tabs) {
        //disable listeners when executing this logic
        //disableListeners();
        console.log("windows created query all tabs and open correct ones started");
        var allTabsClone = JSON.parse(JSON.stringify(allTabs));

        if (tabs.length == 1 && tabs[0].url.indexOf("chrome://newtab") == -1) { //new window without tabs (session restore)
            //restore allTabs
            console.log("restoring all tabs");
            for (t in allTabsClone) {
                try {
                    chrome.tabs.create({'url': allTabsClone[t]});
                } catch (e) {
                    alert(e);
                }

            }
            //return;
        }
        else {//compare open tabs and open the remaining ones
            console.log("comparing open tabs with all tabs");
            //this is for people who use chrome session saver
            //compare sync versions

            var saved_urls = Object.values(allTabsClone);
            var open_urls = [];

            for (var t = 0; t < tabs.length; t++) {
                open_urls.push(tabs[t].url);
            }
            console.log("open urls = " + open_urls);
            console.log("saved urls = " + saved_urls);

            final_urls = arrayUnique(open_urls.concat(saved_urls));

            //oepn tabs
            for (var t = 0; t < final_urls.length; t++) {
                try {
                    chrome.tabs.create({'url': final_urls[t]});
                } catch (e) {
                    alert(e);
                }
            }
        }

        //enable listeners
        //enableListeners();
    });


}
//http://stackoverflow.com/questions/1584370/how-to-merge-two-arrays-in-javascript-and-de-duplicate-items
function arrayUnique(array) {
    var a = array.concat();
    for (var i = 0; i < a.length; ++i) {
        for (var j = i + 1; j < a.length; ++j) {
            if (a[i] === a[j])
                a.splice(j--, 1);
        }
    }

    return a;
}
function windowRemovedListener(windowId) {
    //on exit of any windows force syncupdate and reschedule alarm
    syncUpdate();
    scheduleSync();
}
function loadSync() {
    chrome.storage.sync.get(['allTabs', 'syncversion'], function (items) {
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

    allTabsUpdate();

    syncUpdate();
    scheduleSync();
}
function allTabsUpdate() {
    chrome.tabs.query(args, function (tabs) {
        //deep copy
        var localTabs = JSON.parse(JSON.stringify(localTabs));

        console.log("updating allTabs");
        if (tabs.length == 0) {
            return;
        }
        var idsAdded = [];
        var idsExisting = Object.keys(localTabs);//array with keys


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
}
//http://stackoverflow.com/questions/1187518/javascript-array-difference
Array.prototype.diff = function (a) {
    return this.filter(function (i) {
        return a.indexOf(i) < 0;
    });
};
//http://stackoverflow.com/questions/221294/how-do-you-get-a-timestamp-in-javascript
function timeStamp() {
    return Math.round(+new Date() / 1000);//unixTimestamp
}
//function s4() {
function guid() {//to use maybe when syncing 2 computers
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
    windowCreatedListener();
}
function extInstalled(details) {
    var myid = chrome.runtime.id;
    var extOptionsUrl = "chrome-extension://" + myid + "/options.html";

    if (details.reason == "install") {
        console.log("This is a first install!");
        //open options page
        try {
            chrome.tabs.create({'url': extOptionsUrl});
        } catch (e) {
            alert(e);
        }

    } else if (details.reason == "update") {
        var thisVersion = chrome.runtime.getManifest().version;
        console.log("Updated from " + details.previousVersion + " to " + thisVersion + "!");
    }
}
function enableListeners() {
    chrome.windows.onCreated.addListener(windowCreatedListener);
    chrome.windows.onRemoved.addListener(windowRemovedListener);

    chrome.tabs.onUpdated.addListener(tabUpdatedListener);
    chrome.tabs.onRemoved.addListener(tabClosedListener);

    //chrome.runtime.onInstalled.addListener(extInstalled);

    console.log("Enabled Listeners.");
}
function disableListeners() {
    chrome.windows.onCreated.removeListener(windowCreatedListener);
    chrome.windows.onRemoved.removeListener(windowRemovedListener);

    chrome.tabs.onUpdated.removeListener(tabUpdatedListener);
    chrome.tabs.onRemoved.removeListener(tabClosedListener);

    console.log("Disabled Listeners.");
}


console.log("Google Tabs loading started.");
chrome.runtime.onStartup.addListener(onInit);
chrome.alarms.onAlarm.addListener(onAlarm);
loadSync();
scheduleSync();
enableListeners();
console.log("Google Tabs loading complete.");