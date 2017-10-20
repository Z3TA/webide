(function() {
	/*
		
	*/
	
	var CANVAS;
	var IMAGES_LOADED = 0;
	var WINDOW_LOADED = false;
	var CLOUD = [];
	
	var IMG = [
		"0.png",
		"1.png",
		"2.png",
		"3.png",
		"4.png",
		"5.png",
		"6.png"
	].map(loadImage);
	
		
		window.addEventListener("load", function() {
			WINDOW_LOADED = true;
			clouds();
		}, false);
		
		window.addEventListener("resize", resize, false);
		
		function clouds() {
			if(WINDOW_LOADED && IMAGES_LOADED == IMG.length) showClouds();
		}
		
		function loadImage(imgSrc) {
			var img = new Image();
			img.onload = function() {
				IMAGES_LOADED++;
				clouds();
			}
			img.src = "clouds/" + imgSrc;
			return img;
		}
		
		function showClouds() {
			CANVAS = document.createElement('canvas');
		CANVAS.style.zIndex = -1;
		CANVAS.style.position = "fixed";
		CANVAS.style.top = "0px";
		CANVAS.style.opacity = 0.3;
		
			var body = document.body;
			
		body.insertBefore(CANVAS, body.firstChild);
			
			resize();
			
		var screenArea = CANVAS.width * CANVAS.height;
		var cloudCount = Math.ceil(Math.sqrt(screenArea) / 80);
			
		for (var i=0; i<cloudCount; i++) {
			CLOUD.push({
				x: Math.floor(Math.random() * CANVAS.width), 
				y: Math.floor(Math.random() * CANVAS.height), 
				img: Math.floor(Math.random() * IMG.length)
			});
		}
		
		window.requestAnimationFrame(animate);
		
		
	}
	
	function animate() {
		var ctx = CANVAS.getContext('2d');
		ctx.fillStyle="#4eb2ff";
		ctx.clearRect(0, 0, CANVAS.width, CANVAS.height);
		ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
		for (var i=0, img; i<CLOUD.length; i++) {
			img = IMG[CLOUD[i].img];
			
			CLOUD[i].x += .01 + 0.01 * ( (i > CLOUD.length / 2) + (i > CLOUD.length / 3)  + (i > CLOUD.length / 4) + (i > CLOUD.length / 5) );
			
			if((CLOUD[i].x - img.width/2)  > CANVAS.width) CLOUD[i].x = -img.width/2;
			
			ctx.drawImage(img, CLOUD[i].x - img.width/2, CLOUD[i].y - img.height/2);
			}
		window.requestAnimationFrame(animate);
	}
	
	function resize() {
		var width = window.innerWidth;
		var height = window.innerHeight;
		
		CANVAS.width = width;
		CANVAS.height = height;
	}
	
})();
