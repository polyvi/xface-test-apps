function Downloader(remoteApp){
    var _this = this;
    _this.app = remoteApp;

    _this.downloaded = 0;
    _this.totalSize = 0;
    _this.progress = 0;
    _this.fileTransfer = null;
    _this.url = "";
    _this.fileName = "";
    _this.fileType = "";
    _this.status = Downloader.STATUS.WAITING;

    _this.isDownloading = function(){
        return _this.status === Downloader.STATUS.DOWNLOADING || _this.status === Downloader.STATUS.STARTING;
    };

    _this.start = function(){
        if(!_this.fileTransfer){
            _this.url = _this.app.packageUrl;
            _this.fileType = _this.url.substring(_this.url.lastIndexOf(".")+1,_this.url.length);
            if(!_this.app.fileName)_this.app.fileName = "app_"+Date.now()+"."+_this.fileType;
            _this.fileName = _this.app.fileName;
            _this.fileTransfer = new xFace.AdvancedFileTransfer(_this.url,_this.fileName, false);
            _this.fileTransfer.onprogress = _onProgress;
        }
        if(_this.isDownloading())throw "status error";
        _this.fileTransfer.download(function(file){
            _this.status = Downloader.STATUS.COMPLETE;
            _this.app.packagePath = file.fullPath;
            var evt = $.Event("success");
            evt.fileEntry = file;
            _this.trigger(evt);
        },function(e){
            _this.status = Downloader.STATUS.ERROR;
            var evt = $.Event("error");
            evt.error = e;
            setTimeout(function(){
                _this.trigger(evt);
            },500);
        });
        _this.status = Downloader.STATUS.STARTING;
        _this.trigger($.Event("start"));
    };

    _this.pause = function(){
        if(_this.status == Downloader.STATUS.PAUSE)return;
        _this.fileTransfer.pause();
        _this.status = Downloader.STATUS.PAUSE;
        _this.trigger($.Event("pause"));
    };

    _this.cancel = function(){
        if(_this.status == Downloader.STATUS.CANCEL)return;
        if(_this.fileTransfer)_this.fileTransfer.cancel();
        _this.status = Downloader.STATUS.CANCEL;
        _this.trigger($.Event("cancel"));
    };

    function _onProgress(evt){
        if(_this.status == Downloader.STATUS.COMPLETE || _this.status == Downloader.STATUS.PAUSE)return;
        _this.status = Downloader.STATUS.DOWNLOADING;
        var progress = (evt.loaded/evt.total) * 100;
        var p = Math.ceil(progress);
        if(p<100 && p - _this.progress<5){
            if(p<5){
                _this.downloaded = evt.loaded;
                _this.totalSize = evt.total;
                _this.progress = progress;
            }
            return;
        }
        _this.downloaded = evt.loaded;
        _this.totalSize = evt.total;
        _this.progress = progress;
        var progressEvt = $.Event("progress");
        progressEvt.loaded = evt.loaded;
        progressEvt.total = evt.total;
        progressEvt.progress = _this.progress;
        _this.trigger(progressEvt);
    }
}

Downloader.STATUS = {
    WAITING:0,
    STARTING:6,
    DOWNLOADING:1,
    PAUSE:2,
    COMPLETE:3,
    CANCEL:4,
    ERROR:5
};