'use strict';

if (!console.error) {
	console.error = console.log.bind(console, "ERROR: ");
}

if (!console.warn) {
	console.warn = console.log.bind(console, "WARN: ");
}

// var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var Assets = require('./Assets');

var Game = Object.assign({}, EventEmitter.prototype);

window.Game = Game;



Game.screenWidth = 900;
Game.screenHeight = 540;
Game.FPS = 60.0;
Game.DEBUG = window.DEBUG = true;

Game.deltaTime = 1.0 / Game.FPS;
Game.realDeltaTime = Game.deltaTime;

Game.time = 0;
Game.accumulatedTime = 0;

Game.screen = null;


Game.paused = false;

Game.devicePixels = (window.devicePixelRatio || window.webkitDevicePixelRatio || 1.0);

Game.drawCanvas = null;
Game.scale = 4;

Game.now = (function() {
	if (window.performance && window.performance.now) {
		return window.performance.now.bind(window.performance);
	}
	else {
		return Date.now;
	}
}());

Game.MainLoop = (function() {
	var lastUpdate = 0;
	var frames = 0;
	var ticks = 0;
	var accum = 0;
	var lastSecond = 0;

	var fpsElem = null;
	var tpsElem = null;
	var mspfElem = null;

	function MainLoop(timeStamp) {
		if (Game.paused) {
			return;
		}
		if (!lastUpdate) {
			lastUpdate = timeStamp;
			lastSecond = timeStamp;
			requestAnimationFrame(Game.MainLoop);
			return;
		}

		var frameStart = Game.now();

		Game.time = timeStamp / 1000.0;
		var dt = (timeStamp - lastUpdate) / 1000.0;
		lastUpdate = timeStamp;
		if (dt > 1.0) {
			console.log("Reload from debugger (or whatever)");
			dt = 1.0 / Game.FPS;
		}

		Game.deltaTime = 1.0 / Game.FPS;
		Game.realDeltaTime = dt;

		accum += dt;
		var didUpdate = false;
		while (accum >= Game.deltaTime) {
			++ticks;
			Game.update();
			Game.Input.update();
			accum -= Game.deltaTime;
			didUpdate = true;
			Game.accumulatedTime += Game.deltaTime;
		}

		requestAnimationFrame(Game.MainLoop);
		didUpdate = true;
		if (didUpdate) {
			++frames;
			Game.render();
		}

		var frameEnd = Game.now();

		if (Game.DEBUG && mspfElem != null) {
			mspfElem.textContent = 'mspf: '+(frameEnd-frameStart).toFixed(2);
		}

		if ((timeStamp - lastSecond) >= 1000.0) {
			console.log("fps: "+frames);
			console.log("tps: "+ticks);
			if (Game.DEBUG) {
				if (tpsElem != null) {
					tpsElem.textContent = "tps: "+ticks;
				}
				if (fpsElem != null) {
					fpsElem.textContent = "tps: "+ticks;
				}
			}
			lastSecond = timeStamp;
			ticks = frames = 0;
		}

	}

	MainLoop.start = function() {
		if (mspfElem == null) {
			mspfElem = document.getElementById('mspf');
		}
		if (tpsElem == null) {
			tpsElem = document.getElementById('tps');
		}
		if (fpsElem == null) {
			fpsElem = document.getElementById('tps');
		}
		requestAnimationFrame(MainLoop);
	};

	return MainLoop;
}());

