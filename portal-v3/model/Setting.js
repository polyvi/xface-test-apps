function Setting(){
    var _this = $(this);
    var storage = localStorage;
    var settings = readingSetting();

    _this.maxThreads = _get("maxThreads",2);
    _this.forceRefreshUI = _get("forceRefreshUI",false);
    _this.showNativeApp = _get("showNativeApp",false);
    _this.autoUpdate = _get("autoUpdate",true);
    _this.sound = _get("sound",true);
    _this.shakeLevel = _get("shakeLevel",1);
    _this.theme = _get("theme","");

    _this.bind("propertyChange",function(e){
        _set(e.property, e.value);
    });

    function _get(key,defaultValue){
        var value = settings[key];
        return (undefined === value || null === value)?defaultValue : value;
    }
    function _set(key,value){
        if(undefined === key || null === key)throw "The key can not be null";
        settings[key] = value;
        storage.setItem("settings", $.toJson(settings));
        var evt = $.Event("change");
        evt.property = key;
        evt.value = value;
        this.trigger(evt);
    }
    function readingSetting(){
        var str = storage.getItem("settings");
        if(!str)return {};
        return $.parseJson(str);
    }
}

var Config = {
    AndroidPackageName:"com.polyvi.xportal",
    IOSMarketURI:""
};