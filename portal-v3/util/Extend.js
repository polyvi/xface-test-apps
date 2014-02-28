(function(_){
    xmesh.broadcast = new function Broadcast(){
        var _this = $(this);
        _this.emit = function(broadcastName,data){
            var evt = $.Event(broadcastName);
            evt._data = data;
            _this.trigger(evt);
        };

        _this.listen = function(broadcastName,callback){
            _this.bind(broadcastName,function(e){
                if(callback)callback.call(_this, e._data,e);
            });
        }
    };

    _.formatDate = function (date,pattern) {
        if(!date)return "";
        if(!(date instanceof Date)){
            var _date = new Date();
            _date.setTime(date);
            date = _date;
        }
        var o = {
            "M+": date.getMonth() + 1,
            "d+": date.getDate(),
            "h+": date.getHours(),
            "m+": date.getMinutes(),
            "s+": date.getSeconds(),
            "q+": Math.floor((date.getMonth() + 3) / 3),
            "S": date.getMilliseconds()
        };
        if (/(y+)/.test(pattern)) pattern = pattern.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
        for (var k in o)
            if (new RegExp("(" + k + ")").test(pattern)) pattern = pattern.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        return pattern;
    };

    _.applyObject = function(objA,objB,kvMapping){
        if(!objB || !objB.hasOwnProperty){
            console.warn("applied object is invalid");
            return objA;
        }
        for(var key in objA){
            if(objB.hasOwnProperty(key) && typeof objA[key] !== "function"){
                var valueA = objA[key],valueB = objB[key];
                if(typeof valueA == "object" || typeof valueB == "object" || typeof valueA == typeof valueB || valueB == null || valueB == undefined){
                    objA[key] = objB[key];
                }else{
                    var type = (typeof valueA).replace(/^[a-z]/i,function(letter){
                        return letter.toUpperCase();
                    });
                    objA[key] = eval(type+"('"+objB[key]+"')");
                }
            }
        }
        if(kvMapping && typeof kvMapping == "object"){
            for(var property in kvMapping){
                if(objA.hasOwnProperty(property) && typeof objA[property] != "function"){
                    var key = kvMapping[property];
                    if(!objB.hasOwnProperty(key))continue;
                    var value = objB[key];
                    if(typeof value == "object" || value == null || value == undefined){
                        objA[property] = value;
                    }else{
                        var type = (typeof value).replace(/^[a-z]/i,function(letter){
                            return letter.toUpperCase();
                        });
                        objA[property] = type == "String"?value:eval(type+'("'+value+'")');
                    }
                }
            }
        }
        return objA;
    };

    _.POMAP = {};
    _.initPOMapping = function(src){
        $.get(src,{
            sync:true,
            dataType:"xml",
            success:function(doc){
                var childNodes = doc.documentElement.childNodes;
                for(var i=0;i<childNodes.length;i++){
                    var node = childNodes[i];
                    if(node && node.nodeType == 1)parseItem(node);
                }
            },
            error:function(){
                throw "PO init failed";
            }
        });

        function parseItem(el){
            if(el.tagName.toLowerCase() != "object")return;
            var name = el.getAttribute("name");
            if(!name)throw "The PO muse define name";
            var obj = {};
            var children = el.childNodes;
            for(var i=0;i<children.length;i++){
                var node = children[i];
                if(node && node.nodeType == 1)obj[node.getAttribute("name")] = node.getAttribute("value");
            }
            _.POMAP[name] = obj;
        }
    };

    _.scanQRCode = function(success,error){
        xFace.BarcodeScanner.start(function(code){
            var type = "string";
            if(code.match(/^http[s]{0,1}:\/\//i)){
                type = "url";
            }else if(code.match(/^tel:/i)){
                type = "tel";
                code = code.replace(/^tel:/i,"");
            }else if(code.match(/^smsto:/i)){
                type = "sms";
                code = code.replace(/^smsto:/i,"");
            }else if(code.matches(/^mecard/i)){
                type = "mecard";
                code = code.replace(/^mecard/i,"");
            }else if(code.match(/^wifi:/)){
                type = "wifi";
                code = code.replace(/^wifi:/,"");
            }
            if(success)success.call(this,{code:code,type:type});
        }, error);
    };

    (function shakeListener(){
        var SHAKE_THRESHOLD = 3000;
        var last_update = 0;
        var x= 0,y= 0,z= 0,last_x= 0,last_y= 0,last_z=0;
        var watchId;

        document.startListenShake = function(shake_threshold){
            if(!isNaN(shake_threshold))SHAKE_THRESHOLD = parseInt(shake_threshold);
            if (window.DeviceMotionEvent) {
                window.addEventListener('devicemotion',deviceMotionHandler, false);
                return true;
            } else if(device.isAccelerometerAvailable){
                watchId = navigator.accelerometer.watchAcceleration(deviceMotionHandler,null,{frequency: 100});
                return true;
            }
            return false;
        };

        document.stopListenShake = function(){
            window.removeEventListener('devicemotion',deviceMotionHandler, false);
            if(watchId)navigator.accelerometer.clearWatch(watchId);
            watchId = null;
        };

        function deviceMotionHandler(eventData) {
            var acceleration = eventData.accelerationIncludingGravity || eventData;
            var curTime = new Date().getTime();
            if ((curTime - last_update)> 100) {
                var diffTime = curTime -last_update;
                last_update = curTime;
                x = acceleration.x;
                y = acceleration.y;
                z = acceleration.z;
                var speed = Math.abs(x +y + z - last_x - last_y - last_z) / diffTime * 10000;
                if (speed > SHAKE_THRESHOLD) {
                    document.trigger(_.Event("shake"));
                }
                last_x = x;
                last_y = y;
                last_z = z;
            }
        }
    })();

    _.Share = function(type,content){
        var shareMapping = {
            "sms":function(){
                _.openHiddenURI("sms:?body="+content.body);
            },
            "email":function(){
                _.openHiddenURI('mailto:?subject='+content.subject+'&body='+content.body);
            },
            "sina_wb":function(){
                window.open('http://service.weibo.com/share/share.php?title='+content.body, '_blank', 'location=yes');
            },
            "tencent_wb":function(){
                window.open('http://share.v.t.qq.com/index.php?c=share&a=index&title='+content.body, '_blank', 'location=yes');
            }
        };
        shareMapping[type]();
    };

    _.openHiddenURI = function(uri){
        $("#hidden_window").contentWindow.location.href = uri;
    };

    _.getOrientation = function(){
        var os = _$.os;
        if (os.ios) {
            if (Math.abs(window.orientation) == 90) {
                return "landscape";
            } else {
                return "portrait";
            }
        } else if (os.android) {
            if (Math.abs(window.orientation) != 90) {
                return "portrait";
            } else {
                return "landscape";
            }
        }
        return null;
    };

    _.isIOS7 = function(){
        return Zepto.os.ios && /^7/.test(Zepto.os.version);
    };

    Array.prototype.remove = function(index){
        if(this.length<=0)return null;
        if(index>this.length-1 || index<0){
            console.warn("index out of array :"+index);
            return;
        }
        return this.splice(index,1);
    }
})($);

(function hack(){
    document.addEventListener("DOMContentLoaded",function(){
        var html = document.documentElement;
        var os = _$.os,browser = _$.browser;
        var platform = (function(){
            if(os.android)return "android";
            if(os.ios)return "ios";
            if(/windows/gi.test(navigator.appVersion))return "windows";
            return "other";
        })();
        var browserCore = (function(){
            if(browser.webkit)return "webkit";
            if(browser.firefox)return "moz";
            if(/MSIE/gi.test(navigator.appVersion))return "ms";
        })();
        var screen =(function(){
            if(os.tablet)return "tablet";
            if(os.phone)return "phone";
            return "desktop";
        })();
        html.setAttribute("platform",platform);
        html.setAttribute("screen",screen);
        if(browserCore)html.setAttribute("core",browserCore);
        if(os.version)html.setAttribute("osver", os.version);
        if(browser.version)html.setAttribute("browserver",browser.version);
    });
})();

var RefreshTool = new function(){
    this.isRuning = false;
    this.start = function(){
        if(this.isRuning)return;
        document.bind("touchend",refresh);
        this.isRuning = true;
    };
    this.stop = function(){
        document.unbind("touchend",refresh);
        this.isRuning = false;
    };
    this.refresh = refresh;

    function refresh(){
        setTimeout(function(){
            document.body.append(tempDom);
            setTimeout(function(){
                tempDom.remove();
                setTimeout(function(){
                    document.body.append(tempDom.css("backgroundColor","blue"));
                    setTimeout(function(){
                        tempDom.css("backgroundColor","#f0597f").remove();
                    },200);
                },300);
            },100);
        },50);
    }
    var tempDom = $.Element("div").css({"position":"absolute","left": 0,"top":0,"width":"100%","height":"1px",
        "backgroundColor":"#f0597f"});
};