var Input = Game.Input = (function() {

	function Key() {
		this.down = false;
		this.pressed = false;
		this.released = false;
		this.transitions = 0;
	}

	// Key.prototype = Object.assign(Key.prototype, EventEmitter.prototype);

	Key.prototype.update = function() {
		this.pressed = false;
		this.released = false;
		this.transitions = 0;
	};

	Key.prototype.set = function(v) {
		var oldValue = this.down;
		if (this.down === !!v) {
			return; // hm... can this happen?
		}
		this.down = !!v;
		if (v) {
			this.pressed = true;
		}
		else {
			this.released = true;
		}
		++this.transitions;
	};

	Key.prototype.clear = function() {
		this.transitions = 0;
		this.pressed = false;
		this.released = false;
		this.down = false;
	};

	var Input = {
		mouse: { x: 0, y: 0, button: new Key() },
		keys: {
			up: new Key(),
			down: new Key(),
			left: new Key(),
			right: new Key(),
		},
		bindings: {},
		allKeys: null,
		init: function(canvas) {
			var bindings = Input.bindings;
			// @TODO(thom) handle simultaneous key presses for the
			// same 'key' but different bindings in a sane way.
			bindings[65] = bindings[37] = Input.keys.left;
			bindings[38] = bindings[87] = Input.keys.up;
			bindings[39] = bindings[68] = Input.keys.right;
			bindings[40] = bindings[83] = Input.keys.down;

			Input.allKeys = [
				Input.keys.up,
				Input.keys.down,
				Input.keys.left,
				Input.keys.right,
				Input.mouse.button,
			];

			function updateMousePos(clientX, clientY) {
				var lx = clientX;
				var ly = clientY;
				var rect = canvas.getBoundingClientRect();
				lx -= rect.left;
				ly -= rect.top;
				var cx = Input.mouse.cx = lx / Game.devicePixels;
				var cy = Input.mouse.cy = ly / Game.devicePixels;

				Input.mouse.x = lx / Game.scale;
				Input.mouse.y = ly / Game.scale;
			}

			function onKey(e, state) {
				var keyCode = e.keyCode;
				if (Input.bindings[keyCode]) {
					Input.bindings[keyCode].set(state);
					e.preventDefault();
					return;
				}
				if (state) {
					switch (keyCode) {
					case 77: // m (mute)
						Assets.music.mute();
					case 27: // escape (pause)
						e.preventDefault();
						Game.togglePause();
						break;
					}
				}
			}

			window.addEventListener('blur', function() {
				var allKeys = Input.allKeys;
				for (var i = 0, l = allKeys.length; i < l; ++i) {
					allKeys[i].clear();
				}

			});

			window.addEventListener("keydown", function(e) {
				onKey(e, true);
			});

			window.addEventListener("keyup", function(e) {
				onKey(e, false);
			});

			canvas.addEventListener("mouseup", function(e) {
				e.preventDefault();
				Input.mouse.button.set(false);
				updateMousePos(e.clientX, e.clientY);
			});

			canvas.addEventListener("mousedown", function(e) {
				e.preventDefault();
				Input.mouse.button.set(true);
				updateMousePos(e.clientX, e.clientY);
				if (Game.paused) {
					Game.unpause();
				}
			});

			canvas.addEventListener("mousemove", function(e) {
				e.preventDefault();
				updateMousePos(e.clientX, e.clientY);
			});

		},
		update: function() {
			var allKeys = Input.allKeys;
			for (var i = 0, l = allKeys.length; i < l; ++i) {
				allKeys[i].update();
			}
		}
	};

	return Input;
}());

Game.Mouse = Game.Input.mouse;
Game.Keys = Game.Input.keys;

Game.togglePause = function() {
	if (!Game.paused) {
		Game.paused = true;
		Assets.music.pause();
	}
	else {
		Game.paused = false;
		Assets.music.play();//('main');
		Game.MainLoop.start();
	}
};

Game.unpause = function() {
	if (Game.paused) {
		Game.paused = false;
		Game.MainLoop.start();
	}
};

function lerp(a, b, t) {
	return (1.0-t)*a + b*t;
}



var TileSize = 20;


function Monster(level) {
	this.vx = 0;
	this.vy = 0;

	this.x = 0;
	this.y = 0;

	this.hitTimer = 0;

	this.sprites = Assets.images.sprites;
	this.setSize(0);
	this.level = level;
}

Monster.SizeData = [
	{
		sprites: {
			width: 15,
			height: 11,
			x: 0,
			y: 24,
		},
		tentaclePositions: []
	},
	{
		sprites: {
			width: 19,
			height: 12,
			x: 0,
			y: 12,
		},
		tentaclePositions: []
	},
	{
		sprites: {
			width: 22,
			height: 12,
			x: 0,
			y: 0,
		},
		tentaclePositions: []
	},
];

Monster.initTentaclePositions = function(image) {
	var pixelData = image.getPixelData();
	var pixelWidth = pixelData.width;
	var pixels = pixelData.pixels;
	Monster.SizeData.forEach(function(level, i) {
		var spriteInfo = level.sprites;

		var sx = spriteInfo.x + spriteInfo.width*6;
		var sy = spriteInfo.y;

		var sh = spriteInfo.height;
		var sw = spriteInfo.width;

		for (var y = 0; y < sh; ++y) {
			for (var x = 0; x < sw; ++x) {
				var px = sx + x;
				var py = sy + y;
				var pixel = pixels[px + py * pixelWidth];
				if (pixel === 0xffff00ff) {
					level.tentaclePositions.push({x: x, y: y});
				}
			}
		}
	});
}



