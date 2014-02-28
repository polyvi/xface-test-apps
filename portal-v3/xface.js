window.addEventListener("load",function(){
    setTimeout(function(){
        triggerEvent(document,"deviceready");
        document.addEventListener("keypress",function(e){
            if(e.keyCode == 2)triggerEvent(document,'backbutton');
        });
    },200);
});
function triggerEvent(target,name){
    var evt = document.createEvent("HTMLEvents");
    evt.initEvent(name,true,true);
    target.dispatchEvent(evt);
}
var device = {
    imei:"3592122333221123",
    imsi:"199002211",
    version:"4.2.2",
    uuid:"2ab23e218f8239fd801",
    name:"android device",
    model:"T01",
    platform:"Android",
    xFaceVersion:"2.1.3",
    productVersion:"3.0",
    height:window.outerHeight,
    width:window.outerWidth,
    isCompassAvailable:true,
    isWiFiAvailable:true,
    isAccelerometerAvailable:true,
    isSmsAvailable:true
};
navigator.network = {"connection": {"type": "wifi"}};
navigator.app = {
    queryInstalledNativeApp:function(type,success,error){
        if(success)success.call(this,mockNativeApps);
    },
    startNativeApp:function(id,param,s,e){
        if(s)s();
    },
    uninstallNativeApp:function(is,s,e){
        setTimeout(s,2000);
    },
    openUrl:function(url,s,e){
        top.open(url);
        if(s)s();
    },
    isNativeAppInstalled:function(s,e){
        s(false);
    }
};
navigator.notification = {
    vibrate:function(time){}
};
navigator.contacts = {
    find:function(fields, success, error, options){
        if(success)success(mockContacts);
    }
};
var xFace = {};
xFace.BarcodeScanner={
    start:function(s,e){
        console.log("scan QR code");
        if(s)s("TEST");
    }
};
xFace.AMS = {
    getStartAppInfo:function(s,e){
        if(s)s({
            appid:"122",
            name:"testApp",
            icon:"a/s/t.png",
            icon_background_color:null,
            version:"1.0",
            type:"xapp"
        });
    },
    closeApplication:function(){},
    installApplication:function(packageUrl,s,e){
        console.log("install:"+packageUrl);
        setTimeout(s({id:"a"}),2000);
    },
    listInstalledApplications:function(s,e){
        setTimeout(function(){
            if(s)s(mockAMSApps);
        },2000);
    },
    uninstallApplication:function(id,s,e){
        setTimeout(s,2000);
    },
    startApplication:function(id,s,e,param){
        if(s)s();
    },
    updateApplication:function(p,s,e,c){
        setTimeout(function(){
            if(s)s({appid:"xface"});
        },2000);
    }
};
xFace.AdvancedFileTransfer = function(url,name,isUpload){
    console.log("AdvancedFileTransfer");
    console.log(arguments);
    var _this = this;
    var count= 0,max=198912,inter;
    var paused = false;
    _this.download=function(success,error){
        paused = false;
        inter = setInterval(function(){
            if(!paused && _this.onprogress){
                var newN = count+5000;
                count = newN>max?max:newN;
                _this.onprogress.call(_this,{loaded:count,total:max});
                if(count >= max){
                    clearInterval(inter);
                    count= 0;
                    max=98912;
                    if(success)success({fullPath:"sdcard/x.zip"});
                }
            }
        },500);
    };
    _this.upload=function(success,error){if(success)success()};
    _this.pause=function(){paused = true;clearInterval(inter)};
    _this.cancel=function(){
        count= 0;
        max=98912;
        clearInterval(inter)
    };
};
xFace.Messaging = {
    createMessage:function(t,s,e){},
    sendMessage:function(m,s,e){}
};
xFace.MessageTypes = {
    SMSMessage:1,
    EmailMessage:2
};
window.Media = function(src,s,e,c){
    var audio = document.createElement("audio");
    audio.src = "workspace/"+src;
    audio.seekTo = function(time){
        audio.currentTime = time;
    };
    return audio;
};
StatusBar = {
    styleDefault:function(){
        console.log("default status bar")
    },
    styleLightContent:function(){
        console.log("light status bar")
    }
};

function ContactFindOptions(){
    this.filter = "";
    this.multiple = true;
    this.accountType = 1;
}
ContactAccountType = {
    SIM:1,
    PHONE:2
};

var mockAppIcon="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";
var mockNativeApps = [{id:"NATIVE_A",icon:mockAppIcon,name:"NATIVE_A"},{id:"NATIVE_B",icon:mockAppIcon,name:"NATIVE_B"}];
var mockAMSApps = [{appid:"234","name":"AMS_A",icon:"data:image/png;base64,"+mockAppIcon,version:"1.0"}
    ,{appid:"xface","name":"AMS_B",icon:"data:image/png;base64,"+mockAppIcon,version:"1.1"},{appid:"xface2","name":"AMS_B",icon:"data:image/png;base64,"+mockAppIcon,version:"1.1"}
,{appid:"xface3","name":"AMS_B",icon:"data:image/png;base64,"+mockAppIcon,version:"1.1"},{appid:"xface4","name":"AMS_B",icon:"data:image/png;base64,"+mockAppIcon,version:"1.1"},
    {appid:"xface5","name":"AMS_B",icon:"data:image/png;base64,"+mockAppIcon,version:"1.1"},
    {appid:"xface5","name":"AMS_B",icon:"data:image/png;base64,"+mockAppIcon,version:"1.1"},{appid:"xface5","name":"AMS_B",icon:"data:image/png;base64,"+mockAppIcon,version:"1.1"},{appid:"xface5","name":"AMS_B",icon:"data:image/png;base64,"+mockAppIcon,version:"1.1"},{appid:"xface5","name":"AMS_B",icon:"data:image/png;base64,"+mockAppIcon,version:"1.1"},{appid:"xface5","name":"AMS_B",icon:"data:image/png;base64,"+mockAppIcon,version:"1.1"},{appid:"xface5","name":"AMS_B",icon:"data:image/png;base64,"+mockAppIcon,version:"1.1"},{appid:"xface5","name":"AMS_B",icon:"data:image/png;base64,"+mockAppIcon,version:"1.1"},{appid:"xface5","name":"AMS_B",icon:"data:image/png;base64,"+mockAppIcon,version:"1.1"},{appid:"xface5","name":"AMS_B",icon:"data:image/png;base64,"+mockAppIcon,version:"1.1"},
    {appid:"xface6","name":"AMS_B",icon:"data:image/png;base64,"+mockAppIcon,version:"1.1"}];
var mockContacts = [{"id":"548","rawId":"548","displayName":"联系A","name":{"formatted":"联系A","givenName":"联系A"},"nickname":null,"phoneNumbers":null,"emails":null,"addresses":null,"ims":null,"organizations":null,"birthday":null,"note":null,"photos":null,"categories":null,"urls":null}];