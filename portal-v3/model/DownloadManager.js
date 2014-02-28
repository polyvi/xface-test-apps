function DownloadManager(){
    var _this = this;
    _this.maxThreads = xmesh.model["Setting"].maxThreads;
    _this.queue = new Queue();

    _this.createDownloader = function(remoteApp){
        var downloader = xmesh.createModel(Downloader);
        downloader.app = remoteApp;
        _this.queue.add(downloader);
        var evt = $.Event("create");
        evt.downloader = downloader;
        _this.trigger(evt);
        return downloader;
    };

    _this.getDownloader = function(remoteApp){
        var list = _this.queue.list;
        for(var i=0;i<list.length;i++){
            var d = list[i];
            if(d.app.id === remoteApp.id)return d;
        }
        return null;
    };

    _this.start = function(){
        for(var i=0;i<_this.queue.list.length;i++){
            if(_this.queue.downloading.length>=_this.maxThreads)return;
            var d = _this.queue.list[i];
            if(d.isDownloading())continue;
            d.start();
        }
    };

    _this.stop = function(){
        for(var i=0;i<_this.queue.downloading.length;i++){
            _this.queue.downloading[i].pause();
        }
    };

    _this.thenTheLastQueue = function(){
        var list = xmesh.model["LocalData"].DownloadTask.getLastDownloadQueue();
        var queue = [];
        list.forEach(function(app){
            var downloader = _this.createDownloader($.applyObject(new RemoteApplication(),app));
            downloader.bind("success",function(evt){
                var app = this.app;
                if(app._installing)return;
                app.install(function(){
                    evt.fileEntry.remove();
                },function(){
                    evt.fileEntry.remove();
                });
            });
            queue.push(downloader);
        });
        _this.start();
        return queue;
    };

    function Queue(){
        var _self = this;
        _self.list = [];
        _self.downloading = [];

        this.add = function(downloader){
            _self.list.push(downloader);
            downloader.bind("start",start);
            downloader.bind("success cancel error",complete);
            downloader.bind("success pause cancel error",stop);
            function start(){
                if(_self.downloading.length>=_this.maxThreads){
                    _this.queue.downloading[0].pause();
                    var evt = $.Event("error");
                    evt.type = "exceeded";
                    _this.trigger(evt);
                }
                _self.downloading.push(this);
            }
            function complete(){
                _self.list.remove(_self.list.indexOf(this));
                setTimeout(function(){
                    for(var i=0;i<_self.list.length;i++){
                        var d = _self.list[i];
                        if(d.status == Downloader.STATUS.WAITING && _self.downloading.length<_this.maxThreads){
                            d.start();
                        }
                    }
                },500);
            }
            function stop(){
                _self.downloading.remove(_self.downloading.indexOf(this));
            }
        };
    }
}