Monster.prototype.setSize = function(l) {
	this.size = l;
	this.width = Monster.SizeData[l].sprites.width;
	this.height = Monster.SizeData[l].sprites.height;

	this.sprite = 0;
};

Monster.prototype.update = function() {
	if (this.hitTimer > 0) {
		--this.hitTimer;
	}
	this.move();
};

Monster.speed = 300;
Monster.jumpPower = 4000;
Monster.drag = 2.5;
Monster.gravity = 100;
Monster.prototype.move = function() {
	var ddx = 0;
	var ddy = 0;
	if (this.hitTimer === 0) {
		if (Input.keys.left.down) {
			ddx--;
		}
		if (Input.keys.right.down) {
			ddx++;
		}

		// if (Input.keys.down.down) {
			// ddy++;
		// }
	}

	var ddy = 0;
	if (Input.keys.up.pressed) {
		ddy--;
	}


	ddx *= Monster.speed;
	ddy *= Monster.jumpPower;

	ddy += Monster.gravity; // gravity


	var dragX = -Monster.drag * this.vx;
	var dragY = -Monster.drag * this.vy;

	ddx += dragX;
	//ddy += dragY;

	var oldX = this.x;
	var oldY = this.y;

	var oldVx = this.vx;
	var oldVy = this.vy;

	var newX = this.x + this.vx*Game.deltaTime + ddx * Game.deltaTime * Game.deltaTime * 0.5;
	var newY = this.y + this.vy*Game.deltaTime + ddy * Game.deltaTime * Game.deltaTime * 0.5;

	var newVx = this.vx + ddx*Game.deltaTime;
	var newVy = this.vy + ddy*Game.deltaTime;

	var hitSide = false;

	// x motion
	{
		var moveDx = newX - oldX;
		var moveSx = moveDx < 0 ? -1 : 1;
		var blockedX = false;
		var xSteps = Math.ceil(Math.abs(moveDx));
		moveSx /= 4;
		xSteps *= 4;
		// var xLeft = moveDx;
		for (var px = 0; px < xSteps; ++px) {
			var dmx = moveSx;//Math.abs(xLeft) < Math.abs(moveSx) ? xLeft : moveSx;
			if (this.canMove(dmx, 0)) {
				this.x += dmx;
				// xLeft -= dmx;
			}
			else {
				// var forceX = -this.vx/Game.deltaTime * 4;
				// this.x += forceX*Game.deltaTime*Game.deltaTime/2;
				// this.vx += forceX*Game.deltaTime;

				this.vx = -moveSx*Math.abs(this.vx);
				// this.vx = 0;
				blockedX = true;
				break;
			}
		}


		if (!blockedX) {
			this.x = newX;
			this.vx = newVx;
		}
		else {
			hitSide = true;
		}
	}

	// y motion
	{
		var moveDy = newY - oldY;
		var moveSy = moveDy < 0 ? -1 : 1;
		var blockedY = false;
		var ySteps = Math.ceil(Math.abs(moveDy));
		moveSy /= 4;
		ySteps *= 4;
		// var yLeft = moveDy;
		for (var py = 0; py < ySteps; ++py) {
			var dmy = moveSy//Math.abs(yLeft) < Math.abs(moveSy) ? yLeft : moveSy;
			if (this.canMove(0, dmy)) {
				this.y += dmy;
				// yLeft -= dmy;
			}
			else {
				this.vy = -moveSy*Math.abs(this.vy);
				blockedY = true;
				break;
			}
		}


		if (!blockedY) {
			this.y = newY;
			this.vy = newVy;
		}
		else {
			hitSide = true;
		}
	}

	if (hitSide && this.hitTimer === 0) {
		this.hitTimer = 20;
		Assets.sounds.ouch.play();
	}
};

Monster.prototype.canMove = function(dx, dy) {
	var x = (this.x);
	var y = (this.y);

	var left = (x - this.width/2);
	var right = (x + this.width/2);

	var top = (y - this.height/2);
	var bottom = (y + this.height/2)-1; // @TODO: bottom pixel in height is blank...

	var newLeft = Math.floor(left+dx);
	var newRight = Math.floor(right+dx);
	var newTop = Math.floor(top+dy);
	var newBottom = Math.floor(bottom+dy);

	if (this.level.isBlocked(newLeft, newTop)) return false;
	if (this.level.isBlocked(newLeft, newBottom)) return false;

	if (this.level.isBlocked(newRight, newTop)) return false;
	if (this.level.isBlocked(newRight, newBottom)) return false;

	return true;

};

