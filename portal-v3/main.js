document.bind("deviceready",initPage);
function initPage(){
    window.PageManager = $('#pageManager').css({"overflow":""}).bind("touchmove",function(e){e.preventDefault()});
	xmesh
	.loadMap('map.xml')
	.attachPageManger(PageManager)
	.bind('pathChange', _handleOnPathChange)
	.bind('pathError', _handleOnPathError)
	.bind('actionError', _handleOnActionError)
	.home(true);
    $.initPOMapping("pomap.xml");
    if(xmesh.model["Setting"].forceRefreshUI === true)RefreshTool.start();
    var queue = xmesh.model["DownloadManager"].thenTheLastQueue();
    if(queue.length>0){
        Dialog.toast("上次未完成任务已开始继续下载");
        queue.forEach(function(item){
            item.bind("success cancel error",function(){
                xmesh.model["LocalData"].DownloadTask.store();
            });
        })
    }
}

document.bind("deviceready",function(){
    window.exitApp = function(){
        xFace.AMS.closeApplication();
    };
    window.addEventListener("orientationchange",function(e){
        emitEvent(e.type);
    });
    document.bind("backbutton menubutton",function(evt){
        emitEvent(evt.type,"device");
    });
    pageManager.bind("click",function(e){
        if(e.target.hasClass("back"))emitEvent("backbutton", e.target);
    });

    function emitEvent(type,origin){
        if(PageManager.locked)return;
        if(PageManager.activePage){
            var event = $.Event(type);
            var preventDefaulted = false;
            event.preventDefault = function(){
                preventDefaulted = true;
            };
            event.origin = origin;
            PageManager.activePage.trigger(event);
            if(!preventDefaulted){
                switch (type){
                    case "backbutton": xmesh.back();
                        break;
                }
            }
        }
    }
});

function _handleOnPathChange(evt){
    PageManager.open(evt.cachedPage||this.activeNode.src, null, evt.param, evt.direction);
}

function _handleOnPathError(evt){
	console.error('Can not find path: '+evt.path);
}

function _handleOnActionError(evt){
	console.error('Action not found: '+evt.action);
}

var __emptyImage__ = "view/res/images/empty_opacity.png";
document.bind("imageStatusChange",function(e){
    if(e.img.getAttribute("src") == __emptyImage__)return;
    if(e.status == "error"){
        onImageError.call(e.img,e);
    }else{
        onImageLoad.call(e.img,e);
    }
});
function onImageError(){
    var src = this.getAttribute("src");
    if(!src || !this.hasClass("lazy"))return;
    this.addClass("error").removeClass("loaded");
    this.src=__emptyImage__;
}
function onImageLoad(){
    this.addClass("loaded");
}

function onLoadNewPage(pageEvent){
    var page = _$(pageEvent.target);
    page.find("img.lazy").each(function(i,item){
        item.onerror = onImageError;
        item.onload = onImageLoad;
    });
}

function onLoadError(evt){
	
}