/**
 * 屏幕自动适配 beta1.2
 */
(function(){
    if(window.Viewport && window.Viewport.isRead)return;
    window.Viewport = {isReady:false};
    var defaultWidth = 480;
    var ORIENTATION_CHANGE_DELAY = 230;
    var WINDOW_LOAD_DELAY = 500;
    var metaContent={
        width:defaultWidth
        ,targetDensitydpi:"device-dpi"
        ,userScalable:"no"
        ,maximumScale:1
        ,minimumScale:1
        ,toString:function(){
            var arr = [];
            for(var k in this){
                var v = this[k];
                if(typeof v != "function"){
                    if(k.replace)k = k.replace(/([A-Z])/g,"-$1").toLowerCase();
                    arr.push(k+"="+v);
                }
            }
            return arr.join(",");
        }};

    function getParameters(){
        var map = cloneObject(metaContent);
        try{
            var scripts = document.getElementsByTagName("script");
            var vps = scripts[scripts.length-1];
            var values = vps.src.split("?")[1];
            if(!values || values==="")return map;
            var kvs = values.split("&");
            for(var i=0;i<kvs.length;i++){
                var kv = kvs[i].split("=");
                var k = kv[0]||"",v=kv[1]||"";
                if(!isNaN(v))v=Number(v);
                map[k] = v;
            }
            return map;
        }catch(e){
            console.error(e.message);
        }
        return map;
    }

    function cloneObject(obj){
        if(typeof obj !="object" || obj == null)return obj;
        var clone = {};
        for(var k in obj){
            clone[k] = obj[k];
        }
        return clone;
    }

    var Browser = {
        platform:function(){
            var u = navigator.userAgent;
            return {//移动终端浏览器版本信息
                trident: u.indexOf('Trident') > -1, //IE内核
                presto: u.indexOf('Presto') > -1, //opera内核
                webKit: u.indexOf('AppleWebKit') > -1, //苹果、谷歌内核
                gecko: u.indexOf('Gecko') > -1 && u.indexOf('KHTML') == -1, //火狐内核
                mobile: !!u.match(/AppleWebKit.*Mobile.*/)||!!u.match(/AppleWebKit/), //是否为移动终端
                ios: !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/), //ios终端
                android: u.indexOf('Android') > -1 || u.indexOf('Linux') > -1, //android终端或者uc浏览器
                iPhone: u.indexOf('iPhone') > -1 || u.indexOf('Mac') > -1, //是否为iPhone或者QQHD浏览器
                iPad: u.indexOf('iPad') > -1, //是否iPad
                webApp: u.indexOf('Safari') == -1 //是否web应该程序，没有头部与底部
            };
        },
        isAndroid:function(){
            var p = this.platform();
            return p.android;
        },
        isIOS:function(){
            var p = this.platform();
            return (p.iPhone || p.iPad || p.ios);
        }
    };

    function doAdapt(){
        metaContent = getParameters();
        if(Browser.isAndroid()){
            AndroidAdapter();
        }else if(Browser.isIOS()){
            IOSAdapter();
        }else{
            AndroidAdapter();
            console.error("Can not identification device information in user agent,default use android adapter!");
        }
    }

    function IOSAdapter(){
        delete(metaContent.maximumScale);
        delete(metaContent.minimumScale);
        delete(metaContent.targetDensitydpi);
        metaContent.userScalable = "no";
        var meta = getMetaTag();
        refreshMetaTag(meta);
        emitFinishEvent(meta);
    }

    function refreshMetaTag(meta){
        meta.setAttribute("content",metaContent.toString());
    }

    function getMetaTag(){
        var metaTags = document.getElementsByTagName("meta");
        var viewportTag;
        for(var i=0;i<metaTags.length;i++){
            if(metaTags[i].name === "viewport"){
                viewportTag = metaTags[i];
            }
        }
        if(!viewportTag){
            document.write("<meta name='viewport' content='"+metaContent.toString()+"'>");
            return getMetaTag();
        }
        return viewportTag;
    }

    function AndroidAdapter(){
        var WINDOW_WIDTH = window.outerWidth,WINDOW_HEIGHT = window.outerHeight;
        var scale = getScale();
        metaContent.userScalable = "yes";
        metaContent.maximumScale = scale;
        metaContent.minimumScale = scale;
        var meta = getMetaTag();
        refreshMetaTag(meta);
        function refreshViewPort(deviation){
            var scale = getScale(deviation);
            metaContent.maximumScale = scale;
            metaContent.minimumScale = scale;
            refreshMetaTag(meta);
        }

        function getScale(deviation){
            WINDOW_HEIGHT = window.outerHeight;
            WINDOW_WIDTH = window.outerWidth;
            var DEVICE_WIDTH = isNaN(metaContent.width)?defaultWidth:metaContent.width;
            var scale = WINDOW_WIDTH/DEVICE_WIDTH;
            if(!isNaN(deviation)){
                scale = (WINDOW_WIDTH + deviation)/DEVICE_WIDTH;
            }
            return isNaN(scale)?1:scale;
        }

        function calculationOffset(){
            var deviation = window.innerWidth - document.body.offsetWidth;
            if(deviation !== 0)refreshViewPort(deviation);
        }

        function onOrientationChange(){
            setTimeout(function(){
                var orientation = getOrientation();
                if(orientation == currentOrientation) return;
                refreshViewPort();
                currentOrientation = orientation;
                setTimeout(calculationOffset,WINDOW_LOAD_DELAY);
            },ORIENTATION_CHANGE_DELAY);
        }

        window.addEventListener("load",function(){
            refreshViewPort();
            setTimeout(function(){
                calculationOffset();
                emitFinishEvent(meta);
            },500);
            window.addEventListener("orientationchange",onOrientationChange,false);
        },false);
    }

    function emitFinishEvent(meta){
        window.Viewport.isReady = true;
        window.Viewport.content = metaContent;
        window.Viewport.target = meta;
        var evt = document.createEvent("HTMLEvents");
        evt.initEvent("viewportready",false,false);
        evt.data = window.Viewport;
        window.dispatchEvent(evt);
    }
    // 获取设备方向 0：未知，1：竖屏，2：横屏
    function getOrientation(){
        var ua = navigator.userAgent;
        var deviceType="";
        //判断设备类型
        if (ua.indexOf("iPad") > 0) {
            deviceType = "isIpad";
        } else if (ua.indexOf("Android") > 0) {
            deviceType = "isAndroid";
        } else {
            return 0;
        }
        // 判断横竖屏
        if ("isIpad" == deviceType) {
            if (Math.abs(window.orientation) == 90) {
                return 2;
            } else {
                return 1;
            }
        } else if ("isAndroid" == deviceType ) {
            if (Math.abs(window.orientation) != 90) {
                return 2;
            } else {
                return 1;
            }
        }
        return 0;
    }
    var currentOrientation = getOrientation();

    doAdapt();
})();