Monster.prototype.spriteX = function() {
	var sizeData = Monster.SizeData[this.size]
	return this.sprite * sizeData.sprites.width;
};

Monster.prototype.spriteY = function() {
	var sizeData = Monster.SizeData[this.size];
	return sizeData.sprites.y;
};

Game.Monster = Monster;

function Level() {
	var tiles = Assets.images.level;
	var pixelData = tiles.getPixelData();
	this.tileWidth = pixelData.width;
	this.tileHeight = pixelData.height;
	var pix = pixelData.pixels;
	var length = this.tileWidth*this.tileHeight;
	this.tiles = [];

	this.player = new Monster(this);
	for (var i = 0; i < length; ++i) {
		var x = i % this.tileWidth;
		var y = Math.floor(i / this.tileWidth);

		if (pix[i] === 0xff000000) {
			this.tiles.push(1);
		}
		else {
			this.tiles.push(0);
			if (pix[i] === 0xffffffff) {
				this.player.x = x*TileSize;
				this.player.y = y*TileSize;
			}
		}
	}
	// this.
};

Game.Level = Level;

Level.prototype.update = function() {
	this.player.update();
};


Level.prototype.isBlocked = function(x, y) {
	x = Math.round(x/TileSize-0.5);
	y = Math.round(y/TileSize-0.5);

	return this.getTile(x|0, y|0) !== 0;
};

Level.prototype.getTile = function(x, y) {
	if (y < 0 || y >= this.tileHeight || x < 0 || x >= this.tileWidth) {
		return -1;
	}
	return this.tiles[x+y*this.tileWidth];
};


Level.prototype.render = function(ctx, canvas) {
	var minX = this.player.x - canvas.width/2;
	var minY = this.player.y - canvas.height/2;

	var maxX = this.player.x + canvas.width/2;
	var maxY = this.player.y + canvas.height/2;

	var iMinX = Math.round(minX);
	var iMinY = Math.round(minY);

	var minTileX = Math.floor(minX / TileSize)-1;
	var minTileY = Math.floor(minY / TileSize)-1;

	var maxTileX = Math.ceil(maxX / TileSize)+1;
	var maxTileY = Math.ceil(maxY / TileSize)+1;


	ctx.fillStyle = '#43596d';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.strokeStyle = 'green';

	for (var tileY = minTileY; tileY <= maxTileY; ++tileY) {
		for (var tileX = minTileX; tileX <= maxTileX; ++tileX) {
			var tile = this.getTile(tileX, tileY);
			switch (tile) {
			case -1:
				ctx.fillStyle = 'rgb(128, 128, 128)';
				break;
			case 0:
				continue;
			case 1:
				ctx.fillStyle = 'black';
				break;
			default:
				console.log("unhandled tile: "+tile);
			}
			ctx.fillRect(tileX * TileSize - iMinX, tileY * TileSize - iMinY, TileSize, TileSize);
			ctx.strokeRect(tileX * TileSize - iMinX+0.5, tileY * TileSize - iMinY+0.5, TileSize-1, TileSize-1)
		}
	}

	ctx.moveTo(this.player.x, this.player.y);
	ctx.drawImage(
		Assets.images.sprites.image,

		this.player.spriteX(),
		this.player.spriteY(),
		this.player.width,
		this.player.height,

		Math.round(this.player.x - minX - this.player.width/2),
		Math.round(this.player.y - minY - this.player.height/2),
		this.player.width,
		this.player.height
	);

	if (this.player.hitTimer > 0) {
		var alpha = 1.0-Math.abs(this.player.hitTimer-10.0)/10.0;

		var oldAlpha = ctx.globalAlpha;
		//ctx.globalAlpha = alpha;
		ctx.drawImage(
			Assets.images.sprites.image,

			//@TODO: hack
			this.player.width*7,
			this.player.spriteY(),
			this.player.width,
			this.player.height,

			Math.round(this.player.x - minX - this.player.width/2),
			Math.round(this.player.y - minY - this.player.height/2),
			this.player.width,
			this.player.height
		);

		//ctx.globalAlpha = oldAlpha;
	}

	// ctx.strokeStyle = 'red';
	// ctx.strokeRect(Math.round(this.player.x - minX - this.player.width/2)+0.5,
	//                Math.round(this.player.y - minY - this.player.height/2)+0.5,
	//                this.player.width,
	//                this.player.height);

	// )
/*	ctx.fillStyle = 'red';
	ctx.fillRect(Math.round(this.player.x - minX - this.player.height/2),
	             Math.round(this.player.y - minY - this.player.width/2),
	             this.player.width,
	             this.player.height);*/








}


