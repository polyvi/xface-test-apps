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
