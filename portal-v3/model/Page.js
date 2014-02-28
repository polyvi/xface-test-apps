/**
 * 分页对象
 * @constructor
 */
function Page(){
    var data = [];
    this.totalPage = 0;
    this.pageIndex = 0;
    this.pageSize = 10;

    this.add = function(item){
        data.push(item);
        return this;
    };
    this.addAll = function(array){
        if(!(array instanceof Array))throw new Error("type must is Array");
        data = data.concat(array);
        return this;
    };
    this.each = function(callback){
        data.forEach(callback);
    };
    this.list = function(){
        return data;
    };
    this.get = function(index){
        return data[index];
    };
    this.hasPrev = function(){
        return this.pageIndex > 1;
    };
    this.hasNext = function(){
        return this.pageIndex < this.totalPage;
    };
    this.clear = function(){
        data.length = 0;
        this.pageIndex=0;
        this.totalPage=0;
        return this;
    }
}