function BuildList(ID){
	THIS = this;
	this.rank = 1;
	this.parentNode = '';
	
	function _init(){
		THIS.parentNode = document.getElementById(ID);	
	}
	
	_init();
}

BuildList.prototype.buildAppElement = function (element){
	this.parentNode.appendChild(element);
}


BuildList.prototype.sortByIndex = function (previousIndex,currentIndex){
	
}

BuildList.prototype.insertBefore = function (index){
	
}