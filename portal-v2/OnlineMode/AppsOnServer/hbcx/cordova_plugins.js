cordova.define('cordova/plugin_list', function(require, exports, module) {
module.exports = [
    {
        "file": "plugins/com.polyvi.xface.extension.xapp/www/android/app.js",
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
    }
];
module.exports.metadata = 
// TOP OF METADATA
{
    "com.polyvi.xface.extension.xapp": "1.0.3-dev",
    "org.apache.cordova.dialogs": "0.2.5"
}
// BOTTOM OF METADATA
});