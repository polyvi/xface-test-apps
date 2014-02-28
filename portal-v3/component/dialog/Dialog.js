var Dialog = {
    confirm:function (msg, ok, cancel, title, buttons, callback) {
        msg = String(msg);
        title = title || "提醒";
        buttons = buttons || "确定,取消";
        if (buttons instanceof  Array)buttons = buttons.join(",");
        if (!callback)callback = function (index) {
            if (index == 1) {
                if(ok)ok();
            } else if(index == 2){
                if(cancel)cancel();
            }
        };
        if(navigator.notification && navigator.notification.confirm){
            navigator.notification.confirm(msg, callback, title, buttons);
            return;
        }
        if(window.confirm(msg)){
            if(ok)ok();
        }else{
            if(cancel)cancel();
        }
    },
    alert:function (msg, ok, title, button) {
        msg = String(msg);
        title = title || "提醒";
        button = button || "确定";
        if(navigator.notification && navigator.notification.alert){
            navigator.notification.alert(msg, ok, title, button);
            return;
        }
        window.alert(msg);
        if(ok)ok();
    },
    toast:(function () {
        var c, timer;
        return function Toast(msg, duration,position) {
            if(!msg && msg != "")return;
            if (typeof duration != "number") duration = 2000;
            if (c && c.parentNode) {
                c.remove();
                clearTimeout(timer);
            }
            c = $.Element("div").addClass("dialog toast");
            var t = $.Element("span").addClass("message").css({display:"inline-block"});
            t.html(msg.toString());
            c.append(t);
            switch (position) {
                case "top":
                    c.style.top = "20%";
                    c.style.bottom = "";
                    break;
                case "middle":
                    c.style.bottom = "50%";
                    c.style.top = "50%";
                    break;
                case "bottom":
                    c.style.top = "";
                    c.style.bottom = "20%";
                    break;
            }
            document.body.appendChild(c);
            t.style["-webkit-animation-delay"] = duration+"ms";
            t.style["-webkit-animation-name"] = "fade_out";
            timer = setTimeout(function () {
                if(!c)return;
                c.remove();
                c = undefined;
            }, duration + 200);
        }
    })(),

    progressDialog:(function () {
        function ProgressDialog() {
            var _this = $(this);
            _this.message = "loading";
            var isVisible = false;
            var dialog;
            var _disable = false;

            _this.show = function (msg,canNotCancel) {
                if(msg!==undefined||msg!==null)_this.message = msg;
                dialog.show();
                isVisible = true;
                this.disabled = !!canNotCancel;
                return _this;
            };

            _this.close = function () {
                dialog.hide();
                isVisible = false;
                _this.disabled = false;
                _this.trigger($.Event("close"));
                return _this;
            };
            _this.setMessage = function(text){
                _this.message = text;
                return _this;
            };
            _this.getter("visible", function () {
                return isVisible;
            });
            _this.getter("message", function () {
                return dialog.message.innerHTML;
            });
            _this.setter("message", function (message) {
                dialog.message.innerHTML = message;
            });
            _this.setter("disabled",function(disable){
                _disable = disable === true;
                if(_disable){
                    dialog.closeButton.setAttribute("disabled","disabled");
                }else{
                    dialog.closeButton.removeAttribute("disabled");
                }
            });
            _this.getter("disabled",function(){
                return _disable;
            });

            function _createDialog() {
                var maskWrapper = $.Element("div").addClass("dialog progressDialog").hide();
                var progressDialog = $.Element("div").addClass("dialog dialogContent");
                var centerBox = $.Element("div").append(progressDialog);
                maskWrapper.append($.Element("div")).append(centerBox).append($.Element("div"));
                maskWrapper.context = progressDialog;
                maskWrapper.message = $.Element("div").addClass("p_message").appendTo(progressDialog);
                $.Element("div").addClass("p_loading").appendTo(progressDialog);
                progressDialog.append($.Element("div").addClass("p_line"));
                maskWrapper.closeButton = $.Element("div").addClass("p_closeBtn")
                    .appendTo(progressDialog).bind("click", function () {
                        if (!_disable)_this.close();
                    }, false);
                document.body.appendChild(maskWrapper);
                maskWrapper.show = function(){
                    maskWrapper.style.display = "-webkit-box";
                };
                dialog = maskWrapper;
            }

            if(document.body){
                _createDialog();
            }else{
                document.addEventListener("DOMContentLoaded",_createDialog);
            }
        }

        return new ProgressDialog();
    })()
};

var Loading = (function(){
    var loadingDOMList,loadingDOMMap={};
    document.bind("DOMContentLoaded",function(){
        loadingDOMList = _$(".loading");
        _$.each(loadingDOMList,function(i,item){
            var type = item.getAttribute("data-loading-type");
            if(type)loadingDOMMap[type] = item;
        });
    });
    function Loading(){
        this.TOP = "top";
        this.CENTER = "center";
        this.visibile = false;
        this.show = function(type,color,bgColor){
            if(!type)type = "top";
            var dom = loadingDOMMap[type];
            if(!dom)throw "can not find loading";
            if(color)_$(dom).find(".wInnerBall").css({"backgroundColor":color});
            if(bgColor)dom.css({"backgroundColor":bgColor});
            dom.show();
            this.visibile = true;
        };
        this.hide = function(){
            loadingDOMList.hide();
            loadingDOMList.find(".wInnerBall").css({"backgroundColor":""});
            loadingDOMList.css({"backgroundColor":""});
            this.visibile = false;
        }
    }
    return new Loading();
})();