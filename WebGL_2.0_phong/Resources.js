class Resources{

	static setup(gl, completeHandler){ // tui einai auto to completeHandler????
		Resources.gl = gl;
		Resources.onComplete = completeHandler;
		return this;
	}

	static start(){
		if (Resources.Queue.length > 0) Resources.loadNextItem();
	}


	static loadTexture(name, src){
		for (var i = 0; i < arguments.length; i+=2) {
			Resources.Queue.push({type:"img", name:arguments[i], src:arguments[i+1]});
		}
		return this;
	}

	static loadNextItem(){

		if (Resources.Queue.length == 0) {
			if (Resources.onComplete != null) Resources.onComplete();
			else console.log('Resource Download Queue complete');
			return;
		}

		let itm = Resources.Queue.pop();
		// console.log(itm);
		switch (itm.type) {

			case "img":
				let img = new Image();
				img.queueData = itm;
				img.onload = Resources.onDownloadSuccess;
				img.onabort = img.onerror = Resources.onDownloadError;
				img.src = itm.src;
				// console.log(img);
				break;
		}
	}

	static onDownloadSuccess(){
		if (this instanceof Image) {
			let dat = this.queueData;
			Resources.gl.fLoadTexture(dat.name, this);
		}
		Resources.loadNextItem();
	}

	static onDownloadError(){
		console.log('Error getting ', this);
		Resources.loadNextItem();
	}
}

Resources.Queue = [];
Resources.onComplete = null;
Resources.gl = null;