Game.update = function() {
	Game.emit('update');

	Game.level.update();

	/*

	var ctx = Game.drawCanvas.getContext('2d');
	ctx.imageSmoothingEnabled = false;
	ctx.mozImageSmoothingEnabled = false;
	ctx.webkitImageSmoothingEnabled = false;
	ctx.fillStyle = 'white';
	ctx.fillRect(0, 0, Game.drawCanvas.width, Game.drawCanvas.height);

	var mx = Input.mouse.x;
	var my = Input.mouse.y;
	if (Input.mouse.button.down) {
		ctx.fillStyle = 'red';
	}
	else {
		ctx.fillStyle = 'green';
	}
	ctx.fillRect(Math.floor(mx-10), Math.floor(my-10), 20, 20);*/
};

Game.render = function() {
	Game.emit('render');
	var drawCtx = Game.drawCanvas.getContext('2d');
	drawCtx.imageSmoothingEnabled = false;
	drawCtx.mozImageSmoothingEnabled = false;
	drawCtx.webkitImageSmoothingEnabled = false;

	Game.level.render(drawCtx, Game.drawCanvas);

	var screenCtx = Game.screen.getContext('2d');
	screenCtx.imageSmoothingEnabled = false;
	screenCtx.mozImageSmoothingEnabled = false;
	screenCtx.webkitImageSmoothingEnabled = false;
	screenCtx.clearRect(0, 0, Game.screen.width, Game.screen.height);

	screenCtx.drawImage(Game.drawCanvas, 0, 0, Game.drawCanvas.width, Game.drawCanvas.height, 0, 0, Game.screen.width, Game.screen.height);


};


Game.init = function(canvas) {
	Game.screen = canvas;
	canvas.width = Game.screenWidth*Game.devicePixels;
	canvas.height = Game.screenHeight*Game.devicePixels;
	canvas.style.width = Game.screenWidth+"px";
	canvas.style.height = Game.screenHeight+"px";

	Game.Input.init(canvas);

	var drawCanvas = document.createElement('canvas');

	drawCanvas.width = Game.screenWidth / Game.scale;
	drawCanvas.height = Game.screenHeight / Game.scale;
	Game.drawCanvas = drawCanvas;

	var drawCtx = drawCanvas.getContext('2d');

	// var tentacleLayer = document.createElement('canvas');

	// tentacleLayer.width = Game.screenWidth / Game.scale;
	// tentacleLayer.height = Game.screenHeight / Game.scale;
	// Game.tentacleLayer = tentacleLayer;
	// var tentaclePixels = drawCtx.createImageData(Game.screenWidth/Game.scale, Game.screenHeight/Game.scale);

	// Game.tentaclePixels = {
	// 	imageData: tentaclePixels,
	// 	width: tentaclePixels.width,
	// 	height: tentaclePixels.height,
	// 	data: tentaclePixels.data,
	// 	pixels: new Uint32Array(tentaclePixels.data.buffer)
	// };

	// var drawCtx = drawCanvas.getContext('2d');

	var scrCtx = Game.screen.getContext('2d');
	scrCtx.fillStyle = 'black';
	scrCtx.fillRect(0, 0, Game.screen.width, Game.screen.height);

	scrCtx.font = '250px Source Sans Pro';
	scrCtx.textAlign = 'center';
	scrCtx.textBaseline = 'middle';

	scrCtx.fillStyle = 'white';

	scrCtx.fillText("Loading!", Game.screen.width/2, Game.screen.height/2);

	Assets.loadAll()
	.then(function() {
		Game.level = new Level();
		Monster.initTentaclePositions(Assets.images.sprites);
		Assets.music.play();
		// Assets.music.play('intro');
		// Assets.music.once('end', function() {
			// Assets.music.play('main')
		// });
		Game.MainLoop.start();
	})
	.catch(function() {
		console.error(arguments)
		scrCtx.fillStyle = 'black';
		scrCtx.fillRect(0, 0, Game.screen.width, Game.screen.height);

		scrCtx.font = '150px Source Sans Pro';
		scrCtx.textAlign = 'center';
		scrCtx.textBaseline = 'middle';

		scrCtx.fillStyle = 'white';

		scrCtx.fillText("Init failed! D:", Game.screen.width/2, Game.screen.height/2);
	});


};

Game.Assets = Assets;

function Main() {
	Game.init(document.getElementById('screen'));
}
document.body.onload = Main;
//document.body.addEventListener('load', Main);

