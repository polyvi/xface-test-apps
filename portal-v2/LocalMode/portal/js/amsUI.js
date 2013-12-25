var createAMSMPage = {
	appData :[],
	
	createAppDetail :function(data){
		this.appData = data;
		showAppDetail(this.appData);
		function showAppDetail(data){
			$('img').src = data['icon'];
			$('name').innerHTML = "名称： " +  data['name'];
			$('version').innerHTML = "版本号：" + data['version'];
			$('stars').innerHTML = "";
			createStars($('stars'), 4);
			$('size').innerHTML = "大小：" + data['size'];
			$('intro').innerHTML = data['CONTENT'];
		}
	},
	
	registerEvent: function (id,callback){
		$(id).data = this.appData;
		$(id).onclick = (callback instanceof Function )?callback:function(){alert('empty')};	
	}
}