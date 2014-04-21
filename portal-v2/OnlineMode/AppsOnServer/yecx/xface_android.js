// Platform: android
// 3.2.0
/*
 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements.  See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership.  The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License.  You may obtain a copy of the License at
 
     http://www.apache.org/licenses/LICENSE-2.0
 
 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied.  See the License for the
 specific language governing permissions and limitations
 under the License.
*/
;(function() {
var CORDOVA_JS_BUILD_LABEL = '3.2.0';
// file: src/scripts/require.js

/*jshint -W079 */
/*jshint -W020 */

var require,
    define;

(function () {
    var modules = {},
    // Stack of moduleIds currently being built.
        requireStack = [],
    // Map of module ID -> index into requireStack of modules currently being built.
        inProgressModules = {},
        SEPARATOR = ".";



    function build(module) {
        var factory = module.factory,
            localRequire = function (id) {
                var resultantId = id;
                //Its a relative path, so lop off the last portion and add the id (minus "./")
                if (id.charAt(0) === ".") {
                    resultantId = module.id.slice(0, module.id.lastIndexOf(SEPARATOR)) + SEPARATOR + id.slice(2);
                }
                return require(resultantId);
            };
        module.exports = {};
        delete module.factory;
        factory(localRequire, module.exports, module);
        return module.exports;
    }

    require = function (id) {
        if (!modules[id]) {
            throw "module " + id + " not found";
        } else if (id in inProgressModules) {
            var cycle = requireStack.slice(inProgressModules[id]).join('->') + '->' + id;
            throw "Cycle in require graph: " + cycle;
        }
        if (modules[id].factory) {
            try {
                inProgressModules[id] = requireStack.length;
                requireStack.push(id);
                return build(modules[id]);
            } finally {
                delete inProgressModules[id];
                requireStack.pop();
            }
        }
        return modules[id].exports;
    };

    define = function (id, factory) {
        if (modules[id]) {
            throw "module " + id + " already defined";
        }

        modules[id] = {
            id: id,
            factory: factory
        };
    };

    define.remove = function (id) {
        delete modules[id];
    };

    define.moduleMap = modules;
})();

//Export for use in node
if (typeof module === "object" && typeof require === "function") {
    module.exports.require = require;
    module.exports.define = define;
}

// file: src/cordova.js
define("cordova", function(require, exports, module) {


var channel = require('cordova/channel');
var platform = require('cordova/platform');

/**
 * Intercept calls to addEventListener + removeEventListener and handle deviceready,
 * resume, and pause events.
 */
var m_document_addEventListener = document.addEventListener;
var m_document_removeEventListener = document.removeEventListener;
var m_window_addEventListener = window.addEventListener;
var m_window_removeEventListener = window.removeEventListener;

/**
 * Houses custom event handlers to intercept on document + window event listeners.
 */
var documentEventHandlers = {},
    windowEventHandlers = {};

document.addEventListener = function(evt, handler, capture) {
    var e = evt.toLowerCase();
    if (typeof documentEventHandlers[e] != 'undefined') {
        documentEventHandlers[e].subscribe(handler);
    } else {
        m_document_addEventListener.call(document, evt, handler, capture);
    }
};

window.addEventListener = function(evt, handler, capture) {
    var e = evt.toLowerCase();
    if (typeof windowEventHandlers[e] != 'undefined') {
        windowEventHandlers[e].subscribe(handler);
    } else {
        m_window_addEventListener.call(window, evt, handler, capture);
    }
};

document.removeEventListener = function(evt, handler, capture) {
    var e = evt.toLowerCase();
    // If unsubscribing from an event that is handled by a plugin
    if (typeof documentEventHandlers[e] != "undefined") {
        documentEventHandlers[e].unsubscribe(handler);
    } else {
        m_document_removeEventListener.call(document, evt, handler, capture);
    }
};

window.removeEventListener = function(evt, handler, capture) {
    var e = evt.toLowerCase();
    // If unsubscribing from an event that is handled by a plugin
    if (typeof windowEventHandlers[e] != "undefined") {
        windowEventHandlers[e].unsubscribe(handler);
    } else {
        m_window_removeEventListener.call(window, evt, handler, capture);
    }
};

function createEvent(type, data) {
    var event = document.createEvent('Events');
    event.initEvent(type, false, false);
    if (data) {
        for (var i in data) {
            if (data.hasOwnProperty(i)) {
                event[i] = data[i];
            }
        }
    }
    return event;
}


var cordova = {
    define:define,
    require:require,
    version:CORDOVA_JS_BUILD_LABEL,
    platformId:platform.id,
    /**
     * Methods to add/remove your own addEventListener hijacking on document + window.
     */
    addWindowEventHandler:function(event) {
        return (windowEventHandlers[event] = channel.create(event));
    },
    addStickyDocumentEventHandler:function(event) {
        return (documentEventHandlers[event] = channel.createSticky(event));
    },
    addDocumentEventHandler:function(event) {
        return (documentEventHandlers[event] = channel.create(event));
    },
    removeWindowEventHandler:function(event) {
        delete windowEventHandlers[event];
    },
    removeDocumentEventHandler:function(event) {
        delete documentEventHandlers[event];
    },
    /**
     * Retrieve original event handlers that were replaced by Cordova
     *
     * @return object
     */
    getOriginalHandlers: function() {
        return {'document': {'addEventListener': m_document_addEventListener, 'removeEventListener': m_document_removeEventListener},
        'window': {'addEventListener': m_window_addEventListener, 'removeEventListener': m_window_removeEventListener}};
    },
    /**
     * Method to fire event from native code
     * bNoDetach is required for events which cause an exception which needs to be caught in native code
     */
    fireDocumentEvent: function(type, data, bNoDetach) {
        var evt = createEvent(type, data);
        if (typeof documentEventHandlers[type] != 'undefined') {
            if( bNoDetach ) {
                documentEventHandlers[type].fire(evt);
            }
            else {
                setTimeout(function() {
                    // Fire deviceready on listeners that were registered before cordova.js was loaded.
                    if (type == 'deviceready') {
                        document.dispatchEvent(evt);
                    }
                    documentEventHandlers[type].fire(evt);
                }, 0);
            }
        } else {
            document.dispatchEvent(evt);
        }
    },
    fireWindowEvent: function(type, data) {
        var evt = createEvent(type,data);
        if (typeof windowEventHandlers[type] != 'undefined') {
            setTimeout(function() {
                windowEventHandlers[type].fire(evt);
            }, 0);
        } else {
            window.dispatchEvent(evt);
        }
    },

    /**
     * Plugin callback mechanism.
     */
    // Randomize the starting callbackId to avoid collisions after refreshing or navigating.
    // This way, it's very unlikely that any new callback would get the same callbackId as an old callback.
    callbackId: Math.floor(Math.random() * 2000000000),
    callbacks:  {},
    callbackStatus: {
        NO_RESULT: 0,
        OK: 1,
        CLASS_NOT_FOUND_EXCEPTION: 2,
        ILLEGAL_ACCESS_EXCEPTION: 3,
        INSTANTIATION_EXCEPTION: 4,
        MALFORMED_URL_EXCEPTION: 5,
        IO_EXCEPTION: 6,
        INVALID_ACTION: 7,
        JSON_EXCEPTION: 8,
        ERROR: 9
    },

    /**
     * Called by native code when returning successful result from an action.
     */
    callbackSuccess: function(callbackId, args) {
        try {
            cordova.callbackFromNative(callbackId, true, args.status, [args.message], args.keepCallback);
        } catch (e) {
            console.log("Error in error callback: " + callbackId + " = "+e);
        }
    },

    /**
     * Called by native code when returning error result from an action.
     */
    callbackError: function(callbackId, args) {
        // TODO: Deprecate callbackSuccess and callbackError in favour of callbackFromNative.
        // Derive success from status.
        try {
            cordova.callbackFromNative(callbackId, false, args.status, [args.message], args.keepCallback);
        } catch (e) {
            console.log("Error in error callback: " + callbackId + " = "+e);
        }
    },

    /**
     * Called by native code when returning the result from an action.
     */
    callbackFromNative: function(callbackId, success, status, args, keepCallback) {
        var callback = cordova.callbacks[callbackId];
        if (callback) {
            if (success && status == cordova.callbackStatus.OK) {
                callback.success && callback.success.apply(null, args);
            } else if (!success) {
                callback.fail && callback.fail.apply(null, args);
            }

            // Clear callback if not expecting any more results
            if (!keepCallback) {
                delete cordova.callbacks[callbackId];
            }
        }
    },
    addConstructor: function(func) {
        channel.onCordovaReady.subscribe(function() {
            try {
                func();
            } catch(e) {
                console.log("Failed to run constructor: " + e);
            }
        });
    }
};


module.exports = cordova;

});

// file: src/android/android/nativeapiprovider.js
define("cordova/android/nativeapiprovider", function(require, exports, module) {

/**
 * Exports the ExposedJsApi.java object if available, otherwise exports the PromptBasedNativeApi.
 */

var nativeApi = this._cordovaNative || require('cordova/android/promptbasednativeapi');
var currentApi = nativeApi;

module.exports = {
    get: function() { return currentApi; },
    setPreferPrompt: function(value) {
        currentApi = value ? require('cordova/android/promptbasednativeapi') : nativeApi;
    },
    // Used only by tests.
    set: function(value) {
        currentApi = value;
    }
};

});

// file: src/android/android/promptbasednativeapi.js
define("cordova/android/promptbasednativeapi", function(require, exports, module) {

/**
 * Implements the API of ExposedJsApi.java, but uses prompt() to communicate.
 * This is used only on the 2.3 simulator, where addJavascriptInterface() is broken.
 */

module.exports = {
    exec: function(service, action, callbackId, argsJson) {
        return prompt(argsJson, 'gap:'+JSON.stringify([service, action, callbackId]));
    },
    setNativeToJsBridgeMode: function(value) {
        prompt(value, 'gap_bridge_mode:');
    },
    retrieveJsMessages: function(fromOnlineEvent) {
        return prompt(+fromOnlineEvent, 'gap_poll:');
    }
};

});

// file: src/common/argscheck.js
define("cordova/argscheck", function(require, exports, module) {

var exec = require('cordova/exec');
var utils = require('cordova/utils');

var moduleExports = module.exports;

var typeMap = {
    'A': 'Array',
    'D': 'Date',
    'N': 'Number',
    'S': 'String',
    'F': 'Function',
    'O': 'Object',
    'B': 'Boolean'
};

function extractParamName(callee, argIndex) {
    return (/.*?\((.*?)\)/).exec(callee)[1].split(', ')[argIndex];
}

function checkArgs(spec, functionName, args, opt_callee) {
    if (!moduleExports.enableChecks) {
        return;
    }
    var errMsg = null;
    var typeName;
    for (var i = 0; i < spec.length; ++i) {
        var c = spec.charAt(i),
            cUpper = c.toUpperCase(),
            arg = args[i];
        // Asterix means allow anything.
        if (c == '*') {
            continue;
        }
        typeName = utils.typeName(arg);
        if ((arg === null || arg === undefined) && c == cUpper) {
            continue;
        }
        if (typeName != typeMap[cUpper]) {
            errMsg = 'Expected ' + typeMap[cUpper];
            break;
        }
    }
    if (errMsg) {
        errMsg += ', but got ' + typeName + '.';
        errMsg = 'Wrong type for parameter "' + extractParamName(opt_callee || args.callee, i) + '" of ' + functionName + ': ' + errMsg;
        // Don't log when running unit tests.
        if (typeof jasmine == 'undefined') {
            console.error(errMsg);
        }
        throw TypeError(errMsg);
    }
}

function getValue(value, defaultValue) {
    return value === undefined ? defaultValue : value;
}

moduleExports.checkArgs = checkArgs;
moduleExports.getValue = getValue;
moduleExports.enableChecks = true;


});

// file: src/common/base64.js
define("cordova/base64", function(require, exports, module) {

var base64 = exports;

base64.fromArrayBuffer = function(arrayBuffer) {
    var array = new Uint8Array(arrayBuffer);
    return uint8ToBase64(array);
};
base64.toArrayBuffer = function(str) {
    var decodedStr = typeof atob != 'undefined' ? atob(str) : new Buffer(str,'base64').toString('binary');
    var arrayBuffer = new ArrayBuffer(decodedStr.length);
    var array = new Uint8Array(arrayBuffer);
    for (var i=0, len=decodedStr.length; i < len; i++) {
        array[i] = decodedStr.charCodeAt(i);
    }
    return arrayBuffer;
};

//------------------------------------------------------------------------------

/* This code is based on the performance tests at http://jsperf.com/b64tests
 * This 12-bit-at-a-time algorithm was the best performing version on all
 * platforms tested.
 */

var b64_6bit = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var b64_12bit;

var b64_12bitTable = function() {
    b64_12bit = [];
    for (var i=0; i<64; i++) {
        for (var j=0; j<64; j++) {
            b64_12bit[i*64+j] = b64_6bit[i] + b64_6bit[j];
        }
    }
    b64_12bitTable = function() { return b64_12bit; };
    return b64_12bit;
};

function uint8ToBase64(rawData) {
    var numBytes = rawData.byteLength;
    var output="";
    var segment;
    var table = b64_12bitTable();
    for (var i=0;i<numBytes-2;i+=3) {
        segment = (rawData[i] << 16) + (rawData[i+1] << 8) + rawData[i+2];
        output += table[segment >> 12];
        output += table[segment & 0xfff];
    }
    if (numBytes - i == 2) {
        segment = (rawData[i] << 16) + (rawData[i+1] << 8);
        output += table[segment >> 12];
        output += b64_6bit[(segment & 0xfff) >> 6];
        output += '=';
    } else if (numBytes - i == 1) {
        segment = (rawData[i] << 16);
        output += table[segment >> 12];
        output += '==';
    }
    return output;
}

});

// file: src/common/builder.js
define("cordova/builder", function(require, exports, module) {

var utils = require('cordova/utils');

function each(objects, func, context) {
    for (var prop in objects) {
        if (objects.hasOwnProperty(prop)) {
            func.apply(context, [objects[prop], prop]);
        }
    }
}

function clobber(obj, key, value) {
    exports.replaceHookForTesting(obj, key);
    obj[key] = value;
    // Getters can only be overridden by getters.
    if (obj[key] !== value) {
        utils.defineGetter(obj, key, function() {
            return value;
        });
    }
}

function assignOrWrapInDeprecateGetter(obj, key, value, message) {
    if (message) {
        utils.defineGetter(obj, key, function() {
            console.log(message);
            delete obj[key];
            clobber(obj, key, value);
            return value;
        });
    } else {
        clobber(obj, key, value);
    }
}

function include(parent, objects, clobber, merge) {
    each(objects, function (obj, key) {
        try {
            var result = obj.path ? require(obj.path) : {};

            if (clobber) {
                // Clobber if it doesn't exist.
                if (typeof parent[key] === 'undefined') {
                    assignOrWrapInDeprecateGetter(parent, key, result, obj.deprecated);
                } else if (typeof obj.path !== 'undefined') {
                    // If merging, merge properties onto parent, otherwise, clobber.
                    if (merge) {
                        recursiveMerge(parent[key], result);
                    } else {
                        assignOrWrapInDeprecateGetter(parent, key, result, obj.deprecated);
                    }
                }
                result = parent[key];
            } else {
                // Overwrite if not currently defined.
                if (typeof parent[key] == 'undefined') {
                    assignOrWrapInDeprecateGetter(parent, key, result, obj.deprecated);
                } else {
                    // Set result to what already exists, so we can build children into it if they exist.
                    result = parent[key];
                }
            }

            if (obj.children) {
                include(result, obj.children, clobber, merge);
            }
        } catch(e) {
            utils.alert('Exception building Cordova JS globals: ' + e + ' for key "' + key + '"');
        }
    });
}

/**
 * Merge properties from one object onto another recursively.  Properties from
 * the src object will overwrite existing target property.
 *
 * @param target Object to merge properties into.
 * @param src Object to merge properties from.
 */
function recursiveMerge(target, src) {
    for (var prop in src) {
        if (src.hasOwnProperty(prop)) {
            if (target.prototype && target.prototype.constructor === target) {
                // If the target object is a constructor override off prototype.
                clobber(target.prototype, prop, src[prop]);
            } else {
                if (typeof src[prop] === 'object' && typeof target[prop] === 'object') {
                    recursiveMerge(target[prop], src[prop]);
                } else {
                    clobber(target, prop, src[prop]);
                }
            }
        }
    }
}

exports.buildIntoButDoNotClobber = function(objects, target) {
    include(target, objects, false, false);
};
exports.buildIntoAndClobber = function(objects, target) {
    include(target, objects, true, false);
};
exports.buildIntoAndMerge = function(objects, target) {
    include(target, objects, true, true);
};
exports.recursiveMerge = recursiveMerge;
exports.assignOrWrapInDeprecateGetter = assignOrWrapInDeprecateGetter;
exports.replaceHookForTesting = function() {};

});

// file: src/common/channel.js
define("cordova/channel", function(require, exports, module) {

var utils = require('cordova/utils'),
    nextGuid = 1;

/**
 * Custom pub-sub "channel" that can have functions subscribed to it
 * This object is used to define and control firing of events for
 * cordova initialization, as well as for custom events thereafter.
 *
 * The order of events during page load and Cordova startup is as follows:
 *
 * onDOMContentLoaded*         Internal event that is received when the web page is loaded and parsed.
 * onNativeReady*              Internal event that indicates the Cordova native side is ready.
 * onCordovaReady*             Internal event fired when all Cordova JavaScript objects have been created.
 * onDeviceReady*              User event fired to indicate that Cordova is ready
 * onResume                    User event fired to indicate a start/resume lifecycle event
 * onPause                     User event fired to indicate a pause lifecycle event
 * onDestroy*                  Internal event fired when app is being destroyed (User should use window.onunload event, not this one).
 *
 * The events marked with an * are sticky. Once they have fired, they will stay in the fired state.
 * All listeners that subscribe after the event is fired will be executed right away.
 *
 * The only Cordova events that user code should register for are:
 *      deviceready           Cordova native code is initialized and Cordova APIs can be called from JavaScript
 *      pause                 App has moved to background
 *      resume                App has returned to foreground
 *
 * Listeners can be registered as:
 *      document.addEventListener("deviceready", myDeviceReadyListener, false);
 *      document.addEventListener("resume", myResumeListener, false);
 *      document.addEventListener("pause", myPauseListener, false);
 *
 * The DOM lifecycle events should be used for saving and restoring state
 *      window.onload
 *      window.onunload
 *
 */

/**
 * Channel
 * @constructor
 * @param type  String the channel name
 */
var Channel = function(type, sticky) {
    this.type = type;
    // Map of guid -> function.
    this.handlers = {};
    // 0 = Non-sticky, 1 = Sticky non-fired, 2 = Sticky fired.
    this.state = sticky ? 1 : 0;
    // Used in sticky mode to remember args passed to fire().
    this.fireArgs = null;
    // Used by onHasSubscribersChange to know if there are any listeners.
    this.numHandlers = 0;
    // Function that is called when the first listener is subscribed, or when
    // the last listener is unsubscribed.
    this.onHasSubscribersChange = null;
},
    channel = {
        /**
         * Calls the provided function only after all of the channels specified
         * have been fired. All channels must be sticky channels.
         */
        join: function(h, c) {
            var len = c.length,
                i = len,
                f = function() {
                    if (!(--i)) h();
                };
            for (var j=0; j<len; j++) {
                if (c[j].state === 0) {
                    throw Error('Can only use join with sticky channels.');
                }
                c[j].subscribe(f);
            }
            if (!len) h();
        },
        create: function(type) {
            return channel[type] = new Channel(type, false);
        },
        createSticky: function(type) {
            return channel[type] = new Channel(type, true);
        },

        /**
         * cordova Channels that must fire before "deviceready" is fired.
         */
        deviceReadyChannelsArray: [],
        deviceReadyChannelsMap: {},

        /**
         * Indicate that a feature needs to be initialized before it is ready to be used.
         * This holds up Cordova's "deviceready" event until the feature has been initialized
         * and Cordova.initComplete(feature) is called.
         *
         * @param feature {String}     The unique feature name
         */
        waitForInitialization: function(feature) {
            if (feature) {
                var c = channel[feature] || this.createSticky(feature);
                this.deviceReadyChannelsMap[feature] = c;
                this.deviceReadyChannelsArray.push(c);
            }
        },

        /**
         * Indicate that initialization code has completed and the feature is ready to be used.
         *
         * @param feature {String}     The unique feature name
         */
        initializationComplete: function(feature) {
            var c = this.deviceReadyChannelsMap[feature];
            if (c) {
                c.fire();
            }
        }
    };

function forceFunction(f) {
    if (typeof f != 'function') throw "Function required as first argument!";
}

/**
 * Subscribes the given function to the channel. Any time that
 * Channel.fire is called so too will the function.
 * Optionally specify an execution context for the function
 * and a guid that can be used to stop subscribing to the channel.
 * Returns the guid.
 */
Channel.prototype.subscribe = function(f, c) {
    // need a function to call
    forceFunction(f);
    if (this.state == 2) {
        f.apply(c || this, this.fireArgs);
        return;
    }

    var func = f,
        guid = f.observer_guid;
    if (typeof c == "object") { func = utils.close(c, f); }

    if (!guid) {
        // first time any channel has seen this subscriber
        guid = '' + nextGuid++;
    }
    func.observer_guid = guid;
    f.observer_guid = guid;

    // Don't add the same handler more than once.
    if (!this.handlers[guid]) {
        this.handlers[guid] = func;
        this.numHandlers++;
        if (this.numHandlers == 1) {
            this.onHasSubscribersChange && this.onHasSubscribersChange();
        }
    }
};

/**
 * Unsubscribes the function with the given guid from the channel.
 */
Channel.prototype.unsubscribe = function(f) {
    // need a function to unsubscribe
    forceFunction(f);

    var guid = f.observer_guid,
        handler = this.handlers[guid];
    if (handler) {
        delete this.handlers[guid];
        this.numHandlers--;
        if (this.numHandlers === 0) {
            this.onHasSubscribersChange && this.onHasSubscribersChange();
        }
    }
};

/**
 * Calls all functions subscribed to this channel.
 */
Channel.prototype.fire = function(e) {
    var fail = false,
        fireArgs = Array.prototype.slice.call(arguments);
    // Apply stickiness.
    if (this.state == 1) {
        this.state = 2;
        this.fireArgs = fireArgs;
    }
    if (this.numHandlers) {
        // Copy the values first so that it is safe to modify it from within
        // callbacks.
        var toCall = [];
        for (var item in this.handlers) {
            toCall.push(this.handlers[item]);
        }
        for (var i = 0; i < toCall.length; ++i) {
            toCall[i].apply(this, fireArgs);
        }
        if (this.state == 2 && this.numHandlers) {
            this.numHandlers = 0;
            this.handlers = {};
            this.onHasSubscribersChange && this.onHasSubscribersChange();
        }
    }
};


// defining them here so they are ready super fast!
// DOM event that is received when the web page is loaded and parsed.
channel.createSticky('onDOMContentLoaded');

// Event to indicate the Cordova native side is ready.
channel.createSticky('onNativeReady');

// Event to indicate that all Cordova JavaScript objects have been created
// and it's time to run plugin constructors.
channel.createSticky('onCordovaReady');

// Event to indicate that all automatically loaded JS plugins are loaded and ready.
channel.createSticky('onPluginsReady');

// Event to indicate that Cordova is ready
channel.createSticky('onDeviceReady');

// Event to indicate that xFace private data is ready
channel.createSticky('onPrivateDataReady');

// Event to indicate a resume lifecycle event
channel.create('onResume');

// Event to indicate a pause lifecycle event
channel.create('onPause');

// Event to indicate a destroy lifecycle event
channel.createSticky('onDestroy');

// Channels that must fire before "deviceready" is fired.
channel.waitForInitialization('onCordovaReady');
channel.waitForInitialization('onDOMContentLoaded');
channel.waitForInitialization('onPrivateDataReady');

module.exports = channel;

});

// file: src/android/exec.js
define("cordova/exec", function(require, exports, module) {

/**
 * Execute a cordova command.  It is up to the native side whether this action
 * is synchronous or asynchronous.  The native side can return:
 *      Synchronous: PluginResult object as a JSON string
 *      Asynchronous: Empty string ""
 * If async, the native side will cordova.callbackSuccess or cordova.callbackError,
 * depending upon the result of the action.
 *
 * @param {Function} success    The success callback
 * @param {Function} fail       The fail callback
 * @param {String} service      The name of the service to use
 * @param {String} action       Action to be run in cordova
 * @param {String[]} [args]     Zero or more arguments to pass to the method
 */
var cordova = require('cordova'),
    nativeApiProvider = require('cordova/android/nativeapiprovider'),
    utils = require('cordova/utils'),
    base64 = require('cordova/base64'),
    jsToNativeModes = {
        PROMPT: 0,
        JS_OBJECT: 1,
        // This mode is currently for benchmarking purposes only. It must be enabled
        // on the native side through the ENABLE_LOCATION_CHANGE_EXEC_MODE
        // constant within CordovaWebViewClient.java before it will work.
        LOCATION_CHANGE: 2
    },
    nativeToJsModes = {
        // Polls for messages using the JS->Native bridge.
        POLLING: 0,
        // For LOAD_URL to be viable, it would need to have a work-around for
        // the bug where the soft-keyboard gets dismissed when a message is sent.
        LOAD_URL: 1,
        // For the ONLINE_EVENT to be viable, it would need to intercept all event
        // listeners (both through addEventListener and window.ononline) as well
        // as set the navigator property itself.
        ONLINE_EVENT: 2,
        // Uses reflection to access private APIs of the WebView that can send JS
        // to be executed.
        // Requires Android 3.2.4 or above.
        PRIVATE_API: 3
    },
    jsToNativeBridgeMode,  // Set lazily.
    nativeToJsBridgeMode = nativeToJsModes.LOAD_URL,
    pollEnabled = false,
    messagesFromNative = [];

function androidExec(success, fail, service, action, args) {
    // Set default bridge modes if they have not already been set.
    // By default, we use the failsafe, since addJavascriptInterface breaks too often
    if (jsToNativeBridgeMode === undefined) {
        androidExec.setJsToNativeBridgeMode(jsToNativeModes.JS_OBJECT);
    }

    // Process any ArrayBuffers in the args into a string.
    for (var i = 0; i < args.length; i++) {
        if (utils.typeName(args[i]) == 'ArrayBuffer') {
            args[i] = base64.fromArrayBuffer(args[i]);
        }
    }

    var callbackId = service + cordova.callbackId++,
        argsJson = JSON.stringify(args);

    if (success || fail) {
        cordova.callbacks[callbackId] = {success:success, fail:fail};
    }

    if (jsToNativeBridgeMode == jsToNativeModes.LOCATION_CHANGE) {
        window.location = 'http://cdv_exec/' + service + '#' + action + '#' + callbackId + '#' + argsJson;
    } else {
        var messages = nativeApiProvider.get().exec(service, action, callbackId, argsJson);
        // If argsJson was received by Java as null, try again with the PROMPT bridge mode.
        // This happens in rare circumstances, such as when certain Unicode characters are passed over the bridge on a Galaxy S2.  See CB-2666.
        if (jsToNativeBridgeMode == jsToNativeModes.JS_OBJECT && messages === "@Null arguments.") {
            androidExec.setJsToNativeBridgeMode(jsToNativeModes.PROMPT);
            androidExec(success, fail, service, action, args);
            androidExec.setJsToNativeBridgeMode(jsToNativeModes.JS_OBJECT);
            return;
        } else {
            androidExec.processMessages(messages, true);
        }
    }
}

function pollOnceFromOnlineEvent() {
    pollOnce(true);
}

function pollOnce(opt_fromOnlineEvent) {
    var msg = nativeApiProvider.get().retrieveJsMessages(!!opt_fromOnlineEvent);
    androidExec.processMessages(msg);
}

function pollingTimerFunc() {
    if (pollEnabled) {
        pollOnce();
        setTimeout(pollingTimerFunc, 50);
    }
}

function hookOnlineApis() {
    function proxyEvent(e) {
        cordova.fireWindowEvent(e.type);
    }
    // The network module takes care of firing online and offline events.
    // It currently fires them only on document though, so we bridge them
    // to window here (while first listening for exec()-releated online/offline
    // events).
    window.addEventListener('online', pollOnceFromOnlineEvent, false);
    window.addEventListener('offline', pollOnceFromOnlineEvent, false);
    cordova.addWindowEventHandler('online');
    cordova.addWindowEventHandler('offline');
    document.addEventListener('online', proxyEvent, false);
    document.addEventListener('offline', proxyEvent, false);
}

hookOnlineApis();

androidExec.jsToNativeModes = jsToNativeModes;
androidExec.nativeToJsModes = nativeToJsModes;

androidExec.setJsToNativeBridgeMode = function(mode) {
    if (mode == jsToNativeModes.JS_OBJECT && !window._cordovaNative) {
        mode = jsToNativeModes.PROMPT;
    }
    nativeApiProvider.setPreferPrompt(mode == jsToNativeModes.PROMPT);
    jsToNativeBridgeMode = mode;
};

androidExec.setNativeToJsBridgeMode = function(mode) {
    if (mode == nativeToJsBridgeMode) {
        return;
    }
    if (nativeToJsBridgeMode == nativeToJsModes.POLLING) {
        pollEnabled = false;
    }

    nativeToJsBridgeMode = mode;
    // Tell the native side to switch modes.
    nativeApiProvider.get().setNativeToJsBridgeMode(mode);

    if (mode == nativeToJsModes.POLLING) {
        pollEnabled = true;
        setTimeout(pollingTimerFunc, 1);
    }
};

// Processes a single message, as encoded by NativeToJsMessageQueue.java.
function processMessage(message) {
    try {
        var firstChar = message.charAt(0);
        if (firstChar == 'J') {
            eval(message.slice(1));
        } else if (firstChar == 'S' || firstChar == 'F') {
            var success = firstChar == 'S';
            var keepCallback = message.charAt(1) == '1';
            var spaceIdx = message.indexOf(' ', 2);
            var status = +message.slice(2, spaceIdx);
            var nextSpaceIdx = message.indexOf(' ', spaceIdx + 1);
            var callbackId = message.slice(spaceIdx + 1, nextSpaceIdx);
            var payloadKind = message.charAt(nextSpaceIdx + 1);
            var payload;
            if (payloadKind == 's') {
                payload = message.slice(nextSpaceIdx + 2);
            } else if (payloadKind == 't') {
                payload = true;
            } else if (payloadKind == 'f') {
                payload = false;
            } else if (payloadKind == 'N') {
                payload = null;
            } else if (payloadKind == 'n') {
                payload = +message.slice(nextSpaceIdx + 2);
            } else if (payloadKind == 'A') {
                var data = message.slice(nextSpaceIdx + 2);
                var bytes = window.atob(data);
                var arraybuffer = new Uint8Array(bytes.length);
                for (var i = 0; i < bytes.length; i++) {
                    arraybuffer[i] = bytes.charCodeAt(i);
                }
                payload = arraybuffer.buffer;
            } else if (payloadKind == 'S') {
                payload = window.atob(message.slice(nextSpaceIdx + 2));
            } else {
                payload = JSON.parse(message.slice(nextSpaceIdx + 1));
            }
            cordova.callbackFromNative(callbackId, success, status, [payload], keepCallback);
        } else {
            console.log("processMessage failed: invalid message: " + JSON.stringify(message));
        }
    } catch (e) {
        console.log("processMessage failed: Error: " + e);
        console.log("processMessage failed: Stack: " + e.stack);
        console.log("processMessage failed: Message: " + message);
    }
}

var isProcessing = false;

// This is called from the NativeToJsMessageQueue.java.
androidExec.processMessages = function(messages, opt_useTimeout) {
    if (messages) {
        messagesFromNative.push(messages);
    }
    // Check for the reentrant case.
    if (isProcessing) {
        return;
    }
    if (opt_useTimeout) {
        window.setTimeout(androidExec.processMessages, 0);
        return;
    }
    isProcessing = true;
    try {
        // TODO: add setImmediate polyfill and process only one message at a time.
        while (messagesFromNative.length) {
            var msg = popMessageFromQueue();
            // The Java side can send a * message to indicate that it
            // still has messages waiting to be retrieved.
            if (msg == '*' && messagesFromNative.length === 0) {
                setTimeout(pollOnce, 0);
                return;
            }
            processMessage(msg);
        }
    } finally {
        isProcessing = false;
    }
};

function popMessageFromQueue() {
    var messageBatch = messagesFromNative.shift();
    if (messageBatch == '*') {
        return '*';
    }

    var spaceIdx = messageBatch.indexOf(' ');
    var msgLen = +messageBatch.slice(0, spaceIdx);
    var message = messageBatch.substr(spaceIdx + 1, msgLen);
    messageBatch = messageBatch.slice(spaceIdx + msgLen + 1);
    if (messageBatch) {
        messagesFromNative.unshift(messageBatch);
    }
    return message;
}

module.exports = androidExec;

});

// file: src/common/exec/proxy.js
define("cordova/exec/proxy", function(require, exports, module) {


// internal map of proxy function
var CommandProxyMap = {};

module.exports = {

    // example: cordova.commandProxy.add("Accelerometer",{getCurrentAcceleration: function(successCallback, errorCallback, options) {...},...);
    add:function(id,proxyObj) {
        console.log("adding proxy for " + id);
        CommandProxyMap[id] = proxyObj;
        return proxyObj;
    },

    // cordova.commandProxy.remove("Accelerometer");
    remove:function(id) {
        var proxy = CommandProxyMap[id];
        delete CommandProxyMap[id];
        CommandProxyMap[id] = null;
        return proxy;
    },

    get:function(service,action) {
        return ( CommandProxyMap[service] ? CommandProxyMap[service][action] : null );
    }
};
});

// file: src/common/init.js
define("cordova/init", function(require, exports, module) {

var channel = require('cordova/channel');
var cordova = require('cordova');
var modulemapper = require('cordova/modulemapper');
var platform = require('cordova/platform');
var pluginloader = require('cordova/pluginloader');

var platformInitChannelsArray = [channel.onNativeReady, channel.onPluginsReady];

function logUnfiredChannels(arr) {
    for (var i = 0; i < arr.length; ++i) {
        if (arr[i].state != 2) {
            console.log('Channel not fired: ' + arr[i].type);
        }
    }
}

window.setTimeout(function() {
    if (channel.onDeviceReady.state != 2) {
        console.log('deviceready has not fired after 5 seconds.');
        logUnfiredChannels(platformInitChannelsArray);
        logUnfiredChannels(channel.deviceReadyChannelsArray);
    }
}, 5000);

// Replace navigator before any modules are required(), to ensure it happens as soon as possible.
// We replace it so that properties that can't be clobbered can instead be overridden.
function replaceNavigator(origNavigator) {
    var CordovaNavigator = function() {};
    CordovaNavigator.prototype = origNavigator;
    var newNavigator = new CordovaNavigator();
    // This work-around really only applies to new APIs that are newer than Function.bind.
    // Without it, APIs such as getGamepads() break.
    if (CordovaNavigator.bind) {
        for (var key in origNavigator) {
            if (typeof origNavigator[key] == 'function') {
                newNavigator[key] = origNavigator[key].bind(origNavigator);
            }
        }
    }
    return newNavigator;
}
if (window.navigator) {
    window.navigator = replaceNavigator(window.navigator);
}

if (!window.console) {
    window.console = {
        log: function(){}
    };
}
if (!window.console.warn) {
    window.console.warn = function(msg) {
        this.log("warn: " + msg);
    };
}

// Register pause, resume and deviceready channels as events on document.
channel.onPause = cordova.addDocumentEventHandler('pause');
channel.onResume = cordova.addDocumentEventHandler('resume');
channel.onDeviceReady = cordova.addStickyDocumentEventHandler('deviceready');

// Listen for DOMContentLoaded and notify our channel subscribers.
if (document.readyState == 'complete' || document.readyState == 'interactive') {
    channel.onDOMContentLoaded.fire();
} else {
    document.addEventListener('DOMContentLoaded', function() {
        channel.onDOMContentLoaded.fire();
    }, false);
}

// _nativeReady is global variable that the native side can set
// to signify that the native code is ready. It is a global since
// it may be called before any cordova JS is ready.
if (window._nativeReady) {
    channel.onNativeReady.fire();
}

modulemapper.clobbers('cordova', 'cordova');
modulemapper.clobbers('cordova/exec', 'cordova.exec');
modulemapper.clobbers('cordova/exec', 'Cordova.exec');

// Call the platform-specific initialization.
platform.bootstrap && platform.bootstrap();

// Wrap in a setTimeout to support the use-case of having plugin JS appended to cordova.js.
// The delay allows the attached modules to be defined before the plugin loader looks for them.
setTimeout(function() {
    pluginloader.load(function() {
        channel.onPluginsReady.fire();
    });
}, 0);

/**
 * Create all cordova objects once native side is ready.
 */
channel.join(function() {
    modulemapper.mapModules(window);

    platform.initialize && platform.initialize();

    // Fire event to notify that all objects are created
    channel.onCordovaReady.fire();

    // Fire onDeviceReady event once page has fully loaded, all
    // constructors have run and cordova info has been received from native
    // side.
    channel.join(function() {
        var data = require('xFace/privateModule').appData();
        require('cordova').fireDocumentEvent('deviceready', {"data":data});
    }, channel.deviceReadyChannelsArray);

}, platformInitChannelsArray);


});

// file: src/common/modulemapper.js
define("cordova/modulemapper", function(require, exports, module) {

var builder = require('cordova/builder'),
    moduleMap = define.moduleMap,
    symbolList,
    deprecationMap;

exports.reset = function() {
    symbolList = [];
    deprecationMap = {};
};

function addEntry(strategy, moduleName, symbolPath, opt_deprecationMessage) {
    if (!(moduleName in moduleMap)) {
        throw new Error('Module ' + moduleName + ' does not exist.');
    }
    symbolList.push(strategy, moduleName, symbolPath);
    if (opt_deprecationMessage) {
        deprecationMap[symbolPath] = opt_deprecationMessage;
    }
}

// Note: Android 2.3 does have Function.bind().
exports.clobbers = function(moduleName, symbolPath, opt_deprecationMessage) {
    addEntry('c', moduleName, symbolPath, opt_deprecationMessage);
};

exports.merges = function(moduleName, symbolPath, opt_deprecationMessage) {
    addEntry('m', moduleName, symbolPath, opt_deprecationMessage);
};

exports.defaults = function(moduleName, symbolPath, opt_deprecationMessage) {
    addEntry('d', moduleName, symbolPath, opt_deprecationMessage);
};

exports.runs = function(moduleName) {
    addEntry('r', moduleName, null);
};

function prepareNamespace(symbolPath, context) {
    if (!symbolPath) {
        return context;
    }
    var parts = symbolPath.split('.');
    var cur = context;
    for (var i = 0, part; part = parts[i]; ++i) {
        cur = cur[part] = cur[part] || {};
    }
    return cur;
}

exports.mapModules = function(context) {
    var origSymbols = {};
    context.CDV_origSymbols = origSymbols;
    for (var i = 0, len = symbolList.length; i < len; i += 3) {
        var strategy = symbolList[i];
        var moduleName = symbolList[i + 1];
        var module = require(moduleName);
        // <runs/>
        if (strategy == 'r') {
            continue;
        }
        var symbolPath = symbolList[i + 2];
        var lastDot = symbolPath.lastIndexOf('.');
        var namespace = symbolPath.substr(0, lastDot);
        var lastName = symbolPath.substr(lastDot + 1);

        var deprecationMsg = symbolPath in deprecationMap ? 'Access made to deprecated symbol: ' + symbolPath + '. ' + deprecationMsg : null;
        var parentObj = prepareNamespace(namespace, context);
        var target = parentObj[lastName];

        if (strategy == 'm' && target) {
            builder.recursiveMerge(target, module);
        } else if ((strategy == 'd' && !target) || (strategy != 'd')) {
            if (!(symbolPath in origSymbols)) {
                origSymbols[symbolPath] = target;
            }
            builder.assignOrWrapInDeprecateGetter(parentObj, lastName, module, deprecationMsg);
        }
    }
};

exports.getOriginalSymbol = function(context, symbolPath) {
    var origSymbols = context.CDV_origSymbols;
    if (origSymbols && (symbolPath in origSymbols)) {
        return origSymbols[symbolPath];
    }
    var parts = symbolPath.split('.');
    var obj = context;
    for (var i = 0; i < parts.length; ++i) {
        obj = obj && obj[parts[i]];
    }
    return obj;
};

exports.reset();


});

// file: src/android/platform.js
define("cordova/platform", function(require, exports, module) {

module.exports = {
    id: 'android',
    bootstrap: function() {
        var channel = require('cordova/channel'),
            cordova = require('cordova'),
            exec = require('cordova/exec'),
            modulemapper = require('cordova/modulemapper');

        // Tell the native code that a page change has occurred.
        exec(null, null, 'PluginManager', 'startup', []);
        // Tell the JS that the native side is ready.
        channel.onNativeReady.fire();

        // TODO: Extract this as a proper plugin.
        modulemapper.clobbers('cordova/plugin/android/app', 'navigator.app');
        modulemapper.clobbers('xFace/xapp', 'xFace.app');

        // Inject a listener for the backbutton on the document.
        var backButtonChannel = cordova.addDocumentEventHandler('backbutton');
        backButtonChannel.onHasSubscribersChange = function() {
            // If we just attached the first handler or detached the last handler,
            // let native know we need to override the back button.
            exec(null, null, "App", "overrideBackbutton", [this.numHandlers == 1]);
        };

        // Add hardware MENU and SEARCH button handlers
        cordova.addDocumentEventHandler('menubutton');
        cordova.addDocumentEventHandler('searchbutton');
        /**
         * 当短信到来时，会触发该事件（Android）<br/>
         * @example
                function onMessageReceived(msgs) {
                    alert("短信长度：" + msgs.length);
                }
                document.addEventListener("messagereceived", onMessageReceived, false);
         * @event messagereceived
         * @for BaseEvent
         * @param {xFace.Message[]} msgs 接收到的短信的数组
         * @platform Android
         * @since 3.0.0
         */
        channel.onMsgReceived = cordova.addDocumentEventHandler('messagereceived');
        /**
         * 当电话呼入时，会触发该事件（Android）<br/>
         * @example
                function onCallReceived(callStatus) {
                    //callStatus是字符串需要转换成整形
                    var callStatus = parseInt(CallStatus);
                    switch(callStatus){
                    case 0:
                        alert("无状态(挂断)");
                        break;
                    case 1:
                        alert("电话呼入，响铃中");
                        break;
                    case 2:
                        alert("接听电话。。。。");
                        break;
                }
                document.addEventListener("callreceived", onCallReceived, false);
         * @event callreceived
         * @for BaseEvent
         * @param {String} CallStatus 接入状态信息.<br/>
         *            0：无状态 （挂断）<br/>
         *            1：电话拨入，响铃中<br/>
         *            2：接听中
         * @platform Android
         * @since 3.0.0
         */
        channel.onCallReceived = cordova.addDocumentEventHandler('callreceived');

        // Let native code know we are all done on the JS side.
        // Native code will then un-hide the WebView.
        channel.onCordovaReady.subscribe(function() {
            exec(null, null, "App", "show", []);
        });
    }
};

});

// file: src/android/plugin/android/app.js
define("cordova/plugin/android/app", function(require, exports, module) {

var exec = require('cordova/exec');

module.exports = {
    /**
    * Clear the resource cache.
    */
    clearCache:function() {
        exec(null, null, "App", "clearCache", []);
    },

    /**
    * Load the url into the webview or into new browser instance.
    *
    * @param url           The URL to load
    * @param props         Properties that can be passed in to the activity:
    *      wait: int                           => wait msec before loading URL
    *      loadingDialog: "Title,Message"      => display a native loading dialog
    *      loadUrlTimeoutValue: int            => time in msec to wait before triggering a timeout error
    *      clearHistory: boolean              => clear webview history (default=false)
    *      openExternal: boolean              => open in a new browser (default=false)
    *
    * Example:
    *      navigator.app.loadUrl("http://server/myapp/index.html", {wait:2000, loadingDialog:"Wait,Loading App", loadUrlTimeoutValue: 60000});
    */
    loadUrl:function(url, props) {
        exec(null, null, "App", "loadUrl", [url, props]);
    },

    /**
    * Cancel loadUrl that is waiting to be loaded.
    */
    cancelLoadUrl:function() {
        exec(null, null, "App", "cancelLoadUrl", []);
    },

    /**
    * Clear web history in this web view.
    * Instead of BACK button loading the previous web page, it will exit the app.
    */
    clearHistory:function() {
        exec(null, null, "App", "clearHistory", []);
    },

    /**
    * Go to previous page displayed.
    * This is the same as pressing the backbutton on Android device.
    */
    backHistory:function() {
        exec(null, null, "App", "backHistory", []);
    },

    /**
    * Override the default behavior of the Android back button.
    * If overridden, when the back button is pressed, the "backKeyDown" JavaScript event will be fired.
    *
    * Note: The user should not have to call this method.  Instead, when the user
    *       registers for the "backbutton" event, this is automatically done.
    *
    * @param override        T=override, F=cancel override
    */
    overrideBackbutton:function(override) {
        exec(null, null, "App", "overrideBackbutton", [override]);
    },

    /**
    * Exit and terminate the application.
    */
    exitApp:function() {
        return exec(null, null, "App", "exitApp", []);
    }
};

});

// file: src/android/plugin/privateModule.js
define("xFace/plugin/privateModule", function(require, exports, module) {

/*
 This file was modified from or inspired by Apache Cordova.

 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements. See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership. The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License. You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied. See the License for the
 specific language governing permissions and limitations
 under the License.
*/

var privateModule = function(){};

/**
* 该接口用于js调用native功能（没有返回值）
*/
privateModule.prototype.execCommand = function(type, args) {
    prompt(JSON.stringify(args), type);
};
module.exports = new privateModule();
});

// file: src/common/pluginloader.js
define("cordova/pluginloader", function(require, exports, module) {

var modulemapper = require('cordova/modulemapper');
var urlutil = require('cordova/urlutil');

// Helper function to inject a <script> tag.
// Exported for testing.
exports.injectScript = function(url, onload, onerror) {
    var script = document.createElement("script");
    // onload fires even when script fails loads with an error.
    script.onload = onload;
    // onerror fires for malformed URLs.
    script.onerror = onerror;
    script.src = url;
    document.head.appendChild(script);
};

function injectIfNecessary(id, url, onload, onerror) {
    onerror = onerror || onload;
    if (id in define.moduleMap) {
        onload();
    } else {
        exports.injectScript(url, function() {
            if (id in define.moduleMap) {
                onload();
            } else {
                onerror();
            }
        }, onerror);
    }
}

function onScriptLoadingComplete(moduleList, finishPluginLoading) {
    // Loop through all the plugins and then through their clobbers and merges.
    for (var i = 0, module; module = moduleList[i]; i++) {
        if (module.clobbers && module.clobbers.length) {
            for (var j = 0; j < module.clobbers.length; j++) {
                modulemapper.clobbers(module.id, module.clobbers[j]);
            }
        }

        if (module.merges && module.merges.length) {
            for (var k = 0; k < module.merges.length; k++) {
                modulemapper.merges(module.id, module.merges[k]);
            }
        }

        // Finally, if runs is truthy we want to simply require() the module.
        if (module.runs) {
            modulemapper.runs(module.id);
        }
    }

    finishPluginLoading();
}

// Handler for the cordova_plugins.js content.
// See plugman's plugin_loader.js for the details of this object.
// This function is only called if the really is a plugins array that isn't empty.
// Otherwise the onerror response handler will just call finishPluginLoading().
function handlePluginsObject(path, moduleList, finishPluginLoading) {
    // Now inject the scripts.
    var scriptCounter = moduleList.length;

    if (!scriptCounter) {
        finishPluginLoading();
        return;
    }
    function scriptLoadedCallback() {
        if (!--scriptCounter) {
            onScriptLoadingComplete(moduleList, finishPluginLoading);
        }
    }

    for (var i = 0; i < moduleList.length; i++) {
        injectIfNecessary(moduleList[i].id, path + moduleList[i].file, scriptLoadedCallback);
    }
}

function findCordovaPath() {
    var path = null;
    var scripts = document.getElementsByTagName('script');
    var term = 'xface.js';
    for (var n = scripts.length-1; n>-1; n--) {
        var src = scripts[n].src.replace(/\?.*$/, ''); // Strip any query param (CB-6007).
        if (src.indexOf(term) == (src.length - term.length)) {
            path = src.substring(0, src.length - term.length);

            if('ios' === require('cordova/platform').id){
                var index = path.indexOf('.app');
                if(-1 != index){
                    index = path.lastIndexOf('/', index);
                    path = path.substring(0, index) + '/Library/xface3/js_core/';
                }else if(-1 != path.indexOf('Documents')){
                    path = path.substring(0, path.indexOf('Documents')) + 'Library/xface3/js_core/';
                }else if(-1 != path.indexOf('Library')){
                    path = path.substring(0, path.indexOf('Library')) + 'Library/xface3/js_core/';
                }
            }
            break;
        }
    }
    return path;
}

// Tries to load all plugins' js-modules.
// This is an async process, but onDeviceReady is blocked on onPluginsReady.
// onPluginsReady is fired when there are no plugins to load, or they are all done.
exports.load = function(callback) {
    var pathPrefix = findCordovaPath();
    if (pathPrefix === null) {
        console.log('Could not find cordova.js script tag. Plugin loading may fail.');
        pathPrefix = '';
    }
    injectIfNecessary('cordova/plugin_list', pathPrefix + 'cordova_plugins.js', function() {
        var moduleList = require("cordova/plugin_list");
        handlePluginsObject(pathPrefix, moduleList, callback);
    }, callback);
};


});

// file: src/common/privateModule.js
define("xFace/privateModule", function(require, exports, module) {

/**
 * 该模块是私有模块，用于获取当前应用程序的ID等
 */
var channel = require('cordova/channel');
var currentAppId = null;        //当前应用ID
var appData = null;             //传递给应用的启动参数

var privateModule = function() {
};

/**
 * 由引擎初始化数据
 */
privateModule.prototype.initPrivateData = function(initData) {
    currentAppId = initData[0];
    appData = initData[1];
    channel.onPrivateDataReady.fire();
};

privateModule.prototype.appId = function() {
    return currentAppId;
};

privateModule.prototype.appData = function() {
    return appData;
};

module.exports = new privateModule();

});

// file: src/common/urlutil.js
define("cordova/urlutil", function(require, exports, module) {


/**
 * For already absolute URLs, returns what is passed in.
 * For relative URLs, converts them to absolute ones.
 */
exports.makeAbsolute = function makeAbsolute(url) {
    var anchorEl = document.createElement('a');
    anchorEl.href = url;
    return anchorEl.href;
};


});

// file: src/common/utils.js
define("cordova/utils", function(require, exports, module) {

var utils = exports;

/**
 * Defines a property getter / setter for obj[key].
 */
utils.defineGetterSetter = function(obj, key, getFunc, opt_setFunc) {
    if (Object.defineProperty) {
        var desc = {
            get: getFunc,
            configurable: true
        };
        if (opt_setFunc) {
            desc.set = opt_setFunc;
        }
        Object.defineProperty(obj, key, desc);
    } else {
        obj.__defineGetter__(key, getFunc);
        if (opt_setFunc) {
            obj.__defineSetter__(key, opt_setFunc);
        }
    }
};

/**
 * Defines a property getter for obj[key].
 */
utils.defineGetter = utils.defineGetterSetter;

utils.arrayIndexOf = function(a, item) {
    if (a.indexOf) {
        return a.indexOf(item);
    }
    var len = a.length;
    for (var i = 0; i < len; ++i) {
        if (a[i] == item) {
            return i;
        }
    }
    return -1;
};

/**
 * Returns whether the item was found in the array.
 */
utils.arrayRemove = function(a, item) {
    var index = utils.arrayIndexOf(a, item);
    if (index != -1) {
        a.splice(index, 1);
    }
    return index != -1;
};

utils.typeName = function(val) {
    return Object.prototype.toString.call(val).slice(8, -1);
};

/**
 * Returns an indication of whether the argument is an array or not
 */
utils.isArray = function(a) {
    return utils.typeName(a) == 'Array';
};

/**
 * Returns an indication of whether the argument is a Date or not
 */
utils.isDate = function(d) {
    return utils.typeName(d) == 'Date';
};

/**
 * Does a deep clone of the object.
 */
utils.clone = function(obj) {
    if(!obj || typeof obj == 'function' || utils.isDate(obj) || typeof obj != 'object') {
        return obj;
    }

    var retVal, i;

    if(utils.isArray(obj)){
        retVal = [];
        for(i = 0; i < obj.length; ++i){
            retVal.push(utils.clone(obj[i]));
        }
        return retVal;
    }

    retVal = {};
    for(i in obj){
        if(!(i in retVal) || retVal[i] != obj[i]) {
            retVal[i] = utils.clone(obj[i]);
        }
    }
    return retVal;
};

/**
 * Returns a wrapped version of the function
 */
utils.close = function(context, func, params) {
    if (typeof params == 'undefined') {
        return function() {
            return func.apply(context, arguments);
        };
    } else {
        return function() {
            return func.apply(context, params);
        };
    }
};

/**
 * Create a UUID
 */
utils.createUUID = function() {
    return UUIDcreatePart(4) + '-' +
        UUIDcreatePart(2) + '-' +
        UUIDcreatePart(2) + '-' +
        UUIDcreatePart(2) + '-' +
        UUIDcreatePart(6);
};

/**
 * Extends a child object from a parent object using classical inheritance
 * pattern.
 */
utils.extend = (function() {
    // proxy used to establish prototype chain
    var F = function() {};
    // extend Child from Parent
    return function(Child, Parent) {
        F.prototype = Parent.prototype;
        Child.prototype = new F();
        Child.__super__ = Parent.prototype;
        Child.prototype.constructor = Child;
    };
}());

/**
 * Alerts a message in any available way: alert or console.log.
 */
utils.alert = function(msg) {
    if (window.alert) {
        window.alert(msg);
    } else if (console && console.log) {
        console.log(msg);
    }
};


//------------------------------------------------------------------------------
function UUIDcreatePart(length) {
    var uuidpart = "";
    for (var i=0; i<length; i++) {
        var uuidchar = parseInt((Math.random() * 256), 10).toString(16);
        if (uuidchar.length == 1) {
            uuidchar = "0" + uuidchar;
        }
        uuidpart += uuidchar;
    }
    return uuidpart;
}


});

// file: src/xFace.js
define("xFace", function(require, exports, module) {

var xFace = require('cordova');
module.exports = xFace;
});

// file: src/common/xapp.js
define("xFace/xapp", function(require, exports, module) {

/*
 This file was modified from or inspired by Apache Cordova.

 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements. See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership. The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License. You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied. See the License for the
 specific language governing permissions and limitations
 under the License.
*/

/**
 * @module app
 */
var exec = require('cordova/exec');

var app =
{
    /**
     * 关闭当前应用app（Android, iOS, WP8）
     * 如果当前只有一个app,在android/WP8平台上则退出xFace;在iOS平台上由于系统限制不退出xFace!!
     * @example
            xFace.app.close();
     * @method close
     * @platform Android, iOS, WP8
     * @since 3.0.0
     */
    close:function() {
        require('xFace/plugin/privateModule').execCommand("xFace_close_application:", []);
    }
};
module.exports = app;

});

window.cordova = require('cordova');
window.xFace = require('xFace');
// file: src/scripts/bootstrap.js

require('cordova/init');

})();
cordova.define('cordova/plugin_list', function(require, exports, module) {
module.exports = [
    {
        "file": "plugins/com.polyvi.xface.extension.calendar/www/Calendar.js",
        "id": "com.polyvi.xface.extension.calendar.Calendar",
        "clobbers": [
            "xFace.ui.Calendar"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.media/www/MediaError.js",
        "id": "org.apache.cordova.media.MediaError",
        "clobbers": [
            "window.MediaError"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.media/www/Media.js",
        "id": "org.apache.cordova.media.Media",
        "clobbers": [
            "window.Media"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.inappbrowser/www/InAppBrowser.js",
        "id": "org.apache.cordova.inappbrowser.InAppBrowser",
        "clobbers": [
            "window.open"
        ]
    },
    {
        "file": "plugins/com.polyvi.xface.extension.ams/www/ams.js",
        "id": "com.polyvi.xface.extension.ams.AMS",
        "clobbers": [
            "xFace.AMS"
        ]
    },
    {
        "file": "plugins/com.polyvi.xface.extension.ams/www/AmsError.js",
        "id": "com.polyvi.xface.extension.ams.AmsError",
        "clobbers": [
            "AmsError"
        ]
    },
    {
        "file": "plugins/com.polyvi.xface.extension.ams/www/AmsOperationType.js",
        "id": "com.polyvi.xface.extension.ams.AmsOperationType",
        "clobbers": [
            "AmsOperationType"
        ]
    },
    {
        "file": "plugins/com.polyvi.xface.extension.ams/www/AmsState.js",
        "id": "com.polyvi.xface.extension.ams.AmsState",
        "clobbers": [
            "AmsState"
        ]
    },
    {
        "file": "plugins/com.polyvi.xface.extension.ams/www/app.js",
        "id": "com.polyvi.xface.extension.ams.app",
        "merges": [
            "xFace.app"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.media-capture/www/CaptureAudioOptions.js",
        "id": "org.apache.cordova.media-capture.CaptureAudioOptions",
        "clobbers": [
            "CaptureAudioOptions"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.media-capture/www/CaptureImageOptions.js",
        "id": "org.apache.cordova.media-capture.CaptureImageOptions",
        "clobbers": [
            "CaptureImageOptions"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.media-capture/www/CaptureVideoOptions.js",
        "id": "org.apache.cordova.media-capture.CaptureVideoOptions",
        "clobbers": [
            "CaptureVideoOptions"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.media-capture/www/CaptureError.js",
        "id": "org.apache.cordova.media-capture.CaptureError",
        "clobbers": [
            "CaptureError"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.media-capture/www/MediaFileData.js",
        "id": "org.apache.cordova.media-capture.MediaFileData",
        "clobbers": [
            "MediaFileData"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.media-capture/www/MediaFile.js",
        "id": "org.apache.cordova.media-capture.MediaFile",
        "clobbers": [
            "MediaFile"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.media-capture/www/capture.js",
        "id": "org.apache.cordova.media-capture.capture",
        "clobbers": [
            "navigator.device.capture"
        ]
    },
    {
        "file": "plugins/com.polyvi.xface.extension.xapp/www/android/xapp.js",
        "id": "com.polyvi.xface.extension.xapp.app",
        "merges": [
            "navigator.app"
        ]
    },
    {
        "file": "plugins/com.polyvi.xface.extension.xapp/www/android/SysComponent.js",
        "id": "com.polyvi.xface.extension.xapp.SysComponent",
        "clobbers": [
            "SysComponent"
        ]
    },
    {
        "file": "plugins/com.polyvi.xface.extension.advancedfiletransfer/www/AdvancedFileTransfer.js",
        "id": "com.polyvi.xface.extension.advancedfiletransfer.AdvancedFileTransfer",
        "clobbers": [
            "window.xFace.AdvancedFileTransfer"
        ]
    },
    {
        "file": "plugins/com.polyvi.xface.extension.advancedfiletransfer/www/android/AdvancedFileTransfer.js",
        "id": "com.polyvi.xface.extension.advancedfiletransfer.AdvancedFileTransfer_android",
        "merges": [
            "window.xFace.AdvancedFileTransfer"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.network-information/www/network.js",
        "id": "org.apache.cordova.network-information.network",
        "clobbers": [
            "navigator.connection",
            "navigator.network.connection"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.network-information/www/Connection.js",
        "id": "org.apache.cordova.network-information.Connection",
        "clobbers": [
            "Connection"
        ]
    },
    {
        "file": "plugins/com.polyvi.xface.extension.bluetooth/www/bluetooth.js",
        "id": "com.polyvi.xface.extension.bluetooth.bluetooth",
        "clobbers": [
            "navigator.bluetooth"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.battery-status/www/battery.js",
        "id": "org.apache.cordova.battery-status.battery",
        "clobbers": [
            "navigator.battery"
        ]
    },
    {
        "file": "plugins/com.polyvi.xface.extension.security/www/Security.js",
        "id": "com.polyvi.xface.extension.security.Security",
        "clobbers": [
            "xFace.Security"
        ]
    },
    {
        "file": "plugins/com.polyvi.xface.extension.security/www/SecurityOptions.js",
        "id": "com.polyvi.xface.extension.security.SecurityOptions",
        "clobbers": [
            "SecurityOptions"
        ]
    },
    {
        "file": "plugins/com.polyvi.xface.extension.security/www/StringEncodeType.js",
        "id": "com.polyvi.xface.extension.security.StringEncodeType",
        "clobbers": [
            "StringEncodeType"
        ]
    },
    {
        "file": "plugins/com.polyvi.xface.extension.telephony/www/android/Telephony.js",
        "id": "com.polyvi.xface.extension.telephony.Telephony",
        "clobbers": [
            "xFace.Telephony"
        ]
    },
    {
        "file": "plugins/com.polyvi.xface.extension.telephony/www/android/CallRecord.js",
        "id": "com.polyvi.xface.extension.telephony.CallRecord",
        "clobbers": [
            "xFace.Telephony.CallRecord"
        ]
    },
    {
        "file": "plugins/com.polyvi.xface.extension.telephony/www/android/CallRecordTypes.js",
        "id": "com.polyvi.xface.extension.telephony.CallRecordTypes",
        "clobbers": [
            "xFace.Telephony.CallRecordTypes"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.globalization/www/GlobalizationError.js",
        "id": "org.apache.cordova.globalization.GlobalizationError",
        "clobbers": [
            "window.GlobalizationError"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.globalization/www/globalization.js",
        "id": "org.apache.cordova.globalization.globalization",
        "clobbers": [
            "navigator.globalization"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.statusbar/www/statusbar.js",
        "id": "org.apache.cordova.statusbar.statusbar",
        "clobbers": [
            "window.StatusBar"
        ]
    },
    {
        "file": "plugins/com.polyvi.xface.extension.zip/www/Zip.js",
        "id": "com.polyvi.xface.extension.zip.Zip",
        "clobbers": [
            "window.xFace.Zip"
        ]
    },
    {
        "file": "plugins/com.polyvi.xface.extension.zip/www/ZipError.js",
        "id": "com.polyvi.xface.extension.zip.ZipError",
        "clobbers": [
            "ZipError"
        ]
    },
    {
        "file": "plugins/com.polyvi.xface.extension.zip/www/ZipOptions.js",
        "id": "com.polyvi.xface.extension.zip.ZipOptions",
        "clobbers": [
            "ZipOptions"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.splashscreen/www/splashscreen.js",
        "id": "org.apache.cordova.splashscreen.SplashScreen",
        "clobbers": [
            "navigator.splashscreen"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.camera/www/CameraConstants.js",
        "id": "org.apache.cordova.camera.Camera",
        "clobbers": [
            "Camera"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.camera/www/CameraPopoverOptions.js",
        "id": "org.apache.cordova.camera.CameraPopoverOptions",
        "clobbers": [
            "CameraPopoverOptions"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.camera/www/Camera.js",
        "id": "org.apache.cordova.camera.camera",
        "clobbers": [
            "navigator.camera"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.camera/www/CameraPopoverHandle.js",
        "id": "org.apache.cordova.camera.CameraPopoverHandle",
        "clobbers": [
            "CameraPopoverHandle"
        ]
    },
    {
        "file": "plugins/com.polyvi.xface.extension.trafficstats/www/TrafficStats.js",
        "id": "com.polyvi.xface.extension.trafficstats.TrafficStats",
        "clobbers": [
            "window.xFace.TrafficStats"
        ]
    },
    {
        "file": "plugins/com.polyvi.xface.extension.push/www/PushNotification.js",
        "id": "com.polyvi.xface.extension.push.PushNotification",
        "clobbers": [
            "xFace.PushNotification"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.device/www/device.js",
        "id": "org.apache.cordova.device.device",
        "clobbers": [
            "device"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.contacts/www/contacts.js",
        "id": "org.apache.cordova.contacts.contacts",
        "clobbers": [
            "navigator.contacts"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.contacts/www/Contact.js",
        "id": "org.apache.cordova.contacts.Contact",
        "clobbers": [
            "Contact"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.contacts/www/ContactAddress.js",
        "id": "org.apache.cordova.contacts.ContactAddress",
        "clobbers": [
            "ContactAddress"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.contacts/www/ContactError.js",
        "id": "org.apache.cordova.contacts.ContactError",
        "clobbers": [
            "ContactError"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.contacts/www/ContactField.js",
        "id": "org.apache.cordova.contacts.ContactField",
        "clobbers": [
            "ContactField"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.contacts/www/ContactFindOptions.js",
        "id": "org.apache.cordova.contacts.ContactFindOptions",
        "clobbers": [
            "ContactFindOptions"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.contacts/www/ContactName.js",
        "id": "org.apache.cordova.contacts.ContactName",
        "clobbers": [
            "ContactName"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.contacts/www/ContactOrganization.js",
        "id": "org.apache.cordova.contacts.ContactOrganization",
        "clobbers": [
            "ContactOrganization"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.contacts/www/android/contacts.js",
        "id": "org.apache.cordova.contacts.contacts-android",
        "merges": [
            "navigator.contacts"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.device-motion/www/Acceleration.js",
        "id": "org.apache.cordova.device-motion.Acceleration",
        "clobbers": [
            "Acceleration"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.device-motion/www/accelerometer.js",
        "id": "org.apache.cordova.device-motion.accelerometer",
        "clobbers": [
            "navigator.accelerometer"
        ]
    },
    {
        "file": "plugins/com.polyvi.xface.extension.zbar/www/BarcodeScanner.js",
        "id": "com.polyvi.xface.extension.zbar.Zbar",
        "clobbers": [
            "xFace.BarcodeScanner"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.device-orientation/www/CompassError.js",
        "id": "org.apache.cordova.device-orientation.CompassError",
        "clobbers": [
            "CompassError"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.device-orientation/www/CompassHeading.js",
        "id": "org.apache.cordova.device-orientation.CompassHeading",
        "clobbers": [
            "CompassHeading"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.device-orientation/www/compass.js",
        "id": "org.apache.cordova.device-orientation.compass",
        "clobbers": [
            "navigator.compass"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.dialogs/www/notification.js",
        "id": "org.apache.cordova.dialogs.notification",
        "merges": [
            "navigator.notification"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.dialogs/www/android/notification.js",
        "id": "org.apache.cordova.dialogs.notification_android",
        "merges": [
            "navigator.notification"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.geolocation/www/Coordinates.js",
        "id": "org.apache.cordova.geolocation.Coordinates",
        "clobbers": [
            "Coordinates"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.geolocation/www/PositionError.js",
        "id": "org.apache.cordova.geolocation.PositionError",
        "clobbers": [
            "PositionError"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.geolocation/www/Position.js",
        "id": "org.apache.cordova.geolocation.Position",
        "clobbers": [
            "Position"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.geolocation/www/geolocation.js",
        "id": "org.apache.cordova.geolocation.geolocation",
        "clobbers": [
            "navigator.geolocation"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.vibration/www/vibration.js",
        "id": "org.apache.cordova.vibration.notification",
        "merges": [
            "navigator.notification"
        ]
    },
    {
        "file": "plugins/com.polyvi.xface.extension.xmlhttprequest/www/XMLHttpRequest.js",
        "id": "com.polyvi.xface.extension.xmlhttprequest.XMLHttpRequest",
        "clobbers": [
            "window.xFace.XMLHttpRequest"
        ]
    },
    {
        "file": "plugins/com.polyvi.xface.extension.idlewatcher/www/idlewatcher.js",
        "id": "com.polyvi.xface.extension.idlewatcher.idlewatcher",
        "clobbers": [
            "window.xFace.IdleWatcher"
        ]
    },
    {
        "file": "plugins/com.polyvi.xface.extension.messaging/www/Message.js",
        "id": "com.polyvi.xface.extension.messaging.Message",
        "clobbers": [
            "xFace.Message"
        ]
    },
    {
        "file": "plugins/com.polyvi.xface.extension.messaging/www/MessageTypes.js",
        "id": "com.polyvi.xface.extension.messaging.MessageTypes",
        "clobbers": [
            "xFace.MessageTypes"
        ]
    },
    {
        "file": "plugins/com.polyvi.xface.extension.messaging/www/android/Messaging.js",
        "id": "com.polyvi.xface.extension.messaging.Messaging",
        "clobbers": [
            "xFace.Messaging"
        ]
    },
    {
        "file": "plugins/com.polyvi.xface.extension.messaging/www/android/MessageFolderTypes.js",
        "id": "com.polyvi.xface.extension.messaging.MessageFolderTypes",
        "clobbers": [
            "xFace.MessageFolderTypes"
        ]
    },
    {
        "file": "plugins/com.polyvi.xface.extension.device-capability/www/android/device-capability.js",
        "id": "com.polyvi.xface.extension.device-capability.device",
        "merges": [
            "device"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.file/www/DirectoryEntry.js",
        "id": "org.apache.cordova.file.DirectoryEntry",
        "clobbers": [
            "window.DirectoryEntry"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.file/www/DirectoryReader.js",
        "id": "org.apache.cordova.file.DirectoryReader",
        "clobbers": [
            "window.DirectoryReader"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.file/www/Entry.js",
        "id": "org.apache.cordova.file.Entry",
        "clobbers": [
            "window.Entry"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.file/www/File.js",
        "id": "org.apache.cordova.file.File",
        "clobbers": [
            "window.File"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.file/www/FileEntry.js",
        "id": "org.apache.cordova.file.FileEntry",
        "clobbers": [
            "window.FileEntry"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.file/www/FileError.js",
        "id": "org.apache.cordova.file.FileError",
        "clobbers": [
            "window.FileError"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.file/www/FileReader.js",
        "id": "org.apache.cordova.file.FileReader",
        "clobbers": [
            "window.FileReader"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.file/www/FileSystem.js",
        "id": "org.apache.cordova.file.FileSystem",
        "clobbers": [
            "window.FileSystem"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.file/www/FileUploadOptions.js",
        "id": "org.apache.cordova.file.FileUploadOptions",
        "clobbers": [
            "window.FileUploadOptions"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.file/www/FileUploadResult.js",
        "id": "org.apache.cordova.file.FileUploadResult",
        "clobbers": [
            "window.FileUploadResult"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.file/www/FileWriter.js",
        "id": "org.apache.cordova.file.FileWriter",
        "clobbers": [
            "window.FileWriter"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.file/www/Flags.js",
        "id": "org.apache.cordova.file.Flags",
        "clobbers": [
            "window.Flags"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.file/www/LocalFileSystem.js",
        "id": "org.apache.cordova.file.LocalFileSystem",
        "clobbers": [
            "window.LocalFileSystem"
        ],
        "merges": [
            "window"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.file/www/Metadata.js",
        "id": "org.apache.cordova.file.Metadata",
        "clobbers": [
            "window.Metadata"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.file/www/ProgressEvent.js",
        "id": "org.apache.cordova.file.ProgressEvent",
        "clobbers": [
            "window.ProgressEvent"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.file/www/requestFileSystem.js",
        "id": "org.apache.cordova.file.requestFileSystem",
        "clobbers": [
            "window.requestFileSystem"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.file/www/resolveLocalFileSystemURI.js",
        "id": "org.apache.cordova.file.resolveLocalFileSystemURI",
        "merges": [
            "window"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.file/www/android/FileSystem.js",
        "id": "org.apache.cordova.file.androidFileSystem",
        "merges": [
            "window.FileSystem"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.file-transfer/www/FileTransferError.js",
        "id": "org.apache.cordova.file-transfer.FileTransferError",
        "clobbers": [
            "window.FileTransferError"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.file-transfer/www/FileTransfer.js",
        "id": "org.apache.cordova.file-transfer.FileTransfer",
        "clobbers": [
            "window.FileTransfer"
        ]
    }
];
module.exports.metadata = 
// TOP OF METADATA
{
    "com.polyvi.xface.extra.player": "1.0.1",
    "com.polyvi.xface.extension.calendar": "1.0.1",
    "org.apache.cordova.media": "0.2.8",
    "org.apache.cordova.inappbrowser": "0.3.3",
    "com.polyvi.xface.extension.ams": "1.0.3",
    "org.apache.cordova.media-capture": "0.2.7-dev",
    "com.polyvi.xface.extension.xapp": "1.0.4",
    "com.polyvi.xface.extension.advancedfiletransfer": "1.0.4",
    "org.apache.cordova.network-information": "0.2.7",
    "com.polyvi.xface.extension.bluetooth": "1.0.1",
    "org.apache.cordova.battery-status": "0.2.7",
    "com.polyvi.xface.extension.security": "1.0.3",
    "com.polyvi.xface.extension.telephony": "1.0.3",
    "org.apache.cordova.globalization": "0.2.6",
    "org.apache.cordova.statusbar": "0.1.5",
    "com.polyvi.xface.extension.zip": "1.0.3",
    "org.apache.cordova.splashscreen": "0.2.8",
    "org.apache.cordova.camera": "0.2.9",
    "com.polyvi.xface.extension.trafficstats": "1.0.1",
    "org.apache.cordova.console": "0.2.7",
    "com.polyvi.xface.extension.push": "1.0.2",
    "org.apache.cordova.device": "0.2.8",
    "org.apache.cordova.contacts": "0.2.10",
    "org.apache.cordova.device-motion": "0.2.5",
    "com.polyvi.xface.extension.zbar": "1.0.2",
    "org.apache.cordova.device-orientation": "0.3.5",
    "org.apache.cordova.dialogs": "0.2.5",
    "org.apache.cordova.geolocation": "0.3.5",
    "org.apache.cordova.vibration": "0.3.6",
    "com.polyvi.xface.extension.umeng": "1.0.2",
    "com.polyvi.xface.extension.xmlhttprequest": "1.0.1",
    "com.polyvi.xface.extra.native-app": "1.0.1",
    "com.polyvi.xface.extension.idlewatcher": "1.0.1",
    "com.polyvi.xface.extension.messaging": "1.0.4",
    "com.polyvi.xface.extension.device-capability": "1.0.1",
    "org.apache.cordova.file": "1.0.2",
    "org.apache.cordova.file-transfer": "0.4.3"
}
// BOTTOM OF METADATA
});
cordova.define("com.polyvi.xface.extension.advancedfiletransfer.AdvancedFileTransfer", function(require, exports, module) { /*
 Copyright 2012-2013, Polyvi Inc. (http://www.xface3.com)
 This program is distributed under the terms of the GNU General Public License.

 This file is part of xFace.

 xFace is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 xFace is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with xFace.  If not, see <http://www.gnu.org/licenses/>.
 */
/**
 * 该模块定义普通文件传输和高级文件传输（断点下载与上传）相关的一些功能。
 * @module fileTransfer
 * @main   fileTransfer
 */
var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec');

/**
 * 提供高级文件传输（断点下载与上传），暂停，取消等功能（Android，iOS，WP8）<br/>
 * @example
        var uploadUrl = "http://polyvi.net:8091/mi/UploadServer";
        var downloadUrl = "http://apollo.polyvi.com/develop/TestFileTransfer/test.exe";
        var fileTransfer1 = new xFace.AdvancedFileTransfer(downloadUrl, "test.exe");//构造下载对象
        var fileTransfer2 = new xFace.AdvancedFileTransfer(downloadUrl, "test.exe", false);//构造下载对象
        var fileTransfer3 = new xFace.AdvancedFileTransfer("test_upload2.rar", uploadUrl, true); //构造上传对象
 * @param {String} source 文件传输的源文件地址（下载时为服务器地址，上传时为本地地址）<br/>
 *        上传的本地文件路径支持的类型：<br/>
 *          1.相对路径，例如："myPath/test.txt"，则默认在app的workspace下<br/>
 *          2.全路径，例如："/myPath/..."<br/>
 *          3.file://协议URL，例如："file:///myPath/..."<br/>
 *          4.通过{{#crossLink "File"}}{{/crossLink}}扩展获取的URL，参见{{#crossLink "Entry/toURL"}}{{/crossLink}}
 * @param {String} target 文件传输的目标地址（下载时为本地地址（可以为工作目录也可以指定其他路径，其他路径用file://头标示），上传时为服务器地址）<br/>
 *        下载的本地文件路径支持的类型：<br/>
 *          1.相对路径，例如："myPath/test.txt"，则默认在app的workspace下<br/>
 *          2.全路径，例如："/myPath/..."<br/>
 *          3.file://协议URL，例如："file:///myPath/..."<br/>
 *          4.通过{{#crossLink "File"}}{{/crossLink}}扩展获取的URL，参见{{#crossLink "Entry/toURL"}}{{/crossLink}}
 * @param {boolean} [isUpload=false] 标识是上传还是下载（默认为false，即默认为下载，iOS，WP8目前还不支持上传）
 * @class AdvancedFileTransfer
 * @namespace xFace
 * @constructor
 * @since 3.0.0
 * @platform Android, iOS
 */
var AdvancedFileTransfer = function(source, target, isUpload) {
    argscheck.checkArgs('ssB', 'AdvancedFileTransfer.AdvancedFileTransfer', arguments);
    this.source = source;
    this.target = target;
    this.isUpload = isUpload || false;
    /**
    * 用于接收文件传输的进度通知，该回调函数包含一个类型为Object的参数，该参数包含以下属性：（Android，iOS）<br/>
    * loaded: 已经传输的文件块大小<br/>
    * total: 要传输的文件总大小
    * @property onprogress
    * @type Function
    * @platform Android, iOS，WP8
    * @since 3.0.0
    */
    this.onprogress = null;     // While download the file, and reporting partial download data
};

/**
 * 下载一个文件到指定的路径(Android, iOS，WP8)<br/>
 * 下载过程中会通过onprogress属性更新文件传输进度。
 * @example
        var downloadUrl = "http://apollo.polyvi.com/develop/TestFileTransfer/test.exe";
        var fileTransfer = new xFace.AdvancedFileTransfer(downloadUrl, "test.exe", false);
        fileTransfer.download(success, fail);
        fileTransfer.onprogress = function(evt){
            var progress  = evt.loaded / evt.total;
        };
        function success(entry) {
            alert("success");
            alert(entry.isDirectory);
            alert(entry.isFile);
            alert(entry.name);
            alert(entry.fullPath);
        }
        function fail(error) {
            alert(error.code);
            alert(error.source);
            alert(error.target);
        }
 * @method download
 * @param {Function} [successCallback] 成功回调函数
 * @param {FileEntry} successCallback.fileEntry 成功回调返回下载得到的文件的{{#crossLink "FileEntry"}}{{/crossLink}}对象
 * @param {Function} [errorCallback]   失败回调函数
 * @param {Object} errorCallback.errorInfo 失败回调返回的参数
 * @param {Number} errorCallback.errorInfo.code 错误码（在<a href="FileTransferError.html">FileTransferError</a>中定义）
 * @param {String} errorCallback.errorInfo.source 下载源地址
 * @param {String} errorCallback.errorInfo.target 下载目标地址
 * @platform Android, iOS，WP8
 * @since 3.0.0
 */
AdvancedFileTransfer.prototype.download = function(successCallback, errorCallback) {
    argscheck.checkArgs('FF', 'AdvancedFileTransfer.download', arguments);
    var me = this;
    var win = function(result) {
         if (typeof result.total != "undefined") {
               if (typeof me.onprogress === "function") {
               me.onprogress(new ProgressEvent("progress", {loaded:result.loaded, total:result.total}));
               }
         } else if (successCallback) {
            var entry = null;
            if (result.isDirectory) {
                entry = new (require('org.apache.cordova.file.DirectoryEntry'))();
            }
            else if (result.isFile) {
                entry = new (require('org.apache.cordova.file.FileEntry'))();
            }
            entry.isDirectory = result.isDirectory;
            entry.isFile = result.isFile;
            entry.name = result.name;
            entry.fullPath = result.fullPath;
            entry.filesystem = new FileSystem(result.filesystemName);
            entry.nativeURL = result.nativeURL;
            successCallback(entry);
        }
    };

    exec(win, errorCallback, 'AdvancedFileTransfer', 'download', [this.source, this.target]);
};

/**
*  暂停文件传输操作（上传/下载）（Android, iOS，WP8）<br/>
*  @example
        //构造下载对象，先调用下载接口，然后调用暂停接口暂停下载
        var downloadUrl = "http://apollo.polyvi.com/develop/TestFileTransfer/test.exe";
        var fileTransfer1 = new xFace.AdvancedFileTransfer(downloadUrl, "test.exe", false);
        fileTransfer1.download(success, fail);
        fileTransfer1.onprogress = function(evt){
            var progress  = evt.loaded / evt.total;
        };
        fileTransfer1.pause();
        //构造上传对象，先调用上传接口，然后调用暂停接口暂停上传。
        var uploadUrl = "http://polyvi.net:8091/mi/UploadServer";
        var fileTransfer2 = new xFace.AdvancedFileTransfer("test_upload2.rar",uploadUrl,true);
        fileTransfer2.upload(success, fail);
        fileTransfer2.onprogress = function(evt){
            var progress  = evt.loaded / evt.total;
        };
        fileTransfer2.pause();
        function success() {
            alert("success");
            alert(entry.isDirectory);
            alert(entry.isFile);
            alert(entry.name);
            alert(entry.fullPath);
        }
        function fail(error) {
            alert(error.code);
            alert(error.source);
            alert(error.target);
        }
*  @method pause
*  @platform Android, iOS，WP8
*  @since 3.0.0
*/
AdvancedFileTransfer.prototype.pause = function() {
    exec(null, null, 'AdvancedFileTransfer', 'pause', [this.source]);
};

/**
*  取消文件的传输操作（上传/下载），相应的临时文件也会被删除（Android, iOS，WP8）<br/>
*  @example
        //构造下载对象，先调用下载接口，然后调用取消接口取消下载。
        var downloadUrl = "http://apollo.polyvi.com/develop/TestFileTransfer/test.exe";
        var fileTransfer1 = new xFace.AdvancedFileTransfer(downloadUrl, "test.exe", false);
        fileTransfer1.download(success, fail);
        fileTransfer1.onprogress = function(evt){
            var progress  = evt.loaded / evt.total;
        };
        fileTransfer1.onprogress = function(evt){
            var progress  = evt.loaded / evt.total;
        };
        fileTransfer1.cancel();
        //构造上传对象，先调用上传接口，然后调用取消接口取消上传。
        var uploadUrl = "http://polyvi.net:8091/mi/UploadServer";
        var fileTransfer2 = new xFace.AdvancedFileTransfer("test_upload2.rar",uploadUrl,true);
        fileTransfer2.upload(success, fail)
        fileTransfer2.onprogress = function(evt){
            var progress  = evt.loaded / evt.total;
        };
        fileTransfer2.cancel();
        function success() {
            alert(entry.isDirectory);
            alert(entry.isFile);
            alert(entry.name);
            alert(entry.fullPath);
        }
        function fail(error) {
            alert(error.code);
            alert(error.source);
            alert(error.target);
        }
*  @method cancel
*  @platform Android, iOS，WP8
*  @since 3.0.0
*/
AdvancedFileTransfer.prototype.cancel = function() {
    exec(null, null, 'AdvancedFileTransfer', 'cancel', [this.source, this.target, this.isUpload]);
};

module.exports = AdvancedFileTransfer;

});

cordova.define("com.polyvi.xface.extension.advancedfiletransfer.AdvancedFileTransfer_android", function(require, exports, module) { 
/*
 This file was modified from or inspired by Apache Cordova.

 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements. See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership. The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License. You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied. See the License for the
 specific language governing permissions and limitations
 under the License.
*/

/**
* @module fileTransfer
*/

var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec');

module.exports = {

/**
 * 上传一个文件到指定的路径(Android)<br/>
 * 下载过程中会通过onprogress属性更新文件传输进度
 * @example
        var uploadUrl = "http://polyvi.net:8091/mi/UploadServer";
        var fileTransfer = new xFace.AdvancedFileTransfer("test_upload2.rar",uploadUrl,true);
        fileTransfer.upload(successCallback, errorCallback);
        function success(entry) {
            alert(entry.isDirectory);
            alert(entry.isFile);
            alert(entry.name);
            alert(entry.fullPath);
        }
        function fail(error) {
            alert(error.code);
            alert(error.source);
            alert(error.target);
        }
 * @method upload
 * @param {Function} [successCallback] 成功回调函数
 * @param {FileEntry} successCallback.fileEntry 成功回调返回下载得到的文件的{{#crossLink "FileEntry"}}{{/crossLink}}对象
 * @param {Function} [errorCallback] 失败回调函数
 * @param {Object} errorCallback.errorInfo 失败回调返回的参数
 * @param {Number} errorCallback.errorInfo.code 错误码（在<a href="FileTransferError.html">FileTransferError</a>中定义）
 * @param {String} errorCallback.errorInfo.source 上传源地址
 * @param {String} errorCallback.errorInfo.target 上传目标地址
 * @for xFace.AdvancedFileTransfer
 * @platform Android
 * @since 3.0.0
 */
upload : function(successCallback, errorCallback) {
    argscheck.checkArgs('FF', 'AdvancedFileTransfer.upload', arguments);

    exec(successCallback, errorCallback, 'AdvancedFileTransfer', 'upload', [this.source, this.target]);
}

};
});

cordova.define("com.polyvi.xface.extension.ams.AmsError", function(require, exports, module) { /*
 Copyright 2012-2013, Polyvi Inc. (http://www.xface3.com)
 This program is distributed under the terms of the GNU General Public License.

 This file is part of xFace.

 xFace is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 xFace is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with xFace.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @module ams
 */

/**
 * 该类定义了AMS的错误码，相关用法参考{{#crossLink "AMS"}}{{/crossLink}} （Android, iOS, WP8）<br/>
 * @class AmsError
 * @static
 * @platform Android,iOS,WP8
 * @since 3.0.0
 */
function AmsError(error) {
 /**
  * 应用操作的错误码，用于表示具体的应用操作的错误(Android, iOS, WP8)<br/>
  * 其取值范围参考{{#crossLink "AmsError"}}{{/crossLink}}中定义的常量
  * @example
        function errorCallback(amsError) {
            if( amsError.code == AmsError.NO_SRC_PACKAGE) {
                print("Package does not exist");
            }
        }
  * @property code
  * @type Number
  * @platform Android, iOS, WP8
  * @since 3.0.0
  */
  this.code = error || null;
}

// ams error codes

/**
 * 应用安装包不存在
 * @property NO_SRC_PACKAGE
 * @type Number
 * @final
 * @platform Android,iOS,WP8
 * @since 3.0.0
 */
AmsError.NO_SRC_PACKAGE = 1;

/**
 * 应用已经存在
 * @property APP_ALREADY_EXISTED
 * @type Number
 * @final
 * @platform Android,iOS,WP8
 * @since 3.0.0
 */
AmsError.APP_ALREADY_EXISTED =  2;

/**
 * IO异常错误
 * @property IO_ERROR
 * @type Number
 * @final
 * @platform Android,iOS,WP8
 * @since 3.0.0
 */

AmsError.IO_ERROR = 3;
/**
 * 用于标识没有找到待操作的目标应用
 * @property NO_TARGET_APP
 * @type Number
 * @final
 * @platform Android,iOS,WP8
 * @since 3.0.0
 */
AmsError.NO_TARGET_APP = 4;
/**
 * 应用包中的配置文件不存在
 * @property NO_APP_CONFIG_FILE
 * @type Number
 * @final
 * @platform Android,iOS,WP8
 * @since 3.0.0
 */
AmsError.NO_APP_CONFIG_FILE = 5;

/**
 * 启动的应用不存在
 * @property APP_NOT_FOUND
 * @type Number
 * @final
 * @platform Android,iOS,WP8
 * @since 3.1.0
 */
AmsError.APP_NOT_FOUND = 7;
/**
 * 应用已经启动
 * @property APP_ALREADY_RUNNING
 * @type Number
 * @final
 * @platform Android,iOS,WP8
 * @since 3.1.0
 */
AmsError.APP_ALREADY_RUNNING = 8;
/**
 * 应用入口错误
 * @property APP_ENTRY_ERR
 * @type Number
 * @final
 * @platform Android,iOS,WP8
 * @since 3.1.0
 */
AmsError.APP_ENTRY_ERR = 9;
/**
 * 启动native应用错误
 * @property START_NATIVE_APP_ERR
 * @type Number
 * @final
 * @platform Android,iOS,WP8
 * @since 3.1.0
 */
AmsError.START_NATIVE_APP_ERR = 10;
/**
 * 未知错误
 * @property UNKNOWN
 * @type Number
 * @final
 * @platform Android,iOS,WP8
 * @since 3.0.0
 */
AmsError.UNKNOWN = 11;

module.exports = AmsError;
});

cordova.define("com.polyvi.xface.extension.ams.AmsOperationType", function(require, exports, module) { /*
 Copyright 2012-2013, Polyvi Inc. (http://www.xface3.com)
 This program is distributed under the terms of the GNU General Public License.

 This file is part of xFace.

 xFace is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 xFace is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with xFace.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @module ams
 */

/**
 * 该类定义了AMS的操作类型，相关用法参考{{#crossLink "AMS"}}{{/crossLink}} （Android, iOS, WP8）<br/>
 * @class AmsOperationType
 * @static
 * @platform Android,iOS,WP8
 * @since 3.0.0
 */
function AmsOperationType(type) {
 /**
  * AMS的操作类型，用于表示当前操作类型(Android, iOS, WP8)<br/>
  * 其取值范围参考{{#crossLink "AmsOperationType"}}{{/crossLink}}中定义的常量
  * @example
        function errorCallback(error) {
            if( error.type == AmsOperationType.INSTALL) {
                console.log("Package install operation error!");
            }
        }
  * @property type
  * @type Number
  * @platform Android, iOS, WP8
  * @since 3.0.0
  */
  this.type = type || null;
}

// ams error codes

/**
 * 应用安装操作
 * @property INSTALL
 * @type Number
 * @final
 * @platform Android,iOS,WP8
 * @since 3.0.0
 */
AmsOperationType.INSTALL = 1;

/**
 * 应用更新操作
 * @property UPDATE
 * @type Number
 * @final
 * @platform Android,iOS,WP8
 * @since 3.0.0
 */
AmsOperationType.UPDATE =  2;

/**
 * 应用卸载操作
 * @property UNINSTALL
 * @type Number
 * @final
 * @platform Android,iOS,WP8
 * @since 3.0.0
 */

AmsOperationType.UNINSTALL = 3;

module.exports = AmsOperationType;
});

cordova.define("com.polyvi.xface.extension.ams.AmsState", function(require, exports, module) { /*
 Copyright 2012-2013, Polyvi Inc. (http://www.xface3.com)
 This program is distributed under the terms of the GNU General Public License.

 This file is part of xFace.

 xFace is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 xFace is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with xFace.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @module ams
 */

/**
 * 该类定义了AMS在安装过程的状态信息，相关用法参考{{#crossLink "AMS"}}{{/crossLink}}（Android, iOS, WP8）<br/>
 * @class AmsState
 * @static
 * @platform Android,iOS,WP8
 * @since 3.0.0
 */
function AmsState(state) {
/**
 * 安装的状态码，用于表示具体应用安装的状态(Android, iOS, WP8)<br/>
 * 其取值范围参考{{#crossLink "AmsState"}}{{/crossLink}}中定义的常量
 * @example
        function stateChange(amsstate) {
            if( amsstate.code ==AmsState.INSTALL_INSTALLING) {
            print("the application is installing");
            }
        }
 * @property code
 * @type Number
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
  this.code = state || null;
}
/**
 * 安装初始化
 * @property INSTALL_INITIALIZE
 * @type Number
 * @final
 * @platform Android,iOS,WP8
 * @since 3.0.0
 */
AmsState.INSTALL_INITIALIZE          = 0;
/**
 * 应用正在安装
 * @property INSTALL_INSTALLING
 * @type Number
 * @final
 * @platform Android,iOS,WP8
 * @since 3.0.0
 */
AmsState.INSTALL_INSTALLING          = 1;
/**
 * 正在写配置文件
 * @property INSTALL_WRITE_CONFIGURATION
 * @type Number
 * @final
 * @platform Android,iOS,WP8
 * @since 3.0.0
 */
AmsState.INSTALL_WRITE_CONFIGURATION = 2;
/**
 * 应用安装完成
 * @property INSTALL_FINISHED
 * @type Number
 * @final
 * @platform Android,iOS,WP8
 * @since 3.0.0
 */
AmsState.INSTALL_FINISHED            =  3;

module.exports = AmsState;
});

cordova.define("com.polyvi.xface.extension.ams.AMS", function(require, exports, module) { 
/*
 Copyright 2012-2013, Polyvi Inc. (http://www.xface3.com)
 This program is distributed under the terms of the GNU General Public License.

 This file is part of xFace.

 xFace is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 xFace is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with xFace.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
  *该模块定义了xFace应用相关的一系列操作，包括应用的安装，运行，卸载，更新等
  *@module ams
  *@main
  */


/**
  * 该类定义了xFace应用管理的基础api，包括应用的安装、卸载、启动、关闭、更新等（Android, iOS, WP8）<br/>
  * 该类不能通过new来创建相应的对象，可以通过xFace.AMS来直接使用该类中定义的方法
  * @class AMS
  * @platform Android, iOS, WP8
  * @since 3.0.0
  */
var exec = require('cordova/exec');
var argscheck = require('cordova/argscheck');
var AMS = function(){
};

/**
 * 安装一个app（Android, iOS, WP8）
 * @example
        function successCallback(info) {
            console.log(info.appid);
            console.log(info.type);
        };

        function errorCallback(error) {
            console.log(error.appid);
            console.log(error.type);
            console.log(error.errorcode);
        };

        function statusChanged(status) {
            if (AmsState.INSTALL_INSTALLING == status.progress) {
                console.log("installing...");
            }

            if (AmsState.INSTALL_FINISHED == status.progress) {
                console.log("install was done!");
            }
        };

        xFace.AMS.installApplication ("geolocation.zip",successCallback，errorCallback, statusChanged);
 * @method installApplication
 * @param {String} packagePath              app安装包路径,支持以下形式<br/>：
 *          1.相对app workspace的相对路径，例如："myPath/test.zip"<br/>
 *          2.以“/”开头的绝对路径，例如："/myPath/..."<br/>
 *          3.file://协议URL，例如："file:///myPath/..."<br/>
 *          4.通过{{#crossLink "File"}}{{/crossLink}}扩展获取的URL，参见{{#crossLink "Entry/toURL"}}{{/crossLink}}
 * @param {Function} [successCallback]        成功时的回调函数
 * @param {Object} successCallback.info   与app相关信息object,每个object包含如下属性：
 * @param {Number} successCallback.info.type   操作类型,具体类型参考<a href="../classes/AmsOperationType.html" class="crosslink">AmsOperationType</a>
 * @param {String} successCallback.info.appid  app的id号
 * @param {Function} [errorCallback]          失败时的回调函数
 * @param {Object} errorCallback.error   包含错误信息的对象，每个object包含如下属性：
 * @param {Number} errorCallback.error.type  发生错误的ams操作类型,具体类型参考<a href="../classes/AmsOperationType.html" class="crosslink">AmsOperationType</a>
 * @param {String} errorCallback.error.appid  发生错误的app的id号
 * @param {Number} errorCallback.error.errorcode  错误码，具体错误码参考<a href="../classes/AmsError.html" class="crosslink">AmsError</a>
 * @param {Function} [statusChangedCallback]  安装过程的状态回调函数
 * @param {Object} statusChangedCallback.status 安装过程状态，包含如下属性:
 * @param {Number} statusChangedCallback.status.type 指示当前状态是install，uninstall，或update，参考{{#crossLink "AmsOperationType"}}{{/crossLink}}
 * @param {Number} statusChangedCallback.status.progress 安装过程状态码，具体值可参考{{#crossLink "AmsState"}}{{/crossLink}}
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
AMS.prototype.installApplication = function( packagePath, successCallback, errorCallback, statusChangedCallback)
{
   argscheck.checkArgs('sFFF', 'AMS.installApplication', arguments);
   if(!packagePath || typeof packagePath  != "string"){
        if(typeof errorCallback === "function") {
            errorCallback();
        }
        return;
    }
    var win = function(result) {
        if(typeof result.progress != "undefined") {
            statusChangedCallback(result);
        }
        else {
            successCallback(result);
        }
    }
    exec(win, errorCallback, "AMS", "installApplication",[packagePath]);
};

/**
 * 卸载app（Android, iOS, WP8）
 * @example
        function successCallback(info){
            console.log(info.appid);
            console.log(info.type);
        };
        function errorCallback(error){
            console.log(error.appid);
            console.log(error.type);
            console.log(error.errorcode);
        };
        xFace.AMS.uninstallApplication ("appId",successCallback，errorCallback);
 * @method uninstallApplication
 * @param {String} appId                    用于标识待卸载app的id
 * @param {Function} [successCallback]         卸载成功时的回调函数
 * @param {Object}  successCallback.info   与app相关信息object,每个object包含如下属性：
 * @param {Number}  successCallback.info.type   操作类型,具体类型参考<a href="../classes/AmsOperationType.html" class="crosslink">AmsOperationType</a>
 * @param {String}  successCallback.info.appid  app的id号
 * @param {Function} [errorCallback]          卸载失败时的回调函数
 * @param {Object}  errorCallback.error      包含错误信息的对象，每个object包含如下属性：
 * @param {Number}  errorCallback.error.type  发生错误的ams操作类型,具体类型参考<a href="../classes/AmsOperationType.html" class="crosslink">AmsOperationType</a>
 * @param {String}  errorCallback.error.appid  发生错误的app的id号
 * @param {Object}  errorCallback.error.errorcode  错误码，具体错误码参考<a href="../classes/AmsError.html" class="crosslink">AmsError</a>
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
AMS.prototype.uninstallApplication = function( appId, successCallback, errorCallback)
{
   argscheck.checkArgs('sFF', 'AMS.uninstallApplication', arguments);
   if(!appId || typeof appId  != "string"){
        if(typeof errorCallback === "function") {
            errorCallback();
        }
        return;
    }
    exec(successCallback, errorCallback, "AMS", "uninstallApplication",[appId]);
};

/**
 * 启动app（Android, iOS, WP8）
 * @example
        function successCallback(info){
            console.log(info.appid);
        };
        function errorCallback(error){
            console.log(error.appid);
            if( error.errorcode == AmsError.APP_ALREADY_RUNNING) {
                console.log("APP_ALREADY_RUNNING");
            }
        };
        if(isAndroid()){
            xFace.AMS.startApplication("appId", successCallback, errorCallback, "Admin;123");
        }
        if(isIOS()){
            xFace.AMS.startApplication("TodoListAppId", successCallback, errorCallback, "www.acme.com?Quarterly%20Report#200806231300");
        }
 * @method startApplication
 * @param {String} appId                    用于标识待启动app的id
 * @param {Function} [successCallback]        成功时的回调函数
 * @param {Object}  successCallback.info   与app相关信息object,每个object包含如下属性：
 * @param {String}  successCallback.info.appid  app的id号
 * @param {Function} [errorCallback]          失败时的回调函数
 * @param {Object}  errorCallback.error     包含错误信息的对象，每个object包含如下属性:
 * @param {String}  errorCallback.error.appid  发生错误的app的id号
 * @param {String}  errorCallback.error.errorcode  错误码，具体错误码参考<a href="../classes/AmsError.html" class="crosslink">AmsError</a>
 * @param {String}  [params] 程序启动参数，默认值为空 <br /> <a href="http://developer.apple.com/library/ios/#documentation/iPhone/Conceptual/iPhoneOSProgrammingGuide/AdvancedAppTricks/AdvancedAppTricks.html" class="crosslink">iOS: 请参考Custom URL Schemes</a>
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
AMS.prototype.startApplication = function(appId, successCallback, errorCallback, params)
{
    argscheck.checkArgs('s**S', 'AMS.startApplication', arguments);
    //appId check
    if(!appId || typeof appId  != "string"){
        if(typeof errorCallback === "function") {
            errorCallback("noId");
        }
        return;
    }
    var temp = arguments[1];

    //params check 1
    if( arguments.length == 2 && typeof arguments[1] === "string")
    {
        successCallback = null;
        errorCallback = null;
        params = temp;
    }

    //params check 2
    if(params === null || params === undefined)
    {
        params = "";
    }


    exec(successCallback, errorCallback, "AMS", "startApplication",[appId,params]);
};

/**
 * 列出系统已经安装的app列表（Android, iOS, WP8）
 * @example
         function successCallback(apps) {
            var count = apps.length;
            alert(count + " InstalledApps.");
            for(var i = 0; i < count; i++) {
                console.log(apps[i].appid);
                console.log(apps[i].name);
                console.log(apps[i].icon);
                console.log(apps[i].icon_background_color);
                console.log(apps[i].version);
                console.log(apps[i].type);
            }
        };
        function errorCallback() {
            alert("list fail!");
        };
       xFace.AMS.listInstalledApplications(successCallback，errorCallback);
 * @method listInstalledApplications
 * @param {Function} successCallback       获取列表成功时的回调函数
 * @param {Array}  successCallback.app 包含当前已经安装的app列表，每个app对象包含如下属性,
 * @param {String} successCallback.app.appid App的唯一id
 * @param {String} successCallback.app.name  App的名字
 * @param {String} successCallback.app.icon  App的图标的url
 * @param {String} successCallback.app.icon_background_color  App的图标背景颜色
 * @param {String} successCallback.app.version  App的版本
 * @param {String} successCallback.app.type  App的类型(nativeApp: napp; webApp:xapp或app)
 * @param {Function} [errorCallback]         获取列表失败时的回调函数
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
AMS.prototype.listInstalledApplications = function(successCallback, errorCallback)
{
    argscheck.checkArgs('fF', 'AMS.listInstalledApplications', arguments);
    exec(successCallback, errorCallback, "AMS", "listInstalledApplications",[]);
};

/**
 * 获取默认app可以安装的预设app安装包列表（Android, iOS, WP8）
 * 列表中每一项为一个app安装包的相对路径，可以直接安装/更新
 * @example
        function successCallback(packages){
            var count = packages.length;
            alert(count + " pre set app(s).");
            for(var i = 0; i < count; i++){
                alert(packages[i]);
            }
        }
        function errorCallback(){
            alert("list fail!");
        };
       xFace.AMS.listPresetAppPackages(successCallback，errorCallback);
 * @method listPresetAppPackages
 * @param {Function} successCallback     成功时的回调函数
 * @param {Array} successCallback.packages  预置包名数组对象，每一项均为预置包名
 * @param {Function} [errorCallback]           失败时的回调函数
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
AMS.prototype.listPresetAppPackages = function(successCallback, errorCallback)
{
    argscheck.checkArgs('fF', 'AMS.listPresetAppPackages', arguments);
    exec(successCallback, errorCallback, "AMS", "listPresetAppPackages", []);
};

/**
 * 更新app（Android, iOS, WP8）
 * @example
        function successCallback(info){
            console.log(info.appid);
            console.log(info.type);
        };
        function errorCallback(error){
            console.log(error.appid);
            console.log(error.type);
            console.log(error.errorcode);
        };
       xFace.AMS.updateApplication("geolocation.zip",successCallback，errorCallback);
 * @method updateApplication
 * @param {String} packagePath              app更新包路径,支持以下形式<br/>：
 *          1.相对app workspace的相对路径，例如："myPath/test.zip"<br/>
 *          2.以“/”开头的绝对路径，例如："/myPath/..."<br/>
 *          3.file://协议URL，例如："file:///myPath/..."<br/>
 *          4.通过{{#crossLink "File"}}{{/crossLink}}扩展获取的URL，参见{{#crossLink "Entry/toURL"}}{{/crossLink}}
 * @param {Function} [successCallback]        更新成功时的回调函数
 * @param {Object}  successCallback.info   与app相关信息object,每个object包含如下属性：
 * @param {Number}  successCallback.info.type   操作类型,具体类型参考<a href="../classes/AmsOperationType.html" class="crosslink">AmsOperationType</a>
 * @param {String}  successCallback.info.appid  app的id号
 * @param {Function} [errorCallback]          更新失败时的回调函数
 * @param {Object}  errorCallback.error     包含错误信息的对象，每个object包含如下属性：
 * @param {Number}  errorCallback.error.type  发生错误的ams操作类型,具体类型参考<a href="../classes/AmsOperationType.html" class="crosslink">AmsOperationType</a>
 * @param {String}  errorCallback.error.appid  发生错误的app的id号
 * @param {Object}  errorCallback.error.errorcode  错误码，具体错误码参考<a href="../classes/AmsError.html" class="crosslink">AmsError</a>
 * @param {Function} [statusChangedCallback]  更新过程的状态回调函数
 * @param {Object} statusChangedCallback.status 更新过程状态，包含如下属性:
 * @param {Number} statusChangedCallback.status.type 指示当前状态是install，uninstall，或update，参考{{#crossLink "AmsOperationType"}}{{/crossLink}}
 * @param {Number} statusChangedCallback.status.progress 安装过程状态码，具体值可参考{{#crossLink "AmsState"}}{{/crossLink}}@platform Android, iOS
 * @since 3.0.0
 * @platform Android, iOS, WP8
 */
AMS.prototype.updateApplication = function( packagePath, successCallback, errorCallback, statusChanged)
{
   argscheck.checkArgs('sFFF', 'AMS.updateApplication', arguments);
   if(!packagePath || typeof packagePath  != "string"){
        if(typeof errorCallback === "function") {
            errorCallback();
        }
        return;
    }
    var win = function(result) {
        if(typeof result.progress != "undefined") {
            statusChanged(result);
        }
        else {
            successCallback(result);
        }
    }
    exec(win, errorCallback, "AMS", "updateApplication",[packagePath]);

};

/**
 * 获取startApp的app描述信息（Android, iOS, WP8）
 * @example
       function successCallback(app){
            console.log(app.appid);
            console.log(app.name);
            console.log(app.icon);
            console.log(app.icon_background_color);
            console.log(app.version);
            console.log(app.type);
        };
        function errorCallback(){
            alert("failed");
        };
       xFace.AMS.getStartAppInfo(successCallback，errorCallback);
 * @method getStartAppInfo
 * @param {Function} successCallback      成功时的回调函数
 * @param {Object} successCallback.app    当前启动的app的信息，每个app对象包含如下属性,
 * @param {String} successCallback.app.appid,  App的唯一id
 * @param {String} successCallback.app.name,  App的名字
 * @param {String} successCallback.app.icon  App的图标的url
 * @param {String} successCallback.app.icon_background_color  App的图标背景颜色
 * @param {String} successCallback.app.version  App的版本
 * @param {String} successCallback.app.type  App的类型(nativeApp:napp; webApp:xapp或app)
 * @param {Function} [errorCallback]        失败时的回调函数
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
AMS.prototype.getStartAppInfo = function(successCallback, errorCallback)
{
    argscheck.checkArgs('fF', 'AMS.getStartAppInfo', arguments);
    exec(successCallback, errorCallback, "AMS", "getStartAppInfo", []);
};

module.exports = new AMS();

});

cordova.define("com.polyvi.xface.extension.ams.app", function(require, exports, module) { 
/*
 This file was modified from or inspired by Apache Cordova.

 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements. See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership. The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License. You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied. See the License for the
 specific language governing permissions and limitations
 under the License.
*/

/**
 * @module app
 */

 /**
  * 该类提供一系列基础api，用于进行xface app通信以及监听xface app的启动、关闭事件（Android, iOS）<br/>
  * 该类不能通过new来创建相应的对象，只能通过xFace.app对象来直接使用该类中定义的方法
  * @class App
  * @namespace xFace
  * @platform Android, iOS, WP8
  * @since 3.0.0
  */
var channel = require('cordova/channel');

/**
 * 当前应用收到其它应用发送的消息时，该事件被触发（Android, iOS, WP8）<br/>
 * 注意：只支持主应用与普通应用之间进行通信
 * @example
        function handler(data) {
            console.log("Received message: " + data);
        }
        xFace.app.addEventListener("message", handler);
 * @event message
 * @param {String} data 其它应用发送的数据
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
var message = channel.create("message");
/**
 * 当一个应用启动时，该事件被触发（Android, iOS, WP8）<br/>
 * 注意：只有主应用能够监听该事件
 * @example
        function handler() {
            console.log("One app has started!");
        }
        xFace.app.addEventListener("start", handler);
 * @event start
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
var start = channel.create("start");
/**
 * 当一个应用关闭时，该事件被触发（Android, iOS, WP8）<br/>
 * 注意：只有主应用能够监听该事件
 * @example
        function handler() {
            console.log("One app has closed!");
        }
        xFace.app.addEventListener("close", handler);
 * @event close
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
var close = channel.create("close");

/**
 * 在库模式中，当前应用收到第三方程序发送的消息时，该事件被触发（Android, iOS）<br/>
 * @example
        function handler(data) {
            console.log("Received message: " + data);
        }
        xFace.app.addEventListener("client", handler);
 * @event client
 * @param {String} data 第三方程序发送的数据
 * @platform Android, iOS
 * @since 3.1.20
 */
var client = channel.create("client");//FIXME:添加client事件后，将app.js定义在ams扩展中是否合适？

var app =
{
    /**
     * 注册应用相关的事件监听器（Android, iOS, WP8）
     * @example
            function handler(data) {
                console.log("Received message: " + data);
            }
            xFace.app.addEventListener("message", handler);
     * @method addEventListener
     * @param {String} evt 事件类型，仅支持"message", "start", "close"
     * @param {Function} handler 事件触发时的回调函数
     * @param {String} handler.data 当注册的事件为"message"事件或“client”事件时有效，用于接收应用之间或xFace和第三方程序通信时传递的数据
     * @platform Android, iOS, WP8
     * @since 3.0.0
     */
    addEventListener:function(evt, handler){
        var e = evt.toLowerCase();
        if(e == "message"){
            message.subscribe(handler);
        }else if(e == "start"){
            start.subscribe(handler);
        }else if(e == "close"){
            close.subscribe(handler);
        }else if(e == "client"){
            client.subscribe(handler);
        }
    },

    /**
     * 注销应用相关的事件监听器（Android, iOS, WP8）
     * @example
            function handler(data) {
                console.log("Received message: " + data);
            }
            xFace.app.addEventListener("message", handler);

            // do something ......

            xFace.app.removeEventListener("message", handler);
     * @method removeEventListener
     * @param {String} evt 事件类型，支持"message", "start", "close"
     * @param {Function} handler 要注销的事件监听器<br/>
     *  （该事件监听器通过{{#crossLink "xFace.App/addEventListener"}}{{/crossLink}}接口注册过）
     * @platform Android, iOS, WP8
     * @since 3.0.0
     */
    removeEventListener:function(evt, handler){
        var e = evt.toLowerCase();
        if(e == "message"){
            message.unsubscribe(handler);
        }else if(e == "start"){
            start.unsubscribe(handler);
        }else if(e == "close"){
            close.unsubscribe(handler);
        }else if(e == "client"){
            client.unsubscribe(handler);
        }

    },

    /**
     * 引擎触发应用相关事件的入口函数
     * param {String} evt 事件类型，支持"message", "start", "close"
     * param {String} arg 事件参数。
     *                对于message事件，该参数是消息的id；<br/>
     *                对于client事件，该参数是信息内容。 <br/>
     */
    fireAppEvent: function(evt, arg){
        var e = evt.toLowerCase();
        if( e == "message"){
           var data = localStorage.getItem(arg);
           localStorage.removeItem(arg);
           message.fire(data);
        }else if(e == "start"){
            start.fire();
        }else if(e == "close"){
            close.fire();
        }else if(e == "client"){
            client.fire(arg);
        }
    },

    /**
     * 向其它应用发送消息（Android, iOS, WP8）<br/>
     * 注意：<br/>
     * 1. 只支持主应用与子应用之间进行通信 <br/>
     * 2. 若是主应用发送给子应用，则所有子应用都能收到message
     * @example
            xFace.app.sendMessage("This is the message content sent to another app!", null);
     * @method sendMessage
     * @param {Object} data 要发送的消息内容
     * @param {String} [appid] 消息发送的目标应用的应用id（目前不支持该参数）
     * @platform Android, iOS, WP8
     * @since 3.0.0
     */
    sendMessage:function(data, appid){

        function toString(data)
        {
            var result;
            if( typeof data == 'string'){
                result = data;
            }else if( data !== null && typeof data == 'object'){
                result = data.toString();
            }
            return result;

        }
        function generateUniqueMsgId()
        {
            var msgId = parseInt((Math.random() * 65535), 10).toString(10);
            while(null !== localStorage.getItem(msgId))
            {
                 msgId = parseInt((Math.random() * 65535), 10).toString(10);
            }
            return msgId;
        }

        var args = arguments;
        if(args.length === 1){
            //如果是portal,则消息接收者是所有的app，如果是app，则消息接收者是portal
            var msgId = generateUniqueMsgId();
            localStorage.setItem(msgId, toString(data));
            require('xFace/plugin/privateModule').execCommand("xFace_app_send_message:", [msgId]);
        }else if(args.length === 2){
            //TODO
            //发送消息给指定的app
            alert('specified app');
        }
    }
};
module.exports = app;

});

cordova.define("com.polyvi.xface.extension.bluetooth.bluetooth", function(require, exports, module) { ﻿/*
 Copyright 2012-2013, Polyvi Inc. (http://www.xface3.com)
 This program is distributed under the terms of the GNU General Public License.

 This file is part of xFace.

 xFace is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 xFace is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with xFace.  If not, see <http://www.gnu.org/licenses/>.
*/
/**
 * bluetooth 蓝牙设备模块
 * @module bluetooth
 * @main bluetooth
 */

/**
 * bluetooth模块提供了蓝牙设备配对信息的获取和设备的控制(Android) <br/>
 * @class bluetooth
 * @platform Android
 * @since 3.0.0
 */
var argscheck = require("cordova/argscheck");
var exec = require('cordova/exec');

var Bluetooth = function(){};
 /**
 * 打开bluetooth
  @example
        function win(result) {
            alert(result);
        }

        function fail(result) {
             alert(result);
        }

        navigator.bluetooth.enable(win,fail);
 * @method enable
 * @param {Function} [successCallback] 成功回调函数
 * @param {Bool} successCallback.data true表示设备打开，false表示设备打开失败
 * @param {Function} [errorCallback]   失败回调函数
 * @platform Android
 * @since 3.0.0
 */
Bluetooth.prototype.enable = function(successCallback,errorCallback) {
    argscheck.checkArgs('FF','Bluetooth.enable',arguments);
    exec(successCallback, errorCallback, "Bluetooth", "enableBT", []);
};
 /**
 * 关闭bluetooth
  @example
        function win(result) {
            alert(result);
        }

        function fail(result) {
             alert(result);
        }

        navigator.bluetooth.disable(win,fail);
 * @method disable
 * @param {Function} [successCallback] 成功回调函数
 * @param {Bool} successCallback.data true表示设备关闭成功，false表示设备关闭失败
 * @param {Function} [errorCallback]   失败回调函数
 * @platform Android
 * @since 3.0.0
 */
Bluetooth.prototype.disable = function(successCallback,errorCallback) {
    argscheck.checkArgs('FF','Bluetooth.disable',arguments);
    exec(successCallback, errorCallback, "Bluetooth", "disableBT", []);
};

/**
 * 列出找到的蓝牙设备列表
  @example
        function win(result) {
            for(var i =0;i<result.length;i++){
            var jsonobj = result[i];
            for(var x in jsonobj){
                alert(x+"="+jsonobj[x]);}
            }
        }

        function fail(result) {
             alert(result);
        }

        navigator.bluetooth.listDevices(win,fail);
 * @method listDevices
 * @param {Function} successCallback 成功回调函数
 * @param {JasonArray} successCallback.data 返回搜索到的未配对蓝牙设备信息,如：｛name：“testdevice”,macAddress：“12-AC-5D-6C-91-28",<br/>
                                                                                 name: "testdevice1",macAddress:"16-BC-5D-6C-91-28"}
 * @param {Function} [errorCallback]   失败回调函数
 * @platform Android
 * @since 3.0.0
 */
Bluetooth.prototype.listDevices = function(successCallback,errorCallback) {
    argscheck.checkArgs('FF','Bluetooth.listDevices',arguments);
    exec(successCallback, errorCallback, "Bluetooth", "listDevices", []);
};

/**
 * 列出已配对的蓝牙设备列表
  @example
        function win(result) {
            for(var i =0;i<result.length;i++){
            var jsonobj = result[i];
            for(var x in jsonobj){
                alert(x+"="+jsonobj[x]);}
            }
        }

        function fail(result) {
            alert(result);
        }
        navigator.bluetooth.listBoundDevices(win,fail);
 * @method listBoundDevices
 * @param {Function} successCallback 成功回调函数
 * @param {JasonArray} successCallback.data 返回已配对的蓝牙设备信息,如：｛name：“testdevice”,macAddress：“12-AC-5D-6C-91-28",<br/>
                                                                           name: "testdevice1",macAddress: "31-EA-12-11-31-44"}
 * @param {Function} [errorCallback]   失败回调函数
 * @platform Android
 * @since 3.0.0
 */
Bluetooth.prototype.listBoundDevices = function(successCallback,errorCallback) {
    argscheck.checkArgs('fF','Bluetooth.listBoundDevices',arguments);
    exec(successCallback, errorCallback, "Bluetooth", "listBoundDevices", []);
};
//--------------------------
 /**
 * 判断蓝牙设备是否开启
  @example
        function win(result) {
            alert(result);
        }

        function fail(result) {
            alert(result);
        }

        navigator.bluetooth.isBTEnabled(win,fail);
 * @method isBTEnabled
 * @param {Function} [successCallback] 成功回调函数
 * @param {Bool} successCallback.data true表示设备打开，false表示设备未打开
 * @param {Function} [errorCallback]   失败回调函数
 * @platform Android
 * @since 3.0.0
 */
Bluetooth.prototype.isBTEnabled = function(successCallback,errorCallback) {
    argscheck.checkArgs('fF','Bluetooth.isBTEnabled',arguments);
    exec(successCallback, errorCallback, "Bluetooth", "isBTEnabled", []);
};

 //--------------------------
 /**
 * 根据指定的地址配对
  @example
        function win(result) {
            alert(result);
        }

        function fail(result) {
            alert(result);
        }

        navigator.bluetooth.pairBT(macAddress,win,fail);
 * @method pairBT
 * @param {String} macAddress 要配对蓝牙设备的mac地址
 * @param {Function} successCallback 成功回调函数
 * @param {Bool} successCallback.data true表示配对成功，false表示设备配对失败
 * @param {Function} [errorCallback]   失败回调函数
 * @platform Android
 * @since 3.0.0
 */
Bluetooth.prototype.pairBT = function(macAddress,successCallback,errorCallback) {
    argscheck.checkArgs('sfF','Bluetooth.pairBT',arguments);
    exec(successCallback, errorCallback, "Bluetooth", "pairBT", [macAddress]);
};
//-----------------
/**
 * 对指定的地址取消配对
  @example
        function win(result) {
            alert(result);
        }

        function fail(result) {
            alert(result);
        }

        navigator.bluetooth.unPairBT(macAddress,win,fail);
 * @method unPairBT
 * @param {String} macAddress 要配对蓝牙设备的mac地址
 * @param {Function} successCallback 成功回调函数
 * @param {Bool} successCallback.data true表示取消配对成功，false表示取消配对失败
 * @param {Function} [errorCallback]   失败回调函数
 * @platform Android
 * @since 3.0.0
 */
Bluetooth.prototype.unPairBT = function(macAddress,successCallback,errorCallback) {
    argscheck.checkArgs('sfF','Bluetooth.unPairBT',arguments);
    exec(successCallback, errorCallback, "Bluetooth", "unPairBT", [macAddress]);
};
//-----------------
/**
 * 停止寻找蓝牙设备
  @example
        function win(result) {
            alert(result);
        }

        function fail(result) {
            alert(result);
        }

        navigator.bluetooth.stopDiscovering(win,fail);
 * @method stopDiscovering
 * @param {Function} [successCallback] 成功回调函数
 * @param {Bool} successCallback.data true表示停止搜索成功，false表示停止搜索失败
 * @param {Function} [errorCallback]   失败回调函数
 * @platform Android
 * @since 3.0.0
 */
Bluetooth.prototype.stopDiscovering = function(successCallback,errorCallback) {
    argscheck.checkArgs('fF','Bluetooth.stopDiscovering',arguments);
    exec(successCallback, errorCallback, "Bluetooth", "stopDiscovering", []);
};

/**
 * 判断指定mac地址的蓝牙设备是否配对
  @example
        function win(result) {
            alert(result);
        }

        function fail(result) {
            alert(result);
        }

        navigator.bluetooth.isBound(macAddress,win,fail);
 * @method isBound
 * @param {Function} successCallback 成功回调函数
 * @param {Bool} successCallback.data true表示指定的地址已经配对，false表示指定的地址未配对
 * @param {Function} [errorCallback]   失败回调函数
 * @platform Android
 * @since 3.0.0
 */
Bluetooth.prototype.isBound = function(macAddress,successCallback,errorCallback) {
    argscheck.checkArgs('sfF','Bluetooth.isBound',arguments);
    exec(successCallback, errorCallback, "Bluetooth", "isBound", [macAddress]);
};
module.exports = new Bluetooth();
});

cordova.define("com.polyvi.xface.extension.calendar.Calendar", function(require, exports, module) { /*
 Copyright 2012-2013, Polyvi Inc. (http://www.xface3.com)
 This program is distributed under the terms of the GNU General Public License.

 This file is part of xFace.

 xFace is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 xFace is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with xFace.  If not, see <http://www.gnu.org/licenses/>.
 */


/**
 * ui模块提供系统原生控件，方便应用直接使用
 * @module ui
 */
var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec');

/**
 * 此类提供系统原生calendar控件支持.此类不能通过new来创建相应的对象,只能通过xFace.ui.Calendar
 * 对象来直接使用该类中定义的方法(Android,iOS,WP8)
 * @class Calendar
 * @static
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
function Calendar() {}

/**定义时间的一些常量*/
var MAX_YEARS    = 2100;
var MAX_MONTHS   = 12;
var MAX_DAYS     = 31;
var MAX_HOURS    = 23;
var MAX_MINUTES  = 59;
var MIN_YEARS    = 1900;
var MIN_MONTHS   = 1;
var MIN_DAYS     = 1;
var MIN_HOURS    = 0;
var MIN_MINUTES  = 0;

/**
 * 打开原生时间控件.可以指定控件显示的初始时间,如果用户不传入初始时间，则默认为当前系统时间.(Android,iOS,WP8)
 * 注意：初始时间要么不传，要么全传，否则会报错。
 * @example
        //通过Calendar控件获取用户选取的时间
        function getTime(){
            xFace.ui.Calendar.getTime(
                function(res){
                    alert(res.hour);
                    alert(res.minute);
                },
                function(){alert(" Calendar fail!");}
                );
        }
 * @method getTime
 * @param {Function} successCallback   成功的回调函数，返回用户设置的时间.
 * @param {Object}  successCallback.obj  回调函数的参数为一个带有hour,minute属性的Object对象
 * @param {Function} [errorCallback]     失败的回调函数
 * @param {Number} [hours]   初始小时值(iOS,WP8上不支持传参初始化Calendar控件,默认显示系统当前的时间)
 * @param {Number} [minutes] 初始分钟值(iOS,WP8上不支持传参初始化,不需要该参数）
 * @platform Android,iOS,WP8
 * @since 3.0.0
 */
Calendar.prototype.getTime = function(successCallback, errorCallback, hours, minutes) {
    argscheck.checkArgs('fFNN', 'Calendar.getTime', arguments);
    if(arguments.length == 3){
        if(errorCallback && typeof errorCallback == "function") {
            errorCallback("The parameter length is invalid! ");
            return;
        }
    }
    var checkTime = function(hour, minute) {
        if((hour < MIN_HOURS) || (minute < MIN_MINUTES) ||
            (hour > MAX_HOURS) || (minute > MAX_MINUTES)){
            return false;
        }
        //实例一个Date对象
        var d = new Date();
        d.setHours(hour);
        d.setMinutes(minute);
        return (d.getHours() == hour &&
        d.getMinutes() == minute);
    };
    var newArguments = [];
    if(arguments.length == 4) {
        if(!checkTime(hours, minutes)){
            if(errorCallback && typeof errorCallback == "function") {
                errorCallback("The parameter value is invalid! ");
                return;
            }
        } else {
            newArguments = [hours, minutes];
        }
    }
    exec(successCallback, errorCallback,"Calendar", "getTime", newArguments);
};

/**
 * 打开原生日期控件。可以指定控件显示的初始日期,如果用户不传入初始日期，则默认为当前系统日期.(Android,iOS,WP8)
 * 注意：初始日期要么不传，要么全传，否则会报错。
 * @example
        //通过Calendar控件获取用户选取的日期
        function getDate(){
            xFace.ui.Calendar.getDate(
                function(res){
                    alert(res.year);
                    alert(res.month);
                    alert(res.day);
                },
                function(){alert(" Calendar fail!");}
                    2012,09,10 );
        }

 * @method getDate
 * @param {Function} successCallback   成功回调函数，返回用户设置的日期.
 * @param {Object}  successCallback.obj  回调函数的参数为一个带有year,month,day属性的Object对象
 * @param {Function} [errorCallback]      失败回调函数
 * @param {Number} [year]    初始年值(iOS,WP8上不支持传参初始化Calendar控件,默认显示系统当前的日期)
 * @param {Number} [month]   初始月份值(iOS,WP8上不支持传参初始化,不需要该参数)
 * @param {Number} [day]     初始日值(iOS,WP8上不支持传参初始化,不需要该参数)
 * @platform Android,iOS,WP8
 * @since 3.0.0
 */
Calendar.prototype.getDate = function(successCallback, errorCallback, year, month, day) {
    argscheck.checkArgs('fFNNN', 'Calendar.getDate', arguments);
    if(arguments.length != 5 && arguments.length != 2 && arguments.length != 1){
        if(errorCallback && typeof errorCallback == "function") {
            errorCallback("The parameter length is invalid! ");
            return;
        }
    }
    var checkDate = function(years, months, days) {
        if((years < MIN_YEARS) || (months < MIN_MONTHS) || (days < MIN_DAYS) ||
            (years > MAX_YEARS) || (months > MAX_MONTHS) || (days > MAX_DAYS) ){
            return false;
        }
        //实例一个Date对象并初始化各个属性值，注意月份是从0开始，因此减1
        var d = new Date(years, months-1, days);
        //判断输入时期是否合法 ，同样月份需要加1
        return (d.getFullYear() == years && d.getMonth()+1 == months && d.getDate()== days);
    };
    var newArguments = [];
    if(arguments.length == 5) {
        if(!checkDate(year,month,day)){
            if(errorCallback && typeof errorCallback == "function") {
                errorCallback("The parameter value is invalid! ");
                return;
            }
        } else {
            newArguments = [year, month, day];
        }
    }

    exec(successCallback, errorCallback,"Calendar", "getDate",newArguments);
};

module.exports = new Calendar();
});

cordova.define("com.polyvi.xface.extension.device-capability.device", function(require, exports, module) { 
/*
 Copyright 2012-2013, Polyvi Inc. (http://www.xface3.com)
 This program is distributed under the terms of the GNU General Public License.

 This file is part of xFace.

 xFace is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 xFace is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with xFace.  If not, see <http://www.gnu.org/licenses/>.
*/

var argscheck = require('cordova/argscheck'),
    channel = require('cordova/channel'),
    utils = require('cordova/utils'),
    exec = require('cordova/exec');

function DeviceCapability() {
    this.imei = null;
    this.imsi = null;
    this.isCameraAvailable = null;
    this.isFrontCameraAvailable = null;
    this.isCompassAvailable = null;
    this.isAccelerometerAvailable = null;
    this.isLocationAvailable = null;
    this.isWiFiAvailable = null;
    this.isTelephonyAvailable = null;
    this.isSmsAvailable = null;

    var me = this;

    channel.onCordovaReady.subscribe(function() {
        me.getInfo(function(info) {
            device.imei = info.imei;
            device.imsi = info.imsi;
            /** 获取设备能力*/
            device.isCameraAvailable = info.isCameraAvailable;
            device.isFrontCameraAvailable = info.isFrontCameraAvailable;
            device.isCompassAvailable = info.isCompassAvailable;
            device.isAccelerometerAvailable = info.isAccelerometerAvailable;
            device.isLocationAvailable = info.isLocationAvailable;
            device.isWiFiAvailable = info.isWiFiAvailable;
            device.isTelephonyAvailable = info.isTelephonyAvailable;
            device.isSmsAvailable = info.isSmsAvailable;
        },function(e) {
            utils.alert("[ERROR] Error initializing xFace: " + e);
        });
    });
};

/**
 * Get Device Capability info
 *
 * @param {Function} successCallback The function to call when the heading data is available
 * @param {Function} errorCallback The function to call when there is an error getting the heading data. (OPTIONAL)
 */
DeviceCapability.prototype.getInfo = function(successCallback, errorCallback) {
    argscheck.checkArgs('fF', 'DeviceCapability.getInfo', arguments);
    exec(successCallback, errorCallback, "DeviceCapability", "getDeviceInfo", []);
};

module.exports = new DeviceCapability();

});

cordova.define("com.polyvi.xface.extension.idlewatcher.idlewatcher", function(require, exports, module) { 
/*
 Copyright 2012-2013, Polyvi Inc. (http://www.xface3.com)
 This program is distributed under the terms of the GNU General Public License.

 This file is part of xFace.

 xFace is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 xFace is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with xFace.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * IdleWatcher提供用户长时间无操作超时的监听
 * @module idleWatcher
 * @main idleWatcher
 */

var exec = require('cordova/exec');
var argscheck = require('cordova/argscheck');

/**
 * 提供用户长时间无操作超时的监听（Android，iOS）<br/>
 * 该类不能通过new来创建相应的对象，只能通过xFace.IdleWatcher对象来直接使用该类中定义的方法
 * @class IdleWatcher
 * @platform Android, iOS
 */
var IdleWatcher = function () {
};

/**
 * 开始记录用户无操作的时间（Android, iOS）
 * @method start
 * @example
        xFace.IdleWatcher.start(function(){
            document.getElementById('result').innerText ="timeout";
        },5);
 * @param {Function} eventListener     超时监听函数
 * @param {String}   [timeout=300]     超时时间,单位为秒。注意：超时时间设定的值会被最后一次调用设定的值所覆盖。
 * @param {Function} [successCallback] 成功回调函数
 * @param {Function} [errorCallback]   失败回调函数
 * @platform Android、iOS
 * @since 3.0.0
 */
IdleWatcher.prototype.start = function(timeout, successCallback, errorCallback) {
    argscheck.checkArgs('NFF','IdleWatcher.start', arguments);
    exec(successCallback, errorCallback, "IdleWatcher", "start", [timeout]);
};

/**
 * 停止记录用户无操作的时间 （Android, iOS）
 * @method stop
 * @example
        xFace.IdleWatcher.stop();
 * @platform Android、iOS
 * @since 3.0.0
 */
IdleWatcher.prototype.stop = function() {
    exec(null, null, "IdleWatcher", "stop", []);
};
module.exports = new IdleWatcher();

});

cordova.define("com.polyvi.xface.extension.messaging.Message", function(require, exports, module) { /*
 Copyright 2012-2013, Polyvi Inc. (http://www.xface3.com)
 This program is distributed under the terms of the GNU General Public License.

 This file is part of xFace.

 xFace is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 xFace is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with xFace.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @module message
 */

/**
 * 该类定义了信息的一系列属性（Android, iOS, WP8）<br/>
 * 相关参考： {{#crossLink "MessageTypes"}}{{/crossLink}}
 * @class Message
 * @constructor
 * @param {String} [messageId=null] 唯一标识符，仅在 Native端设置
 * @param {String} [subject=null] 信息的标题
 * @param {String} [body=null] 信息的内容
 * @param {String} [destinationAddresses=null] 目的地址
 * @param {String} [messageType=null] 信息的类型（短信，彩信，Email），取值范围见{{#crossLink "xFace.MessageTypes"}}{{/crossLink}}
 * @param {Date} [date=null] 信息的日期
 * @param {Boolean} [isRead=null] 信息是否已读
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
var Message = function(messageId, subject, body, destinationAddresses, messageType, date, isRead) {

/**
 * 唯一标识符，仅在 Native 端设置（Android, iOS, WP8）
 * @property messageId
 * @type String
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
    this.messageId = messageId || null;
/**
 * 信息的标题（Android, iOS, WP8）
 * @property subject
 * @type String
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
    this.subject = subject || null;
/**
 * 信息的内容（Android, iOS, WP8）
 * @property body
 * @type String
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
    this.body = body || null;
/**
 * 目的地址（Android, iOS, WP8）
 * @property destinationAddresses
 * @type String
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
    this.destinationAddresses = destinationAddresses || null;
/**
 * 信息的类型（短信，彩信，Email），目前支持短信和Email（Android, iOS, WP8），取值范围见 {{#crossLink "xFace.MessageTypes"}}{{/crossLink}}
 * @property messageType
 * @type String
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
    this.messageType = messageType || null;
/**
 * 信息的日期（Android, iOS, WP8）
 * @property date
 * @type Date
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
    this.date = date || null;
/**
 * 信息是否已读标志（Android, iOS, WP8）
 * @property isRead
 * @type Boolean
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
    this.isRead = isRead || null;
};

module.exports = Message;

});

cordova.define("com.polyvi.xface.extension.messaging.MessageTypes", function(require, exports, module) { /*
 Copyright 2012-2013, Polyvi Inc. (http://www.xface3.com)
 This program is distributed under the terms of the GNU General Public License.

 This file is part of xFace.

 xFace is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 xFace is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with xFace.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @module message
 */
/**
 * 该类定义一些常量，用于标识信息的类型（Android, iOS, WP8）<br/>
 * 相关参考： {{#crossLink "Messaging"}}{{/crossLink}}
 * @class MessageTypes
 * @static
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */

var MessageTypes = function() {
};

/**
 * 邮件（Android, iOS, WP8）
 * @property EmailMessage
 * @type String
 * @static
 * @final
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
MessageTypes.EmailMessage = "Email";
/**
 * 彩信（Android, iOS, WP8）
 * @property MMSMessage
 * @type String
 * @static
 * @final
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
MessageTypes.MMSMessage = "MMS";
/**
 * 短信（Android, iOS, WP8）
 * @property SMSMessage
 * @type String
 * @static
 * @final
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
MessageTypes.SMSMessage = "SMS";

module.exports = MessageTypes;

});

cordova.define("com.polyvi.xface.extension.messaging.MessageFolderTypes", function(require, exports, module) { /*
 This file was modified from or inspired by Apache Cordova.

 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements. See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership. The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License. You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied. See the License for the
 specific language governing permissions and limitations
 under the License.
*/

/**
 * @module message
 */

/**
 * 该类定义一些常量，用于标识信息文件夹的类型（Android）
 * 相关参考： {{#crossLink "Messaging"}}{{/crossLink}}
 * @class MessageFolderTypes
 * @static
 * @platform Android
 * @since 3.0.0
 */
var MessageFolderTypes = function() {
};

/**
 * 草稿箱（Android）
 * @property DRAFTS
 * @type String
 * @static
 * @final
 * @platform Android
 * @since 3.0.0
 */
MessageFolderTypes.DRAFTS = "DRAFT";  //草稿箱
/**
 * 收件箱（Android）
 * @property INBOX
 * @type String
 * @static
 * @final
 * @platform Android
 * @since 3.0.0
 */
MessageFolderTypes.INBOX = "INBOX";   //收件箱
/**
 * 发件箱（Android）
 * @property OUTBOX
 * @type String
 * @static
 * @final
 * @platform Android
 * @since 3.0.0
 */
MessageFolderTypes.OUTBOX = "OUTBOX"; //发件箱
/**
 * 发出的信息（Android）
 * @property SENTBOX
 * @type String
 * @static
 * @final
 * @platform Android
 * @since 3.0.0
 */
MessageFolderTypes.SENTBOX = "SENT";  //发出的信息

module.exports = MessageFolderTypes;

});

cordova.define("com.polyvi.xface.extension.messaging.Messaging", function(require, exports, module) { /*
 Copyright 2012-2013, Polyvi Inc. (http://www.xface3.com)
 This program is distributed under the terms of the GNU General Public License.

 This file is part of xFace.

 xFace is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 xFace is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with xFace.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * 该模块定义发送，获取和查找短信相关的一些功能.
 * @module message
 * @main message
 */

/**
 * 该类实现了对短信的一系列操作，包括新建短信，发送短信，查找短信等（Android, iOS, WP8）<br/>
 * 该类不能通过new来创建相应的对象，只能通过xFace.Messaging对象来直接使用该类中定义的方法<br/>
 * 相关参考： {{#crossLink "Message"}}{{/crossLink}}, {{#crossLink "MessageTypes"}}{{/crossLink}}, {{#crossLink "MessageFolderTypes"}}{{/crossLink}}
 * @class Messaging
 * @static
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec'),
    Message = require('./Message');

var Messaging = function() {
    this.onReceived = null;
};

/**
 * 新建信息，根据messageType新建信息，目前支持短息和Email类型（Android, iOS, WP8）<br/>
 * @example
        xFace.Messaging.createMessage(MessageTypes.SMSMessage, successCallback, errorCallback);
        function successCallback(message){alert(message.type);}
        function errorCallback(){alert("failed");}
 * @method createMessage
 * @param {String} messageType 信息类型（如MMS,SMS,Email），取值范围见{{#crossLink "xFace.MessageTypes"}}{{/crossLink}}
 * @param {Function} successCallback 成功回调函数
 * @param {Message} successCallback.message 生成的信息对象，参见 {{#crossLink "Message"}}{{/crossLink}}
 * @param {Function} [errorCallback]   失败回调函数
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
Messaging.prototype.createMessage = function(messageType, successCallback, errorCallback) {
    argscheck.checkArgs('sfF', 'xFace.Messaging.createMessage', arguments);
    //TODO:根据messageType创建不同类型的信息，目前只处理了短消息
    var MessageTypes = require('./MessageTypes');
    if((messageType != MessageTypes.EmailMessage&&
       messageType != MessageTypes.MMSMessage&&
       messageType != MessageTypes.SMSMessage)){
        if(errorCallback && typeof errorCallback == "function") {
            errorCallback();
        }
        return;
    }
    var result = new Message();
    result.messageType = messageType;
    successCallback(result);
};

/**
 * 发送信息，目前支持发送短信和Email（Android, iOS, WP8）<br/>
 * @example
        xFace.Messaging.sendMessage (message, success, errorCallback);
        function success(statusCode) {alert("success : " + statusCode);}
        function errorCallback(errorCode){alert("fail : " + errorCode);

 * @method sendMessage
 * @param {Message} message 要发送的信息对象，参见{{#crossLink "Message"}}{{/crossLink}}
 * @param {Function} [successCallback] 成功回调函数
 * @param {Number} successCallback.code   状态码: 0：发送成功；
 * @param {Function} [errorCallback]   失败回调函数
 * @param {Number} errorCallback.code   状态码: 1：通用错误；2：无服务；3：没有PDU提供；4：天线关闭；
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
Messaging.prototype.sendMessage = function(message, successCallback, errorCallback){
    argscheck.checkArgs('oFF', 'xFace.Messaging.sendMessage', arguments);
    exec(successCallback, errorCallback, "Messaging", "sendMessage", [message.messageType, message.destinationAddresses, message.body, message.subject]);
};

/**
 * 获取指定信息文件夹的信息数量，不支持读取SIM卡内信息（Android）<br/>
 * @example
        xFace.Messaging.getQuantities (xFace.MessageTypes.SMSMessage, xFace.MessageFolderTypes.INBOX, successCallback, errorCallback);
        function successCallback(num){
            alert("收件箱中有"+num+"条短信");}
        function errorCallback(){alert("failed");}
 * @method getQuantities
 * @for Messaging
 * @param {String} messageType 信息类型，取值范围见{{#crossLink "MessageTypes"}}{{/crossLink}}
 * @param {String} folderType  文件夹类型，取值范围见{{#crossLink "MessageFolderTypes"}}{{/crossLink}}
 * @param {Function} [successCallback] 成功回调函数
 * @param {Number} successCallback.num   获取到的信息数量
 * @param {Function} [errorCallback]   失败回调函数
 * @platform Android
 * @since 3.0.0
 */
Messaging.prototype.getQuantities = function(messageType, folderType, successCallback, errorCallback) {
    argscheck.checkArgs('ssfF', 'Messaging.getQuantities', arguments);
    exec(
        function(result) {
            successCallback(result);
        },
        errorCallback, "Messaging", "getQuantities", [messageType, folderType]);
};

/**
 * 获取指定文件夹类型中的指定索引位置的信息，不支持读取SIM卡内信息（Android）<br/>
 * @example
        xFace.Messaging.getMessage (MessageTypes.SMSMessage, xFace.MessageFolderTypes.INBOX, 0, successCallback, errorCallback);
        function successCallback(message) { alert(message.body);}
        function errorCallback(){alert("failed");}
 * @method getMessage
 * @for Messaging
 * @param {String} messageType 信息类型，取值范围见{{#crossLink "MessageTypes"}}{{/crossLink}}
 * @param {String} folderType  文件夹类型，取值范围见{{#crossLink "MessageFolderTypes"}}{{/crossLink}}
 * @param {Number} index           要获取的短信索引
 * @param {Function} [successCallback] 成功回调函数
 * @param {Message} successCallback.message 获取到的信息对象，参见 {{#crossLink "Message"}}{{/crossLink}}
 * @param {Function} [errorCallback]   失败回调函数
 * @platform Android
 * @since 3.0.0
 */
Messaging.prototype.getMessage = function(messageType, folderType, index, successCallback, errorCallback) {
    argscheck.checkArgs('ssnfF', 'Messaging.getMessage', arguments);
     var win = typeof successCallback !== 'function' ? null : function(result) {
        var message = new Message(result.messageId, result.subject, result.body, result.destinationAddresses,
                            result.messageType, new Date(result.date), result.isRead);
        successCallback(message);
    };
    exec(win, errorCallback, "Messaging", "getMessage", [messageType, folderType, index]);
};

/**
 * 获取某个文件夹中的所有信息，不支持读取SIM卡内信息（Android）<br/>
 * @example
        xFace.Messaging.getAllMessages (MessageTypes.SMSMessage, xFace.MessageFolderTypes.INBOX, successCallback, errorCallback);
        function successCallback(messages){  alert(messages.length);}
        function errorCallback(){alert("failed");}
 * @method getAllMessages
 * @for Messaging
 * @param {String} messageType 信息类型，取值范围见{{#crossLink "MessageTypes"}}{{/crossLink}}
 * @param {String} folderType  文件夹类型，取值范围见{{#crossLink "MessageFolderTypes"}}{{/crossLink}}
 * @param {Function} [successCallback] 成功回调函数
 * @param {Array} successCallback.messages 获取到的所有信息对象，该数组对象中的每个元素为一个{{#crossLink "xFace.Message"}}{{/crossLink}}类型对象
 * @param {Function} [errorCallback]   失败回调函数
 * @platform Android
 * @since 3.0.0
 */
Messaging.prototype.getAllMessages =function(messageType, folderType, successCallback, errorCallback) {
    argscheck.checkArgs('ssfF', 'Messaging.getAllMessages', arguments);
    var win = typeof successCallback !== 'function' ? null : function(result) {
        var retVal = [];
        for (var i = 0; i < result.length; i++) {
            var message = new Message(result[i].messageId, result[i].subject, result[i].body, result[i].destinationAddresses,
                                result[i].messageType, new Date(result[i].date), result[i].isRead);
            retVal.push(message);
        }
        successCallback(retVal);
    };
    exec(win, errorCallback, "Messaging", "getAllMessages", [messageType, folderType]);
};

/**
 * 在指定文件夹中查找匹配的信息，不支持读取SIM卡内信息（Android）<br/>
 * @example
        Messaging.findMessages (message, MessageFolderTypes.INBOX, 0, 3, success, errorCallback);
        function success(messages) {alert(messages.length);}
        function errorCallback(){alert("failed");}
 * @method findMessages
 * @for Messaging
 * @param {Message} comparisonMsg   要查找的信息，参见{{#crossLink "Message"}}{{/crossLink}}
 * @param {String} folderType  文件夹类型，取值范围见{{#crossLink "MessageFolderTypes"}}{{/crossLink}}
 * @param {Number} startIndex  起始索引
 * @param {Number} endIndex  结束索引
 * @param {Function} [successCallback] 成功回调函数
 * @param {Array} successCallback.messages 查找到的所有信息对象，该数组对象中的每个元素为一个{{#crossLink "xFace.Message"}}{{/crossLink}}类型对象
 * @param {Function} [errorCallback]   失败回调函数
 * @platform Android
 * @since 3.0.0
 */
Messaging.prototype.findMessages = function(comparisonMsg, folderType, startIndex, endIndex, successCallback, errorCallback) {
    argscheck.checkArgs('osnnfF', 'Messaging.findMessages', arguments);
    var comparison = {messageId:"", subject:"", destinationAddresses:"", body:"", isRead:-1};
    if(null !== comparisonMsg){
        comparison.messageId = comparisonMsg.messageId || "";
        comparison.subject = comparisonMsg.subject || "";
        comparison.destinationAddresses = comparisonMsg.destinationAddresses || "";
        comparison.body = comparisonMsg.body || "";
        if(null === comparisonMsg.isRead) {
            comparison.isRead = -1;
        }
        else if(comparisonMsg.isRead) {
            comparison.isRead = 1;
        }
        else {
            comparison.isRead = 0;
        }
    }
    var win = typeof successCallback !== 'function' ? null : function(result) {
        var retVal = [];
        for(var i = 0 ; i < result.length ; i++){
            var message = new Message(result[i].messageId, result[i].subject, result[i].body, result[i].destinationAddresses, result[i].messageType,
                                        new Date(result[i].date), result[i].isRead);
            retVal.push(message);
        }
        successCallback(retVal);
    };
    exec(win, errorCallback, "Messaging", "findMessages", [comparison, folderType, startIndex, endIndex]);
};

/**
* 当收到短信的回调函数
*/
Messaging.prototype.fire = function(msgs) {
    if (this.onReceived) {
        this.onReceived(msgs);
    }
};

/**
* 注册一个监听器, 当手机收到短信的时候，该监听器会被回调(Android, iOS, WP8)<br/>
* @example
        xFace.Messaging.registerOnMessageReceivedListener(printMessage);
        function printMessage(msgs){
                alert(msgs);
            }
*@method registerOnMessageReceivedListener
*@param {Function} listener 收到短信的监听
*@param {String} listener.msgs 收到短信的内容
*@platform Android, iOS, WP8
*@since 3.0.0
*/
Messaging.prototype.registerOnMessageReceivedListener = function(listener) {

    argscheck.checkArgs('f', 'Messaging.registerOnMessageReceivedListener', arguments);
    this.onReceived = listener;
    exec(null, null,"Messaging", "registerOnMessageReceivedListener", []);

};

module.exports = new Messaging();

});

cordova.define("com.polyvi.xface.extension.push.PushNotification", function(require, exports, module) { /*
 Copyright 2012-2013, Polyvi Inc. (http://www.xface3.com)
 This program is distributed under the terms of the GNU General Public License.

 This file is part of xFace.

 xFace is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 xFace is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with xFace.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
* 该模块提供向手机推送消息的功能
* @module push
* @main push
*/

/**
* 该类提供向手机推送消息的功能(Android, iOS, WP8)<br/>
* 该类不能通过new来创建相应的对象,只能通过xFace.PushNotification对象来直接使用该类定义的方法
* @class PushNotification
* @static
* @platform Android,iOS,WP8
* @since 3.0.0
*/
var exec = require('cordova/exec');
var argscheck = require('cordova/argscheck');
var PushNotification = function() {
    this.onReceived = null;
};

/**
* 当收到推送通知的回调函数
*/
PushNotification.prototype.fire = function(pushString) {
    if (this.onReceived) {
        this.onReceived(pushString);
    }
};

/**
* 注册一个监听器, 当手机收到推送消息时，该监听器会被回调(Android, iOS, WP8)<br/>
* @example
        xFace.PushNotification.registerOnReceivedListener(printPushData);
        function printPushData(info){
                alert(info);
            }
*@method registerOnReceivedListener
*@param {Function} listener 收到通知的监听
*@param {String} listener.message 收到通知的内容
*@platform Android, iOS, WP8
*@since 3.0.0
*/
PushNotification.prototype.registerOnReceivedListener = function(listener) {

    argscheck.checkArgs('f', 'PushNotification.registerOnReceivedListener', arguments);
    this.onReceived = listener;
    exec(null, null,"PushNotification", "registerOnReceivedListener", []);

};

/**
* 获取手机设备的唯一标识符(以UUID作为唯一标识符)(Android, iOS, WP8)<br/>
* @example
        xFace.PushNotification.getDeviceToken(success, error);
        function success(deviceToken){
                alert(deviceToken);
            };
        function error(err){
                alert(err);
            };
*@method getDeviceToken
*@param {Function} [successCallback] 成功回调函数
*@param {String} successCallback.deviceToken 手机的唯一标识符
*@param {Function} [errorCallback] 失败回调函数
*@param {String} errorCallback.err 失败的描述信息
*@platform Android, iOS, WP8
*@since 3.0.0
*/
PushNotification.prototype.getDeviceToken = function(successCallback, errorCallback) {
    argscheck.checkArgs('FF', 'PushNotification.getDeviceToken', arguments);
    exec(successCallback, errorCallback,"PushNotification", "getDeviceToken", []);
};

/**
* 通过服务器地址,端口号打开Push(Android)<br/>
* @example
        xFace.PushNotification.open(host,port,success, error);
        function success(deviceToken){
                alert(deviceToken);
            };
        function error(err){
                alert(err);
            };
*@method openPush
*@param {String} host 服务器的地址
*@param {String} port 服务器的端口号
*@param {Function} [successCallback] 成功回调函数
*@param {Function} [errorCallback] 失败回调函数
*@param {String} errorCallback.err 失败的描述信息
*@platform Android
*@since 3.0.0
*/
PushNotification.prototype.open = function(host,port,successCallback, errorCallback) {
    argscheck.checkArgs('FF', 'PushNotification.open', arguments);
    exec(successCallback, errorCallback,"PushNotification", "open", [host,port]);
	};

module.exports = new PushNotification();
});

cordova.define("com.polyvi.xface.extension.security.Security", function(require, exports, module) { /*
 Copyright 2012-2013, Polyvi Inc. (http://www.xface3.com)
 This program is distributed under the terms of the GNU General Public License.

 This file is part of xFace.

 xFace is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 xFace is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with xFace.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * 该模块提供加解密的功能
 * @module security
 * @main   security
 */

 /**
  * 该类提供一系列基础api，用于字符串或者文件的加解密操作（Android, iOS, WP8）<br/>
  * 该类不能通过new来创建相应的对象，只能通过xFace.Security对象来直接使用该类中定义的方法
  * @class Security
  * @platform Android, iOS, WP8
  * @since 3.0.0
  */
var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec');
var Security = function() {};

/**
 * 根据传入的密钥对明文字符串加密，并返回加密后的密文（Android, iOS, WP8）<br/>
 * @example
        //采用3DES方式加密并以16进制返回加密数据，如果没有设置加密方式则默认用DES加密，如果没有设置加密后数据类型则默认返回String类型数据。
        options.CryptAlgorithm = SecurityOptions.CryptAlgorithm.TRIPLE_DES;
        options.EncodeDataType = StringEncodeType.HEX;
        options.EncodeKeyType = StringEncodeType.HEX;
        xFace.Security.encrypt(key, plainText, encryptSuccess, encryptError, options);
        function encryptSuccess(encryptedText) {
            alert("encryptedContent:" + encryptedText);
        }
        function encryptError(errorcode) {
            alert("Encrypt file error:" + errorcode);
        }
 * @method encrypt
 * @param {String} key 密钥，长度必须大于或等于8个字符
 * @param {String} plainText 需要加密的明文
 * @param {Function} [successCallback] 成功回调函数
 * @param {String} successCallback.encryptedText 该参数用于返回加密后的密文内容
 * @param {Function} [errorCallback]  失败回调函数
 * @param {String} errorCallback.errorCode 该参数用于返回加密错误码
 * <ul>返回的加密错误码具体说明：</ul>
 * <ul>1:   文件找不到错误</ul>
 * <ul>2:   加密路径错误</ul>
 * <ul>3:   加密过程出错</ul>
 * @param {SecurityOptions} [options] 封装加解密配置选项
 * @platform Android, iOS, WP8
 */
Security.prototype.encrypt = function(key, plainText,  successCallback, errorCallback, options){
    argscheck.checkArgs('ssFFO', 'xFace.Security.encrypt', arguments);
    if(key.length < 8 ||  plainText.length === 0){
        if(errorCallback) {
            errorCallback("Wrong parameter of encrypt! key length is less than 8");
        }
        return;
    }
    exec(successCallback, errorCallback, "Security", "encrypt", [key, plainText, options]);
};

/**
 * 根据传入的密钥对密文解密，并返回解密后的明文（Android, iOS, WP8）<br/>
 * @example
        //采用3DES方式解密并以16进制返回解密数据，如果没有设置解密方式则默认用DES解密，如果没有设置解密后数据类型则默认返回String类型数据。
        var options = new SecurityOptions();
        options.CryptAlgorithm = SecurityOptions.CryptAlgorithm.TRIPLE_DES;
        options.EncodeDataType = StringEncodeType.HEX;
        options.EncodeKeyType = StringEncodeType.HEX;
        xFace.Security.decrypt(key, plainText, decryptSuccess, decryptError, options);
        function decryptSuccess(decryptedText) {
            alert("decryptedContent:" + decryptedText);
        }
        function decryptError(errorcode) {
            alert("Decrypt file error:" + errorcode);
        }
 * @method decrypt
 * @param {String} key 密钥，长度必须大于或等于8个字符
 * @param {String} encryptedText 需要解密的密文
 * @param {Function} [successCallback] 成功回调函数
 * @param {String} successCallback.decryptedText 该参数用于返回解密后的明文内容
 * @param {Function} [errorCallback]  失败回调函数
 * @param {String} errorCallback.errorCode 该参数用于返回解密错误码
 * <ul>返回的解密错误码具体说明：</ul>
 * <ul>1:   文件找不到错误</ul>
 * <ul>2:   加密路径错误</ul>
 * <ul>3:   加密过程出错</ul>
 * @param {SecurityOptions} [options] 封装加解密配置选项
 * @platform Android, iOS, WP8
 */
Security.prototype.decrypt = function(key, encryptedText, successCallback, errorCallback, options){
    argscheck.checkArgs('ssFFO', 'xFace.Security.decrypt', arguments);
    if(key.length < 8 || encryptedText.length === 0){
        if(errorCallback) {
            errorCallback("Wrong parameter of decrypt! key length is less than 8");
        }
        return;
    }
    exec(successCallback, errorCallback, "Security", "decrypt", [key, encryptedText, options]);
};

/**
 * 根据传入的密钥加密文件，并返回新生成加密文件的路径（Android，iOS, WP8）<br/>
 * @example
        var sourceFilePath = "encrypt_source.txt";
        var targetFilePath = "encrypt_target.txt";
        xFace.Security.encryptFile(key, sourceFilePath, targetFilePath, success, error);
        function success(entry) {
            alert("Encrypt file path:" + entry);
        }
        function error(errorcode) {
            alert("Encrypt file error:" + errorcode);
        }
 * @method encryptFile
 * @param {String} key 密钥，长度必须大于或等于8个字符
 * @param {String} sourceFilePath 要加密的文件路径<br/>
 *        文件路径支持的类型：<br/>
 *          1.相对路径，例如："myPath/test.txt"，则默认在app的workspace下<br/>
 *          2.全路径，例如："/myPath/..."<br/>
 *          3.file://协议URL，例如："file:///myPath/..."<br/>
 *          4.通过{{#crossLink "File"}}{{/crossLink}}扩展获取的URL，参见{{#crossLink "Entry/toURL"}}{{/crossLink}}
 * @param {String} targetFilePath 用户指定加密后生成的文件路径<br/>
 *        文件路径支持的类型：<br/>
 *          1.相对路径，例如："myPath/test.txt"，则默认在app的workspace下<br/>
 *          2.全路径，例如："/myPath/..."<br/>
 *          3.file://协议URL，例如："file:///myPath/..."<br/>
 *          4.通过{{#crossLink "File"}}{{/crossLink}}扩展获取的URL，参见{{#crossLink "Entry/toURL"}}{{/crossLink}}
 * @param {Function} [successCallback] 成功回调函数
 * @param {String} successCallback.path 该参数用于返回新生成加密文件的路径
 * @param {Function} [errorCallback]  失败回调函数
 * @param {String} errorCallback.errorCode 该参数用于返回加密错误码
 * <ul>返回的加密错误码具体说明：</ul>
 * <ul>1:   文件找不到错误</ul>
 * <ul>2:   加密路径错误</ul>
 * <ul>3:   加密过程出错</ul>
 * @platform Android, iOS, WP8
 */
Security.prototype.encryptFile = function(key, sourceFilePath, targetFilePath, successCallback, errorCallback){
    argscheck.checkArgs('sssFF', 'xFace.Security.decrypt', arguments);
    if(key.length < 8){
        if(errorCallback) {
            errorCallback("Wrong parameter of encryptFile! key length is less than 8");
        }
        return;
    }
    exec(successCallback, errorCallback, "Security", "encryptFile", [key, sourceFilePath,targetFilePath]);
};

/**
 * 根据传入的密钥解密文件，返回解密后的新生成文件的路径（Android，iOS, WP8）<br/>
 * @example
        var sourceFilePath = "decrypt_source.txt";
        var targetFilePath = "decrypt_target.txt";
        xFace.Security.decryptFile(key, sourceFilePath,targetFilePath, success, error);
        function success(entry) {
            alert("Decrypt file path:" + entry);
        }
        function error(errorcode) {
            alert("Decrypt file error:" + errorcode);
        }
 * @method decryptFile
 * @param {String} key 密钥，长度必须大于或等于8个字符
 * @param {String} sourceFilePath 要解密的文件路径<br/>
 *        文件路径支持的类型：<br/>
 *          1.相对路径，例如："myPath/test.txt"，则默认在app的workspace下<br/>
 *          2.全路径，例如："/myPath/..."<br/>
 *          3.file://协议URL，例如："file:///myPath/..."<br/>
 *          4.通过{{#crossLink "File"}}{{/crossLink}}扩展获取的URL，参见{{#crossLink "Entry/toURL"}}{{/crossLink}}
 * @param {String} targetFilePath 用户指定解密后生成的文件路径<br/>
 *        文件路径支持的类型：<br/>
 *          1.相对路径，例如："myPath/test.txt"，则默认在app的workspace下<br/>
 *          2.全路径，例如："/myPath/..."<br/>
 *          3.file://协议URL，例如："file:///myPath/..."<br/>
 *          4.通过{{#crossLink "File"}}{{/crossLink}}扩展获取的URL，参见{{#crossLink "Entry/toURL"}}{{/crossLink}}
 * @param {Function} [successCallback] 成功回调函数
 * @param {String} successCallback.path 该参数用于返回新生成解密文件的路径
 * @param {Function} [errorCallback]  失败回调函数
 * @param {String} errorCallback.errorCode 该参数用于返回解密错误码
 * <ul>返回的解密错误码具体说明：</ul>
 * <ul>1:   文件找不到错误</ul>
 * <ul>2:   加密路径错误</ul>
 * <ul>3:   加密过程出错</ul>
 * @platform Android, iOS, WP8
 */
Security.prototype.decryptFile = function(key, sourceFilePath, targetFilePath, successCallback, errorCallback){
    argscheck.checkArgs('sssFF', 'xFace.Security.decrypt', arguments);
    if(key.length < 8) {
        if(errorCallback) {
            errorCallback("Wrong parameter of decryptFile! key length is less than 8");
        }
        return;
    }
    exec(successCallback, errorCallback, "Security", "decryptFile", [key, sourceFilePath,targetFilePath]);
};

/**
 * 根据传入的数据求MD5值，并返回该数据的MD5值（Android, iOS, WP8）<br/>
 * @example
        var data = "test1234567890";
        xFace.Security.digest(data, successCallback, errorCallback);
        function successCallback(MD5Value) {
            alert("MD5 value:" + MD5Value);
        }
        function errorCallback(errorcode) {
            alert("digest failed!");
        }
 * @method digest
 * @param {String} data 需要求MD5值的数据
 * @param {Function} [successCallback] 成功回调函数
 * @param {String} successCallback.MD5Value MD5值
 * @param {Function} [errorCallback]  失败回调函数
 * @platform Android, iOS, WP8
 */
Security.prototype.digest = function(data, successCallback, errorCallback){
    argscheck.checkArgs('sFF', 'xFace.Security.digest', arguments);
    exec(successCallback, errorCallback, "Security", "digest", [data]);
};

module.exports = new Security();

});

cordova.define("com.polyvi.xface.extension.security.SecurityOptions", function(require, exports, module) { /*
 Copyright 2012-2013, Polyvi Inc. (http://www.xface3.com)
 This program is distributed under the terms of the GNU General Public License.

 This file is part of xFace.

 xFace is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 xFace is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with xFace.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @module security
 */

 /**
  * 该类封装了加密算法配置选项（Android, iOS, WP8）<br/>
  * @class SecurityOptions
  * @platform Android, iOS
  * @since 3.0.0
  */
function SecurityOptions() {
    /**
     * 加解密用到的算法(Android, iOS, WP8)<br/>
     * @example
            //采用DES算法加密
            var options = new SecurityOptions();
            options.CryptAlgorithm = SecurityOptions.CryptAlgorithm.DES;
            xFace.Security.encrypt(key, plainText, decryptSuccess, decryptError, options);
            //采用3DES算法加密
            var options = new SecurityOptions();
            options.CryptAlgorithm = SecurityOptions.CryptAlgorithm.TRIPLE_DES;
            xFace.Security.encrypt(key, plainText, decryptSuccess, decryptError, options);
            //采用RSA算法加密
            var options = new SecurityOptions();
            options.CryptAlgorithm = SecurityOptions.CryptAlgorithm.RSA;
            xFace.Security.encrypt(key, plainText, decryptSuccess, decryptError, options);
            //采用DES算法解密
            var options = new SecurityOptions();
            options.CryptAlgorithm = SecurityOptions.CryptAlgorithm.DES;
            xFace.Security.decrypt(key, plainText, decryptSuccess, decryptError, options);
            //采用3DES算法解密
            var options = new SecurityOptions();
            options.CryptAlgorithm = SecurityOptions.CryptAlgorithm.TRIPLE_DES;
            xFace.Security.decrypt(key, plainText, decryptSuccess, decryptError, options);
            //采用RSA算法解密
            var options = new SecurityOptions();
            options.CryptAlgorithm = SecurityOptions.CryptAlgorithm.RSA;
            xFace.Security.decrypt(key, plainText, decryptSuccess, decryptError, options);
     * @property CryptAlgorithm
     * @type Number
     * @default SecurityOptions.CryptAlgorithm.DES
     * @platform Android, iOS, WP8
     * @since 3.0.0
     */
    this.CryptAlgorithm = SecurityOptions.CryptAlgorithm.DES;
    /**
     * 加密结果(解密内容)字符串编码类型(Android, iOS, WP8)
     * @example
            //加密后返回数据为Base64编码
            var options = new SecurityOptions();
            options.EncodeDataType = StringEncodeType.STRING;
            xFace.Security.encrypt(key, plainText, decryptSuccess, decryptError, options)
            //加密后返回数据为16进制编码
            var options = new SecurityOptions();
            options.EncodeDataType = StringEncodeType.HEX;
            xFace.Security.encrypt(key, plainText, decryptSuccess, decryptError, options)
            //要解密的数据格式为Base64编码
            var options = new SecurityOptions();
            options.EncodeDataType = StringEncodeType.STRING;
            xFace.Security.decrypt(key, plainText, decryptSuccess, decryptError, options)
            //要解密的数据格式为16进制编码
            var options = new SecurityOptions();
            options.EncodeDataType = StringEncodeType.HEX;
            xFace.Security.decrypt(key, plainText, decryptSuccess, decryptError, options)
     * @property EncodeDataType
     * @type Number
     * @default StringEncodeType.STRING
     * @platform Android, iOS, WP8
     * @since 3.0.0
     */
    this.EncodeDataType = StringEncodeType.Base64;
    /**
     * 加密key结果(解密key内容)字符串编码类型(Android, iOS, WP8)
     * @example
            //要加密的key格式为Base64编码
            var options = new SecurityOptions();
            options.EncodeKeyType = StringEncodeType.STRING;
            xFace.Security.encrypt(key, plainText, decryptSuccess, decryptError, options)
            //要加密的key格式为16进制编码
            var options = new SecurityOptions();
            options.EncodeKeyType = StringEncodeType.HEX;
            xFace.Security.encrypt(key, plainText, decryptSuccess, decryptError, options)
            //要解密的key格式为Base64编码
            var options = new SecurityOptions();
            options.EncodeKeyType = StringEncodeType.STRING;
            xFace.Security.decrypt(key, plainText, decryptSuccess, decryptError, options)
            //要解密的key格式为16进制编码
            var options = new SecurityOptions();
            options.EncodeKeyType = StringEncodeType.HEX;
            xFace.Security.decrypt(key, plainText, decryptSuccess, decryptError, options)
     * @property EncodeKeyType
     * @type Number
     * @default StringEncodeType.STRING
     * @platform Android, iOS, WP8
     * @since 3.0.0
     */
    this.EncodeKeyType = StringEncodeType.STRING;
}
  /**
   * 该类定义一些常量，用于标识加解密采用的算法类型（Android, iOS）<br/>
   * 相关参考： {{#crossLink "Security"}}{{/crossLink}}
   * @class CryptAlgorithm
   * @namespace SecurityOptions
   * @static
   * @platform Android, iOS, WP8
   * @since 3.0.0
   */
  SecurityOptions.CryptAlgorithm = {
    /**
     * DES加密算法
     * @property DES
     * @type Number
     * @final
     * @platform Android, iOS, WP8
     * @since 3.0.0
     */
    DES : 1,
    /**
     * 3DES加密算法
     * @property TRIPLE_DES
     * @type Number
     * @final
     * @platform Android, iOS, WP8
     * @since 3.0.0
     */
    TRIPLE_DES : 2,
    /**
     * RSA加密算法
     * @property RSA
     * @type Number
     * @final
     * @platform Android, iOS
     * @since 3.0.0
     */
    RSA : 3
  },
module.exports = SecurityOptions;

});

cordova.define("com.polyvi.xface.extension.security.StringEncodeType", function(require, exports, module) { /*
 This file was modified from or inspired by Apache Cordova.

 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements. See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership. The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License. You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied. See the License for the
 specific language governing permissions and limitations
 under the License.
*/

/**
 * @module StringEncodeType
 */

/**
 * 该类定义一些常量，用于标识String的编码格式（Android, iOS）<br/>
 * 该类的用法参考{{#crossLink "Security"}}{{/crossLink}}
 * @class StringEncodeType
 * @platform Android, iOS
 * @since 3.0.0
 */
function StringEncodeType() {
}

/**
* String为普通的string编码
* @property STRING
* @type Number
* @final
* @platform Android
* @since 3.0.0
*/
StringEncodeType.STRING = 0;
/**
* String为Base64编码
* @property Base64
* @type Number
* @final
* @platform Android
* @since 3.0.0
*/
StringEncodeType.Base64 = 1;
/**
* String为16进制格式编码
* @property HEX
* @type Number
* @final
* @platform Android
* @since 3.0.0
*/
StringEncodeType.HEX = 2;

module.exports = StringEncodeType;

});

cordova.define("com.polyvi.xface.extension.telephony.CallRecord", function(require, exports, module) { /*
 This file was modified from or inspired by Apache Cordova.

 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements. See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership. The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License. You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied. See the License for the
 specific language governing permissions and limitations
 under the License.
*/

/**
 * @module telephony
 */

 /**
 * 用来描述一个通话记录对象（Android）<br/>
 * @example
        var callRecord = new CallRecord("*", "", "*", "", null, null);
 * @param {String} [callRecordAddress=null] 电话号码
 * @param {String} [callRecordId=null] 通话记录的id号
 * @param {String} [callRecordName=null] 联系人名字
 * @param {String} [callRecordType=null] 通话记录类型
 * @param {Number} [durationSeconds=null] 通话的时长(单位是秒)
 * @param {Date} [startTime=null] 通话开始时间
 * @class CallRecord
 * @constructor
 * @platform Android
 * @since 3.0.0
 */
var CallRecord = function(callRecordAddress,callRecordId,callRecordName,callRecordType,durationSeconds,startTime){
    /**
     * 电话号码（Android）
     * @property callRecordAddress
     * @type String
     * @platform Android
     * @since 3.0.0
     */
    this.callRecordAddress = callRecordAddress || null;
    /**
     * 通话记录的id号（Android）
     * @property callRecordId
     * @type String
     * @platform Android
     * @since 3.0.0
     */
    this.callRecordId = callRecordId || null;
    /**
     * 联系人名字（Android）
     * @property callRecordName
     * @type String
     * @platform Android
     * @since 3.0.0
     */
    this.callRecordName = callRecordName || null;
    /**
     * 通话记录类型（Android）
     * @property callRecordType
     * @type String
     * @platform Android
     * @since 3.0.0
     */
    this.callRecordType = callRecordType || null;
    /**
     * 通话的时长(单位是秒)（Android）
     * @property durationSeconds
     * @type Number
     * @platform Android
     * @since 3.0.0
     */
    this.durationSeconds = durationSeconds || null;
    /**
     * 通话开始时间（Android）
     * @property startTime
     * @type Date
     * @platform Android
     * @since 3.0.0
     */
    this.startTime = startTime || null;
};
module.exports = CallRecord;

});

cordova.define("com.polyvi.xface.extension.telephony.CallRecordTypes", function(require, exports, module) { /*
 This file was modified from or inspired by Apache Cordova.

 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements. See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership. The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License. You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied. See the License for the
 specific language governing permissions and limitations
 under the License.
*/

/**
 * @module telephony
 */

 /**
 * 定义通话记录相关的类型（Android）<br/>
 * @class CallRecordTypes
 * @static
 * @platform Android
 * @since 3.0.0
 */
var CallRecordTypes = {
    /**
     * 已接电话 (Android).
     * @example
         CallRecordTypes.RECEIVED
     * @property RECEIVED
     * @type String
     * @final
     * @platform Android
     * @since 3.0.0
     */
    RECEIVED:"RECEIVED",
    /**
     * 已拨电话 (Android).
     * @example
         CallRecordTypes.OUTGOING
     * @property OUTGOING
     * @type String
     * @final
     * @platform Android
     * @since 3.0.0
     */
    OUTGOING:"OUTGOING",
    /**
     * 未接电话 (Android).
     * @example
         CallRecordTypes.MISSED
     * @property MISSED
     * @type String
     * @final
     * @platform Android
     * @since 3.0.0
     */
    MISSED:"MISSED"
};

module.exports = CallRecordTypes;

});

cordova.define("com.polyvi.xface.extension.telephony.Telephony", function(require, exports, module) { /*
 Copyright 2012-2013, Polyvi Inc. (http://www.xface3.com)
 This program is distributed under the terms of the GNU General Public License.

 This file is part of xFace.

 xFace is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 xFace is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with xFace.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * 该模块定义拨打电话和操作通话记录相关的功能
 * @module telephony
 * @main telephony
 */
var argscheck = require('cordova/argscheck'),
    CallRecord = require('./CallRecord'),
    exec = require('cordova/exec');

/**
 * 提供拨打电话和操作通话记录相关的功能（Android, iOS, WP8）<br/>
 * 该类不能通过new来创建相应的对象，只能通过xFace.Telephony对象来直接使用该类中定义的方法
 * @class Telephony
 * @static
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
var Telephony = function(){
    this.onReceived = null;
};

/**
* 当收到来电的回调函数
*/
Telephony.prototype.fire = function(callStatus) {
    if (this.onReceived) {
        this.onReceived(callStatus);
    }
};

/**
* 注册一个监听器, 当手机收到来电的时候，该监听器会被回调(Android, iOS, WP8)<br/>
* @example
        xFace.Telephony.registerOnCallReceivedListener(printCallStatus);
        function printCallStatus(info){
                alert(info);
            }
*@method registerOnCallReceivedListener
*@param {Function} listener 收到来电的监听
*@param {String} listener.status 收到来电的状态内容
*@platform Android, iOS, WP8
*@since 3.0.0
*/
Telephony.prototype.registerOnCallReceivedListener = function(listener) {

    argscheck.checkArgs('f', 'Telephony.registerOnCallReceivedListener', arguments);
    this.onReceived = listener;
    exec(null, null,"Telephony", "registerOnCallReceivedListener", []);

};

/**
 * 拨打电话 (Android, iOS, WP8)
 * @example
        function call() {
            xFace.Telephony.initiateVoiceCall("114",callSuccess, callFail);
        }
        function success() {
            alert("success");
        }
        function fail() {
            alert("fail to scanner barcode" );
        }
 * @method initiateVoiceCall
 * @param {String} phoneNumber 电话号码
 * @param {Function} [successCallback] 成功回调函数
 * @param {Function} [errorCallback] 失败回调函数
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
Telephony.prototype.initiateVoiceCall = function(phoneNumber,successCallback,errorCallback){
    argscheck.checkArgs('sFF', 'xFace.Telephony.initiateVoiceCall', arguments);
    exec(successCallback, errorCallback, "Telephony", "initiateVoiceCall", [phoneNumber]);
};

/**
 * 删除指定通话记录类型的所有通话记录 (Android)
 *@example
       //删除已拨电话通话记录
       xFace.Telephony.deleteAllCallRecords(CallRecordTypes.OUTGOING,
       deleteAllCallRecordsSuccess,deleteAllCallRecordsError);
       function deleteAllCallRecordsSuccess(){
           alert("success!");
       }
       function deleteAllCallRecordsError(){
           alert("fail!");
       }
 * @method deleteAllCallRecords
 * @for Telephony
 * @param {String} callRecordType 通话记录类型,具体用法请参考相关链接{{#crossLink "CallRecordTypes"}}{{/crossLink}}
 * @param {Function} [successCallback] 成功回调函数
 * @param {Function} [errorCallback] 失败回调函数
 * @platform Android
 */
Telephony.prototype.deleteAllCallRecords = function(callRecordType,successCallback,errorCallback){
    argscheck.checkArgs('sFF', 'Telephony.deleteAllCallRecords', arguments);
    exec(successCallback, errorCallback,"Telephony", "deleteAllCallRecords", [callRecordType]);
};

/**
 * 删除指定通话记录类型和指定id的通话记录 (Android)
 * @example
        //删除拨出电话id为0的通话记录
        xFace.Telephony.deleteCallRecord(CallRecordTypes.OUTGOING,
        "0",deleteCallRecordSuccess,deleteCallRecordError);
        function deleteCallRecordSuccess(){
            alert("delete " + CallRecordTypes.OUTGOING + " 0 is success!");
        }
        function deleteCallRecordError(){
            alert("delete " + CallRecordTypes.OUTGOING + " 0 is fail!");
        }
 * @method deleteCallRecord
 * @param {String} callRecordType 通话记录类型,具体用法请参考相关链接{{#crossLink "CallRecordTypes"}}{{/crossLink}}
 * @param {String} id 通话记录的id号(不能为非数字的字符串),具体用法请参考相关链接{{#crossLink "CallRecord"}}{{/crossLink}}的callRecordId属性
 * @param {Function} [successCallback] 成功回调函数
 * @param {Function} [errorCallback] 失败回调函数
 * @platform Android
 */
Telephony.prototype.deleteCallRecord = function(callRecordType,id,successCallback,errorCallback){
    argscheck.checkArgs('ssFF', 'Telephony.deleteCallRecord', arguments);
    exec(successCallback, errorCallback,"Telephony", "deleteCallRecord", [callRecordType,id]);
};

/**
 * 获取指定通话记录类型和id的通话记录 (Android)
 * @example
        //获取已拨打电话里的第一条通话记录
        xFace.Telephony.getCallRecord(CallRecordTypes.OUTGOING,
        "1",getCallRcdSuccess,getCallRcdError);
        function getCallRcdSuccess(callRecord){
            if(null == callRecord.callRecordId){
                alert("指定id的该通话记录不存在！");
                return;
            }
            alert(callRecord.callRecordAddress);
            alert(callRecord.callRecordId);
            alert(callRecord.callRecordName);
            alert(callRecord.callRecordType);
            if(typeof callRecord.durationSeconds == undefined){
            alert(0);
            }else{
                alert(callRecord.durationSeconds);
            }
        }
        function getCallRcdError(){
            alert(CallRecordTypes.OUTGOING + " 1 " + "  getCallRecord Error");
        }
 * @method getCallRecord
 * @param {String} callRecordType 通话记录类型,具体用法请参考相关链接{{#crossLink "CallRecordTypes"}}{{/crossLink}}
 * @param {String} index 通话记录的索引(不能为非数字的字符串)
 * @param {Function} [successCallback] 成功回调函数
 * @param {CallRecord} successCallback.callRecord 指定通话记录类型和id的通话记录。具体用法请参考相关链接{{#crossLink "CallRecord"}}{{/crossLink}}
 * @param {Function} [errorCallback] 失败回调函数
 * @platform Android
 */
Telephony.prototype.getCallRecord = function(callRecordType,index,successCallback,errorCallback){
    argscheck.checkArgs('ssfF', 'Telephony.getCallRecord', arguments);
    var success = function(result){
        var callRecord = new CallRecord(result.callRecordAddress,result.callRecordId,result.callRecordName,
                                        result.callRecordType,result.durationSeconds,new Date(result.startTime));
        successCallback(callRecord);
    };
    exec(success, errorCallback,"Telephony", "getCallRecord", [callRecordType,index]);
};

/**
 * 按照带匹配的通话记录查找指定范围内的通话记录 (Android)
 * @example
        //联系人使用"*"通配，电话号码也使用"*"通配，其余字段不考虑，查找的是取结果的第2至4条记录
        var compairedCallRecord = new CallRecord("*","","*","",null,null);
        xFace.Telephony.findCallRecords(compairedCallRecord,1,3,success,fail);
        function success(result){
            alert("找到了" + result.length +" 条通话记录");
        }
        function fail() {
            alert("failed");
        }
 * @method findCallRecords
 * @param {CallRecord} comparisonCallRecord 查找带匹配属性的通话记录,具体用法请参考相关链接{{#crossLink "CallRecord"}}{{/crossLink}}
 * @param {Number} startIndex 开始位置索引(不能为负数)
 * @param {Number} endIndex 结束位置索引(不能为负数)
 * @param {Function} [successCallback] 成功回调函数
 * @param {Array} successCallback.callRecords 该数组对象
 * 中的每个元素为一个{{#crossLink "CallRecord"}}{{/crossLink}}类型对象。
 * @param {Function} [errorCallback] 失败回调函数
 * @platform Android
 */
Telephony.prototype.findCallRecords = function(comparisonCallRecord,startIndex,endIndex,successCallback,errorCallback){
    argscheck.checkArgs('onnfF', 'Telephony.findCallRecords', arguments);
    if(startIndex < 0 && endIndex < 0){
        throw "ivalid_parameter";
    }
    var comparison = {callRecordAddress:"*",callRecordId:"",callRecordName:"*",callRecordType:"",durationSeconds:-1,startTime:-1};
    if(null !== comparisonCallRecord){
        comparison.callRecordAddress = comparisonCallRecord.callRecordAddress === null ? "" : comparisonCallRecord.callRecordAddress;
        comparison.callRecordId = comparisonCallRecord.callRecordId === null ? "" : comparisonCallRecord.callRecordId;
        comparison.callRecordName = comparisonCallRecord.callRecordName === null ? "" : comparisonCallRecord.callRecordName;
        comparison.callRecordType = comparisonCallRecord.callRecordType === null ? "" : comparisonCallRecord.callRecordType;
        comparison.durationSeconds = comparisonCallRecord.durationSeconds === null ? -1 : comparisonCallRecord.durationSeconds;//如果该项留空则将该项值设为-1,java层检查是否为-1，-1表示留空忽略该项
        comparison.startTime = comparisonCallRecord.startTime === null ? -1 : (comparisonCallRecord.startTime.getTime());//如果该项留空则将该项值设为-1,java层检查是否为-1，-1表示留空忽略该项
    }
    var success = function(result){
        var len = result.length;
        var callRecordArr = [];
        for(var i = 0 ; i < len ; i++){
            var callRecord = new CallRecord(result[i].callRecordAddress,result[i].callRecordId,result[i].callRecordName,
                                        result[i].callRecordType,result[i].durationSeconds,new Date(result[i].startTime));
            callRecordArr.push(callRecord);
        }
        successCallback(callRecordArr);
    };
    exec(success, errorCallback,"Telephony", "findCallRecords", [comparison,startIndex,endIndex]);
};

/**
 * 获取指定通话记录类型的通话记录总数 (Android)
 * @example
        xFace.Telephony.getCallRecordCount(CallRecordTypes.OUTGOING,
        getCallRecordCountSuccess,getCallRecordCountError);
        function getCallRecordCountSuccess(count){
            alert(CallRecordTypes.OUTGOING + " count is : " + count);
        }
        function getCallRecordCountError(){
            alert("get " + CallRecordTypes.OUTGOING + " count fail");
        }
 * @method getCallRecordCount
 * @for Telephony
 * @param {String} callRecordType 通话记录类型,具体用法请参考相关链接{{#crossLink "CallRecordTypes"}}{{/crossLink}}
 * @param {Function} successCallback 成功回调函数
 * @param {Number} successCallback.count 通话记录总条数
 * @param {Function} [errorCallback] 失败回调函数
 * @platform Android
 */
Telephony.prototype.getCallRecordCount = function(callRecordType,successCallback,errorCallback){
    argscheck.checkArgs('sfF', 'Telephony.findCallRecords', arguments);
    var success = function(result){
        successCallback(result);
    };
    exec(success, errorCallback,"Telephony", "getCallRecordCount", [callRecordType]);
};

module.exports = new Telephony();
});

cordova.define("com.polyvi.xface.extension.trafficstats.TrafficStats", function(require, exports, module) { 
/**
 * TrafficStats模块提供流量统计功能
 * @module trafficStats
 * @main trafficStats
 */

  var exec = require('cordova/exec');
  var argscheck = require('cordova/argscheck');

 /**
  *TrafficStats模块提供流量统计功能 (Android) <br/>
  *直接使用xFace.TrafficStats对象来获取流量的相关信息，获取的流量是从应用启动到调用接口其间的网络流量，
  * @class TrafficStats
  * @platform Android
  */
  var TrafficStats = function() {};

/**
 * 获取2G和3G网络的网络流量
  @example
        xFace.getMobileTraffic( function(trafficData)
        {
            alert(trafficData);
        },null);
 * @method getMobileTraffic
 * @param {Function} successCallback 成功回调函数
 * @param {String} successCallback.trafficData 网络流量,单位为KB
 * @param {Function} [errorCallback]   失败回调函数
 * @platform Android
 * @since 3.0.0
 */
  TrafficStats.prototype.getMobileTraffic = function(successCallback, errorCallback){
    argscheck.checkArgs('fF','TrafficStats.getMobileTraffic', arguments);
    exec(successCallback, errorCallback, "TrafficStats", "getMobileTraffic", []);
  };

/**
 * 获取Wifi网络流量
  @example
        xFace.getWifiTraffic(
        function(trafficData)
        {
            alert(trafficData);
        },null);
 * @method getWifiTraffic
 * @param {Function} successCallback 成功回调函数
 * @param {String} successCallback.trafficData 网络流量,单位为KB
 * @param {Function} [errorCallback]   失败回调函数
 * @platform Android
 * @since 3.0.0
 */
  TrafficStats.prototype.getWifiTraffic = function(successCallback, errorCallback){
    argscheck.checkArgs('fF','TrafficStats.getWifiTraffic', arguments);
    exec(successCallback, errorCallback, "TrafficStats", "getWifiTraffic", []);
  };

  module.exports = new TrafficStats();

});

cordova.define("com.polyvi.xface.extension.xapp.SysComponent", function(require, exports, module) { 
/*
 This file was modified from or inspired by Apache Cordova.

 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements. See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership. The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License. You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied. See the License for the
 specific language governing permissions and limitations
 under the License.
*/

/**
 * @module app
 */

/**
 * 该类定义一些常量，用于标识系统中的特定程序（Android）<br/>
 * 该类的用法参考{{#crossLink "App/startSystemComponent"}}{{/crossLink}}
 * @class SysComponent
 * @platform Android
 * @since 3.0.0
 */
function SysComponent() {
}

/**
 * 用于标识VPN设置界面（Android）
 * @property VPN
 * @type Number
 * @static
 * @final
 * @platform Android
 * @since 3.0.0
 */
SysComponent.VPN = 0;

/**
 * 用于标识网络设置界面（Android）
 * @property WIRELESS
 * @type Number
 * @static
 * @final
 * @platform Android
 * @since 3.0.0
 */
SysComponent.WIRELESS = 1;

/**
 * 用于标识GPS设置界面（Android）
 * @property GPS
 * @type Number
 * @static
 * @final
 * @platform Android
 * @since 3.0.0
 */
SysComponent.GPS = 2;

module.exports = SysComponent;
});

cordova.define("com.polyvi.xface.extension.xapp.app", function(require, exports, module) { /*
 This file was modified from or inspired by Apache Cordova.

 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements. See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership. The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License. You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied. See the License for the
 specific language governing permissions and limitations
 under the License.
*/

/**
 * @module app
 */
var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec');

module.exports = {
	openUrl : function(url, successCallback, errorCallback){
        argscheck.checkArgs('sFF', 'XApp.openUrl', arguments);
        exec(successCallback, errorCallback, "XApp", "openUrl", [url]);
	},

	startNativeApp : function(packageName, parameter, successCallback, errorCallback){
        argscheck.checkArgs('sSFF', 'XApp.startNativeApp', arguments);
        exec(successCallback, errorCallback, "XApp", "startNativeApp", [packageName, parameter]);
    },

	isNativeAppInstalled : function(packageName, successCallback, errorCallback){
        argscheck.checkArgs('sFF', 'XApp.isNativeAppInstalled', arguments);
        exec(successCallback, errorCallback, "XApp", "isNativeAppInstalled", [packageName]);
    },

	telLinkEnable : function(isTelLinkEnable, successCallback, errorCallback){
        argscheck.checkArgs('bFF', 'XApp.telLinkEnable', arguments);
        exec(successCallback, errorCallback, "XApp", "telLinkEnable", [isTelLinkEnable]);
    },

	setWifiSleepPolicy : function(wifiSleepPolicy,successCallback, errorCallback){
        argscheck.checkArgs('sFF', 'XApp.setWifiSleepPolicy', arguments);
        exec(successCallback, errorCallback, "XApp", "setWifiSleepPolicy", [wifiSleepPolicy]);
    },

    startSystemComponent : function(name, successCallback, errorCallback){
        argscheck.checkArgs('nFF', 'XApp.startSystemComponent', arguments);
        exec(successCallback, errorCallback, "XApp", "startSystemComponent", [name]);
    },

	install : function(path, successCallback, errorCallback){
        argscheck.checkArgs('sFF', 'XApp.install', arguments);
        exec(successCallback, errorCallback, "XApp", "install", [path]);
    },

    /**
     * 获取native应用程序的列表（Android）
     * @example
            navigator.app.queryInstalledNativeApp('0', successCallback, errorCallback);
            function successCallback(apps) {
                var count = apps.length;
                alert(count + " InstalledApps.");
                for(var i = 0; i < count; i++) {
                    console.log(apps[i].id);
                    console.log(apps[i].name);
                    console.log(apps[i].icon);
                }
            }
            function errorCallback() {
                alert("error!");
            }
     * @method queryInstalledNativeApp
     * @param {String} type native应用的类型,0代表所有naive程序，1代表用户安装的native程序，2代表系统应用
     * @param {Function} successCallback       获取列表成功时的回调函数
     * @param {Array}  successCallback.app 当前指定类型已经安装的app列表，每个app对象包含如下属性,
     * @param {String} successCallback.app.id    NativeApp的包名
     * @param {String} successCallback.app.name  NativeApp的名字
     * @param {String} successCallback.app.icon  NativeApp的图标(base64数据)
     * @param {Function} [errorCallback]         获取列表失败时的回调函数
     * @for App
     * @platform Android
     * @since 3.1
     */
    queryInstalledNativeApp : function(type, successCallback, errorCallback){
        argscheck.checkArgs('sfF', 'XApp.queryInstalledNativeApp', arguments);
        if(type != '0' && type != '1' && type != '2') {
            var errMsg = "Wrong type for parameter, expected parameter is '0' or '1' or '2'.";
            throw TypeError(errMsg);
        }
        exec(successCallback, errorCallback, "XApp", "queryInstalledNativeApp", [type]);
    },

    /**
     * 卸载指定的native程序（Android）
     * @example
            navigator.app.uninstallNativeApp("com.polyvi.test", successCallback, errorCallback);
            function successCallback() {
               alert("uninstall success!");
            }
            function errorCallback() {
                alert("uninstall fail!");
            }
     * @method uninstallNativeApp
     * @param {String} packageName 应用ID(包名)
     * @param {Function} [successCallback] 成功回调函数
     * @param {Function} [errorCallback] 失败回调函数
     * @for App
     * @platform Android
     * @since 3.1
     */
    uninstallNativeApp : function(packageName, successCallback, errorCallback){
        argscheck.checkArgs('sFF', 'XApp.uninstallNativeApp', arguments);
        exec(successCallback, errorCallback, "XApp", "uninstallNativeApp", [packageName]);
    }

};

});

cordova.define("com.polyvi.xface.extension.xmlhttprequest.XMLHttpRequest", function(require, exports, module) {  var argscheck = require('cordova/argscheck'),
     exec = require('cordova/exec'),
     utils = require('cordova/utils');

/**
  * 该类定义了AJAX请求对象相关接口（Android, iOS）<br/>
  * 该类通过new来创建相应的对象<br/>
  * @class XMLHttpRequest
  * @example
        var xhr = new xFace.XMLHttpRequest(); //构造ajax对象
  * @namespace xFace
  * @constructor
  * @platform Android, iOS
  * @since 3.0.0
  */
var XMLHttpRequest = function()
{
   /**
     *  每次 readyState 属性改变的时候调用的事件句柄函数（Android，iOS）<br/>
     * @property onreadystatechange
     * @type Function
     * @platform Android, iOS
     * @since 3.0.0
     */
    this.onreadystatechange = null;

   /**
     * HTTP请求发生网络错误时调用的句柄函数（Android，iOS）<br/>
     * @property onerror
     * @type Function
     * @platform Android, iOS
     * @since 3.0.0
     */
    this.onerror = null;

   /**
     * HTTP请求被中断时调用的句柄函数,比如调用abort方法 该句柄函数会被触发（Android，iOS）<br/>
     * @property onabort
     * @type Function
     * @platform Android, iOS
     * @since 3.0.0
     */
   this.onabort = null;

    /**
      * HTTP 请求的状态.当一个 XMLHttpRequest 初次创建时，这个属性的值从 0 开始，直到接收到完整的 HTTP 响应，这个值增加到 4（Android，iOS）<br/>
        状态                           名称                                        描述<br/>
         0       UNSEND               初始化状态, XMLHttpRequest 对象已创建或已被 abort() 方法重置；<br/>
         1       OPENED               open()方法已调用；<br/>
         2       HEADERS_RECEIVED     所有响应头部都已经接收到 <br/>
         3       LOADING              正在接收服务器响应体数据 <br/>
         4       DONE                 数据接收完毕或者请求被中断 <br/>
      * @property readyState
      * @type Number
      * @platform Android, iOS
      * @since 3.0.0
      */
    this.readyState = 0;

    /**
      * 从服务器接收到的响应体（不包括头部），或者如果还没有接收到数据的话，就是空字符串（Android，iOS）<br/>
      * @property responseText
      * @type String
      * @platform Android, iOS
      * @since 3.0.0
      */
    this.responseText = null;

    /**
      * 由服务器返回的 HTTP 状态代码，如 200 表示成功，而 404 表示 "Not Found" 错误（Android，iOS）<br/>
      * @property status
      * @type  Number
      * @platform Android, iOS
      * @since 3.0.0
      */
    this.status = 0;
    this.id = utils.createUUID(); // 这里通过uuid标示每个ajax对象
    this.headers = null;
    var me = this;
    this.success =function(result){
        if(typeof me.onreadystatechange === "function" ){
            me.readyState = result.readyState;
            me.status = result.status;
            me.responseText = result.responseText;
            me.headers = result.headers;
            me.onreadystatechange();
        }
    };
    this.failure = function(result){
        me.readyState = result.readyState;
        me.status = result.status;
        me.responseText = result.responseText;
        me.headers = result.headers;

        var type = result.eventType;
        if( type == 1 && typeof me.onerror == "function"){
            me.onerror();
        }else if(type === 0 && typeof me.onabort == "function"){
            me.onabort();
        }
    };
};

/**
  *  返回指定的 HTTP 响应头部的值。其参数是要返回的 HTTP 响应头部的名称（Android, iOS）<br/>
  *  @example
        var client = new xFace.XMLHttpRequest();
        client.open("GET", "http://www.polyvi.net:8012/develop/Ajax/ajax_get.php");
        client.send();
        client.onreadystatechange = function() {
         if(this.readyState == 2) {
           print(client.getResponseHeader("Content-Type"));
         }
}
  *  @method getResponseHeader
  * @param {String} name 需要返回的HTTP响应头部的名称
  *  @platform Android, iOS
  *  @since 3.0.0
  */
XMLHttpRequest.prototype.getResponseHeader = function(name)
{
  argscheck.checkArgs('s', 'XMLHttpRequest.getResponseHeader', arguments);
  return this.headers[name];
};


/**
  *  把 HTTP 响应头部作为未解析的字符串返回,如果 readyState 小于 3，这个方法返回 null。否则，它返回服务器发送的所有 HTTP 响应的头部。
     头部作为单个的字符串返回，一行一个头部。每行用换行符 "\r\n" 隔开（Android, iOS）<br/>
  *  @example
        var client = new xFace.XMLHttpRequest();
        client.open("GET", "http://www.polyvi.net:8012/develop/Ajax/ajax_get.php");
        client.send();
        client.onreadystatechange = function() {
        if(this.readyState == 2) {
           print(this.getAllResponseHeaders());
         }
}
  *  @method getAllResponseHeaders
  *  @platform Android, iOS
  *  @since 3.0.0
  */
XMLHttpRequest.prototype.getAllResponseHeaders = function()
{
    var str = "";
    for(var p in this.headers)
    {
        if(typeof(this.headers[p]) == "string")
        {
            str =str + p + ": " +  this.headers[p] + "\r\n";
        }
    }
    return str;
};

/**
  *  初始化 HTTP 请求参数，例如 URL 和 HTTP 方法(注意目前仅仅支持 GET 和 POST 方法 )但不发送请求，仅仅支持异步（Android, iOS）<br/>
  *  @example
        var client = new xFace.XMLHttpRequest();
        client.open("GET", "http://www.polyvi.net:8012/develop/Ajax/ajax_get.php");
        client.send();
        client.onreadystatechange = function() {
         if(this.readyState == 4) {
      print(this.getAllResponseHeaders());
        }
}
  *  @method open
  *  @param {String} method 用于请求HTTP的方法 值包括POST, GET
  *  @param {String} url 请求的host地址(仅仅支持http和https)
  *  @platform Android, iOS
  *  @since 3.0.0
  */
XMLHttpRequest.prototype.open = function(method, url){
    argscheck.checkArgs('ss', 'XMLHttpRequest.open', arguments);
    exec(this.success, this.failure, 'XMLHttpRequest', 'open', [this.id, method, url]);
};
/**
  *  发送 HTTP 请求，使用传递给 open() 方法的参数，以及传递给该方法的可选请求体（Android, iOS）<br/>
  *  @example
        var client = new xFace.XMLHttpRequest();
        client.open("GET", "http://www.polyvi.net:8012/develop/Ajax/ajax_get.php");
        client.send();
        client.onreadystatechange = function() {
        if(this.readyState == 4) {
        print(this.getAllResponseHeaders());
        }
}
  *  @method send
  *  @param {String} [data] 向服务器post的数据
  *  @platform Android, iOS
  *  @since 3.0.0
  */
XMLHttpRequest.prototype.send = function(data){
    argscheck.checkArgs('S', 'XMLHttpRequest', 'send', arguments);
    exec(null, null,'XMLHttpRequest', 'send', [this.id, data]);
};

/**
  *  取消当前响应，关闭连接并且结束任何未决的网络活动，这个方法把 XMLHttpRequest 对象重置为 readyState 为 0 的状态，并且取消所有未决的网络活动。例如，如果请求用了太长时间，而且响应不再必要的时候，可以调用这个方法（Android, iOS）<br/>
  *  @example
        var client = new xFace.XMLHttpRequest();
        client.open("GET", "http://www.polyvi.net:8012/develop/Ajax/ajax_get.php");
        client.send();
        client.abort();
        client.onabort = function(){alert('abort');}
}
  *  @method abort
  *  @platform Android, iOS
  *  @since 3.0.0
  */
XMLHttpRequest.prototype.abort = function(){
    exec(null, null, 'XMLHttpRequest', 'abort', [this.id]);
};

/**
  *  向一个打开但未发送的请求设置或添加一个 HTTP 请求头部（Android, iOS）<br/>
  *  @example
      var client = new xFace.XMLHttpRequest();
      client.open("GET", "http://www.polyvi.net:8012/develop/Ajax/ajax_get.php");
      client.setRequestHeader("agent","xface");
      client.send();
  *  @method setRequestHeader
  *  @param {String} name 头部的名称
  *  @param {String} value 头部的值
  *  @platform Android, iOS
  *  @since 3.0.0
  */
XMLHttpRequest.prototype.setRequestHeader= function(name, value){
    exec(null, null, 'XMLHttpRequest', 'setRequestHeader' , [this.id, name, value]);
};

module.exports = XMLHttpRequest;


});

cordova.define("com.polyvi.xface.extension.zbar.Zbar", function(require, exports, module) { /*
 Copyright 2012-2013, Polyvi Inc. (http://www.xface3.com)
 This program is distributed under the terms of the GNU General Public License.

 This file is part of xFace.

 xFace is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 xFace is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with xFace.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * 该模块提供条形码扫描的功能
 * @module barcodeScanner
 * @main barcodeScanner
 */

 /**
  * BarcodeScanner扩展提供条形码扫描的功能（Android, iOS, WP8）<br/>
  * 该类不能通过new来创建相应的对象，只能通过xFace.BarcodeScanner对象来直接使用该类中定义的方法
  * @class BarcodeScanner
  * @static
  * @platform Android, iOS, WP8
  * @since 3.0.0
  */
var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec');
function BarcodeScanner(){}

/**
 * 启动条形码扫描器（Android, iOS, WP8）<br/>
 * 该方法通过异步方式尝试扫描条形码。如果扫描成功，成功回调被调用并传回barcode的字符串；否则失败回调被调用。
  @example
      function start() {
          xFace.BarcodeScanner.start(success, fail);
      }
      function success(barcode) {
          alert(barcode);
          alert("success");
      }
      function fail() {
          alert("fail to scanner barcode" );
      }
 * @method start
 * @param {Function} successCallback   成功回调函数
 * @param {String} successCallback.barcode 扫描码结果
 * @param {Function} [errorCallback]   失败回调函数
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
BarcodeScanner.prototype.start = function(successCallback, errorCallback){
    argscheck.checkArgs('fF', 'BarcodeScanner.start', arguments);
    exec(successCallback, errorCallback, "BarcodeScanner", "start", []);
};
module.exports = new BarcodeScanner();

});

cordova.define("com.polyvi.xface.extension.zip.Zip", function(require, exports, module) { 
/*
 Copyright 2012-2013, Polyvi Inc. (http://www.xface3.com)
 This program is distributed under the terms of the GNU General Public License.

 This file is part of xFace.

 xFace is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 xFace is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with xFace.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * 该模块定义与压缩与解压缩相关的一些功能.
 * @module zip
 * @main zip
 */

/**
 * 该类定义了压缩与解压缩相关接口（Android, iOS, WP8）<br/>
 * 该类不能通过new来创建相应的对象，只能通过xFace.Zip对象来直接使用该类中定义的方法
 * 相关参考： {{#crossLink "ZipError"}}{{/crossLink}}
 * @class Zip
 * @static
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec');
var ZipError = require('./ZipError');
var Zip = function() {};

/**
 * 将指定路径的文件或文件夹压缩成zip文件（Android, iOS, WP8）<br/>
 * 成功回调函数不带参数<br/>
 * 错误回调函数带有一个Number类型的参数，用于返回错误码，错误码的定义参见{{#crossLink "ZipError"}}{{/crossLink}}<br/>
 * @example
        var filePath ="MyFile.txt";
        var zipFilePath ="MyZip.zip";
        var zipFilePath2 ="mypath/MyZip.zip";
        function Success() {
                alert("zip file success" );
            }
        function Error(errorcode) {
                alert("zip file error: errorcode = " + errorcode);
            }

        xFace.Zip.zip(filePath, zipFilePath, Success, Error, {password:"test"}); //表明将文件压缩到当前目录，压缩文件的名字为MyZip.zip
        xFace.Zip.zip(filePath, zipFilePath2, Success, Error); //表明将文件压缩到当前目录的mypath文件夹下,压缩文件的名字为MyZip.zip
 * @method zip
 * @param {String} filePath 待压缩的文件路径<br/>
 *        文件路径支持的类型：<br/>
 *          1.相对路径，例如："myPath/test.txt"，则默认在app的workspace下<br/>
 *          2.全路径，例如："/myPath/..."<br/>
 *          3.file://协议URL，例如："file:///myPath/..."<br/>
 *          4.通过{{#crossLink "File"}}{{/crossLink}}扩展获取的URL，参见{{#crossLink "Entry/toURL"}}{{/crossLink}}
 * @param {String} dstFilePath 指定目标文件路径(含 .zip 后缀)
 *        文件路径支持的类型：<br/>
 *          1.相对路径，例如："myPath/test.zip"，则默认在app的workspace下<br/>
 *          2.全路径，例如："/myPath/..."<br/>
 *          3.file://协议URL，例如："file:///myPath/..."<br/>
 *          4.通过{{#crossLink "File"}}{{/crossLink}}扩展获取的URL，参见{{#crossLink "Entry/toURL"}}{{/crossLink}}
 * @param {Object} [options]     压缩文件时采用的配置选项（目前仅ios支持），属性包括：<br/>
        password：类型为String，用于指定压缩时的密码
 * @param {Function} [successCallback] 成功回调函数
 * @param {Function} [errorCallback]   失败回调函数
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
Zip.prototype.zip = function(filePath, dstFilePath, successCallback, errorCallback,options){
    argscheck.checkArgs('ssFFO', 'xFace.Zip.zip', arguments);
    if((filePath == "" ||  dstFilePath == "") && errorCallback){
        errorCallback(ZipError.FILE_NOT_EXIST);
        return;
    }
    exec(successCallback, errorCallback, "Zip", "zip", [filePath,dstFilePath,options]);
};

/**
 * 将指定路径的zip文件解压（Android, iOS, WP8）<br/>
 * 成功回调函数不带参数<br/>
 * 错误回调函数带有一个Number类型的参数，用于返回错误码，错误码的定义参见{{#crossLink "ZipError"}}{{/crossLink}}<br/>
 * @example
        var dstFolderPath = "MyDstFolder";
        var zipFilePath ="MyZip.zip";
        function Success() {
                alert("zip file success" );
            }
        function Error(errorcode) {
                alert("zip file error: errorcode = " + errorcode);
            }

        xFace.Zip.unzip(zipFilePath, dstFolderPath, Success, Error, {password:"test"});
 * @method unzip
 * @param {String} zipFilePath 待解压的指定路径的zip文件
 *        文件路径支持的类型：<br/>
 *          1.相对路径，例如："myPath/test.zip"，则默认在app的workspace下<br/>
 *          2.全路径，例如："/myPath/..."<br/>
 *          3.file://协议URL，例如："file:///myPath/..."<br/>
 *          4.通过{{#crossLink "File"}}{{/crossLink}}扩展获取的URL，参见{{#crossLink "Entry/toURL"}}{{/crossLink}}
 * @param {String} dstFolderPath 指定目标文件夹（如果为空串的话，就解压到当前app workspace目录；Android不支持路径为空）
 *        文件路径支持的类型：<br/>
 *          1.相对路径，例如："myPath/MyDstFolder"，则默认在app的workspace下<br/>
 *          2.全路径，例如："/myPath/..."<br/>
 *          3.file://协议URL，例如："file:///myPath/..."<br/>
 *          4.通过{{#crossLink "File"}}{{/crossLink}}扩展获取的URL，参见{{#crossLink "Entry/toURL"}}{{/crossLink}}
 * @param {Object} [options]  解压文件时采用的配置选项（目前仅ios支持），属性包括：<br/>
        password：类型为String，用于指定解压时的密码
 * @param {Function} [successCallback] 成功回调函数
 * @param {Function} [errorCallback]   失败回调函数
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
Zip.prototype.unzip = function(zipFilePath, dstFolderPath, successCallback, errorCallback,options){
    argscheck.checkArgs('ssFFO', 'xFace.Zip.unzip', arguments);
    if(zipFilePath == "" && errorCallback){
        errorCallback(ZipError.FILE_NOT_EXIST);
        return;
    }
    //zip文件类型检查（zip/xpa/xspa）
    var arr = zipFilePath.split(".");
    var suffix = arr[arr.length -1];
    console.log("file type: "+ suffix);
    if("zip" == suffix || "xpa" == suffix || "xspa" == suffix) {
        exec(successCallback, errorCallback, "Zip", "unzip", [zipFilePath,dstFolderPath,options]);
    }
    else {
        if( errorCallback && (typeof errorCallback == 'function') ) {
            errorCallback(ZipError.FILE_TYPE_ERROR);
        }
    }
};

/**
 * 将多个指定路径的文件或文件夹压缩成zip文件（Android, iOS, WP8）<br/>
 * 成功回调函数不带参数<br/>
 * 错误回调函数带有一个Number类型的参数，用于返回错误码，错误码的定义参见{{#crossLink "ZipError"}}{{/crossLink}}<br/>
 * @example
        var zipFilePath ="MyZip.zip";
        function Success() {
                alert("zip file success" );
            }
        function Error(errorcode) {
                alert("zip file error: errorcode = " + errorcode);
            }

        xFace.Zip.zipFiles(["MyZip", "test.apk", "index.html"],
                        zipFilePath, Success, Error, {password:"test"});
 * @method zipFiles
 * @param {Array} srcEntries  待压缩文件或文件夹的路径数组，String类型的Array
 *        文件路径支持的类型：<br/>
 *          1.相对路径，例如："myPath/test.txt"，则默认在app的workspace下<br/>
 *          2.全路径，例如："/myPath/..."<br/>
 *          3.file://协议URL，例如："file:///myPath/..."<br/>
 *          4.通过{{#crossLink "File"}}{{/crossLink}}扩展获取的URL，参见{{#crossLink "Entry/toURL"}}{{/crossLink}}
 * @param {String} dstFilePath  指定目标文件路径(含 .zip 后缀)
 *        文件路径支持的类型：<br/>
 *          1.相对路径，例如："myPath/test.zip"，则默认在app的workspace下<br/>
 *          2.全路径，例如："/myPath/..."<br/>
 *          3.file://协议URL，例如："file:///myPath/..."<br/>
 *          4.通过{{#crossLink "File"}}{{/crossLink}}扩展获取的URL，参见{{#crossLink "Entry/toURL"}}{{/crossLink}}
 * @param {Object} [options]      压缩文件时采用的配置选项（目前仅ios支持），属性包括：<br/>
        password：类型为String，用于指定压缩时的密码
 * @param {Function} [successCallback] 成功回调函数
 * @param {Function} [errorCallback]   失败回调函数
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
Zip.prototype.zipFiles = function(srcEntries, dstFilePath, successCallback, errorCallback, options){
    argscheck.checkArgs('asFFO', 'xFace.Zip.zipFiles', arguments);
    if(dstFilePath == "" && errorCallback){
        errorCallback(ZipError.FILE_NOT_EXIST);
        return;
    }
    exec(successCallback, errorCallback, "Zip", "zipFiles", [srcEntries, dstFilePath, options]);
};

module.exports = new Zip();

});

cordova.define("com.polyvi.xface.extension.zip.ZipError", function(require, exports, module) { 
/*
 Copyright 2012-2013, Polyvi Inc. (http://www.xface3.com)
 This program is distributed under the terms of the GNU General Public License.

 This file is part of xFace.

 xFace is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 xFace is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with xFace.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @module zip
 */

/**
 * 该类定义一些常量，用于标识压缩和解压失败的错误信息（Android, iOS, WP8）<br/>
 * 相关参考： {{#crossLink "Zip"}}{{/crossLink}}
 * @class ZipError
 * @static
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */

var ZipError = function() {
};

/**
 * 待压缩的文件或文件夹不存在（Android, iOS, WP8）
 * @property FILE_NOT_EXIST
 * @type Number
 * @static
 * @final
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
ZipError.FILE_NOT_EXIST = 1;

/**
 * 压缩文件出错.（Android, iOS, WP8）
 * @property COMPRESS_FILE_ERROR
 * @type Number
 * @static
 * @final
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
ZipError.COMPRESS_FILE_ERROR = 2;

/**
 * 解压文件出错.（Android, iOS, WP8）
 * @property UNZIP_FILE_ERROR
 * @type Number
 * @static
 * @final
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
ZipError.UNZIP_FILE_ERROR = 3;

/**
 * 文件类型错误,不支持的文件类型（Android, iOS, WP8）
 * @property FILE_TYPE_ERROR
 * @type Number
 * @static
 * @final
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
ZipError.FILE_TYPE_ERROR = 4;

/**
 * 位置错误（Android, iOS, WP8）
 * @property UNKNOWN_ERR
 * @type Number
 * @static
 * @final
 * @platform Android, iOS, WP8
 * @since 3.0.0
 */
ZipError.UNKNOWN_ERR = 5;

module.exports = ZipError;

});

cordova.define("com.polyvi.xface.extension.zip.ZipOptions", function(require, exports, module) { 
/*
 Copyright 2012-2013, Polyvi Inc. (http://www.xface3.com)
 This program is distributed under the terms of the GNU General Public License.

 This file is part of xFace.

 xFace is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 xFace is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with xFace.  If not, see <http://www.gnu.org/licenses/>.
 */

var ZipOptions = function(){
        this.password = null;
    };

module.exports = ZipOptions;

});

cordova.define("org.apache.cordova.battery-status.battery", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

/**
 * This class contains information about the current battery status.
 * @constructor
 */
var cordova = require('cordova'),
    exec = require('cordova/exec');

function handlers() {
  return battery.channels.batterystatus.numHandlers +
         battery.channels.batterylow.numHandlers +
         battery.channels.batterycritical.numHandlers;
}

var Battery = function() {
    this._level = null;
    this._isPlugged = null;
    // Create new event handlers on the window (returns a channel instance)
    this.channels = {
      batterystatus:cordova.addWindowEventHandler("batterystatus"),
      batterylow:cordova.addWindowEventHandler("batterylow"),
      batterycritical:cordova.addWindowEventHandler("batterycritical")
    };
    for (var key in this.channels) {
        this.channels[key].onHasSubscribersChange = Battery.onHasSubscribersChange;
    }
};
/**
 * Event handlers for when callbacks get registered for the battery.
 * Keep track of how many handlers we have so we can start and stop the native battery listener
 * appropriately (and hopefully save on battery life!).
 */
Battery.onHasSubscribersChange = function() {
  // If we just registered the first handler, make sure native listener is started.
  if (this.numHandlers === 1 && handlers() === 1) {
      exec(battery._status, battery._error, "Battery", "start", []);
  } else if (handlers() === 0) {
      exec(null, null, "Battery", "stop", []);
  }
};

/**
 * Callback for battery status
 *
 * @param {Object} info            keys: level, isPlugged
 */
Battery.prototype._status = function(info) {
    if (info) {
        var me = battery;
    var level = info.level;
        if (me._level !== level || me._isPlugged !== info.isPlugged) {
            // Fire batterystatus event
            cordova.fireWindowEvent("batterystatus", info);

            // Fire low battery event
            if (level === 20 || level === 5) {
                if (level === 20) {
                    cordova.fireWindowEvent("batterylow", info);
                }
                else {
                    cordova.fireWindowEvent("batterycritical", info);
                }
            }
        }
        me._level = level;
        me._isPlugged = info.isPlugged;
    }
};

/**
 * Error callback for battery start
 */
Battery.prototype._error = function(e) {
    console.log("Error initializing Battery: " + e);
};

var battery = new Battery();

module.exports = battery;

});

cordova.define("org.apache.cordova.camera.camera", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec'),
    Camera = require('./Camera');
    // XXX: commented out
    //CameraPopoverHandle = require('./CameraPopoverHandle');

var cameraExport = {};

// Tack on the Camera Constants to the base camera plugin.
for (var key in Camera) {
    cameraExport[key] = Camera[key];
}

/**
 * Gets a picture from source defined by "options.sourceType", and returns the
 * image as defined by the "options.destinationType" option.

 * The defaults are sourceType=CAMERA and destinationType=FILE_URI.
 *
 * @param {Function} successCallback
 * @param {Function} errorCallback
 * @param {Object} options
 */
cameraExport.getPicture = function(successCallback, errorCallback, options) {
    argscheck.checkArgs('fFO', 'Camera.getPicture', arguments);
    options = options || {};
    var getValue = argscheck.getValue;

    var quality = getValue(options.quality, 50);
    var destinationType = getValue(options.destinationType, Camera.DestinationType.FILE_URI);
    var sourceType = getValue(options.sourceType, Camera.PictureSourceType.CAMERA);
    var targetWidth = getValue(options.targetWidth, -1);
    var targetHeight = getValue(options.targetHeight, -1);
    var encodingType = getValue(options.encodingType, Camera.EncodingType.JPEG);
    var mediaType = getValue(options.mediaType, Camera.MediaType.PICTURE);
    var allowEdit = !!options.allowEdit;
    var correctOrientation = !!options.correctOrientation;
    var saveToPhotoAlbum = !!options.saveToPhotoAlbum;
    var popoverOptions = getValue(options.popoverOptions, null);
    var cameraDirection = getValue(options.cameraDirection, Camera.Direction.BACK);
    var cropToSize = !!options.cropToSize;

    var args = [quality, destinationType, sourceType, targetWidth, targetHeight, encodingType,
                mediaType, allowEdit, correctOrientation, saveToPhotoAlbum, popoverOptions, cameraDirection, cropToSize];

    exec(successCallback, errorCallback, "Camera", "takePicture", args);
    // XXX: commented out
    //return new CameraPopoverHandle();
};

cameraExport.cleanup = function(successCallback, errorCallback) {
    exec(successCallback, errorCallback, "Camera", "cleanup", []);
};

module.exports = cameraExport;

});

cordova.define("org.apache.cordova.camera.Camera", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

module.exports = {
  DestinationType:{
    DATA_URL: 0,         // Return base64 encoded string
    FILE_URI: 1,         // Return file uri (content://media/external/images/media/2 for Android)
    NATIVE_URI: 2        // Return native uri (eg. asset-library://... for iOS)
  },
  EncodingType:{
    JPEG: 0,             // Return JPEG encoded image
    PNG: 1               // Return PNG encoded image
  },
  MediaType:{
    PICTURE: 0,          // allow selection of still pictures only. DEFAULT. Will return format specified via DestinationType
    VIDEO: 1,            // allow selection of video only, ONLY RETURNS URL
    ALLMEDIA : 2         // allow selection from all media types
  },
  PictureSourceType:{
    PHOTOLIBRARY : 0,    // Choose image from picture library (same as SAVEDPHOTOALBUM for Android)
    CAMERA : 1,          // Take picture from camera
    SAVEDPHOTOALBUM : 2  // Choose image from picture library (same as PHOTOLIBRARY for Android)
  },
  PopoverArrowDirection:{
      ARROW_UP : 1,        // matches iOS UIPopoverArrowDirection constants to specify arrow location on popover
      ARROW_DOWN : 2,
      ARROW_LEFT : 4,
      ARROW_RIGHT : 8,
      ARROW_ANY : 15
  },
  Direction:{
      BACK: 0,
      FRONT: 1
  }
};

});

cordova.define("org.apache.cordova.camera.CameraPopoverHandle", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var exec = require('cordova/exec');

/**
 * A handle to an image picker popover.
 */
var CameraPopoverHandle = function() {
    this.setPosition = function(popoverOptions) {
        console.log('CameraPopoverHandle.setPosition is only supported on iOS.');
    };
};

module.exports = CameraPopoverHandle;

});

cordova.define("org.apache.cordova.camera.CameraPopoverOptions", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var Camera = require('./Camera');

/**
 * Encapsulates options for iOS Popover image picker
 */
var CameraPopoverOptions = function(x,y,width,height,arrowDir){
    // information of rectangle that popover should be anchored to
    this.x = x || 0;
    this.y = y || 32;
    this.width = width || 320;
    this.height = height || 480;
    // The direction of the popover arrow
    this.arrowDir = arrowDir || Camera.PopoverArrowDirection.ARROW_ANY;
};

module.exports = CameraPopoverOptions;

});

cordova.define("org.apache.cordova.contacts.Contact", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec'),
    ContactError = require('./ContactError'),
    utils = require('cordova/utils');

/**
* Converts primitives into Complex Object
* Currently only used for Date fields
*/
function convertIn(contact) {
    var value = contact.birthday;
    try {
      contact.birthday = new Date(parseFloat(value));
    } catch (exception){
      console.log("Cordova Contact convertIn error: exception creating date.");
    }
    return contact;
}

/**
* Converts Complex objects into primitives
* Only conversion at present is for Dates.
**/

function convertOut(contact) {
    var value = contact.birthday;
    if (value !== null) {
        // try to make it a Date object if it is not already
        if (!utils.isDate(value)){
            try {
                value = new Date(value);
            } catch(exception){
                value = null;
            }
        }
        if (utils.isDate(value)){
            value = value.valueOf(); // convert to milliseconds
        }
        contact.birthday = value;
    }
    return contact;
}

/**
* Contains information about a single contact.
* @constructor
* @param {DOMString} id unique identifier
* @param {DOMString} displayName
* @param {ContactName} name
* @param {DOMString} nickname
* @param {Array.<ContactField>} phoneNumbers array of phone numbers
* @param {Array.<ContactField>} emails array of email addresses
* @param {Array.<ContactAddress>} addresses array of addresses
* @param {Array.<ContactField>} ims instant messaging user ids
* @param {Array.<ContactOrganization>} organizations
* @param {DOMString} birthday contact's birthday
* @param {DOMString} note user notes about contact
* @param {Array.<ContactField>} photos
* @param {Array.<ContactField>} categories
* @param {Array.<ContactField>} urls contact's web sites
*/
var Contact = function (id, displayName, name, nickname, phoneNumbers, emails, addresses,
    ims, organizations, birthday, note, photos, categories, urls) {
    this.id = id || null;
    this.rawId = null;
    this.displayName = displayName || null;
    this.name = name || null; // ContactName
    this.nickname = nickname || null;
    this.phoneNumbers = phoneNumbers || null; // ContactField[]
    this.emails = emails || null; // ContactField[]
    this.addresses = addresses || null; // ContactAddress[]
    this.ims = ims || null; // ContactField[]
    this.organizations = organizations || null; // ContactOrganization[]
    this.birthday = birthday || null;
    this.note = note || null;
    this.photos = photos || null; // ContactField[]
    this.categories = categories || null; // ContactField[]
    this.urls = urls || null; // ContactField[]
};

/**
* Removes contact from device storage.
* @param successCB success callback
* @param errorCB error callback
*/
Contact.prototype.remove = function(successCB, errorCB) {
    argscheck.checkArgs('FF', 'Contact.remove', arguments);
    var fail = errorCB && function(code) {
        errorCB(new ContactError(code));
    };
    if (this.id === null) {
        fail(ContactError.UNKNOWN_ERROR);
    }
    else {
        exec(successCB, fail, "Contacts", "remove", [this.id]);
    }
};

/**
* Creates a deep copy of this Contact.
* With the contact ID set to null.
* @return copy of this Contact
*/
Contact.prototype.clone = function() {
    var clonedContact = utils.clone(this);
    clonedContact.id = null;
    clonedContact.rawId = null;

    function nullIds(arr) {
        if (arr) {
            for (var i = 0; i < arr.length; ++i) {
                arr[i].id = null;
            }
        }
    }

    // Loop through and clear out any id's in phones, emails, etc.
    nullIds(clonedContact.phoneNumbers);
    nullIds(clonedContact.emails);
    nullIds(clonedContact.addresses);
    nullIds(clonedContact.ims);
    nullIds(clonedContact.organizations);
    nullIds(clonedContact.categories);
    nullIds(clonedContact.photos);
    nullIds(clonedContact.urls);
    return clonedContact;
};

/**
* Persists contact to device storage.
* @param successCB success callback
* @param errorCB error callback
*/
Contact.prototype.save = function(successCB, errorCB) {
    argscheck.checkArgs('FFO', 'Contact.save', arguments);
    var fail = errorCB && function(code) {
        errorCB(new ContactError(code));
    };
    var success = function(result) {
        if (result) {
            if (successCB) {
                var fullContact = require('./contacts').create(result);
                successCB(convertIn(fullContact));
            }
        }
        else {
            // no Entry object returned
            fail(ContactError.UNKNOWN_ERROR);
        }
    };
    var dupContact = convertOut(utils.clone(this));
    exec(success, fail, "Contacts", "save", [dupContact]);
};


module.exports = Contact;

});

cordova.define("org.apache.cordova.contacts.ContactAddress", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

/**
* Contact address.
* @constructor
* @param {DOMString} id unique identifier, should only be set by native code
* @param formatted // NOTE: not a W3C standard
* @param streetAddress
* @param locality
* @param region
* @param postalCode
* @param country
*/

var ContactAddress = function(pref, type, formatted, streetAddress, locality, region, postalCode, country) {
    this.id = null;
    this.pref = (typeof pref != 'undefined' ? pref : false);
    this.type = type || null;
    this.formatted = formatted || null;
    this.streetAddress = streetAddress || null;
    this.locality = locality || null;
    this.region = region || null;
    this.postalCode = postalCode || null;
    this.country = country || null;
};

module.exports = ContactAddress;

});

cordova.define("org.apache.cordova.contacts.ContactError", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

/**
 *  ContactError.
 *  An error code assigned by an implementation when an error has occurred
 * @constructor
 */
var ContactError = function(err) {
    this.code = (typeof err != 'undefined' ? err : null);
};

/**
 * Error codes
 */
ContactError.UNKNOWN_ERROR = 0;
ContactError.INVALID_ARGUMENT_ERROR = 1;
ContactError.TIMEOUT_ERROR = 2;
ContactError.PENDING_OPERATION_ERROR = 3;
ContactError.IO_ERROR = 4;
ContactError.NOT_SUPPORTED_ERROR = 5;
ContactError.PERMISSION_DENIED_ERROR = 20;

module.exports = ContactError;

});

cordova.define("org.apache.cordova.contacts.ContactField", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

/**
* Generic contact field.
* @constructor
* @param {DOMString} id unique identifier, should only be set by native code // NOTE: not a W3C standard
* @param type
* @param value
* @param pref
*/
var ContactField = function(type, value, pref) {
    this.id = null;
    this.type = (type && type.toString()) || null;
    this.value = (value && value.toString()) || null;
    this.pref = (typeof pref != 'undefined' ? pref : false);
};

module.exports = ContactField;

});

cordova.define("org.apache.cordova.contacts.ContactFindOptions", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

/**
 * ContactFindOptions.
 * @constructor
 * @param filter used to match contacts against
 * @param multiple boolean used to determine if more than one contact should be returned
 */

var ContactFindOptions = function(filter, multiple) {
    this.filter = filter || '';
    this.multiple = (typeof multiple != 'undefined' ? multiple : false);
};

module.exports = ContactFindOptions;

});

cordova.define("org.apache.cordova.contacts.ContactName", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

/**
* Contact name.
* @constructor
* @param formatted // NOTE: not part of W3C standard
* @param familyName
* @param givenName
* @param middle
* @param prefix
* @param suffix
*/
var ContactName = function(formatted, familyName, givenName, middle, prefix, suffix) {
    this.formatted = formatted || null;
    this.familyName = familyName || null;
    this.givenName = givenName || null;
    this.middleName = middle || null;
    this.honorificPrefix = prefix || null;
    this.honorificSuffix = suffix || null;
};

module.exports = ContactName;

});

cordova.define("org.apache.cordova.contacts.ContactOrganization", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

/**
* Contact organization.
* @constructor
* @param {DOMString} id unique identifier, should only be set by native code // NOTE: not a W3C standard
* @param name
* @param dept
* @param title
* @param startDate
* @param endDate
* @param location
* @param desc
*/

var ContactOrganization = function(pref, type, name, dept, title) {
    this.id = null;
    this.pref = (typeof pref != 'undefined' ? pref : false);
    this.type = type || null;
    this.name = name || null;
    this.department = dept || null;
    this.title = title || null;
};

module.exports = ContactOrganization;

});

cordova.define("org.apache.cordova.contacts.contacts-android", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var exec = require('cordova/exec');

/**
 * Provides android enhanced contacts API.
 */
module.exports = {
    chooseContact : function(successCallback, options) {
        /*
         *    Select a contact using the iOS Contact Picker UI
         *    NOT part of W3C spec so no official documentation
         *
         *    @param errorCB error callback
         *    @param options object
         *    allowsEditing: boolean AS STRING
         *        "true" to allow editing the contact
         *        "false" (default) display contact
         *      fields: array of fields to return in contact object (see ContactOptions.fields)
         *
         *    @returns
         *        id of contact selected
         *        ContactObject
         *            if no fields provided contact contains just id information
         *            if fields provided contact object contains information for the specified fields
         *
         */
         var win = function(result) {
             var fullContact = require('./contacts').create(result);
            successCallback(fullContact.id, fullContact);
        };
        exec(win, null, "Contacts","chooseContact", [options]);
    }
};

});

cordova.define("org.apache.cordova.contacts.contacts", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec'),
    ContactError = require('./ContactError'),
    utils = require('cordova/utils'),
    Contact = require('./Contact');

/**
* Represents a group of Contacts.
* @constructor
*/
var contacts = {
    /**
     * Returns an array of Contacts matching the search criteria.
     * @param fields that should be searched
     * @param successCB success callback
     * @param errorCB error callback
     * @param {ContactFindOptions} options that can be applied to contact searching
     * @return array of Contacts matching search criteria
     */
    find:function(fields, successCB, errorCB, options) {
        argscheck.checkArgs('afFO', 'contacts.find', arguments);
        if (!fields.length) {
            errorCB && errorCB(new ContactError(ContactError.INVALID_ARGUMENT_ERROR));
        } else {
            var win = function(result) {
                var cs = [];
                for (var i = 0, l = result.length; i < l; i++) {
                    cs.push(contacts.create(result[i]));
                }
                successCB(cs);
            };
            exec(win, errorCB, "Contacts", "search", [fields, options]);
        }
    },

    /**
     * This function creates a new contact, but it does not persist the contact
     * to device storage. To persist the contact to device storage, invoke
     * contact.save().
     * @param properties an object whose properties will be examined to create a new Contact
     * @returns new Contact object
     */
    create:function(properties) {
        argscheck.checkArgs('O', 'contacts.create', arguments);
        var contact = new Contact();
        for (var i in properties) {
            if (typeof contact[i] !== 'undefined' && properties.hasOwnProperty(i)) {
                contact[i] = properties[i];
            }
        }
        return contact;
    }
};

module.exports = contacts;

});

cordova.define("org.apache.cordova.device.device", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var argscheck = require('cordova/argscheck'),
    channel = require('cordova/channel'),
    utils = require('cordova/utils'),
    exec = require('cordova/exec'),
    cordova = require('cordova');

channel.createSticky('onCordovaInfoReady');
// Tell cordova channel to wait on the CordovaInfoReady event
channel.waitForInitialization('onCordovaInfoReady');

/**
 * This represents the mobile device, and provides properties for inspecting the model, version, UUID of the
 * phone, etc.
 * @constructor
 */
function Device() {
    this.available = false;
    this.platform = null;
    this.version = null;
    this.uuid = null;
    this.cordova = null;
    this.model = null;
    this.name = null;
    this.xFaceVersion = null;
    this.productVersion = null;
    this.width = null;
    this.height = null;

    var me = this;

    channel.onCordovaReady.subscribe(function() {
        me.getInfo(function(info) {
            //ignoring info.cordova returning from native, we should use value from cordova.version defined in cordova.js
            //TODO: CB-5105 native implementations should not return info.cordova
            var buildLabel = cordova.version;
            me.available = true;
            me.platform = info.platform;
            me.version = info.version;
            me.uuid = info.uuid;
            me.cordova = buildLabel;
            me.model = info.model;
            me.name = info.name;
            me.xFaceVersion = info.xFaceVersion;
            me.productVersion = info.productVersion;
            me.width = info.width;
            me.height = info.height;
            channel.onCordovaInfoReady.fire();
        },function(e) {
            me.available = false;
            utils.alert("[ERROR] Error initializing Cordova: " + e);
        });
    });
}

/**
 * Get device info
 *
 * @param {Function} successCallback The function to call when the heading data is available
 * @param {Function} errorCallback The function to call when there is an error getting the heading data. (OPTIONAL)
 */
Device.prototype.getInfo = function(successCallback, errorCallback) {
    argscheck.checkArgs('fF', 'Device.getInfo', arguments);
    exec(successCallback, errorCallback, "Device", "getDeviceInfo", []);
};

module.exports = new Device();

});

cordova.define("org.apache.cordova.device-motion.Acceleration", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var Acceleration = function(x, y, z, timestamp) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.timestamp = timestamp || (new Date()).getTime();
};

module.exports = Acceleration;

});

cordova.define("org.apache.cordova.device-motion.accelerometer", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

/**
 * This class provides access to device accelerometer data.
 * @constructor
 */
var argscheck = require('cordova/argscheck'),
    utils = require("cordova/utils"),
    exec = require("cordova/exec"),
    Acceleration = require('./Acceleration');

// Is the accel sensor running?
var running = false;

// Keeps reference to watchAcceleration calls.
var timers = {};

// Array of listeners; used to keep track of when we should call start and stop.
var listeners = [];

// Last returned acceleration object from native
var accel = null;

// Tells native to start.
function start() {
    exec(function(a) {
        var tempListeners = listeners.slice(0);
        accel = new Acceleration(a.x, a.y, a.z, a.timestamp);
        for (var i = 0, l = tempListeners.length; i < l; i++) {
            tempListeners[i].win(accel);
        }
    }, function(e) {
        var tempListeners = listeners.slice(0);
        for (var i = 0, l = tempListeners.length; i < l; i++) {
            tempListeners[i].fail(e);
        }
    }, "Accelerometer", "start", []);
    running = true;
}

// Tells native to stop.
function stop() {
    exec(null, null, "Accelerometer", "stop", []);
    running = false;
}

// Adds a callback pair to the listeners array
function createCallbackPair(win, fail) {
    return {win:win, fail:fail};
}

// Removes a win/fail listener pair from the listeners array
function removeListeners(l) {
    var idx = listeners.indexOf(l);
    if (idx > -1) {
        listeners.splice(idx, 1);
        if (listeners.length === 0) {
            stop();
        }
    }
}

var accelerometer = {
    /**
     * Asynchronously acquires the current acceleration.
     *
     * @param {Function} successCallback    The function to call when the acceleration data is available
     * @param {Function} errorCallback      The function to call when there is an error getting the acceleration data. (OPTIONAL)
     * @param {AccelerationOptions} options The options for getting the accelerometer data such as timeout. (OPTIONAL)
     */
    getCurrentAcceleration: function(successCallback, errorCallback, options) {
        argscheck.checkArgs('fFO', 'accelerometer.getCurrentAcceleration', arguments);

        var p;
        var win = function(a) {
            removeListeners(p);
            successCallback(a);
        };
        var fail = function(e) {
            removeListeners(p);
            errorCallback && errorCallback(e);
        };

        p = createCallbackPair(win, fail);
        listeners.push(p);

        if (!running) {
            start();
        }
    },

    /**
     * Asynchronously acquires the acceleration repeatedly at a given interval.
     *
     * @param {Function} successCallback    The function to call each time the acceleration data is available
     * @param {Function} errorCallback      The function to call when there is an error getting the acceleration data. (OPTIONAL)
     * @param {AccelerationOptions} options The options for getting the accelerometer data such as timeout. (OPTIONAL)
     * @return String                       The watch id that must be passed to #clearWatch to stop watching.
     */
    watchAcceleration: function(successCallback, errorCallback, options) {
        argscheck.checkArgs('fFO', 'accelerometer.watchAcceleration', arguments);
        // Default interval (10 sec)
        var frequency = (options && options.frequency && typeof options.frequency == 'number') ? options.frequency : 10000;

        // Keep reference to watch id, and report accel readings as often as defined in frequency
        var id = utils.createUUID();

        var p = createCallbackPair(function(){}, function(e) {
            removeListeners(p);
            errorCallback && errorCallback(e);
        });
        listeners.push(p);

        timers[id] = {
            timer:window.setInterval(function() {
                if (accel) {
                    successCallback(accel);
                }
            }, frequency),
            listeners:p
        };

        if (running) {
            // If we're already running then immediately invoke the success callback
            // but only if we have retrieved a value, sample code does not check for null ...
            if (accel) {
                successCallback(accel);
            }
        } else {
            start();
        }

        return id;
    },

    /**
     * Clears the specified accelerometer watch.
     *
     * @param {String} id       The id of the watch returned from #watchAcceleration.
     */
    clearWatch: function(id) {
        // Stop javascript timer & remove from timer list
        if (id && timers[id]) {
            window.clearInterval(timers[id].timer);
            removeListeners(timers[id].listeners);
            delete timers[id];
        }
    }
};
module.exports = accelerometer;

});

cordova.define("org.apache.cordova.device-orientation.CompassError", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

/**
 *  CompassError.
 *  An error code assigned by an implementation when an error has occurred
 * @constructor
 */
var CompassError = function(err) {
    this.code = (err !== undefined ? err : null);
};

CompassError.COMPASS_INTERNAL_ERR = 0;
CompassError.COMPASS_NOT_SUPPORTED = 20;

module.exports = CompassError;

});

cordova.define("org.apache.cordova.device-orientation.CompassHeading", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var CompassHeading = function(magneticHeading, trueHeading, headingAccuracy, timestamp) {
  this.magneticHeading = magneticHeading;
  this.trueHeading = trueHeading;
  this.headingAccuracy = headingAccuracy;
  this.timestamp = timestamp || new Date().getTime();
};

module.exports = CompassHeading;

});

cordova.define("org.apache.cordova.device-orientation.compass", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec'),
    utils = require('cordova/utils'),
    CompassHeading = require('./CompassHeading'),
    CompassError = require('./CompassError'),

    timers = {},
    compass = {
        /**
         * Asynchronously acquires the current heading.
         * @param {Function} successCallback The function to call when the heading
         * data is available
         * @param {Function} errorCallback The function to call when there is an error
         * getting the heading data.
         * @param {CompassOptions} options The options for getting the heading data (not used).
         */
        getCurrentHeading:function(successCallback, errorCallback, options) {
            argscheck.checkArgs('fFO', 'compass.getCurrentHeading', arguments);

            var win = function(result) {
                var ch = new CompassHeading(result.magneticHeading, result.trueHeading, result.headingAccuracy, result.timestamp);
                successCallback(ch);
            };
            var fail = errorCallback && function(code) {
                var ce = new CompassError(code);
                errorCallback(ce);
            };

            // Get heading
            exec(win, fail, "Compass", "getHeading", [options]);
        },

        /**
         * Asynchronously acquires the heading repeatedly at a given interval.
         * @param {Function} successCallback The function to call each time the heading
         * data is available
         * @param {Function} errorCallback The function to call when there is an error
         * getting the heading data.
         * @param {HeadingOptions} options The options for getting the heading data
         * such as timeout and the frequency of the watch. For iOS, filter parameter
         * specifies to watch via a distance filter rather than time.
         */
        watchHeading:function(successCallback, errorCallback, options) {
            argscheck.checkArgs('fFO', 'compass.watchHeading', arguments);
            // Default interval (100 msec)
            var frequency = (options !== undefined && options.frequency !== undefined) ? options.frequency : 100;
            var filter = (options !== undefined && options.filter !== undefined) ? options.filter : 0;

            var id = utils.createUUID();
            if (filter > 0) {
                // is an iOS request for watch by filter, no timer needed
                timers[id] = "iOS";
                compass.getCurrentHeading(successCallback, errorCallback, options);
            } else {
                // Start watch timer to get headings
                timers[id] = window.setInterval(function() {
                    compass.getCurrentHeading(successCallback, errorCallback);
                }, frequency);
            }

            return id;
        },

        /**
         * Clears the specified heading watch.
         * @param {String} watchId The ID of the watch returned from #watchHeading.
         */
        clearWatch:function(id) {
            // Stop javascript timer & remove from timer list
            if (id && timers[id]) {
                if (timers[id] != "iOS") {
                    clearInterval(timers[id]);
                } else {
                    // is iOS watch by filter so call into device to stop
                    exec(null, null, "Compass", "stopHeading", []);
                }
                delete timers[id];
            }
        }
    };

module.exports = compass;

});

cordova.define("org.apache.cordova.dialogs.notification_android", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var exec = require('cordova/exec');

/**
 * Provides Android enhanced notification API.
 */
module.exports = {
    activityStart : function(title, message) {
        // If title and message not specified then mimic Android behavior of
        // using default strings.
        if (typeof title === "undefined" && typeof message == "undefined") {
            title = "Busy";
            message = 'Please wait...';
        }

        exec(null, null, 'Notification', 'activityStart', [ title, message ]);
    },

    /**
     * Close an activity dialog
     */
    activityStop : function() {
        exec(null, null, 'Notification', 'activityStop', []);
    },

    /**
     * Display a progress dialog with progress bar that goes from 0 to 100.
     *
     * @param {String}
     *            title Title of the progress dialog.
     * @param {String}
     *            message Message to display in the dialog.
     */
    progressStart : function(title, message) {
        exec(null, null, 'Notification', 'progressStart', [ title, message ]);
    },

    /**
     * Close the progress dialog.
     */
    progressStop : function() {
        exec(null, null, 'Notification', 'progressStop', []);
    },

    /**
     * Set the progress dialog value.
     *
     * @param {Number}
     *            value 0-100
     */
    progressValue : function(value) {
        exec(null, null, 'Notification', 'progressValue', [ value ]);
    }
};

});

cordova.define("org.apache.cordova.dialogs.notification", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var exec = require('cordova/exec');
var platform = require('cordova/platform');

/**
 * Provides access to notifications on the device.
 */

module.exports = {

    /**
     * Open a native alert dialog, with a customizable title and button text.
     *
     * @param {String} message              Message to print in the body of the alert
     * @param {Function} completeCallback   The callback that is called when user clicks on a button.
     * @param {String} title                Title of the alert dialog (default: Alert)
     * @param {String} buttonLabel          Label of the close button (default: OK)
     */
    alert: function(message, completeCallback, title, buttonLabel) {
        var _title = (title || "Alert");
        var _buttonLabel = (buttonLabel || "OK");
        exec(completeCallback, null, "Notification", "alert", [message, _title, _buttonLabel]);
    },

    /**
     * Open a native confirm dialog, with a customizable title and button text.
     * The result that the user selects is returned to the result callback.
     *
     * @param {String} message              Message to print in the body of the alert
     * @param {Function} resultCallback     The callback that is called when user clicks on a button.
     * @param {String} title                Title of the alert dialog (default: Confirm)
     * @param {Array} buttonLabels          Array of the labels of the buttons (default: ['OK', 'Cancel'])
     */
    confirm: function(message, resultCallback, title, buttonLabels) {
        var _title = (title || "Confirm");
        var _buttonLabels = (buttonLabels || ["OK", "Cancel"]);

        // Strings are deprecated!
        if (typeof _buttonLabels === 'string') {
            console.log("Notification.confirm(string, function, string, string) is deprecated.  Use Notification.confirm(string, function, string, array).");
        }

        // Some platforms take an array of button label names.
        // Other platforms take a comma separated list.
        // For compatibility, we convert to the desired type based on the platform.
        if (platform.id == "android" || platform.id == "ios" || platform.id == "windowsphone" || platform.id == "firefoxos" || platform.id == "ubuntu") {

            if (typeof _buttonLabels === 'string') {
                var buttonLabelString = _buttonLabels;
                _buttonLabels = _buttonLabels.split(","); // not crazy about changing the var type here
            }
        } else {
            if (Array.isArray(_buttonLabels)) {
                var buttonLabelArray = _buttonLabels;
                _buttonLabels = buttonLabelArray.toString();
            }
        }
        exec(resultCallback, null, "Notification", "confirm", [message, _title, _buttonLabels]);
    },

    /**
     * Open a native prompt dialog, with a customizable title and button text.
     * The following results are returned to the result callback:
     *  buttonIndex     Index number of the button selected.
     *  input1          The text entered in the prompt dialog box.
     *
     * @param {String} message              Dialog message to display (default: "Prompt message")
     * @param {Function} resultCallback     The callback that is called when user clicks on a button.
     * @param {String} title                Title of the dialog (default: "Prompt")
     * @param {Array} buttonLabels          Array of strings for the button labels (default: ["OK","Cancel"])
     * @param {String} defaultText          Textbox input value (default: empty string)
     */
    prompt: function(message, resultCallback, title, buttonLabels, defaultText) {
        var _message = (message || "Prompt message");
        var _title = (title || "Prompt");
        var _buttonLabels = (buttonLabels || ["OK","Cancel"]);
        var _defaultText = (defaultText || "");
        exec(resultCallback, null, "Notification", "prompt", [_message, _title, _buttonLabels, _defaultText]);
    },

    /**
     * Causes the device to beep.
     * On Android, the default notification ringtone is played "count" times.
     *
     * @param {Integer} count       The number of beeps.
     */
    beep: function(count) {
        exec(null, null, "Notification", "beep", [count]);
    }
};

});

cordova.define("org.apache.cordova.file.DirectoryEntry", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var argscheck = require('cordova/argscheck'),
    utils = require('cordova/utils'),
    exec = require('cordova/exec'),
    Entry = require('./Entry'),
    FileError = require('./FileError'),
    DirectoryReader = require('./DirectoryReader');

/**
 * An interface representing a directory on the file system.
 *
 * {boolean} isFile always false (readonly)
 * {boolean} isDirectory always true (readonly)
 * {DOMString} name of the directory, excluding the path leading to it (readonly)
 * {DOMString} fullPath the absolute full path to the directory (readonly)
 * {FileSystem} filesystem on which the directory resides (readonly)
 */
var DirectoryEntry = function(name, fullPath, fileSystem, nativeURL) {
     DirectoryEntry.__super__.constructor.call(this, false, true, name, fullPath, fileSystem, nativeURL);
};

utils.extend(DirectoryEntry, Entry);

/**
 * Creates a new DirectoryReader to read entries from this directory
 */
DirectoryEntry.prototype.createReader = function() {
    return new DirectoryReader(this.toURL());
};

/**
 * Creates or looks up a directory
 *
 * @param {DOMString} path either a relative or absolute path from this directory in which to look up or create a directory
 * @param {Flags} options to create or exclusively create the directory
 * @param {Function} successCallback is called with the new entry
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryEntry.prototype.getDirectory = function(path, options, successCallback, errorCallback) {
    argscheck.checkArgs('sOFF', 'DirectoryEntry.getDirectory', arguments);
    var fs = this.filesystem;
    var win = successCallback && function(result) {
        var entry = new DirectoryEntry(result.name, result.fullPath, fs, result.nativeURL);
        successCallback(entry);
    };
    var fail = errorCallback && function(code) {
        errorCallback(new FileError(code));
    };
    exec(win, fail, "File", "getDirectory", [this.filesystem.__format__(this.fullPath), path, options]);
};

/**
 * Deletes a directory and all of it's contents
 *
 * @param {Function} successCallback is called with no parameters
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryEntry.prototype.removeRecursively = function(successCallback, errorCallback) {
    argscheck.checkArgs('FF', 'DirectoryEntry.removeRecursively', arguments);
    var fail = errorCallback && function(code) {
        errorCallback(new FileError(code));
    };
    exec(successCallback, fail, "File", "removeRecursively", [this.filesystem.__format__(this.fullPath)]);
};

/**
 * Creates or looks up a file
 *
 * @param {DOMString} path either a relative or absolute path from this directory in which to look up or create a file
 * @param {Flags} options to create or exclusively create the file
 * @param {Function} successCallback is called with the new entry
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryEntry.prototype.getFile = function(path, options, successCallback, errorCallback) {
    argscheck.checkArgs('sOFF', 'DirectoryEntry.getFile', arguments);
    var fs = this.filesystem;
    var win = successCallback && function(result) {
        var FileEntry = require('./FileEntry');
        var entry = new FileEntry(result.name, result.fullPath, fs, result.nativeURL);
        successCallback(entry);
    };
    var fail = errorCallback && function(code) {
        errorCallback(new FileError(code));
    };
    exec(win, fail, "File", "getFile", [this.filesystem.__format__(this.fullPath), path, options]);
};

module.exports = DirectoryEntry;

});

cordova.define("org.apache.cordova.file.DirectoryReader", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var exec = require('cordova/exec'),
    FileError = require('./FileError') ;

/**
 * An interface that lists the files and directories in a directory.
 */
function DirectoryReader(localURL) {
    this.localURL = localURL || null;
    this.hasReadEntries = false;
}

/**
 * Returns a list of entries from a directory.
 *
 * @param {Function} successCallback is called with a list of entries
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryReader.prototype.readEntries = function(successCallback, errorCallback) {
    // If we've already read and passed on this directory's entries, return an empty list.
    if (this.hasReadEntries) {
        successCallback([]);
        return;
    }
    var reader = this;
    var win = typeof successCallback !== 'function' ? null : function(result) {
        var retVal = [];
        for (var i=0; i<result.length; i++) {
            var entry = null;
            if (result[i].isDirectory) {
                entry = new (require('./DirectoryEntry'))();
            }
            else if (result[i].isFile) {
                entry = new (require('./FileEntry'))();
            }
            entry.isDirectory = result[i].isDirectory;
            entry.isFile = result[i].isFile;
            entry.name = result[i].name;
            entry.fullPath = result[i].fullPath;
            entry.filesystem = new (require('./FileSystem'))(result[i].filesystemName);
            entry.nativeURL = result[i].nativeURL;
            retVal.push(entry);
        }
        reader.hasReadEntries = true;
        successCallback(retVal);
    };
    var fail = typeof errorCallback !== 'function' ? null : function(code) {
        errorCallback(new FileError(code));
    };
    exec(win, fail, "File", "readEntries", [this.localURL]);
};

module.exports = DirectoryReader;

});

cordova.define("org.apache.cordova.file.Entry", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec'),
    FileError = require('./FileError'),
    Metadata = require('./Metadata');

/**
 * Represents a file or directory on the local file system.
 *
 * @param isFile
 *            {boolean} true if Entry is a file (readonly)
 * @param isDirectory
 *            {boolean} true if Entry is a directory (readonly)
 * @param name
 *            {DOMString} name of the file or directory, excluding the path
 *            leading to it (readonly)
 * @param fullPath
 *            {DOMString} the absolute full path to the file or directory
 *            (readonly)
 * @param fileSystem
 *            {FileSystem} the filesystem on which this entry resides
 *            (readonly)
 * @param nativeURL
 *            {DOMString} an alternate URL which can be used by native
 *            webview controls, for example media players.
 *            (optional, readonly)
 */
function Entry(isFile, isDirectory, name, fullPath, fileSystem, nativeURL) {
    this.isFile = !!isFile;
    this.isDirectory = !!isDirectory;
    this.name = name || '';
    this.fullPath = fullPath || '';
    this.filesystem = fileSystem || null;
    this.nativeURL = nativeURL || null;
}

/**
 * Look up the metadata of the entry.
 *
 * @param successCallback
 *            {Function} is called with a Metadata object
 * @param errorCallback
 *            {Function} is called with a FileError
 */
Entry.prototype.getMetadata = function(successCallback, errorCallback) {
    argscheck.checkArgs('FF', 'Entry.getMetadata', arguments);
    var success = successCallback && function(entryMetadata) {
        var metadata = new Metadata(entryMetadata);
        successCallback(metadata);
    };
    var fail = errorCallback && function(code) {
        errorCallback(new FileError(code));
    };
    exec(success, fail, "File", "getMetadata", [this.filesystem.__format__(this.fullPath)]);
};

/**
 * Set the metadata of the entry.
 *
 * @param successCallback
 *            {Function} is called with a Metadata object
 * @param errorCallback
 *            {Function} is called with a FileError
 * @param metadataObject
 *            {Object} keys and values to set
 */
Entry.prototype.setMetadata = function(successCallback, errorCallback, metadataObject) {
    argscheck.checkArgs('FFO', 'Entry.setMetadata', arguments);
    exec(successCallback, errorCallback, "File", "setMetadata", [this.fullPath, metadataObject]);
};

/**
 * Move a file or directory to a new location.
 *
 * @param parent
 *            {DirectoryEntry} the directory to which to move this entry
 * @param newName
 *            {DOMString} new name of the entry, defaults to the current name
 * @param successCallback
 *            {Function} called with the new DirectoryEntry object
 * @param errorCallback
 *            {Function} called with a FileError
 */
Entry.prototype.moveTo = function(parent, newName, successCallback, errorCallback) {
    argscheck.checkArgs('oSFF', 'Entry.moveTo', arguments);
    var fail = errorCallback && function(code) {
        errorCallback(new FileError(code));
    };
    var fs = this.filesystem // Copy / move op cannot cross filesystems;
    // source path
        var srcURL = this.filesystem.__format__(this.fullPath);
        // entry name
        name = newName || this.name,
        success = function(entry) {
            if (entry) {
                if (successCallback) {
                    // create appropriate Entry object
                    var result = (entry.isDirectory) ? new (require('./DirectoryEntry'))(entry.name, entry.fullPath, fs, entry.nativeURL) : new (require('org.apache.cordova.file.FileEntry'))(entry.name, entry.fullPath, fs, entry.nativeURL);
                    successCallback(result);
                }
            }
            else {
                // no Entry object returned
                fail && fail(FileError.NOT_FOUND_ERR);
            }
        };

    // copy
    exec(success, fail, "File", "moveTo", [srcURL, parent.filesystem.__format__(parent.fullPath), name]);
};

/**
 * Copy a directory to a different location.
 *
 * @param parent
 *            {DirectoryEntry} the directory to which to copy the entry
 * @param newName
 *            {DOMString} new name of the entry, defaults to the current name
 * @param successCallback
 *            {Function} called with the new Entry object
 * @param errorCallback
 *            {Function} called with a FileError
 */
Entry.prototype.copyTo = function(parent, newName, successCallback, errorCallback) {
    argscheck.checkArgs('oSFF', 'Entry.copyTo', arguments);
    var fail = errorCallback && function(code) {
        errorCallback(new FileError(code));
    };
    var fs = this.filesystem // Copy / move op cannot cross filesystems;
        // source path
    var srcURL = this.filesystem.__format__(this.fullPath),
        // entry name
        name = newName || this.name,
        // success callback
        success = function(entry) {
            if (entry) {
                if (successCallback) {
                    // create appropriate Entry object
                    var result = (entry.isDirectory) ? new (require('./DirectoryEntry'))(entry.name, entry.fullPath, fs, entry.nativeURL) : new (require('org.apache.cordova.file.FileEntry'))(entry.name, entry.fullPath, fs, entry.nativeURL);
                    successCallback(result);
                }
            }
            else {
                // no Entry object returned
                fail && fail(FileError.NOT_FOUND_ERR);
            }
        };

    // copy
    exec(success, fail, "File", "copyTo", [srcURL, parent.filesystem.__format__(parent.fullPath), name]);
};

/**
 * Return a URL that can be used to identify this entry.
 */
Entry.prototype.toURL = function() {
    if (this.filesystem && this.filesystem.__format__) {
      return this.filesystem.__format__(this.fullPath);
    }
    // fullPath attribute contains the full URL
    return "file://localhost" + this.fullPath;
};

/**
 * Return a URL that can be used to as the src attribute of a <video> or
 * <audio> tag, in case it is different from the URL returned by .toURL().
 */
Entry.prototype.toNativeURL = function() {
    return this.nativeURL || this.toURL();
};

/**
 * Returns a URI that can be used to identify this entry.
 *
 * @param {DOMString} mimeType for a FileEntry, the mime type to be used to interpret the file, when loaded through this URI.
 * @return uri
 */
Entry.prototype.toURI = function(mimeType) {
    console.log("DEPRECATED: Update your code to use 'toURL'");
    // fullPath attribute contains the full URI
    return this.toURL();
};

/**
 * Remove a file or directory. It is an error to attempt to delete a
 * directory that is not empty. It is an error to attempt to delete a
 * root directory of a file system.
 *
 * @param successCallback {Function} called with no parameters
 * @param errorCallback {Function} called with a FileError
 */
Entry.prototype.remove = function(successCallback, errorCallback) {
    argscheck.checkArgs('FF', 'Entry.remove', arguments);
    var fail = errorCallback && function(code) {
        errorCallback(new FileError(code));
    };
    exec(successCallback, fail, "File", "remove", [this.filesystem.__format__(this.fullPath)]);
};

/**
 * Look up the parent DirectoryEntry of this entry.
 *
 * @param successCallback {Function} called with the parent DirectoryEntry object
 * @param errorCallback {Function} called with a FileError
 */
Entry.prototype.getParent = function(successCallback, errorCallback) {
    argscheck.checkArgs('FF', 'Entry.getParent', arguments);
    var fs = this.filesystem;
    var win = successCallback && function(result) {
        var DirectoryEntry = require('./DirectoryEntry');
        var entry = new DirectoryEntry(result.name, result.fullPath, fs, result.nativeURL);
        successCallback(entry);
    };
    var fail = errorCallback && function(code) {
        errorCallback(new FileError(code));
    };
    exec(win, fail, "File", "getParent", [this.filesystem.__format__(this.fullPath)]);
};

module.exports = Entry;

});

cordova.define("org.apache.cordova.file.File", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

/**
 * Constructor.
 * name {DOMString} name of the file, without path information
 * fullPath {DOMString} the full path of the file, including the name
 * type {DOMString} mime type
 * lastModifiedDate {Date} last modified date
 * size {Number} size of the file in bytes
 */

var File = function(name, localURL, type, lastModifiedDate, size){
    this.name = name || '';
    this.localURL = localURL || null;
    this.type = type || null;
    this.lastModifiedDate = lastModifiedDate || null;
    this.size = size || 0;

    // These store the absolute start and end for slicing the file.
    this.start = 0;
    this.end = this.size;
};

/**
 * Returns a "slice" of the file. Since Cordova Files don't contain the actual
 * content, this really returns a File with adjusted start and end.
 * Slices of slices are supported.
 * start {Number} The index at which to start the slice (inclusive).
 * end {Number} The index at which to end the slice (exclusive).
 */
File.prototype.slice = function(start, end) {
    var size = this.end - this.start;
    var newStart = 0;
    var newEnd = size;
    if (arguments.length) {
        if (start < 0) {
            newStart = Math.max(size + start, 0);
        } else {
            newStart = Math.min(size, start);
        }
    }

    if (arguments.length >= 2) {
        if (end < 0) {
            newEnd = Math.max(size + end, 0);
        } else {
            newEnd = Math.min(end, size);
        }
    }

    var newFile = new File(this.name, this.localURL, this.type, this.lastModifiedData, this.size);
    newFile.start = this.start + newStart;
    newFile.end = this.start + newEnd;
    return newFile;
};


module.exports = File;

});

cordova.define("org.apache.cordova.file.FileEntry", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var utils = require('cordova/utils'),
    exec = require('cordova/exec'),
    Entry = require('./Entry'),
    FileWriter = require('./FileWriter'),
    File = require('./File'),
    FileError = require('./FileError');

/**
 * An interface representing a file on the file system.
 *
 * {boolean} isFile always true (readonly)
 * {boolean} isDirectory always false (readonly)
 * {DOMString} name of the file, excluding the path leading to it (readonly)
 * {DOMString} fullPath the absolute full path to the file (readonly)
 * {FileSystem} filesystem on which the file resides (readonly)
 */
var FileEntry = function(name, fullPath, fileSystem, nativeURL) {
     FileEntry.__super__.constructor.apply(this, [true, false, name, fullPath, fileSystem, nativeURL]);
};

utils.extend(FileEntry, Entry);

/**
 * Creates a new FileWriter associated with the file that this FileEntry represents.
 *
 * @param {Function} successCallback is called with the new FileWriter
 * @param {Function} errorCallback is called with a FileError
 */
FileEntry.prototype.createWriter = function(successCallback, errorCallback) {
    this.file(function(filePointer) {
        var writer = new FileWriter(filePointer);

        if (writer.localURL === null || writer.localURL === "") {
            errorCallback && errorCallback(new FileError(FileError.INVALID_STATE_ERR));
        } else {
            successCallback && successCallback(writer);
        }
    }, errorCallback);
};

/**
 * Returns a File that represents the current state of the file that this FileEntry represents.
 *
 * @param {Function} successCallback is called with the new File object
 * @param {Function} errorCallback is called with a FileError
 */
FileEntry.prototype.file = function(successCallback, errorCallback) {
    var localURL = this.filesystem.__format__(this.fullPath);
    var win = successCallback && function(f) {
        var file = new File(f.name, localURL, f.type, f.lastModifiedDate, f.size);
        successCallback(file);
    };
    var fail = errorCallback && function(code) {
        errorCallback(new FileError(code));
    };
    exec(win, fail, "File", "getFileMetadata", [localURL]);
};


module.exports = FileEntry;

});

cordova.define("org.apache.cordova.file.FileError", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

/**
 * FileError
 */
function FileError(error) {
  this.code = error || null;
}

// File error codes
// Found in DOMException
FileError.NOT_FOUND_ERR = 1;
FileError.SECURITY_ERR = 2;
FileError.ABORT_ERR = 3;

// Added by File API specification
FileError.NOT_READABLE_ERR = 4;
FileError.ENCODING_ERR = 5;
FileError.NO_MODIFICATION_ALLOWED_ERR = 6;
FileError.INVALID_STATE_ERR = 7;
FileError.SYNTAX_ERR = 8;
FileError.INVALID_MODIFICATION_ERR = 9;
FileError.QUOTA_EXCEEDED_ERR = 10;
FileError.TYPE_MISMATCH_ERR = 11;
FileError.PATH_EXISTS_ERR = 12;

module.exports = FileError;

});

cordova.define("org.apache.cordova.file.FileReader", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var exec = require('cordova/exec'),
    modulemapper = require('cordova/modulemapper'),
    utils = require('cordova/utils'),
    File = require('./File'),
    FileError = require('./FileError'),
    ProgressEvent = require('./ProgressEvent'),
    origFileReader = modulemapper.getOriginalSymbol(this, 'FileReader');

/**
 * This class reads the mobile device file system.
 *
 * For Android:
 *      The root directory is the root of the file system.
 *      To read from the SD card, the file name is "sdcard/my_file.txt"
 * @constructor
 */
var FileReader = function() {
    this._readyState = 0;
    this._error = null;
    this._result = null;
    this._localURL = '';
    this._realReader = origFileReader ? new origFileReader() : {};
};

// States
FileReader.EMPTY = 0;
FileReader.LOADING = 1;
FileReader.DONE = 2;

utils.defineGetter(FileReader.prototype, 'readyState', function() {
    return this._localURL ? this._readyState : this._realReader.readyState;
});

utils.defineGetter(FileReader.prototype, 'error', function() {
    return this._localURL ? this._error: this._realReader.error;
});

utils.defineGetter(FileReader.prototype, 'result', function() {
    return this._localURL ? this._result: this._realReader.result;
});

function defineEvent(eventName) {
    utils.defineGetterSetter(FileReader.prototype, eventName, function() {
        return this._realReader[eventName] || null;
    }, function(value) {
        this._realReader[eventName] = value;
    });
}
defineEvent('onloadstart');    // When the read starts.
defineEvent('onprogress');     // While reading (and decoding) file or fileBlob data, and reporting partial file data (progress.loaded/progress.total)
defineEvent('onload');         // When the read has successfully completed.
defineEvent('onerror');        // When the read has failed (see errors).
defineEvent('onloadend');      // When the request has completed (either in success or failure).
defineEvent('onabort');        // When the read has been aborted. For instance, by invoking the abort() method.

function initRead(reader, file) {
    // Already loading something
    if (reader.readyState == FileReader.LOADING) {
      throw new FileError(FileError.INVALID_STATE_ERR);
    }

    reader._result = null;
    reader._error = null;
    reader._readyState = FileReader.LOADING;

    if (typeof file.localURL == 'string') {
        reader._localURL = file.localURL;
    } else {
        reader._localURL = '';
        return true;
    }

    reader.onloadstart && reader.onloadstart(new ProgressEvent("loadstart", {target:reader}));
}

/**
 * Abort reading file.
 */
FileReader.prototype.abort = function() {
    if (origFileReader && !this._localURL) {
        return this._realReader.abort();
    }
    this._result = null;

    if (this._readyState == FileReader.DONE || this._readyState == FileReader.EMPTY) {
      return;
    }

    this._readyState = FileReader.DONE;

    // If abort callback
    if (typeof this.onabort === 'function') {
        this.onabort(new ProgressEvent('abort', {target:this}));
    }
    // If load end callback
    if (typeof this.onloadend === 'function') {
        this.onloadend(new ProgressEvent('loadend', {target:this}));
    }
};

/**
 * Read text file.
 *
 * @param file          {File} File object containing file properties
 * @param encoding      [Optional] (see http://www.iana.org/assignments/character-sets)
 */
FileReader.prototype.readAsText = function(file, encoding) {
    if (initRead(this, file)) {
        return this._realReader.readAsText(file, encoding);
    }

    // Default encoding is UTF-8
    var enc = encoding ? encoding : "UTF-8";
    var me = this;
    var execArgs = [this._localURL, enc, file.start, file.end];

    // Read file
    exec(
        // Success callback
        function(r) {
            // If DONE (cancelled), then don't do anything
            if (me._readyState === FileReader.DONE) {
                return;
            }

            // Save result
            me._result = r;

            // If onload callback
            if (typeof me.onload === "function") {
                me.onload(new ProgressEvent("load", {target:me}));
            }

            // DONE state
            me._readyState = FileReader.DONE;

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend(new ProgressEvent("loadend", {target:me}));
            }
        },
        // Error callback
        function(e) {
            // If DONE (cancelled), then don't do anything
            if (me._readyState === FileReader.DONE) {
                return;
            }

            // DONE state
            me._readyState = FileReader.DONE;

            // null result
            me._result = null;

            // Save error
            me._error = new FileError(e);

            // If onerror callback
            if (typeof me.onerror === "function") {
                me.onerror(new ProgressEvent("error", {target:me}));
            }

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend(new ProgressEvent("loadend", {target:me}));
            }
        }, "File", "readAsText", execArgs);
};


/**
 * Read file and return data as a base64 encoded data url.
 * A data url is of the form:
 *      data:[<mediatype>][;base64],<data>
 *
 * @param file          {File} File object containing file properties
 */
FileReader.prototype.readAsDataURL = function(file) {
    if (initRead(this, file)) {
        return this._realReader.readAsDataURL(file);
    }

    var me = this;
    var execArgs = [this._localURL, file.start, file.end];

    // Read file
    exec(
        // Success callback
        function(r) {
            // If DONE (cancelled), then don't do anything
            if (me._readyState === FileReader.DONE) {
                return;
            }

            // DONE state
            me._readyState = FileReader.DONE;

            // Save result
            me._result = r;

            // If onload callback
            if (typeof me.onload === "function") {
                me.onload(new ProgressEvent("load", {target:me}));
            }

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend(new ProgressEvent("loadend", {target:me}));
            }
        },
        // Error callback
        function(e) {
            // If DONE (cancelled), then don't do anything
            if (me._readyState === FileReader.DONE) {
                return;
            }

            // DONE state
            me._readyState = FileReader.DONE;

            me._result = null;

            // Save error
            me._error = new FileError(e);

            // If onerror callback
            if (typeof me.onerror === "function") {
                me.onerror(new ProgressEvent("error", {target:me}));
            }

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend(new ProgressEvent("loadend", {target:me}));
            }
        }, "File", "readAsDataURL", execArgs);
};

/**
 * Read file and return data as a binary data.
 *
 * @param file          {File} File object containing file properties
 */
FileReader.prototype.readAsBinaryString = function(file) {
    if (initRead(this, file)) {
        return this._realReader.readAsBinaryString(file);
    }

    var me = this;
    var execArgs = [this._localURL, file.start, file.end];

    // Read file
    exec(
        // Success callback
        function(r) {
            // If DONE (cancelled), then don't do anything
            if (me._readyState === FileReader.DONE) {
                return;
            }

            // DONE state
            me._readyState = FileReader.DONE;

            me._result = r;

            // If onload callback
            if (typeof me.onload === "function") {
                me.onload(new ProgressEvent("load", {target:me}));
            }

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend(new ProgressEvent("loadend", {target:me}));
            }
        },
        // Error callback
        function(e) {
            // If DONE (cancelled), then don't do anything
            if (me._readyState === FileReader.DONE) {
                return;
            }

            // DONE state
            me._readyState = FileReader.DONE;

            me._result = null;

            // Save error
            me._error = new FileError(e);

            // If onerror callback
            if (typeof me.onerror === "function") {
                me.onerror(new ProgressEvent("error", {target:me}));
            }

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend(new ProgressEvent("loadend", {target:me}));
            }
        }, "File", "readAsBinaryString", execArgs);
};

/**
 * Read file and return data as a binary data.
 *
 * @param file          {File} File object containing file properties
 */
FileReader.prototype.readAsArrayBuffer = function(file) {
    if (initRead(this, file)) {
        return this._realReader.readAsArrayBuffer(file);
    }

    var me = this;
    var execArgs = [this._localURL, file.start, file.end];

    // Read file
    exec(
        // Success callback
        function(r) {
            // If DONE (cancelled), then don't do anything
            if (me._readyState === FileReader.DONE) {
                return;
            }

            // DONE state
            me._readyState = FileReader.DONE;

            me._result = r;

            // If onload callback
            if (typeof me.onload === "function") {
                me.onload(new ProgressEvent("load", {target:me}));
            }

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend(new ProgressEvent("loadend", {target:me}));
            }
        },
        // Error callback
        function(e) {
            // If DONE (cancelled), then don't do anything
            if (me._readyState === FileReader.DONE) {
                return;
            }

            // DONE state
            me._readyState = FileReader.DONE;

            me._result = null;

            // Save error
            me._error = new FileError(e);

            // If onerror callback
            if (typeof me.onerror === "function") {
                me.onerror(new ProgressEvent("error", {target:me}));
            }

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend(new ProgressEvent("loadend", {target:me}));
            }
        }, "File", "readAsArrayBuffer", execArgs);
};

module.exports = FileReader;

});

cordova.define("org.apache.cordova.file.FileSystem", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var DirectoryEntry = require('./DirectoryEntry');

/**
 * An interface representing a file system
 *
 * @constructor
 * {DOMString} name the unique name of the file system (readonly)
 * {DirectoryEntry} root directory of the file system (readonly)
 */
var FileSystem = function(name, root) {
    this.name = name || null;
    if (root) {
        this.root = new DirectoryEntry(root.name, root.fullPath, this);
    } else {
        this.root = new DirectoryEntry(this.name, '/', this);
    }
};

FileSystem.prototype.__format__ = function(fullPath) {
    return fullPath;
};

module.exports = FileSystem;

});

cordova.define("org.apache.cordova.file.FileUploadOptions", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

/**
 * Options to customize the HTTP request used to upload files.
 * @constructor
 * @param fileKey {String}   Name of file request parameter.
 * @param fileName {String}  Filename to be used by the server. Defaults to image.jpg.
 * @param mimeType {String}  Mimetype of the uploaded file. Defaults to image/jpeg.
 * @param params {Object}    Object with key: value params to send to the server.
 * @param headers {Object}   Keys are header names, values are header values. Multiple
 *                           headers of the same name are not supported.
 */
var FileUploadOptions = function(fileKey, fileName, mimeType, params, headers, httpMethod) {
    this.fileKey = fileKey || null;
    this.fileName = fileName || null;
    this.mimeType = mimeType || null;
    this.params = params || null;
    this.headers = headers || null;
    this.httpMethod = httpMethod || null;
};

module.exports = FileUploadOptions;

});

cordova.define("org.apache.cordova.file.FileUploadResult", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

/**
 * FileUploadResult
 * @constructor
 */
module.exports = function FileUploadResult(size, code, content) {
	this.bytesSent = size;
	this.responseCode = code;
	this.response = content;
 };
});

cordova.define("org.apache.cordova.file.FileWriter", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var exec = require('cordova/exec'),
    FileError = require('./FileError'),
    ProgressEvent = require('./ProgressEvent');

/**
 * This class writes to the mobile device file system.
 *
 * For Android:
 *      The root directory is the root of the file system.
 *      To write to the SD card, the file name is "sdcard/my_file.txt"
 *
 * @constructor
 * @param file {File} File object containing file properties
 * @param append if true write to the end of the file, otherwise overwrite the file
 */
var FileWriter = function(file) {
    this.fileName = "";
    this.length = 0;
    if (file) {
        this.localURL = file.localURL || file;
        this.length = file.size || 0;
    }
    // default is to write at the beginning of the file
    this.position = 0;

    this.readyState = 0; // EMPTY

    this.result = null;

    // Error
    this.error = null;

    // Event handlers
    this.onwritestart = null;   // When writing starts
    this.onprogress = null;     // While writing the file, and reporting partial file data
    this.onwrite = null;        // When the write has successfully completed.
    this.onwriteend = null;     // When the request has completed (either in success or failure).
    this.onabort = null;        // When the write has been aborted. For instance, by invoking the abort() method.
    this.onerror = null;        // When the write has failed (see errors).
};

// States
FileWriter.INIT = 0;
FileWriter.WRITING = 1;
FileWriter.DONE = 2;

/**
 * Abort writing file.
 */
FileWriter.prototype.abort = function() {
    // check for invalid state
    if (this.readyState === FileWriter.DONE || this.readyState === FileWriter.INIT) {
        throw new FileError(FileError.INVALID_STATE_ERR);
    }

    // set error
    this.error = new FileError(FileError.ABORT_ERR);

    this.readyState = FileWriter.DONE;

    // If abort callback
    if (typeof this.onabort === "function") {
        this.onabort(new ProgressEvent("abort", {"target":this}));
    }

    // If write end callback
    if (typeof this.onwriteend === "function") {
        this.onwriteend(new ProgressEvent("writeend", {"target":this}));
    }
};

/**
 * Writes data to the file
 *
 * @param data text or blob to be written
 */
FileWriter.prototype.write = function(data) {

    var that=this;
    var supportsBinary = (typeof window.Blob !== 'undefined' && typeof window.ArrayBuffer !== 'undefined');
    var isBinary;

    // Check to see if the incoming data is a blob
    if (data instanceof File || (supportsBinary && data instanceof Blob)) {
        var fileReader = new FileReader();
        fileReader.onload = function() {
            // Call this method again, with the arraybuffer as argument
            FileWriter.prototype.write.call(that, this.result);
        };
        if (supportsBinary) {
            fileReader.readAsArrayBuffer(data);
        } else {
            fileReader.readAsText(data);
        }
        return;
    }

    // Mark data type for safer transport over the binary bridge
    isBinary = supportsBinary && (data instanceof ArrayBuffer);
    if (isBinary && ['windowsphone', 'windows8'].indexOf(cordova.platformId) >= 0) {
        // create a plain array, using the keys from the Uint8Array view so that we can serialize it
        data = Array.apply(null, new Uint8Array(data));
    }
    
    // Throw an exception if we are already writing a file
    if (this.readyState === FileWriter.WRITING) {
        throw new FileError(FileError.INVALID_STATE_ERR);
    }

    // WRITING state
    this.readyState = FileWriter.WRITING;

    var me = this;

    // If onwritestart callback
    if (typeof me.onwritestart === "function") {
        me.onwritestart(new ProgressEvent("writestart", {"target":me}));
    }

    // Write file
    exec(
        // Success callback
        function(r) {
            // If DONE (cancelled), then don't do anything
            if (me.readyState === FileWriter.DONE) {
                return;
            }

            // position always increases by bytes written because file would be extended
            me.position += r;
            // The length of the file is now where we are done writing.

            me.length = me.position;

            // DONE state
            me.readyState = FileWriter.DONE;

            // If onwrite callback
            if (typeof me.onwrite === "function") {
                me.onwrite(new ProgressEvent("write", {"target":me}));
            }

            // If onwriteend callback
            if (typeof me.onwriteend === "function") {
                me.onwriteend(new ProgressEvent("writeend", {"target":me}));
            }
        },
        // Error callback
        function(e) {
            // If DONE (cancelled), then don't do anything
            if (me.readyState === FileWriter.DONE) {
                return;
            }

            // DONE state
            me.readyState = FileWriter.DONE;

            // Save error
            me.error = new FileError(e);

            // If onerror callback
            if (typeof me.onerror === "function") {
                me.onerror(new ProgressEvent("error", {"target":me}));
            }

            // If onwriteend callback
            if (typeof me.onwriteend === "function") {
                me.onwriteend(new ProgressEvent("writeend", {"target":me}));
            }
        }, "File", "write", [this.localURL, data, this.position, isBinary]);
};

/**
 * Moves the file pointer to the location specified.
 *
 * If the offset is a negative number the position of the file
 * pointer is rewound.  If the offset is greater than the file
 * size the position is set to the end of the file.
 *
 * @param offset is the location to move the file pointer to.
 */
FileWriter.prototype.seek = function(offset) {
    // Throw an exception if we are already writing a file
    if (this.readyState === FileWriter.WRITING) {
        throw new FileError(FileError.INVALID_STATE_ERR);
    }

    if (!offset && offset !== 0) {
        return;
    }

    // See back from end of file.
    if (offset < 0) {
        this.position = Math.max(offset + this.length, 0);
    }
    // Offset is bigger than file size so set position
    // to the end of the file.
    else if (offset > this.length) {
        this.position = this.length;
    }
    // Offset is between 0 and file size so set the position
    // to start writing.
    else {
        this.position = offset;
    }
};

/**
 * Truncates the file to the size specified.
 *
 * @param size to chop the file at.
 */
FileWriter.prototype.truncate = function(size) {
    // Throw an exception if we are already writing a file
    if (this.readyState === FileWriter.WRITING) {
        throw new FileError(FileError.INVALID_STATE_ERR);
    }

    // WRITING state
    this.readyState = FileWriter.WRITING;

    var me = this;

    // If onwritestart callback
    if (typeof me.onwritestart === "function") {
        me.onwritestart(new ProgressEvent("writestart", {"target":this}));
    }

    // Write file
    exec(
        // Success callback
        function(r) {
            // If DONE (cancelled), then don't do anything
            if (me.readyState === FileWriter.DONE) {
                return;
            }

            // DONE state
            me.readyState = FileWriter.DONE;

            // Update the length of the file
            me.length = r;
            me.position = Math.min(me.position, r);

            // If onwrite callback
            if (typeof me.onwrite === "function") {
                me.onwrite(new ProgressEvent("write", {"target":me}));
            }

            // If onwriteend callback
            if (typeof me.onwriteend === "function") {
                me.onwriteend(new ProgressEvent("writeend", {"target":me}));
            }
        },
        // Error callback
        function(e) {
            // If DONE (cancelled), then don't do anything
            if (me.readyState === FileWriter.DONE) {
                return;
            }

            // DONE state
            me.readyState = FileWriter.DONE;

            // Save error
            me.error = new FileError(e);

            // If onerror callback
            if (typeof me.onerror === "function") {
                me.onerror(new ProgressEvent("error", {"target":me}));
            }

            // If onwriteend callback
            if (typeof me.onwriteend === "function") {
                me.onwriteend(new ProgressEvent("writeend", {"target":me}));
            }
        }, "File", "truncate", [this.localURL, size]);
};

module.exports = FileWriter;

});

cordova.define("org.apache.cordova.file.Flags", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

/**
 * Supplies arguments to methods that lookup or create files and directories.
 *
 * @param create
 *            {boolean} file or directory if it doesn't exist
 * @param exclusive
 *            {boolean} used with create; if true the command will fail if
 *            target path exists
 */
function Flags(create, exclusive) {
    this.create = create || false;
    this.exclusive = exclusive || false;
}

module.exports = Flags;

});

cordova.define("org.apache.cordova.file.LocalFileSystem", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

exports.TEMPORARY = 0;
exports.PERSISTENT = 1;
exports.APPWORKSPACE = 3; //TODO:Use filesystem name

});

cordova.define("org.apache.cordova.file.Metadata", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

/**
 * Information about the state of the file or directory
 *
 * {Date} modificationTime (readonly)
 */
var Metadata = function(metadata) {
    if (typeof metadata == "object") {
        this.modificationTime = new Date(metadata.modificationTime);
        this.size = +(metadata.size);
    } else if (typeof metadata == "undefined") {
        this.modificationTime = null;
        this.size = null;
    } else {
        /* Backwards compatiblity with platforms that only return a timestamp */
        this.modificationTime = new Date(metadata);
    }
};

module.exports = Metadata;

});

cordova.define("org.apache.cordova.file.ProgressEvent", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

// If ProgressEvent exists in global context, use it already, otherwise use our own polyfill
// Feature test: See if we can instantiate a native ProgressEvent;
// if so, use that approach,
// otherwise fill-in with our own implementation.
//
// NOTE: right now we always fill in with our own. Down the road would be nice if we can use whatever is native in the webview.
var ProgressEvent = (function() {
    /*
    var createEvent = function(data) {
        var event = document.createEvent('Events');
        event.initEvent('ProgressEvent', false, false);
        if (data) {
            for (var i in data) {
                if (data.hasOwnProperty(i)) {
                    event[i] = data[i];
                }
            }
            if (data.target) {
                // TODO: cannot call <some_custom_object>.dispatchEvent
                // need to first figure out how to implement EventTarget
            }
        }
        return event;
    };
    try {
        var ev = createEvent({type:"abort",target:document});
        return function ProgressEvent(type, data) {
            data.type = type;
            return createEvent(data);
        };
    } catch(e){
    */
        return function ProgressEvent(type, dict) {
            this.type = type;
            this.bubbles = false;
            this.cancelBubble = false;
            this.cancelable = false;
            this.lengthComputable = false;
            this.loaded = dict && dict.loaded ? dict.loaded : 0;
            this.total = dict && dict.total ? dict.total : 0;
            this.target = dict && dict.target ? dict.target : null;
        };
    //}
})();

module.exports = ProgressEvent;

});

cordova.define("org.apache.cordova.file.androidFileSystem", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

FILESYSTEM_PROTOCOL = "cdvfile";

module.exports = {
    __format__: function(fullPath) {
        if (this.name === 'content') {
            return 'content:/' + fullPath;
        }
        var path = ('/'+this.name+(fullPath[0]==='/'?'':'/')+encodeURI(fullPath)).replace('//','/');
        return FILESYSTEM_PROTOCOL + '://localhost' + path;
    }
};


});

cordova.define("org.apache.cordova.file.requestFileSystem", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var argscheck = require('cordova/argscheck'),
    FileError = require('./FileError'),
    FileSystem = require('./FileSystem'),
    exec = require('cordova/exec');

/**
 * Request a file system in which to store application data.
 * @param type  local file system type
 * @param size  indicates how much storage space, in bytes, the application expects to need
 * @param successCallback  invoked with a FileSystem object
 * @param errorCallback  invoked if error occurs retrieving file system
 */
var requestFileSystem = function(type, size, successCallback, errorCallback) {
    argscheck.checkArgs('nnFF', 'requestFileSystem', arguments);
    var fail = function(code) {
        errorCallback && errorCallback(new FileError(code));
    };

    if (type < 0) {
        fail(FileError.SYNTAX_ERR);
    } else {
        // if successful, return a FileSystem object
        var success = function(file_system) {
            if (file_system) {
                if (successCallback) {
                    // grab the name and root from the file system object
                    var result = new FileSystem(file_system.name, file_system.root);
                    successCallback(result);
                }
            }
            else {
                // no FileSystem object returned
                fail(FileError.NOT_FOUND_ERR);
            }
        };
        exec(success, fail, "File", "requestFileSystem", [type, size]);
    }
};

module.exports = requestFileSystem;

});

cordova.define("org.apache.cordova.file.resolveLocalFileSystemURI", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var argscheck = require('cordova/argscheck'),
    DirectoryEntry = require('./DirectoryEntry'),
    FileEntry = require('./FileEntry'),
    FileError = require('./FileError'),
    exec = require('cordova/exec');

/**
 * Look up file system Entry referred to by local URI.
 * @param {DOMString} uri  URI referring to a local file or directory
 * @param successCallback  invoked with Entry object corresponding to URI
 * @param errorCallback    invoked if error occurs retrieving file system entry
 */
module.exports.resolveLocalFileSystemURL = function(uri, successCallback, errorCallback) {
    argscheck.checkArgs('sFF', 'resolveLocalFileSystemURI', arguments);
    // error callback
    var fail = function(error) {
        errorCallback && errorCallback(new FileError(error));
    };
    // sanity check for 'not:valid:filename'
    if(!uri || uri.split(":").length > 2) {
        setTimeout( function() {
            fail(FileError.ENCODING_ERR);
        },0);
        return;
    }
    // if successful, return either a file or directory entry
    var success = function(entry) {
        if (entry) {
            if (successCallback) {
                // create appropriate Entry object
                var fsName = entry.filesystemName || (entry.filesystem == window.PERSISTENT ? 'persistent' : 'temporary');
                var fs = new FileSystem(fsName, {name:"", fullPath:"/"});
                var result = (entry.isDirectory) ? new DirectoryEntry(entry.name, entry.fullPath, fs, entry.nativeURL) : new FileEntry(entry.name, entry.fullPath, fs, entry.nativeURL);
                successCallback(result);
            }
        }
        else {
            // no Entry object returned
            fail(FileError.NOT_FOUND_ERR);
        }
    };

    exec(success, fail, "File", "resolveLocalFileSystemURI", [uri]);
};
module.exports.resolveLocalFileSystemURI = function() {
    console.log("resolveLocalFileSystemURI is deprecated. Please call resolveLocalFileSystemURL instead.");
    module.exports.resolveLocalFileSystemURL.apply(this, arguments);
};

});

cordova.define("org.apache.cordova.file-transfer.FileTransfer", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec'),
    FileTransferError = require('./FileTransferError'),
    ProgressEvent = require('org.apache.cordova.file.ProgressEvent');

function newProgressEvent(result) {
    var pe = new ProgressEvent();
    pe.lengthComputable = result.lengthComputable;
    pe.loaded = result.loaded;
    pe.total = result.total;
    return pe;
}

function getBasicAuthHeader(urlString) {
    var header =  null;

    if (window.btoa) {
        // parse the url using the Location object
        var url = document.createElement('a');
        url.href = urlString;

        var credentials = null;
        var protocol = url.protocol + "//";
        var origin = protocol + url.host.replace(":" + url.port, ""); // Windows 8 (IE10) append :80 or :443 to url.host

        // check whether there are the username:password credentials in the url
        if (url.href.indexOf(origin) !== 0) { // credentials found
            var atIndex = url.href.indexOf("@");
            credentials = url.href.substring(protocol.length, atIndex);
        }

        if (credentials) {
            var authHeader = "Authorization";
            var authHeaderValue = "Basic " + window.btoa(credentials);

            header = {
                name : authHeader,
                value : authHeaderValue
            };
        }
    }

    return header;
}

var idCounter = 0;

/**
 * FileTransfer uploads a file to a remote server.
 * @constructor
 */
var FileTransfer = function() {
    this._id = ++idCounter;
    this.onprogress = null; // optional callback
};

/**
* Given an absolute file path, uploads a file on the device to a remote server
* using a multipart HTTP request.
* @param filePath {String}           Full path of the file on the device
* @param server {String}             URL of the server to receive the file
* @param successCallback (Function}  Callback to be invoked when upload has completed
* @param errorCallback {Function}    Callback to be invoked upon error
* @param options {FileUploadOptions} Optional parameters such as file name and mimetype
* @param trustAllHosts {Boolean} Optional trust all hosts (e.g. for self-signed certs), defaults to false
*/
FileTransfer.prototype.upload = function(filePath, server, successCallback, errorCallback, options, trustAllHosts) {
    argscheck.checkArgs('ssFFO*', 'FileTransfer.upload', arguments);
    // check for options
    var fileKey = null;
    var fileName = null;
    var mimeType = null;
    var params = null;
    var chunkedMode = true;
    var headers = null;
    var httpMethod = null;
    var basicAuthHeader = getBasicAuthHeader(server);
    if (basicAuthHeader) {
        options = options || {};
        options.headers = options.headers || {};
        options.headers[basicAuthHeader.name] = basicAuthHeader.value;
    }

    if (options) {
        fileKey = options.fileKey;
        fileName = options.fileName;
        mimeType = options.mimeType;
        headers = options.headers;
        httpMethod = options.httpMethod || "POST";
        if (httpMethod.toUpperCase() == "PUT"){
            httpMethod = "PUT";
        } else {
            httpMethod = "POST";
        }
        if (options.chunkedMode !== null || typeof options.chunkedMode != "undefined") {
            chunkedMode = options.chunkedMode;
        }
        if (options.params) {
            params = options.params;
        }
        else {
            params = {};
        }
    }

    var fail = errorCallback && function(e) {
        var error = new FileTransferError(e.code, e.source, e.target, e.http_status, e.body);
        errorCallback(error);
    };

    var self = this;
    var win = function(result) {
        if (typeof result.lengthComputable != "undefined") {
            if (self.onprogress) {
                self.onprogress(newProgressEvent(result));
            }
        } else {
            successCallback && successCallback(result);
        }
    };
    exec(win, fail, 'FileTransfer', 'upload', [filePath, server, fileKey, fileName, mimeType, params, trustAllHosts, chunkedMode, headers, this._id, httpMethod]);
};

/**
 * Downloads a file form a given URL and saves it to the specified directory.
 * @param source {String}          URL of the server to receive the file
 * @param target {String}         Full path of the file on the device
 * @param successCallback (Function}  Callback to be invoked when upload has completed
 * @param errorCallback {Function}    Callback to be invoked upon error
 * @param trustAllHosts {Boolean} Optional trust all hosts (e.g. for self-signed certs), defaults to false
 * @param options {FileDownloadOptions} Optional parameters such as headers
 */
FileTransfer.prototype.download = function(source, target, successCallback, errorCallback, trustAllHosts, options) {
    argscheck.checkArgs('ssFF*', 'FileTransfer.download', arguments);
    var self = this;

    var basicAuthHeader = getBasicAuthHeader(source);
    if (basicAuthHeader) {
        options = options || {};
        options.headers = options.headers || {};
        options.headers[basicAuthHeader.name] = basicAuthHeader.value;
    }

    var headers = null;
    if (options) {
        headers = options.headers || null;
    }

    var win = function(result) {
        if (typeof result.lengthComputable != "undefined") {
            if (self.onprogress) {
                return self.onprogress(newProgressEvent(result));
            }
        } else if (successCallback) {
            var entry = null;
            if (result.isDirectory) {
                entry = new (require('org.apache.cordova.file.DirectoryEntry'))();
            }
            else if (result.isFile) {
                entry = new (require('org.apache.cordova.file.FileEntry'))();
            }
            entry.isDirectory = result.isDirectory;
            entry.isFile = result.isFile;
            entry.name = result.name;
            entry.fullPath = result.fullPath;
            entry.filesystem = new FileSystem(result.filesystemName || (result.filesystem == window.PERSISTENT ? 'persistent' : 'temporary'));
            entry.nativeURL = result.nativeURL;
            successCallback(entry);
        }
    };

    var fail = errorCallback && function(e) {
        var error = new FileTransferError(e.code, e.source, e.target, e.http_status, e.body);
        errorCallback(error);
    };

    exec(win, fail, 'FileTransfer', 'download', [source, target, trustAllHosts, this._id, headers]);
};

/**
 * Aborts the ongoing file transfer on this object. The original error
 * callback for the file transfer will be called if necessary.
 */
FileTransfer.prototype.abort = function() {
    exec(null, null, 'FileTransfer', 'abort', [this._id]);
};

module.exports = FileTransfer;

});

cordova.define("org.apache.cordova.file-transfer.FileTransferError", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

/**
 * FileTransferError
 * @constructor
 */
var FileTransferError = function(code, source, target, status, body) {
    this.code = code || null;
    this.source = source || null;
    this.target = target || null;
    this.http_status = status || null;
    this.body = body || null;
};

FileTransferError.FILE_NOT_FOUND_ERR = 1;
FileTransferError.INVALID_URL_ERR = 2;
FileTransferError.CONNECTION_ERR = 3;
FileTransferError.ABORT_ERR = 4;

module.exports = FileTransferError;

});

cordova.define("org.apache.cordova.geolocation.Coordinates", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

/**
 * This class contains position information.
 * @param {Object} lat
 * @param {Object} lng
 * @param {Object} alt
 * @param {Object} acc
 * @param {Object} head
 * @param {Object} vel
 * @param {Object} altacc
 * @constructor
 */
var Coordinates = function(lat, lng, alt, acc, head, vel, altacc) {
    /**
     * The latitude of the position.
     */
    this.latitude = lat;
    /**
     * The longitude of the position,
     */
    this.longitude = lng;
    /**
     * The accuracy of the position.
     */
    this.accuracy = acc;
    /**
     * The altitude of the position.
     */
    this.altitude = (alt !== undefined ? alt : null);
    /**
     * The direction the device is moving at the position.
     */
    this.heading = (head !== undefined ? head : null);
    /**
     * The velocity with which the device is moving at the position.
     */
    this.speed = (vel !== undefined ? vel : null);

    if (this.speed === 0 || this.speed === null) {
        this.heading = NaN;
    }

    /**
     * The altitude accuracy of the position.
     */
    this.altitudeAccuracy = (altacc !== undefined) ? altacc : null;
};

module.exports = Coordinates;

});

cordova.define("org.apache.cordova.geolocation.Position", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var Coordinates = require('./Coordinates');

var Position = function(coords, timestamp) {
    if (coords) {
        this.coords = new Coordinates(coords.latitude, coords.longitude, coords.altitude, coords.accuracy, coords.heading, coords.velocity, coords.altitudeAccuracy);
    } else {
        this.coords = new Coordinates();
    }
    this.timestamp = (timestamp !== undefined) ? timestamp : new Date();
};

module.exports = Position;

});

cordova.define("org.apache.cordova.geolocation.PositionError", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

/**
 * Position error object
 *
 * @constructor
 * @param code
 * @param message
 */
var PositionError = function(code, message) {
    this.code = code || null;
    this.message = message || '';
};

PositionError.PERMISSION_DENIED = 1;
PositionError.POSITION_UNAVAILABLE = 2;
PositionError.TIMEOUT = 3;

module.exports = PositionError;

});

cordova.define("org.apache.cordova.geolocation.geolocation", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var argscheck = require('cordova/argscheck'),
    utils = require('cordova/utils'),
    exec = require('cordova/exec'),
    PositionError = require('./PositionError'),
    Position = require('./Position');

var timers = {};   // list of timers in use

// Returns default params, overrides if provided with values
function parseParameters(options) {
    var opt = {
        maximumAge: 0,
        enableHighAccuracy: false,
        timeout: Infinity
    };

    if (options) {
        if (options.maximumAge !== undefined && !isNaN(options.maximumAge) && options.maximumAge > 0) {
            opt.maximumAge = options.maximumAge;
        }
        if (options.enableHighAccuracy !== undefined) {
            opt.enableHighAccuracy = options.enableHighAccuracy;
        }
        if (options.timeout !== undefined && !isNaN(options.timeout)) {
            if (options.timeout < 0) {
                opt.timeout = 0;
            } else {
                opt.timeout = options.timeout;
            }
        }
    }

    return opt;
}

// Returns a timeout failure, closed over a specified timeout value and error callback.
function createTimeout(errorCallback, timeout) {
    var t = setTimeout(function() {
        clearTimeout(t);
        t = null;
        errorCallback({
            code:PositionError.TIMEOUT,
            message:"Position retrieval timed out."
        });
    }, timeout);
    return t;
}

var geolocation = {
    lastPosition:null, // reference to last known (cached) position returned
    /**
   * Asynchronously acquires the current position.
   *
   * @param {Function} successCallback    The function to call when the position data is available
   * @param {Function} errorCallback      The function to call when there is an error getting the heading position. (OPTIONAL)
   * @param {PositionOptions} options     The options for getting the position data. (OPTIONAL)
   */
    getCurrentPosition:function(successCallback, errorCallback, options) {
        argscheck.checkArgs('fFO', 'geolocation.getCurrentPosition', arguments);
        options = parseParameters(options);

        // Timer var that will fire an error callback if no position is retrieved from native
        // before the "timeout" param provided expires
        var timeoutTimer = {timer:null};

        var win = function(p) {
            clearTimeout(timeoutTimer.timer);
            if (!(timeoutTimer.timer)) {
                // Timeout already happened, or native fired error callback for
                // this geo request.
                // Don't continue with success callback.
                return;
            }
            var pos = new Position(
                {
                    latitude:p.latitude,
                    longitude:p.longitude,
                    altitude:p.altitude,
                    accuracy:p.accuracy,
                    heading:p.heading,
                    velocity:p.velocity,
                    altitudeAccuracy:p.altitudeAccuracy
                },
                (p.timestamp === undefined ? new Date() : ((p.timestamp instanceof Date) ? p.timestamp : new Date(p.timestamp)))
            );
            geolocation.lastPosition = pos;
            successCallback(pos);
        };
        var fail = function(e) {
            clearTimeout(timeoutTimer.timer);
            timeoutTimer.timer = null;
            var err = new PositionError(e.code, e.message);
            if (errorCallback) {
                errorCallback(err);
            }
        };

        // Check our cached position, if its timestamp difference with current time is less than the maximumAge, then just
        // fire the success callback with the cached position.
        if (geolocation.lastPosition && options.maximumAge && (((new Date()).getTime() - geolocation.lastPosition.timestamp.getTime()) <= options.maximumAge)) {
            successCallback(geolocation.lastPosition);
        // If the cached position check failed and the timeout was set to 0, error out with a TIMEOUT error object.
        } else if (options.timeout === 0) {
            fail({
                code:PositionError.TIMEOUT,
                message:"timeout value in PositionOptions set to 0 and no cached Position object available, or cached Position object's age exceeds provided PositionOptions' maximumAge parameter."
            });
        // Otherwise we have to call into native to retrieve a position.
        } else {
            if (options.timeout !== Infinity) {
                // If the timeout value was not set to Infinity (default), then
                // set up a timeout function that will fire the error callback
                // if no successful position was retrieved before timeout expired.
                timeoutTimer.timer = createTimeout(fail, options.timeout);
            } else {
                // This is here so the check in the win function doesn't mess stuff up
                // may seem weird but this guarantees timeoutTimer is
                // always truthy before we call into native
                timeoutTimer.timer = true;
            }
            exec(win, fail, "Geolocation", "getLocation", [options.enableHighAccuracy, options.maximumAge]);
        }
        return timeoutTimer;
    },
    /**
     * Asynchronously watches the geolocation for changes to geolocation.  When a change occurs,
     * the successCallback is called with the new location.
     *
     * @param {Function} successCallback    The function to call each time the location data is available
     * @param {Function} errorCallback      The function to call when there is an error getting the location data. (OPTIONAL)
     * @param {PositionOptions} options     The options for getting the location data such as frequency. (OPTIONAL)
     * @return String                       The watch id that must be passed to #clearWatch to stop watching.
     */
    watchPosition:function(successCallback, errorCallback, options) {
        argscheck.checkArgs('fFO', 'geolocation.getCurrentPosition', arguments);
        options = parseParameters(options);

        var id = utils.createUUID();

        // Tell device to get a position ASAP, and also retrieve a reference to the timeout timer generated in getCurrentPosition
        timers[id] = geolocation.getCurrentPosition(successCallback, errorCallback, options);

        var fail = function(e) {
            clearTimeout(timers[id].timer);
            var err = new PositionError(e.code, e.message);
            if (errorCallback) {
                errorCallback(err);
            }
        };

        var win = function(p) {
            clearTimeout(timers[id].timer);
            if (options.timeout !== Infinity) {
                timers[id].timer = createTimeout(fail, options.timeout);
            }
            var pos = new Position(
                {
                    latitude:p.latitude,
                    longitude:p.longitude,
                    altitude:p.altitude,
                    accuracy:p.accuracy,
                    heading:p.heading,
                    velocity:p.velocity,
                    altitudeAccuracy:p.altitudeAccuracy
                },
                (p.timestamp === undefined ? new Date() : ((p.timestamp instanceof Date) ? p.timestamp : new Date(p.timestamp)))
            );
            geolocation.lastPosition = pos;
            successCallback(pos);
        };

        exec(win, fail, "Geolocation", "addWatch", [id, options.enableHighAccuracy]);

        return id;
    },
    /**
     * Clears the specified heading watch.
     *
     * @param {String} id       The ID of the watch returned from #watchPosition
     */
    clearWatch:function(id) {
        if (id && timers[id] !== undefined) {
            clearTimeout(timers[id].timer);
            timers[id].timer = false;
            exec(null, null, "Geolocation", "clearWatch", [id]);
        }
    }
};

module.exports = geolocation;

});

cordova.define("org.apache.cordova.globalization.GlobalizationError", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/


/**
 * Globalization error object
 *
 * @constructor
 * @param code
 * @param message
 */
var GlobalizationError = function(code, message) {
    this.code = code || null;
    this.message = message || '';
};

// Globalization error codes
GlobalizationError.UNKNOWN_ERROR = 0;
GlobalizationError.FORMATTING_ERROR = 1;
GlobalizationError.PARSING_ERROR = 2;
GlobalizationError.PATTERN_ERROR = 3;

module.exports = GlobalizationError;

});

cordova.define("org.apache.cordova.globalization.globalization", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec'),
    GlobalizationError = require('./GlobalizationError');

var globalization = {

/**
* Returns the string identifier for the client's current language.
* It returns the language identifier string to the successCB callback with a
* properties object as a parameter. If there is an error getting the language,
* then the errorCB callback is invoked.
*
* @param {Function} successCB
* @param {Function} errorCB
*
* @return Object.value {String}: The language identifier
*
* @error GlobalizationError.UNKNOWN_ERROR
*
* Example
*    globalization.getPreferredLanguage(function (language) {alert('language:' + language.value + '\n');},
*                                function () {});
*/
getPreferredLanguage:function(successCB, failureCB) {
    argscheck.checkArgs('fF', 'Globalization.getPreferredLanguage', arguments);
    exec(successCB, failureCB, "Globalization","getPreferredLanguage", []);
},

/**
* Returns the string identifier for the client's current locale setting.
* It returns the locale identifier string to the successCB callback with a
* properties object as a parameter. If there is an error getting the locale,
* then the errorCB callback is invoked.
*
* @param {Function} successCB
* @param {Function} errorCB
*
* @return Object.value {String}: The locale identifier
*
* @error GlobalizationError.UNKNOWN_ERROR
*
* Example
*    globalization.getLocaleName(function (locale) {alert('locale:' + locale.value + '\n');},
*                                function () {});
*/
getLocaleName:function(successCB, failureCB) {
    argscheck.checkArgs('fF', 'Globalization.getLocaleName', arguments);
    exec(successCB, failureCB, "Globalization","getLocaleName", []);
},


/**
* Returns a date formatted as a string according to the client's user preferences and
* calendar using the time zone of the client. It returns the formatted date string to the
* successCB callback with a properties object as a parameter. If there is an error
* formatting the date, then the errorCB callback is invoked.
*
* The defaults are: formatLenght="short" and selector="date and time"
*
* @param {Date} date
* @param {Function} successCB
* @param {Function} errorCB
* @param {Object} options {optional}
*            formatLength {String}: 'short', 'medium', 'long', or 'full'
*            selector {String}: 'date', 'time', or 'date and time'
*
* @return Object.value {String}: The localized date string
*
* @error GlobalizationError.FORMATTING_ERROR
*
* Example
*    globalization.dateToString(new Date(),
*                function (date) {alert('date:' + date.value + '\n');},
*                function (errorCode) {alert(errorCode);},
*                {formatLength:'short'});
*/
dateToString:function(date, successCB, failureCB, options) {
    argscheck.checkArgs('dfFO', 'Globalization.dateToString', arguments);
    var dateValue = date.valueOf();
    exec(successCB, failureCB, "Globalization", "dateToString", [{"date": dateValue, "options": options}]);
},


/**
* Parses a date formatted as a string according to the client's user
* preferences and calendar using the time zone of the client and returns
* the corresponding date object. It returns the date to the successCB
* callback with a properties object as a parameter. If there is an error
* parsing the date string, then the errorCB callback is invoked.
*
* The defaults are: formatLength="short" and selector="date and time"
*
* @param {String} dateString
* @param {Function} successCB
* @param {Function} errorCB
* @param {Object} options {optional}
*            formatLength {String}: 'short', 'medium', 'long', or 'full'
*            selector {String}: 'date', 'time', or 'date and time'
*
* @return    Object.year {Number}: The four digit year
*            Object.month {Number}: The month from (0 - 11)
*            Object.day {Number}: The day from (1 - 31)
*            Object.hour {Number}: The hour from (0 - 23)
*            Object.minute {Number}: The minute from (0 - 59)
*            Object.second {Number}: The second from (0 - 59)
*            Object.millisecond {Number}: The milliseconds (from 0 - 999),
*                                        not available on all platforms
*
* @error GlobalizationError.PARSING_ERROR
*
* Example
*    globalization.stringToDate('4/11/2011',
*                function (date) { alert('Month:' + date.month + '\n' +
*                    'Day:' + date.day + '\n' +
*                    'Year:' + date.year + '\n');},
*                function (errorCode) {alert(errorCode);},
*                {selector:'date'});
*/
stringToDate:function(dateString, successCB, failureCB, options) {
    argscheck.checkArgs('sfFO', 'Globalization.stringToDate', arguments);
    exec(successCB, failureCB, "Globalization", "stringToDate", [{"dateString": dateString, "options": options}]);
},


/**
* Returns a pattern string for formatting and parsing dates according to the client's
* user preferences. It returns the pattern to the successCB callback with a
* properties object as a parameter. If there is an error obtaining the pattern,
* then the errorCB callback is invoked.
*
* The defaults are: formatLength="short" and selector="date and time"
*
* @param {Function} successCB
* @param {Function} errorCB
* @param {Object} options {optional}
*            formatLength {String}: 'short', 'medium', 'long', or 'full'
*            selector {String}: 'date', 'time', or 'date and time'
*
* @return    Object.pattern {String}: The date and time pattern for formatting and parsing dates.
*                                    The patterns follow Unicode Technical Standard #35
*                                    http://unicode.org/reports/tr35/tr35-4.html
*            Object.timezone {String}: The abbreviated name of the time zone on the client
*            Object.utc_offset {Number}: The current difference in seconds between the client's
*                                        time zone and coordinated universal time.
*            Object.dst_offset {Number}: The current daylight saving time offset in seconds
*                                        between the client's non-daylight saving's time zone
*                                        and the client's daylight saving's time zone.
*
* @error GlobalizationError.PATTERN_ERROR
*
* Example
*    globalization.getDatePattern(
*                function (date) {alert('pattern:' + date.pattern + '\n');},
*                function () {},
*                {formatLength:'short'});
*/
getDatePattern:function(successCB, failureCB, options) {
    argscheck.checkArgs('fFO', 'Globalization.getDatePattern', arguments);
    exec(successCB, failureCB, "Globalization", "getDatePattern", [{"options": options}]);
},


/**
* Returns an array of either the names of the months or days of the week
* according to the client's user preferences and calendar. It returns the array of names to the
* successCB callback with a properties object as a parameter. If there is an error obtaining the
* names, then the errorCB callback is invoked.
*
* The defaults are: type="wide" and item="months"
*
* @param {Function} successCB
* @param {Function} errorCB
* @param {Object} options {optional}
*            type {String}: 'narrow' or 'wide'
*            item {String}: 'months', or 'days'
*
* @return Object.value {Array{String}}: The array of names starting from either
*                                        the first month in the year or the
*                                        first day of the week.
* @error GlobalizationError.UNKNOWN_ERROR
*
* Example
*    globalization.getDateNames(function (names) {
*        for(var i = 0; i < names.value.length; i++) {
*            alert('Month:' + names.value[i] + '\n');}},
*        function () {});
*/
getDateNames:function(successCB, failureCB, options) {
    argscheck.checkArgs('fFO', 'Globalization.getDateNames', arguments);
    exec(successCB, failureCB, "Globalization", "getDateNames", [{"options": options}]);
},

/**
* Returns whether daylight savings time is in effect for a given date using the client's
* time zone and calendar. It returns whether or not daylight savings time is in effect
* to the successCB callback with a properties object as a parameter. If there is an error
* reading the date, then the errorCB callback is invoked.
*
* @param {Date} date
* @param {Function} successCB
* @param {Function} errorCB
*
* @return Object.dst {Boolean}: The value "true" indicates that daylight savings time is
*                                in effect for the given date and "false" indicate that it is not.
*
* @error GlobalizationError.UNKNOWN_ERROR
*
* Example
*    globalization.isDayLightSavingsTime(new Date(),
*                function (date) {alert('dst:' + date.dst + '\n');}
*                function () {});
*/
isDayLightSavingsTime:function(date, successCB, failureCB) {
    argscheck.checkArgs('dfF', 'Globalization.isDayLightSavingsTime', arguments);
    var dateValue = date.valueOf();
    exec(successCB, failureCB, "Globalization", "isDayLightSavingsTime", [{"date": dateValue}]);
},

/**
* Returns the first day of the week according to the client's user preferences and calendar.
* The days of the week are numbered starting from 1 where 1 is considered to be Sunday.
* It returns the day to the successCB callback with a properties object as a parameter.
* If there is an error obtaining the pattern, then the errorCB callback is invoked.
*
* @param {Function} successCB
* @param {Function} errorCB
*
* @return Object.value {Number}: The number of the first day of the week.
*
* @error GlobalizationError.UNKNOWN_ERROR
*
* Example
*    globalization.getFirstDayOfWeek(function (day)
*                { alert('Day:' + day.value + '\n');},
*                function () {});
*/
getFirstDayOfWeek:function(successCB, failureCB) {
    argscheck.checkArgs('fF', 'Globalization.getFirstDayOfWeek', arguments);
    exec(successCB, failureCB, "Globalization", "getFirstDayOfWeek", []);
},


/**
* Returns a number formatted as a string according to the client's user preferences.
* It returns the formatted number string to the successCB callback with a properties object as a
* parameter. If there is an error formatting the number, then the errorCB callback is invoked.
*
* The defaults are: type="decimal"
*
* @param {Number} number
* @param {Function} successCB
* @param {Function} errorCB
* @param {Object} options {optional}
*            type {String}: 'decimal', "percent", or 'currency'
*
* @return Object.value {String}: The formatted number string.
*
* @error GlobalizationError.FORMATTING_ERROR
*
* Example
*    globalization.numberToString(3.25,
*                function (number) {alert('number:' + number.value + '\n');},
*                function () {},
*                {type:'decimal'});
*/
numberToString:function(number, successCB, failureCB, options) {
    argscheck.checkArgs('nfFO', 'Globalization.numberToString', arguments);
    exec(successCB, failureCB, "Globalization", "numberToString", [{"number": number, "options": options}]);
},

/**
* Parses a number formatted as a string according to the client's user preferences and
* returns the corresponding number. It returns the number to the successCB callback with a
* properties object as a parameter. If there is an error parsing the number string, then
* the errorCB callback is invoked.
*
* The defaults are: type="decimal"
*
* @param {String} numberString
* @param {Function} successCB
* @param {Function} errorCB
* @param {Object} options {optional}
*            type {String}: 'decimal', "percent", or 'currency'
*
* @return Object.value {Number}: The parsed number.
*
* @error GlobalizationError.PARSING_ERROR
*
* Example
*    globalization.stringToNumber('1234.56',
*                function (number) {alert('Number:' + number.value + '\n');},
*                function () { alert('Error parsing number');});
*/
stringToNumber:function(numberString, successCB, failureCB, options) {
    argscheck.checkArgs('sfFO', 'Globalization.stringToNumber', arguments);
    exec(successCB, failureCB, "Globalization", "stringToNumber", [{"numberString": numberString, "options": options}]);
},

/**
* Returns a pattern string for formatting and parsing numbers according to the client's user
* preferences. It returns the pattern to the successCB callback with a properties object as a
* parameter. If there is an error obtaining the pattern, then the errorCB callback is invoked.
*
* The defaults are: type="decimal"
*
* @param {Function} successCB
* @param {Function} errorCB
* @param {Object} options {optional}
*            type {String}: 'decimal', "percent", or 'currency'
*
* @return    Object.pattern {String}: The number pattern for formatting and parsing numbers.
*                                    The patterns follow Unicode Technical Standard #35.
*                                    http://unicode.org/reports/tr35/tr35-4.html
*            Object.symbol {String}: The symbol to be used when formatting and parsing
*                                    e.g., percent or currency symbol.
*            Object.fraction {Number}: The number of fractional digits to use when parsing and
*                                    formatting numbers.
*            Object.rounding {Number}: The rounding increment to use when parsing and formatting.
*            Object.positive {String}: The symbol to use for positive numbers when parsing and formatting.
*            Object.negative: {String}: The symbol to use for negative numbers when parsing and formatting.
*            Object.decimal: {String}: The decimal symbol to use for parsing and formatting.
*            Object.grouping: {String}: The grouping symbol to use for parsing and formatting.
*
* @error GlobalizationError.PATTERN_ERROR
*
* Example
*    globalization.getNumberPattern(
*                function (pattern) {alert('Pattern:' + pattern.pattern + '\n');},
*                function () {});
*/
getNumberPattern:function(successCB, failureCB, options) {
    argscheck.checkArgs('fFO', 'Globalization.getNumberPattern', arguments);
    exec(successCB, failureCB, "Globalization", "getNumberPattern", [{"options": options}]);
},

/**
* Returns a pattern string for formatting and parsing currency values according to the client's
* user preferences and ISO 4217 currency code. It returns the pattern to the successCB callback with a
* properties object as a parameter. If there is an error obtaining the pattern, then the errorCB
* callback is invoked.
*
* @param {String} currencyCode
* @param {Function} successCB
* @param {Function} errorCB
*
* @return    Object.pattern {String}: The currency pattern for formatting and parsing currency values.
*                                    The patterns follow Unicode Technical Standard #35
*                                    http://unicode.org/reports/tr35/tr35-4.html
*            Object.code {String}: The ISO 4217 currency code for the pattern.
*            Object.fraction {Number}: The number of fractional digits to use when parsing and
*                                    formatting currency.
*            Object.rounding {Number}: The rounding increment to use when parsing and formatting.
*            Object.decimal: {String}: The decimal symbol to use for parsing and formatting.
*            Object.grouping: {String}: The grouping symbol to use for parsing and formatting.
*
* @error GlobalizationError.FORMATTING_ERROR
*
* Example
*    globalization.getCurrencyPattern('EUR',
*                function (currency) {alert('Pattern:' + currency.pattern + '\n');}
*                function () {});
*/
getCurrencyPattern:function(currencyCode, successCB, failureCB) {
    argscheck.checkArgs('sfF', 'Globalization.getCurrencyPattern', arguments);
    exec(successCB, failureCB, "Globalization", "getCurrencyPattern", [{"currencyCode": currencyCode}]);
}

};

module.exports = globalization;

});

cordova.define("org.apache.cordova.inappbrowser.InAppBrowser", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var exec = require('cordova/exec');
var channel = require('cordova/channel');
var modulemapper = require('cordova/modulemapper');
var urlutil = require('cordova/urlutil');

function InAppBrowser() {
   this.channels = {
        'loadstart': channel.create('loadstart'),
        'loadstop' : channel.create('loadstop'),
        'loaderror' : channel.create('loaderror'),
        'exit' : channel.create('exit')
   };
}

InAppBrowser.prototype = {
    _eventHandler: function (event) {
        if (event.type in this.channels) {
            this.channels[event.type].fire(event);
        }
    },
    close: function (eventname) {
        exec(null, null, "InAppBrowser", "close", []);
    },
    show: function (eventname) {
      exec(null, null, "InAppBrowser", "show", []);
    },
    addEventListener: function (eventname,f) {
        if (eventname in this.channels) {
            this.channels[eventname].subscribe(f);
        }
    },
    removeEventListener: function(eventname, f) {
        if (eventname in this.channels) {
            this.channels[eventname].unsubscribe(f);
        }
    },

    executeScript: function(injectDetails, cb) {
        if (injectDetails.code) {
            exec(cb, null, "InAppBrowser", "injectScriptCode", [injectDetails.code, !!cb]);
        } else if (injectDetails.file) {
            exec(cb, null, "InAppBrowser", "injectScriptFile", [injectDetails.file, !!cb]);
        } else {
            throw new Error('executeScript requires exactly one of code or file to be specified');
        }
    },

    insertCSS: function(injectDetails, cb) {
        if (injectDetails.code) {
            exec(cb, null, "InAppBrowser", "injectStyleCode", [injectDetails.code, !!cb]);
        } else if (injectDetails.file) {
            exec(cb, null, "InAppBrowser", "injectStyleFile", [injectDetails.file, !!cb]);
        } else {
            throw new Error('insertCSS requires exactly one of code or file to be specified');
        }
    }
};

module.exports = function(strUrl, strWindowName, strWindowFeatures) {
    // Don't catch calls that write to existing frames (e.g. named iframes).
    if (window.frames && window.frames[strWindowName]) {
        var origOpenFunc = modulemapper.getOriginalSymbol(window, 'open');
        return origOpenFunc.apply(window, arguments);
    }

    strUrl = urlutil.makeAbsolute(strUrl);
    var iab = new InAppBrowser();
    var cb = function(eventname) {
       iab._eventHandler(eventname);
    };

    exec(cb, cb, "InAppBrowser", "open", [strUrl, strWindowName, strWindowFeatures]);
    return iab;
};


});

cordova.define("org.apache.cordova.media.Media", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var argscheck = require('cordova/argscheck'),
    utils = require('cordova/utils'),
    exec = require('cordova/exec');

var mediaObjects = {};

/**
 * This class provides access to the device media, interfaces to both sound and video
 *
 * @constructor
 * @param src                   The file name or url to play
 * @param successCallback       The callback to be called when the file is done playing or recording.
 *                                  successCallback()
 * @param errorCallback         The callback to be called if there is an error.
 *                                  errorCallback(int errorCode) - OPTIONAL
 * @param statusCallback        The callback to be called when media status has changed.
 *                                  statusCallback(int statusCode) - OPTIONAL
 */
var Media = function(src, successCallback, errorCallback, statusCallback) {
    argscheck.checkArgs('SFFF', 'Media', arguments);
    this.id = utils.createUUID();
    mediaObjects[this.id] = this;
    this.src = src;
    this.successCallback = successCallback;
    this.errorCallback = errorCallback;
    this.statusCallback = statusCallback;
    this._duration = -1;
    this._position = -1;
    exec(null, this.errorCallback, "Media", "create", [this.id, this.src]);
};

// Media messages
Media.MEDIA_STATE = 1;
Media.MEDIA_DURATION = 2;
Media.MEDIA_POSITION = 3;
Media.MEDIA_ERROR = 9;

// Media states
Media.MEDIA_NONE = 0;
Media.MEDIA_STARTING = 1;
Media.MEDIA_RUNNING = 2;
Media.MEDIA_PAUSED = 3;
Media.MEDIA_STOPPED = 4;
Media.MEDIA_MSG = ["None", "Starting", "Running", "Paused", "Stopped"];

// "static" function to return existing objs.
Media.get = function(id) {
    return mediaObjects[id];
};

/**
 * Start or resume playing audio file.
 */
Media.prototype.play = function(options) {
    exec(null, null, "Media", "startPlayingAudio", [this.id, this.src, options]);
};

/**
 * Stop playing audio file.
 */
Media.prototype.stop = function() {
    var me = this;
    exec(function() {
        me._position = 0;
    }, this.errorCallback, "Media", "stopPlayingAudio", [this.id]);
};

/**
 * Seek or jump to a new time in the track..
 */
Media.prototype.seekTo = function(milliseconds) {
    var me = this;
    exec(function(p) {
        me._position = p;
    }, this.errorCallback, "Media", "seekToAudio", [this.id, milliseconds]);
};

/**
 * Pause playing audio file.
 */
Media.prototype.pause = function() {
    exec(null, this.errorCallback, "Media", "pausePlayingAudio", [this.id]);
};

/**
 * Get duration of an audio file.
 * The duration is only set for audio that is playing, paused or stopped.
 *
 * @return      duration or -1 if not known.
 */
Media.prototype.getDuration = function() {
    return this._duration;
};

/**
 * Get position of audio.
 */
Media.prototype.getCurrentPosition = function(success, fail) {
    var me = this;
    exec(function(p) {
        me._position = p;
        success(p);
    }, fail, "Media", "getCurrentPositionAudio", [this.id]);
};

/**
 * Start recording audio file.
 */
Media.prototype.startRecord = function() {
    exec(null, this.errorCallback, "Media", "startRecordingAudio", [this.id, this.src]);
};

/**
 * Stop recording audio file.
 */
Media.prototype.stopRecord = function() {
    exec(null, this.errorCallback, "Media", "stopRecordingAudio", [this.id]);
};

/**
 * Release the resources.
 */
Media.prototype.release = function() {
    exec(null, this.errorCallback, "Media", "release", [this.id]);
};

/**
 * Adjust the volume.
 */
Media.prototype.setVolume = function(volume) {
    exec(null, null, "Media", "setVolume", [this.id, volume]);
};

/**
 * Audio has status update.
 * PRIVATE
 *
 * @param id            The media object id (string)
 * @param msgType       The 'type' of update this is
 * @param value         Use of value is determined by the msgType
 */
Media.onStatus = function(id, msgType, value) {

    var media = mediaObjects[id];

    if(media) {
        switch(msgType) {
            case Media.MEDIA_STATE :
                media.statusCallback && media.statusCallback(value);
                if(value == Media.MEDIA_STOPPED) {
                    media.successCallback && media.successCallback();
                }
                break;
            case Media.MEDIA_DURATION :
                media._duration = value;
                break;
            case Media.MEDIA_ERROR :
                media.errorCallback && media.errorCallback(value);
                break;
            case Media.MEDIA_POSITION :
                media._position = Number(value);
                break;
            default :
                console.error && console.error("Unhandled Media.onStatus :: " + msgType);
                break;
        }
    }
    else {
         console.error && console.error("Received Media.onStatus callback for unknown media :: " + id);
    }

};

module.exports = Media;

});

cordova.define("org.apache.cordova.media.MediaError", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

/**
 * This class contains information about any Media errors.
*/
/*
 According to :: http://dev.w3.org/html5/spec-author-view/video.html#mediaerror
 We should never be creating these objects, we should just implement the interface
 which has 1 property for an instance, 'code'

 instead of doing :
    errorCallbackFunction( new MediaError(3,'msg') );
we should simply use a literal :
    errorCallbackFunction( {'code':3} );
 */

 var _MediaError = window.MediaError;


if(!_MediaError) {
    window.MediaError = _MediaError = function(code, msg) {
        this.code = (typeof code != 'undefined') ? code : null;
        this.message = msg || ""; // message is NON-standard! do not use!
    };
}

_MediaError.MEDIA_ERR_NONE_ACTIVE    = _MediaError.MEDIA_ERR_NONE_ACTIVE    || 0;
_MediaError.MEDIA_ERR_ABORTED        = _MediaError.MEDIA_ERR_ABORTED        || 1;
_MediaError.MEDIA_ERR_NETWORK        = _MediaError.MEDIA_ERR_NETWORK        || 2;
_MediaError.MEDIA_ERR_DECODE         = _MediaError.MEDIA_ERR_DECODE         || 3;
_MediaError.MEDIA_ERR_NONE_SUPPORTED = _MediaError.MEDIA_ERR_NONE_SUPPORTED || 4;
// TODO: MediaError.MEDIA_ERR_NONE_SUPPORTED is legacy, the W3 spec now defines it as below.
// as defined by http://dev.w3.org/html5/spec-author-view/video.html#error-codes
_MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED = _MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || 4;

module.exports = _MediaError;

});

cordova.define("org.apache.cordova.media-capture.CaptureAudioOptions", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

/**
 * Encapsulates all audio capture operation configuration options.
 */
var CaptureAudioOptions = function(){
    // Upper limit of sound clips user can record. Value must be equal or greater than 1.
    this.limit = 1;
    // Maximum duration of a single sound clip in seconds.
    this.duration = 0;
};

module.exports = CaptureAudioOptions;

});

cordova.define("org.apache.cordova.media-capture.CaptureError", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

/**
 * The CaptureError interface encapsulates all errors in the Capture API.
 */
var CaptureError = function(c) {
   this.code = c || null;
};

// Camera or microphone failed to capture image or sound.
CaptureError.CAPTURE_INTERNAL_ERR = 0;
// Camera application or audio capture application is currently serving other capture request.
CaptureError.CAPTURE_APPLICATION_BUSY = 1;
// Invalid use of the API (e.g. limit parameter has value less than one).
CaptureError.CAPTURE_INVALID_ARGUMENT = 2;
// User exited camera application or audio capture application before capturing anything.
CaptureError.CAPTURE_NO_MEDIA_FILES = 3;
// The requested capture operation is not supported.
CaptureError.CAPTURE_NOT_SUPPORTED = 20;

module.exports = CaptureError;

});

cordova.define("org.apache.cordova.media-capture.CaptureImageOptions", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

/**
 * Encapsulates all image capture operation configuration options.
 */
var CaptureImageOptions = function(){
    // Upper limit of images user can take. Value must be equal or greater than 1.
    this.limit = 1;
};

module.exports = CaptureImageOptions;

});

cordova.define("org.apache.cordova.media-capture.CaptureVideoOptions", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

/**
 * Encapsulates all video capture operation configuration options.
 */
var CaptureVideoOptions = function(){
    // Upper limit of videos user can record. Value must be equal or greater than 1.
    this.limit = 1;
    // Maximum duration of a single video clip in seconds.
    this.duration = 0;
};

module.exports = CaptureVideoOptions;

});

cordova.define("org.apache.cordova.media-capture.MediaFile", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var utils = require('cordova/utils'),
    exec = require('cordova/exec'),
    File = require('org.apache.cordova.file.File'),
    CaptureError = require('./CaptureError');
/**
 * Represents a single file.
 *
 * name {DOMString} name of the file, without path information
 * fullPath {DOMString} the full path of the file, including the name
 * type {DOMString} mime type
 * lastModifiedDate {Date} last modified date
 * size {Number} size of the file in bytes
 */
var MediaFile = function(name, fullPath, type, lastModifiedDate, size){
    MediaFile.__super__.constructor.apply(this, arguments);
};

utils.extend(MediaFile, File);

/**
 * Request capture format data for a specific file and type
 *
 * @param {Function} successCB
 * @param {Function} errorCB
 */
MediaFile.prototype.getFormatData = function(successCallback, errorCallback) {
    if (typeof this.fullPath === "undefined" || this.fullPath === null) {
        errorCallback(new CaptureError(CaptureError.CAPTURE_INVALID_ARGUMENT));
    } else {
        exec(successCallback, errorCallback, "Capture", "getFormatData", [this.fullPath, this.type]);
    }
};

module.exports = MediaFile;

});

cordova.define("org.apache.cordova.media-capture.MediaFileData", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

/**
 * MediaFileData encapsulates format information of a media file.
 *
 * @param {DOMString} codecs
 * @param {long} bitrate
 * @param {long} height
 * @param {long} width
 * @param {float} duration
 */
var MediaFileData = function(codecs, bitrate, height, width, duration){
    this.codecs = codecs || null;
    this.bitrate = bitrate || 0;
    this.height = height || 0;
    this.width = width || 0;
    this.duration = duration || 0;
};

module.exports = MediaFileData;

});

cordova.define("org.apache.cordova.media-capture.capture", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var exec = require('cordova/exec'),
    MediaFile = require('./MediaFile');

/**
 * Launches a capture of different types.
 *
 * @param (DOMString} type
 * @param {Function} successCB
 * @param {Function} errorCB
 * @param {CaptureVideoOptions} options
 */
function _capture(type, successCallback, errorCallback, options) {
    var win = function(pluginResult) {
        var mediaFiles = [];
        var i;
        for (i = 0; i < pluginResult.length; i++) {
            var mediaFile = new MediaFile();
            mediaFile.name = pluginResult[i].name;
            mediaFile.fullPath = pluginResult[i].fullPath;
            mediaFile.type = pluginResult[i].type;
            mediaFile.lastModifiedDate = pluginResult[i].lastModifiedDate;
            mediaFile.size = pluginResult[i].size;
            mediaFiles.push(mediaFile);
        }
        successCallback(mediaFiles);
    };
    exec(win, errorCallback, "Capture", type, [options]);
}
/**
 * The Capture interface exposes an interface to the camera and microphone of the hosting device.
 */
function Capture() {
    this.supportedAudioModes = [];
    this.supportedImageModes = [];
    this.supportedVideoModes = [];
}

/**
 * Launch audio recorder application for recording audio clip(s).
 *
 * @param {Function} successCB
 * @param {Function} errorCB
 * @param {CaptureAudioOptions} options
 */
Capture.prototype.captureAudio = function(successCallback, errorCallback, options){
    _capture("captureAudio", successCallback, errorCallback, options);
};

/**
 * Launch camera application for taking image(s).
 *
 * @param {Function} successCB
 * @param {Function} errorCB
 * @param {CaptureImageOptions} options
 */
Capture.prototype.captureImage = function(successCallback, errorCallback, options){
    _capture("captureImage", successCallback, errorCallback, options);
};

/**
 * Launch device camera application for recording video(s).
 *
 * @param {Function} successCB
 * @param {Function} errorCB
 * @param {CaptureVideoOptions} options
 */
Capture.prototype.captureVideo = function(successCallback, errorCallback, options){
    _capture("captureVideo", successCallback, errorCallback, options);
};


module.exports = new Capture();

});

cordova.define("org.apache.cordova.network-information.Connection", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

/**
 * Network status
 */
module.exports = {
        UNKNOWN: "unknown",
        ETHERNET: "ethernet",
        WIFI: "wifi",
        CELL_2G: "2g",
        CELL_3G: "3g",
        CELL_4G: "4g",
        CELL:"cellular",
        NONE: "none"
};

});

cordova.define("org.apache.cordova.network-information.network", function(require, exports, module) { /*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var exec = require('cordova/exec'),
    cordova = require('cordova'),
    channel = require('cordova/channel'),
    utils = require('cordova/utils');

// Link the onLine property with the Cordova-supplied network info.
// This works because we clobber the naviagtor object with our own
// object in bootstrap.js.
if (typeof navigator != 'undefined') {
    utils.defineGetter(navigator, 'onLine', function() {
        return this.connection.type != 'none';
    });
}

function NetworkConnection() {
    this.type = 'unknown';
}

/**
 * Get connection info
 *
 * @param {Function} successCallback The function to call when the Connection data is available
 * @param {Function} errorCallback The function to call when there is an error getting the Connection data. (OPTIONAL)
 */
NetworkConnection.prototype.getInfo = function(successCallback, errorCallback) {
    exec(successCallback, errorCallback, "NetworkStatus", "getConnectionInfo", []);
};

var me = new NetworkConnection();
var timerId = null;
var timeout = 500;

channel.createSticky('onCordovaConnectionReady');
channel.waitForInitialization('onCordovaConnectionReady');

channel.onCordovaReady.subscribe(function() {
    me.getInfo(function(info) {
        me.type = info;
        if (info === "none") {
            // set a timer if still offline at the end of timer send the offline event
            timerId = setTimeout(function(){
                cordova.fireDocumentEvent("offline");
                timerId = null;
            }, timeout);
        } else {
            // If there is a current offline event pending clear it
            if (timerId !== null) {
                clearTimeout(timerId);
                timerId = null;
            }
            cordova.fireDocumentEvent("online");
        }

        // should only fire this once
        if (channel.onCordovaConnectionReady.state !== 2) {
            channel.onCordovaConnectionReady.fire();
        }
    },
    function (e) {
        // If we can't get the network info we should still tell Cordova
        // to fire the deviceready event.
        if (channel.onCordovaConnectionReady.state !== 2) {
            channel.onCordovaConnectionReady.fire();
        }
        console.log("Error initializing Network Connection: " + e);
    });
});

module.exports = me;

});

cordova.define("org.apache.cordova.splashscreen.SplashScreen", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var exec = require('cordova/exec');

var splashscreen = {
    show:function() {
        exec(null, null, "SplashScreen", "show", []);
    },
    hide:function() {
        exec(null, null, "SplashScreen", "hide", []);
    }
};

module.exports = splashscreen;

});

cordova.define("org.apache.cordova.statusbar.statusbar", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var exec = require('cordova/exec');

var namedColors = {
    "black": "#000000",
    "darkGray": "#A9A9A9",
    "lightGray": "#D3D3D3",
    "white": "#FFFFFF",
    "gray": "#808080",
    "red": "#FF0000",
    "green": "#00FF00",
    "blue": "#0000FF",
    "cyan": "#00FFFF",
    "yellow": "#FFFF00",
    "magenta": "#FF00FF",
    "orange": "##FFA500",
    "purple": "#800080",
    "brown": "#A52A2A"
};

// prime it
exec(function (res) {
    StatusBar.isVisible = res;
}, null, "StatusBar", "_ready", []);

var StatusBar = {

    isVisible: true,

    overlaysWebView: function (doOverlay) {
        exec(null, null, "StatusBar", "overlaysWebView", [doOverlay]);
    },

    styleDefault: function () {
        // dark text ( to be used on a light background )
        exec(null, null, "StatusBar", "styleDefault", []);
    },

    styleLightContent: function () {
        // light text ( to be used on a dark background )
        exec(null, null, "StatusBar", "styleLightContent", []);
    },

    styleBlackTranslucent: function () {
        // #88000000 ? Apple says to use lightContent instead
        exec(null, null, "StatusBar", "styleBlackTranslucent", []);
    },

    styleBlackOpaque: function () {
        // #FF000000 ? Apple says to use lightContent instead
        exec(null, null, "StatusBar", "styleBlackOpaque", []);
    },

    backgroundColorByName: function (colorname) {
        return StatusBar.backgroundColorByHexString(namedColors[colorname]);
    },

    backgroundColorByHexString: function (hexString) {
        if (hexString.indexOf("#") < 0) {
            hexString = "#" + hexString;
        }

        if (hexString.length == 4) {
            var split = hexString.split("");
            hexString = "#" + hexString[1] + hexString[1] + hexString[2] + hexString[2] + hexString[3] + hexString[3];
        }

        exec(null, null, "StatusBar", "backgroundColorByHexString", [hexString]);
    },

    hide: function () {
        exec(null, null, "StatusBar", "hide", []);
        StatusBar.isVisible = false;
    },

    show: function () {
        exec(null, null, "StatusBar", "show", []);
        StatusBar.isVisible = true;
    }

};

module.exports = StatusBar;

});

cordova.define("org.apache.cordova.vibration.notification", function(require, exports, module) { /*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var exec = require('cordova/exec');

/**
 * Provides access to the vibration mechanism on the device.
 */

module.exports = {

    /**
     * Causes the device to vibrate.
     *
     * @param {Integer} mills       The number of milliseconds to vibrate for.
     */
    vibrate: function(mills) {
        exec(null, null, "Vibration", "vibrate", [mills]);
    },
};

});
