function LocalData(){
    var storage = localStorage;

    this.SearchHistory = new function(){
        this.maxSize = 6;
        var _history = [];
        this.getHistory = function(){
            return _history || [];
        };
        this.push = function(item){
            if(_history.length>=this.maxSize)_history.pop();
            if(_history.indexOf(item) != -1)return false;
            _history = [item].concat(_history);
            storage.setItem("search_history", $.toJson(_history));
            return true;
        };
        function readingHistory(){
            var str = storage.getItem("search_history");
            if(!str)return;
            var json = $.parseJson(str);
            if(json)_history = json;
        }
        readingHistory();
    };

    this.DownloadTask = new function(){
        this.getLastDownloadQueue = function(){
            var list = storage.getItem("downloadTask");
            if(!list)return[];
            return $.parseJson(list);
        };

        this.store = function(){
            var list = xmesh.model["DownloadManager"].queue.list;
            var arr = [];
            list.forEach(function(d){
                if(d.isDownloading())d.pause();
                arr.push(d.app);
            });
            storage.setItem("downloadTask", $.toJson(arr));
        }
    };

    this.LocalAppOrder = new function(){
        this.sortInstallApps = function (apps) {
            var orderList = appsOrder.read();
            if (orderList && orderList.length > 0) {
                var temp = [];
                var notExists = [];// 本地顺序数组中不包含的，默认添加到后面去。
                for (var i = 0; i < apps.length; i++) {
                    var app = apps[i];
                    var id = app.id;
                    id = id.toString();
                    var index = orderList.indexOf(id);
                    if (index != -1) {
                        temp[index] = app;
                    } else {
                        notExists.push(app);
                    }
                }
                temp = temp.concat(notExists);
                return temp;
            }
            return apps;
        };

        this.storeOrder = function (apps) {
            appsOrder.store(apps);
        };

        var appsOrder = {
            STORAGE_KEY: "portal_apps_order",
            read: function () {
                var list = [];
                var order = storage.getItem(appsOrder.STORAGE_KEY);
                if (!order || null == order || "" == order) {
                    return list;
                } else {
                    try {
                        eval("list=" + order);
                    } catch (e) {
                        return [];
                    }
                    if (!(list instanceof Array))list = [];
                    return list;
                }
            },
            store: function (apps) {
                var list = apps instanceof Array ? apps : [];
                storage.setItem(appsOrder.STORAGE_KEY, $.toJson(list));
            }
        };
    };
}