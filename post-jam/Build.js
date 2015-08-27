(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){


// var Promise = require('bluebird');

var Assets = {
	images: {},
	sounds: {
		ouch: new Howl({
			src: ['res/ouch.wav']
		}),
		playerDie: new Howl({
			src: ['res/player_die.wav']
		}),
		shootBullet: new Howl({
			src: ['res/bullet.wav']
		}),
		hurtm: new Howl({
			src: ['res/hurtm.wav']
		}),
		mdie: new Howl({
			src: ['res/mdie.wav']
		}),
		boom: new Howl({
			src: ['res/boom.wav']
		}),
		winlevel: new Howl({
			src: ['res/winlevel.wav']
		}),
		exitAppear: new Howl({
			src: ['res/exit-appear.wav']
		})
	},
	music: new Howl({
		src: ['res/song1.mp3', 'res/song1.ogg'],
		loop: true,
		// sprite: {
		// 	intro: [0, 10000],
		// 	main: [10000, 52104, true]
		// }
	}),
	deathMusic: new Howl({
		src: ['res/deathmusic.mp3', 'res/deathmusic.ogg'],
		loop: true
	}),
	winMusic: new Howl({
		src: ['res/winner-music.mp3', 'res/winner-music.ogg'],
		loop: true
	})
};

function ImageAsset(image, name) {
	this.image = image;
	this.width = image.naturalWidth || image.width;
	this.height = image.naturalHeight || image.height;
	this.name = name;
	this.pixels = null;
	this.rotations = null;
}

ImageAsset.prototype.getCardinalRotations = function(sw, sh) {
	if (this.rotations == null) {
		this.rotations = [];
		for (var i = 0; i < 4; ++i) {
			var canv = document.createElement('canvas');
			canv.width = this.width;
			canv.height = this.height;
			var ctx = canv.getContext('2d');
			var c = Math.floor(this.width/sw);
			var r = Math.floor(this.height/sh);
			for (var y = 0; y < r; ++y) {
				for (var x = 0; x < c; ++x) {
					ctx.save();
					ctx.translate(sw*x+sw/2, sh*y+sh/2);
					ctx.rotate(i*Math.PI/2);
					ctx.drawImage(
						this.image,
						x*sw,   y*sh, sw, sh,
						-sw/2, -sh/2, sw, sh);
					ctx.restore();
				}
			}
			this.rotations[i] = canv;
		}
	}
	return this.rotations;
}


ImageAsset.prototype.getPixelData = function() {
	if (!this.pixels) {
		var canv = document.createElement('canvas');
		canv.width = this.width;
		canv.height = this.height;
		var ctx = canv.getContext('2d');
		ctx.drawImage(this.image, 0, 0, canv.width, canv.height);
		var imageData = ctx.getImageData(0, 0, canv.width, canv.height);
		this.pixels = {
			width: imageData.width,
			height: imageData.height,
			data: imageData.data,
			pixels: new Uint32Array(imageData.data.buffer)
		};
	}
	return this.pixels;
};

function loadImage(name, src) {
	return new Promise(function(resolve, reject) {
		var image = new Image();
		image.onload = function() {
			Assets.images[name] = new ImageAsset(image, name);
			resolve(Assets.images[name]);
		};
		image.onerror = function(e) {
			console.log(e);
			console.error("Failed to load: "+src)
			reject("Failed to load asset ("+name+")");
		};
		image.src = src;
	});
}


Assets.loadAll = function() {

	return Promise.all([
		loadImage('sprites', 'res/sprites.png'),
		loadImage('eye', 'res/eye.png'),
		loadImage('misc', 'res/misc.png'),
		loadImage('copter', 'res/copter.png'),
		loadImage('tiles', 'res/tiles-only.png'),
		loadImage('backdrop', 'res/backdrop.png'),
		loadImage('exit', 'res/exit-sprite.png'),
		loadImage('l5', 'res/levels/L5.png'),
		loadImage('l4', 'res/levels/L4.png'),
		loadImage('l3', 'res/levels/L3.png'),
		loadImage('l2', 'res/levels/L2.png'),
		loadImage('l1', 'res/levels/L1.png')
		// loadImage('font', 'res/font.png')
	]);
}


module.exports = Assets;


},{}],2:[function(require,module,exports){
'use strict';

if (!console.error) {
	console.error = console.log.bind(console, "ERROR: ");
}

if (!console.warn) {
	console.warn = console.log.bind(console, "WARN: ");
}

var Assets = require('./Assets');

var Engine = {};

window.Engine = Engine;

Engine.screenWidth = 900;
Engine.screenHeight = 540;
Engine.FPS = 60.0;
Engine.DEBUG = window.DEBUG = false;

Engine.deltaTime = 1.0 / Engine.FPS;
Engine.realDeltaTime = Engine.deltaTime;

Engine.time = 0;
Engine.accumulatedTime = 0;

Engine.screen = null;

Engine.didLose = false
Engine.isOver = false;

Engine.paused = false;

Engine.devicePixels = (window.devicePixelRatio || window.webkitDevicePixelRatio || 1.0);

Engine.drawCanvas = null;
Engine.scale = 3;

Engine.now = (function() {
	if (window.performance && window.performance.now) {
		return window.performance.now.bind(window.performance);
	}
	else {
		return Date.now;
	}
}());

function Assert(v, msg) {
	if (!Engine.DEBUG) {
		return;
	}
	if (msg == null) {
		msg = "assertation failed";
	}
	console.assert(v, msg);
	if (!v) {
		if (!confirm("assertation failed: "+msg+". continue?")) {
			debugger;
		}
	}
}


function NaNCheck(v) {
	if (!Engine.DEBUG) {
		return;
	}
	Assert(+v === v, "NaNCheck failed");
}

Engine.MainLoop = (function() {
	var lastUpdate = 0;
	var frames = 0;
	var ticks = 0;
	var accum = 0;
	var lastSecond = 0;

	var fpsElem = null;
	var tpsElem = null;
	var mspfElem = null;

	function MainLoop(timeStamp) {
		if (Engine.paused) {
			return;
		}
		if (!lastUpdate) {
			lastUpdate = timeStamp;
			lastSecond = timeStamp;
			requestAnimationFrame(Engine.MainLoop);
			return;
		}

		var frameStart = Engine.now();

		Engine.time = timeStamp / 1000.0;
		var dt = (timeStamp - lastUpdate) / 1000.0;
		lastUpdate = timeStamp;
		if (dt > 1.0) {
			console.log("Reload from debugger (or whatever)");
			dt = 1.0 / Engine.FPS;
		}

		Engine.deltaTime = 1.0 / Engine.FPS;
		Engine.realDeltaTime = dt;

		accum += dt;
		var didUpdate = false;
		while (accum >= Engine.deltaTime) {
			++ticks;
			Engine.update();
			Engine.Input.update();
			accum -= Engine.deltaTime;
			didUpdate = true;
			Engine.accumulatedTime += Engine.deltaTime;
		}

		requestAnimationFrame(Engine.MainLoop);
		didUpdate = true;
		if (didUpdate) {
			++frames;
			Engine.render();
		}

		var frameEnd = Engine.now();

		if (Engine.DEBUG && mspfElem != null) {
			mspfElem.textContent = 'mspf: '+(frameEnd-frameStart).toFixed(2);
		}

		if ((timeStamp - lastSecond) >= 1000.0) {
			console.log("fps: "+frames+", tps: "+ticks+', mspf: '+(frameEnd-frameStart).toFixed(2));
			if (Engine.DEBUG) {
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

var Input = Engine.Input = (function() {

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
		mouse: { x: 0, y: 0, worldX: 0, worldY: 0, button: new Key() },
		keys: {
			up: new Key(),
			down: new Key(),
			left: new Key(),
			right: new Key(),
		},
		bindings: {},
		allKeys: null,
		setBounds: function(x, y) {
			this.mouse.worldX = this.mouse.x + x;
			this.mouse.worldY = this.mouse.y + y;
		},
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
				var cx = Input.mouse.cx = lx / Engine.devicePixels;
				var cy = Input.mouse.cy = ly / Engine.devicePixels;

				Input.mouse.x = lx / Engine.scale;
				Input.mouse.y = ly / Engine.scale;
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
						Engine.togglePause();
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
				if (Engine.paused) {
					Engine.unpause();
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

Engine.Mouse = Engine.Input.mouse;
Engine.Keys = Engine.Input.keys;

Engine.togglePause = function() {
	if (!Engine.paused) {
		Engine.paused = true;
		Assets.music.pause();
	}
	else {
		Engine.paused = false;
		Assets.music.play();//('main');
		Engine.MainLoop.start();
	}
};

Engine.unpause = function() {
	if (Engine.paused) {
		Engine.paused = false;
		Engine.MainLoop.start();
	}
};

function mixin(type, mixin) {
	Object.keys(mixin).forEach(function(k) {
		type.prototype[k] = mixin[k];
	});
	return type;
}


function lerp(a, b, t) {
	return (1.0-t)*a + b*t;
}

function clamp(v, min, max) {
	return v < min ? min : (v > max ? max : v);
}

function clamp01(v) {
	return clamp(v, 0, 1);
};

function pingPong(t, len) {
	t -= Math.floor(t/(len*2))*len*2;
	return len - Math.abs(t - len);
}

function distBetween(x0, y0, x1, y1) {
	var dx = x1 - x0;
	var dy = y1 - y0;
	return Math.sqrt(dx*dx+dy*dy);
}

function normLen(x, y) {
	var l = x*x+y*y;
	if (l < 0.001) {
		return 1.0;
	}
	return Math.sqrt(l);
}

// @NOTE: partial renderer bottleneck... somewhat optimized
function bresenham(x0, y0, x1, y1, pixelData, color) {
	x0 = x0|0; y0 = y0|0; x1 = x1|0; y1 = y1|0; color = color|0;
	var dx = Math.abs(x1 - x0)|0;
	var dy = Math.abs(y1 - y0)|0;
	var sx = (x0 < x1) ? 1 : -1;
	var sy = (y0 < y1) ? 1 : -1;
	var err = dx - dy;
	var pix = pixelData.pixels;
	var width = pixelData.width>>>0;
	var height = pixelData.height>>>0;
	if (x0 >= 0 && x0 < width && y0 >= 0 && y0 < height) {
		pix[x0+y0*width] = color;
	}
	else if (x1 < 0 || x1 >= width || y1 < 0 && y1 >= height) {
		// technically not correct to do this but we don't care
		// about lines that start and end off screen
		// console.warn("bresenham entirely off screen")
		return;
	}
	while (true) {
		pix[x0+y0*width] = color;
		if (x0 === x1 && y0 === y1) {
			break;
		}

		var e2 = err << 1;
		if (e2 > -dy) {
			err -= dy;
			x0 += sx;
			if (x0 < 0 || x0 > width) {
				break;
			}
		}
		if (e2 <  dx) {
			err += dx;
			y0 += sy;
			if (y0 < 0 || y0 > height) {
				break;
			}
		}
	}
}

var TileSize = 12;


var Movable = {};

Engine.Movable = Movable;
Movable.doMove = function() {
	var s = Math.ceil(Math.sqrt(this.vx*this.vx+this.vy*this.vy));
	for (var i = 0; i < s; ++i)	{
		this._move(this.vx/s, 0);
		this._move(0, this.vy/s);
	}
};

Movable.knockBack = function(x, y) {
	this.vx += (x - this.vx)*2/5;
	this.vy += (y - this.vy)*2/5;
};

Movable.blockCheck = function(x, y) {
	return (
		this.game.isBlocked(x-this.rx, y-this.ry) ||
		this.game.isBlocked(x-this.rx, y+this.ry) ||
		this.game.isBlocked(x+this.rx, y-this.ry) ||
		this.game.isBlocked(x+this.rx, y+this.ry)
	);
};

Movable._move = function(dx, dy) {
	if (!this.active) {
		return;
	}
	var nx = this.x+dx;
	var ny = this.y+dy;
	// hm....
	if (this.blockCheck(nx, ny)) {
		this.collide(dx, dy);
	}
	else {
		this.x = nx;
		this.y = ny;
	}
};

Movable.collide = function(dx, dy) {};


// tentacles are stored as an array of structs of
// {x, y, velX, velY, oldX, oldY}
var SEG_X = 0;
var SEG_Y = 1;
var SEG_VX = 2;
var SEG_VY = 3;
var SEG_OLD_X = 4;
var SEG_OLD_Y = 5;
var SEG_SIZE = 6;
// @NOTE: update bottleneck, optimized
function Tentacle(numPoints, ox, oy, parent) {
	this.parent = parent;
	this.offsetX = ox;
	this.offsetY = oy;
	this.numPoints = numPoints;
	this.data = new Float32Array(numPoints*SEG_SIZE);
	// {x, y, vx, vy, ox, oy, nx, ny, angle}
	this.drag = Math.random()*0.2 + 0.75;
	this.drift = (Math.random() - 0.5)/100
	this.segLength = Math.random() * 0.8 + 1.0;
	var tr = (0x31+Math.floor((Math.random() - 0.5)*10)) & 0xff;
	var tg = (0x30+Math.floor((Math.random() - 0.5)*10)) & 0xff;
	var tb = (0x10+Math.floor((Math.random() - 0.5)*10)) & 0xff;

	this.color = 0xff000000|(tb<<16)|(tg<<8)|(tr);//0xff103031;
}

Tentacle.spacing = 5;
Tentacle.size = 1;
Tentacle.globalDrag = 0.02;
Tentacle.gravity = 0.1;

Tentacle.prototype.update = function(x, y) {
	if (Math.random() < 0.01) {
		this.drift += (Math.random() - 0.5)/100;
		if (Math.abs(this.drift) >= 0.1) {
			this.drift = 0;
		}
	}
	var driftMul = this.drift;
	if (Math.random() < 0.01) {
		driftMul = (Math.random() - 0.5)/10;
	}
	var drift = driftMul * Math.sqrt(Math.sqrt(this.parent.vx*this.parent.vx + this.parent.vy*this.parent.vy));

	var mx = Input.mouse.worldX;
	var my = Input.mouse.worldY;
	var parentX = this.parent.x;
	var parentY = this.parent.y;

	var mxScale = 0;
	var myScale = 0;

	var prevX = this.data[SEG_X];
	var prevY = this.data[SEG_Y];

	var length = +this.numPoints;
	var data = this.data;
	var drag = this.drag * (1.0 - Tentacle.globalDrag);
	var size = Tentacle.size;
	if (Input.mouse.button.down) {
		mxScale = 2.0/(Engine.screenWidth/Engine.scale);
		myScale = 2.0/(Engine.screenHeight/Engine.scale);
		size *= 2.0
	}
	size *= this.segLength;

	// var px = Input.mouse.button;

	// @FIXME: should be using deltaTime...
	var i = 0;
	for (var segIdx = SEG_SIZE, end = data.length; segIdx < end; segIdx += SEG_SIZE) {
		++i;
		data[segIdx+SEG_X] += data[segIdx+SEG_VX];
		data[segIdx+SEG_Y] += data[segIdx+SEG_VY];

		var segX = data[segIdx+SEG_X];
		var segY = data[segIdx+SEG_Y];

		var dx = prevX - segX;
		var dy = prevY - segY;

		var da = Math.atan2(dy, dx);

		var px = segX + Math.cos(da) * size;
		var py = segY + Math.sin(da) * size;

		var mdx = (mx - ((i&1) ? segX : parentX)+(Math.random()-0.5)*15) * mxScale;
		var mdy = (my - ((i&1) ? segY : parentY)+(Math.random()-0.5)*15) * myScale;

		segX = data[segIdx+SEG_X] = prevX - (px - segX);
		segY = data[segIdx+SEG_Y] = prevY - (py - segY);


		data[segIdx+SEG_VX] = (segX - data[segIdx+SEG_OLD_X])*drag - drift + mdx;
		data[segIdx+SEG_VY] = (segY - data[segIdx+SEG_OLD_Y])*drag + Tentacle.gravity + mdy;

		data[segIdx+SEG_OLD_X] = segX;
		data[segIdx+SEG_OLD_Y] = segY;

		prevX = segX;
		prevY = segY;
	}
}

Tentacle.prototype.parentMoved = function(x, y) {
	this.data[SEG_X] = x+this.offsetX;
	this.data[SEG_Y] = y+this.offsetY;
};

Tentacle.prototype.setPosition = function(x, y) {
	x += this.offsetX;
	y += this.offsetY;
	for (var i = 0; i < this.data.length; i += SEG_SIZE) {
		this.data[i+SEG_X] = x + (Math.random() - 0.5)/10;
		this.data[i+SEG_Y] = y + (Math.random() - 0.5)/10;
	}
};

Tentacle.prototype.drawPath = function(ctx, sx, sy) {
	var data = this.data;
	ctx.beginPath();
	ctx.moveTo(data[SEG_X]-sx, data[SEG_Y]-sy);
	for (var i = SEG_SIZE, end = data.length; i < end; i += SEG_SIZE) {
		ctx.lineTo(data[i+SEG_X]-sx+0.5, data[i+SEG_Y]-sy+0.5);
	}
};

Tentacle.prototype.gibify = function(game) {
	var stride = (Math.floor(this.numPoints / 5))*SEG_SIZE;
	for (var i = 0; i < this.data.length; i += stride) {
		if (game.isBlocked(this.data[i+SEG_X], this.data[i+SEG_Y])) {
			continue;
		}
		var gib = new Gib(game, this.data[i+SEG_X], this.data[i+SEG_Y], true);
		gib.vx += this.data[i+SEG_VX]/2.0;
		gib.vy += this.data[i+SEG_VY]/2.0;
		game.addEffect(gib);
	}
};
Tentacle.prototype.makeRedder = function() {
	var r = this.color & 0xff;
	r = clamp(r + Math.ceil(Math.random() * 4), 0, 0xff);
	this.color = (this.color & 0xffffff00)|r;
};
Tentacle.prototype.drawOnPixels = function(pixels, sx, sy, color) {
	var data = this.data;

	var px = data[SEG_X];
	var py = data[SEG_Y];

	var minXSeen = pixels.bounds.minX;
	var minYSeen = pixels.bounds.minY;
	var maxXSeen = pixels.bounds.maxX;
	var maxYSeen = pixels.bounds.maxY;

	for (var i = SEG_SIZE, end = data.length; i < end; i += SEG_SIZE) {
		var nx = data[i+SEG_X];
		var ny = data[i+SEG_Y];
		var startX = Math.round(px-sx);
		var startY = Math.round(py-sy);
		var endX = Math.round(nx-sx);
		var endY = Math.round(ny-sy);
		bresenham(startX, startY, endX, endY, pixels, color);


		minXSeen = Math.min(minXSeen, startX, endX);
		minYSeen = Math.min(minYSeen, startY, endY);

		maxXSeen = Math.max(maxXSeen, startX, endX);
		maxYSeen = Math.max(maxYSeen, startY, endY);

		px = nx;
		py = ny;
	}
	pixels.bounds.minX = minXSeen;
	pixels.bounds.minY = minYSeen;
	pixels.bounds.maxX = maxXSeen;
	pixels.bounds.maxY = maxYSeen;

};

function Monster(game) {
	this.vx = 0;
	this.vy = 0;
	this.timer = new Timer();

	this.hp = 100;
	this.maxHp = 100;
	this.active = true;

	this.deathTimer = 0;

	this.blinkTime = 0;
	this.blinking = false;

	this.x = 0;
	this.y = 0;
	this.rx = 0
	this.ry = 0;

	this.hitTimer = 0;

	this.sprites = Assets.images.sprites;
	this.tentacles = [];
	this.setSize(2);
	this.game = game;
	this.invincibleTimer = 0;
}

mixin(Monster, Movable);

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
	Monster.SizeData.forEach(function(size, i) {
		var spriteInfo = size.sprites;

		var sx = spriteInfo.x + spriteInfo.width*5;
		var sy = spriteInfo.y;

		var sh = spriteInfo.height;
		var sw = spriteInfo.width;

		for (var y = 0; y < sh; ++y) {
			for (var x = 0; x < sw; ++x) {
				var px = sx + x;
				var py = sy + y;
				var pixel = pixels[px + py * pixelWidth];
				if ((pixel & 0xff000000) !== 0) {
					size.tentaclePositions.push({x: x-spriteInfo.width/2, y: y-spriteInfo.height/2});
				}
			}
		}
	});
}

Monster.prototype.hurtFor = function(amt) {
	if (this.invincibleTimer > 0) {
		return;
	}
	if (this.hitTimer > 0) {
		this.hitTimer--;
		return;
	}
	this.game.camera.screenShake(Math.ceil(amt/2));
	NaNCheck(amt);
	this.hitTimer = 20;
	this.hp -= amt;
	this.bloodyTentacles(amt);

	if (this.hp < 0) {
		this.hp = 0;
	}
	Assets.sounds.ouch.play();
	if (this.hp === 0) {
		this.die();
	}
	else {
		if (!this.blinking) {
			this.blinking = true;
			// this.blinkTime = 0;
		}
	}
};

Monster.prototype.die = function() {
	this.dead = true;
	this.deathTimer = 120;
	Assets.sounds.playerDie.play();
	for (var i = 0; i < 30; ++i) {
		var ox = Math.random() * this.width - this.width/2;
		var oy = Math.random() * this.height - this.height / 2;
		this.game.addEffect(new Gib(this.game, this.x+ox, this.y+oy, true));
	}
	for (var i = 0; i < this.tentacles.length; ++i) {
		this.tentacles[i].gibify(this.game);
	}
};

//
Monster.prototype.blockCheck = function(x, y) {
	return (
		this.game.isBlocked(x-this.rx, y-this.ry) ||
		this.game.isBlocked(x-this.rx, y+this.ry) ||
		this.game.isBlocked(x-this.rx, y) ||
		this.game.isBlocked(x+this.rx, y-this.ry) ||
		this.game.isBlocked(x+this.rx, y+this.ry) ||
		this.game.isBlocked(x+this.rx, y) ||
		this.game.isBlocked(x, y-this.ry) ||
		this.game.isBlocked(x, y+this.ry) ||
		this.game.isBlocked(x, y)
	);
};
// @HACK
Monster.prototype.spikeCheck = function(x, y) {
	return (
		this.game.isSpikeTile(x-this.rx, y-this.ry) ||
		this.game.isSpikeTile(x-this.rx, y+this.ry) ||
		this.game.isSpikeTile(x-this.rx, y) ||
		this.game.isSpikeTile(x+this.rx, y-this.ry) ||
		this.game.isSpikeTile(x+this.rx, y+this.ry) ||
		this.game.isSpikeTile(x+this.rx, y) ||
		this.game.isSpikeTile(x, y-this.ry) ||
		this.game.isSpikeTile(x, y+this.ry) ||
		this.game.isSpikeTile(x, y)
	);
};

Monster.prototype.setPosition = function(x, y) {
	this.x = x;
	this.y = y;
	for (var i = 0; i < this.tentacles.length; ++i) {
		this.tentacles[i].setPosition(x, y);
	}
}

Monster.prototype.setSize = function(l) {
	this.size = l;
	var sizeData = Monster.SizeData[l];
	this.width = Monster.SizeData[l].sprites.width;
	this.rx = this.width/2;
	this.height = Monster.SizeData[l].sprites.height;
	this.ry = this.height/2;

	this.sprite = 0;
	this.tentacles.length = 0;

	for (var i = 0; i < sizeData.tentaclePositions.length; ++i) {
		var numPoints = Math.floor(l * 5 + 5 * Math.random() + 20);
		this.tentacles.push(new Tentacle(numPoints, sizeData.tentaclePositions[i].x, sizeData.tentaclePositions[i].y, this));
		if (Math.random() < 0.1) {
			this.tentacles.push(new Tentacle(numPoints, sizeData.tentaclePositions[i].x, sizeData.tentaclePositions[i].y, this));
		}
	}
};

Monster.prototype.update = function() {


	if (this.dead) {
		--this.deathTimer;
		if (this.deathTimer === 0) {
			if (this.size === 0) {
				Engine.gameOver();
			}
			else {
				this.setSize(this.size-1);
				this.dead = false;
				this.hp = this.maxHp = 100;
				this.invincibleTimer = 120;
			}
		}
		return;
	}
	this.timer.update();
	if (Math.random() < 0.01 && this.timer.testOrSet('blink', 240)) {
		this.blinking = true;
	}

	if (this.blinking) {
		++this.blinkTime;
		if (this.blinkTime >= 20) {
			this.blinkTime = 0;
			this.blinking = false;
		}
	}

	if (this.invincibleTimer > 0) {
		--this.invincibleTimer;
	}
	if (this.hitTimer > 0) {
		--this.hitTimer;
	}
	else {
		// if (this.hp < this.maxHp) {
			//this.hp += 0.05;
		// }
	}
	this.move();
	for (var i = 0; i < this.tentacles.length; ++i) {
		this.tentacles[i].parentMoved(this.x, this.y);
		this.tentacles[i].update();
	}
};

Monster.speed = 1/10;
Monster.drag = 0.98;

Monster.prototype.move = function() {
	var ddx = 0;
	var ddy = 0;
	//if (this.hitTimer === 0)
	{
		if (Input.keys.left.down) {
			ddx--;
		}
		if (Input.keys.right.down) {
			ddx++;
		}
		if (Input.keys.down.down) {
			ddy++;
		}
		if (Input.keys.up.down) {
			ddy--;
		}

	}

	// var ddy = 0;
	// if (Input.keys.up.pressed) {
	// 	ddy--;
	// }


	ddx *= Monster.speed;
	ddy *= Monster.speed;// Monster.jumpPower;

	//ddy += Monster.gravity; // gravity
	this.vx += ddx;
	this.vy += ddy;
	this.vx *= Monster.drag;
	this.vy *= Monster.drag;

	this.doMove();

};

Monster.prototype.collide = function(dx, dy) {
	if (dx !== 0) this.vx = 0;
	if (dy !== 0) this.vy = 0;

	var nx = this.x + dx;
	var ny = this.y + dy;

	if (this.spikeCheck(nx, ny)){
		if (this.hitTimer === 0) {
			console.log("hurt: spike");
			this.hurtFor(10);
			if (dx !== 0) this.vx = -dx*3;
			if (dy !== 0) this.vy = -dy*3;
		}
	}
};

Monster.prototype.spriteX = function() {
	var sizeData = Monster.SizeData[this.size]
	var sprite = this.sprite;
	var blinkTime = this.blinkTime>>1;
	if (blinkTime > 5) {
		blinkTime = 10 - blinkTime;
	}
	else {
		blinkTime = blinkTime;
	}
	sprite += blinkTime;

	return sprite * sizeData.sprites.width;
};

Monster.prototype.spriteY = function() {
	var sizeData = Monster.SizeData[this.size];
	return sizeData.sprites.y;
};

Monster.prototype.bloodyTentacles = function(amount) {
	if (!amount) {
		amount = 1;//Math.ceil(Math.random() * 5 + 5);
	}

	for (var i = 0; i < amount; ++i) {
		this.tentacles[(Math.random()*this.tentacles.length)|0].makeRedder();
	}
};

Engine.Monster = Monster;

function PixelBuffer(w, h) {
	this.width = w;
	this.height = h;
	this.canvas = document.createElement('canvas');
	this.context = this.canvas.getContext('2d')

	this.canvas.width = w;
	this.canvas.height = h;
	this.imageData = this.context.createImageData(w, h);
	this.bounds = { minX: w, maxX: 0, minY: h, maxY: 0 };
	this.pixels = new Uint32Array(this.imageData.data.buffer);
	this.trackBounds = false;
}

PixelBuffer.prototype.reset = function() {
	this.bounds.minX = this.width;
	this.bounds.maxX = 0;
	this.bounds.minY = this.height;
	this.bounds.maxY = 0;
	for (var i = 0; i < this.pixels.length; ++i) {
		this.pixels[i] = 0;
	}
};

PixelBuffer.prototype.update = function() {
	this.context.clearRect(0, 0, this.width, this.height);
	this.context.putImageData(this.imageData, 0, 0);
};

PixelBuffer.prototype.putPixel = function(x, y, c) {
	if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
		this.pixels[x+y*this.width] = c;
		if (this.trackBounds) {
			this.minX = Math.min(this.minX, x);
			this.maxX = Math.max(this.maxX, x);
			this.minY = Math.min(this.minY, y);
			this.maxY = Math.max(this.maxY, y);
		}
	}
};

function Timer() {
	this.items = [];
}

Timer.prototype.find = function(name) {
	for (var i = 0; i < this.items.length; ++i) {
		if (this.items[i].name === name) {
			return i;
		}
	}
	return -1;
};

Timer.prototype.test = function(name) {
	var idx = this.find(name);
	if (idx < 0) {
		return true;
	}
	return this.items[idx].delay > 0;
};

Timer.prototype.testOrSet = function(name, delay) {
	var idx = this.find(name);
	if (idx < 0) {
		this.items.push({delay: delay, name: name});
		return true;
	}
	return false;
};

Timer.prototype.set = function(name, delay) {
	var idx = this.find(name);
	if (idx < 0) {
		this.items.push({delay: delay, name: name});
	}
	else {
		this.items[idx].delay = delay;
	}
};

Timer.prototype.clear = function(name) {
	if (!name) {
		this.items.length = 0;
	}
	else {
		var idx = this.find(name);
		if (idx >= 0) {
			this.items[idx] = this.items[this.items.length-1];
			this.items.pop();
		}
	}
};

Timer.prototype.update = function(name) {
	if (!name) {
		var j = 0;
		for (var i = 0; i < this.items.length; ++i) {
			this.items[i].delay--;
			if (this.items[i].delay > 0) {
				this.items[j++] = this.items[i];
			}
		}
		this.items.length = j;
	}
	else {
		var idx = this.find(name);
		if (idx >= 0) {
			this.items[idx].delay--;
			if (this.items[idx].delay <= 0) {
				this.items[idx] = this.items[this.items.length-1];
				this.items.pop();
			}
		}
	}
};

Engine.Timer = Timer;

function Camera(game) {
	this.game = game;
	// this.xBound = game.columns * TileSize;
	// this.yBound = game.rows * TileSize;
	this.focus = this.game.player;
	this.width = Engine.screenWidth / Engine.scale;
	this.height = Engine.screenHeight / Engine.scale;
	this.minX = 0;
	this.maxX = 0;
	this.minY = 0;
	this.maxY = 0;

	this.x = this.focus.x;
	this.y = this.focus.y;
}

Camera.lookahead = 1.2;
Camera.speed = 3.5;

Camera.prototype.screenShake = function(amt) {
	if (!amt) {
		amt = 4;
	}
	var ox, oy;
	do {
		ox = Math.random() * 2 - 1;
		oy = Math.random() * 2 - 1;
	} while (ox*ox+oy*oy > 1);
	ox *= amt;
	oy *= amt;
	this.setPosition(this.x+ox, this.y+oy);
};

Camera.prototype.xBound = function() {
	return this.game.columns*TileSize;
};

Camera.prototype.yBound = function() {
	return this.game.rows*TileSize;
};


Camera.prototype.update = function() {
	var cx = this.x;
	var cy = this.y;

	var fx = this.focus.x;
	var fy = this.focus.y;

	var fvx = this.focus.vx;
	var fvy = this.focus.vy;

	var gx = fx + fvx * Camera.lookahead;
	var gy = fy + fvy * Camera.lookahead;

	if (Input.mouse.button.down) {
		var mwx = Input.mouse.worldX;
		var mwy = Input.mouse.worldY;

		var frx = mwx - this.focus.x;
		var fry = mwy - this.focus.y;

		gx += frx / 3.0;
		gy += fry / 3.0;
	}
	gx = clamp(gx, this.width/2, this.xBound()-this.width/2);
	gy = clamp(gy, this.height/2, this.yBound()-this.height/2);

	var nx = gx - cx;
	var ny = gy - cy;

	var relax = 1.0 - Math.exp(-Camera.speed*Engine.deltaTime);

	nx = this.x + nx*relax;
	ny = this.y + ny*relax;

	this.setPosition(nx, ny);

};

Camera.prototype.isInView = function(l, r, t, b) {
	return !(r < this.minX || l > this.maxX || b < this.minY || t > this.maxY);
};

Camera.prototype.canSee = function(ent) {
	return this.isInView(ent.x-ent.rx, ent.x+ent.rx, ent.y-ent.ry, ent.y+ent.ry);
};

Camera.prototype.setPosition = function(nx, ny) {
	this.x = clamp(nx, this.width/2, this.xBound()-this.width/2);
	this.y = clamp(ny, this.height/2, this.yBound()-this.height/2);

	this.minX = this.x-this.width/2;
	this.minY = this.y-this.height/2;

	this.maxX = this.minX+this.width;
	this.maxY = this.minY+this.height;
	// @HACK: prevent camera from not containing player...
	if (this.focus.x - this.focus.rx < this.minX) {
		this.minX = this.focus.x-this.focus.rx;
		this.x = this.minX + this.width/2;
		this.maxX = this.minX + this.width;
	}

	if (this.focus.y - this.focus.ry < this.minY) {
		this.minY = this.focus.y-this.focus.ry;
		this.y = this.minY + this.height/2;
		this.maxY = this.minY + this.height;
	}

	if (this.focus.x + this.focus.rx > this.maxX) {
		this.maxX = this.focus.x + this.focus.rx;
		this.x = this.maxX - this.width/2;
		this.minX = this.maxX - this.width;
	}

	if (this.focus.y + this.focus.ry > this.maxY) {
		this.maxY = this.focus.y + this.focus.ry;
		this.y = this.maxY - this.height/2;
		this.minY = this.maxY - this.height;
	}
};

Engine.Camera = Camera;

function Tile(type) {
	this.type = type;
	this.sprite = (Math.random() * 4)|0;
	this.rotation = 0;
	this.variant = 0;
	this.sx = 1;
	this.sy = 1;
}

Tile.fixUpTileArray = function(tiles, columns, rows) {
	var U = 0x1;
	var D = 0x2;
	var L = 0x4;
	var R = 0x8;
	for (var y = 0; y < rows; ++y) {
		for (var x = 0; x < columns; ++x) {
			var t = tiles[x+y*columns];

			if (t.type === 0) {
				continue;
			}

			var u = y === 0         ? 1 : tiles[x+(y-1)*columns].type;
			var d = y === rows-1    ? 1 : tiles[x+(y+1)*columns].type;
			var r = x === columns-1 ? 1 : tiles[(x+1)+y*columns].type;
			var l = x === 0         ? 1 : tiles[(x-1)+y*columns].type;

			var mask = 0;

			if (u) mask |= U;
			if (d) mask |= D;
			if (l) mask |= L;
			if (r) mask |= R;

			switch (mask) {
				case 0: t.rotation = Math.floor(Math.random()*4); t.variant = 5; break;

				case U: t.rotation = 3; t.variant = 4; /*t.sy = Math.random() < 0 ? -1 : 1;*/ break;
				case D: t.rotation = 1; t.variant = 4; /*t.sy = Math.random() < 0 ? -1 : 1;*/ break;
				case L: t.rotation = 2; t.variant = 4; /*t.sx = Math.random() < 0 ? -1 : 1;*/ break;
				case R: t.rotation = 0; t.variant = 4; /*t.sx = Math.random() < 0 ? -1 : 1;*/ break;

				case U|D: t.rotation = (Math.random() < 0.5 ? 1 : 3); t.variant = 3; /*t.sx = Math.random() < 0 ? -1 : 1;*/ break;
				case L|R: t.rotation = (Math.random() < 0.5 ? 0 : 2); t.variant = 3; /*t.sy = Math.random() < 0 ? -1 : 1;*/ break;

				case U|R: t.rotation = 3; t.variant = 2; break;
				case U|L: t.rotation = 2; t.variant = 2; break;
				case D|R: t.rotation = 0; t.variant = 2; break;
				case D|L: t.rotation = 1; t.variant = 2; break;

				case D|L|R: t.rotation = 0; t.variant = 0; break;
				case U|L|R: t.rotation = 2; t.variant = 0; break;
				case U|D|R: t.rotation = 3; t.variant = 0; break;
				case U|D|L: t.rotation = 1; t.variant = 0; break;

				case U|D|L|R: t.rotation = Math.floor(Math.random()*4); t.variant = 1; break;

				default: Assert(false, "unreachable"); break;
			}
		}
	}
};

Engine.Tile = Tile;

function Game() {
	this.player = new Monster(this);
	this.effects = [];
	this.entities = [];
	this.tiles = [];

	// this.addEntity(new Copter(this, 25*TileSize, 25*TileSize));


	// @TODO: this belongs in a separate renderer
	var vpwidth = Engine.screenWidth / Engine.scale;
	var vpheight = Engine.screenHeight / Engine.scale;

	this.viewportWidth = vpwidth;
	this.viewportHeight = vpheight;

	this.tentacleBuffer = new PixelBuffer(vpwidth, vpheight);
	this.effectBuffer = new PixelBuffer(vpwidth, vpheight);
	this.effectBuffer.trackBounds = false;
	this.camera = new Camera(this);
	BloodSystem.setGame(this);
	// this.bloodSplatCanvas = document.createElement('canvas');
	// this.bloodSplatContext = this.bloodSplatCanvas.getContext('2d');
	// this.entityPosFeedback = new Uint8Array(this.viewportWidth*this.viewportHeight);

	this.loadLevel(0);
}

Game.Levels = [
	{imageName: 'l1'},
	{imageName: 'l2'},
	{imageName: 'l3'},
	{imageName: 'l4'},
	{imageName: 'l5'}
];

Game.prototype.loadLevel = function(levelNum) {
	this.levelNum = levelNum;
	var tiles = Assets.images[Game.Levels[levelNum].imageName];
	var pixelData = tiles.getPixelData();

	this.columns = pixelData.width;
	this.rows = pixelData.height;

	var pix = pixelData.pixels;
	var length = this.columns*this.rows;

	this.tiles.length = length;
	this.effects.length = 0;
	this.entities.length = 0;

	// this.bloodSplatCanvas.width = this.rows*TileSize;
	// this.bloodSplatCanvas.height = this.columns*TileSize;
	// this.bloodSplatContext.imageSmoothingEnabled = false;
	// this.bloodSplatContext.mozImageSmoothingEnabled = false;
	// this.bloodSplatContext.webkitImageSmoothingEnabled = false;
	// this.bloodSplatContext.clearRect(0, 0, this.bloodSplatCanvas.width, this.bloodSplatCanvas.height);
	// this.bloodSplatContext.globalAlpha = 0.05;
	// this.bloodSplatContext.globalCompositeOperation = 'screen'

	for (var i = 0; i < length; ++i) {
		var x = i % this.columns;
		var y = Math.floor(i / this.columns);

		if (pix[i] === 0xff000000) {
			this.tiles[i] = new Tile(1);
		}
		else if (pix[i] === 0xff808080) {
			this.tiles[i] = new Tile(2);
		}
		else if (pix[i] === 0xff0000ff) {
			this.tiles[i] = new Tile(3);
		}
		else {
			this.tiles[i] = new Tile(0);
			if (pix[i] === 0xffffffff) {
				this.player.setPosition(x*TileSize, y*TileSize)
			}
			else if (pix[i] === 0xffff00ff) {
				this.addEntity(new Copter(this, x*TileSize, y*TileSize));
			}
			else if (pix[i] === 0xffff0000) {
				this.addEntity(new Exit(this, x*TileSize, y*TileSize));
			}
		}
	}

	Tile.fixUpTileArray(this.tiles, this.columns, this.rows)
};

Game.prototype.wonLevel = function() {
	Assets.sounds.winlevel.play();
	if (this.levelNum+1 >= Game.Levels.length) {
		Engine.wonGame();
	}
	else {
		if (this.player.size < 2) {
			this.player.setSize(this.player.size+1);
		}
		this.player.hp = this.player.maxHp;
		this.loadLevel(this.levelNum+1);
	}
}

Engine.Game = Game;

Game.prototype.addEffect = function(e) {
	if (e instanceof ExitParticle || this.camera.canSee(e)) {
		this.effects.push(e);
	}
};

Game.prototype.updateArray = function(arr, isEffects) {
	for (var i = 0; i < arr.length; ++i) {
		arr[i].update();
		if (isEffects && !(arr[i] instanceof ExitParticle || this.camera.canSee(arr[i]))) {
			arr[i].active = false;
		}
	}

	var j = 0;
	for (i = 0; i < arr.length; ++i) {
		if (arr[i].active) {
			arr[j++] = arr[i];
		}
	}
	arr.length = j;
};

Game.prototype.addSmoke = function(x, y) {
	var numClouds = Math.ceil(Math.random()*3);
	for (var i = 0; i < numClouds; ++i) {
		var ox = Math.round(Math.random()-0.5)*8;
		var oy = Math.round(Math.random()-0.5)*8;
		this.addEffect(new Smoke(this, x+ox, y+oy));
	}
}

Game.prototype.update = function() {
	this.player.update();

	this.updateArray(this.effects, true);
	BloodSystem.update();
	BloodSystem.clearDead();
	this.updateArray(this.entities, false);


	this.camera.update();
};

Game.prototype.isBlocked = function(x, y) {
	x = Math.round(x/TileSize-0.5);
	y = Math.round(y/TileSize-0.5);
	return this.getTile(x|0, y|0) !== 0;
};

Game.prototype.isSpikeTile = function(x, y){
	x = Math.round(x/TileSize-0.5);
	y = Math.round(y/TileSize-0.5);
	return this.getTile(x|0, y|0) === 3;
};

Game.prototype.getTile = function(x, y) {
	if (y < 0 || y >= this.rows || x < 0 || x >= this.columns) {
		return -1;
	}
	return this.tiles[x+y*this.columns].type;
};

Game.prototype.getTileInfo = function(x, y) {
	if (y < 0 || y >= this.rows || x < 0 || x >= this.columns) {
		return null;
	}
	return this.tiles[x+y*this.columns];
};

Game.prototype.addEntity = function(e) {
	this.entities.push(e);
};

Game.prototype.tentacleTouched = function(x, y, rw, rh) {
	var left = x-rw;
	var right = x+rw;
	var top = y-rh;
	var bottom = y+rh;
	if (right < this.camera.minX || left > this.camera.maxX || bottom < this.camera.minY || top > this.camera.maxY) {
		return false;
	}
	// move to screenspace
	var ls = Math.round(left - this.camera.minX);
	var rs = Math.round(right - this.camera.minX);
	var ts = Math.round(top - this.camera.minY);
	var bs = Math.round(bottom - this.camera.minY);

	var tbuf = this.tentacleBuffer;
	var bbox = tbuf.bounds;

	if (rs < bbox.minX || ls > bbox.maxX || bs < bbox.minY || ts > bbox.maxY) {
		return false;
	}

	if (ls < 0) {
		ls = 0;
	}
	if (ts < 0) {
		ts = 0
	}
	if (rs >= this.viewportWidth) {
		rs = this.viewportWidth-1;
	}
	if (bs >= this.viewportHeight) {
		bs = this.viewportHeight-1;
	}

	var width = this.viewportWidth;
	for (var y = ts; y <= bs; ++y) {
		for (var x = ls; x <= rs; ++x) {
			if (tbuf.pixels[x+y*width] !== 0) {
				this.player.bloodyTentacles();
				return true;
			}
		}
	}
	return false;
};

Game.prototype.explosionCheck = function(e, x, y, dmg, r) {
	var dx = e.x - x;
	var dy = e.y - y;
	if (dx*dx + dy*dy < r*r) {
		var len = Math.sqrt(dx*dx+dy*dy);
		dx /= len;
		dy /= len;
		len /= r;
		var falloff = (1.0 - len)/2 + 0.5;
		falloff /= 2;
		if (e === this.player) console.log("hurt: explode");
		e.hurtFor(Math.max(Math.floor(dmg*falloff), 1));
		e.vx += dx * 5 * (1 - len);
		e.vy += dy * 5 * (1 - len);
	}
}

Game.prototype.explode = function(x, y, dmg, radius) {
	if (dmg == null) {
		dmg = 10;
	}
	if (radius == null) {
		radius = 24;
	}

	for (var i = 0; i < this.entities.length; ++i) {
		var e = this.entities[i];
		if (!e.active) {
			continue;
		}
		if (e instanceof Copter) {
			this.explosionCheck(e, x, y, dmg/4, radius/2);
		}
	}
	this.addEffect(new Explosion(this, x, y))
};

Game.prototype.render = function(ctx, canvas) {

	var minX = this.camera.minX;
	var maxX = this.camera.maxX;
	var minY = this.camera.minY;
	var maxY = this.camera.maxY;

	var cardinalRotations = Assets.images.tiles.getCardinalRotations(TileSize, TileSize);

	Input.setBounds(minX, minY);

	var iMinX = Math.round(minX);
	var iMinY = Math.round(minY);

	var parallaxX = minX / 5;
	var parallaxY = minY / 5;
	var backdropSize = 128;

	var backdropsX = 2+Math.floor(this.camera.width/backdropSize);
	var backdropsY = 2+Math.floor(this.camera.height/backdropSize);
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	for (var by = 0; by < backdropsY; ++by) {
		for (var bx = 0; bx < backdropsX; ++bx) {
			ctx.drawImage(
				Assets.images.backdrop.image,
				bx*backdropSize-parallaxX,
				by*backdropSize-parallaxY);
		}
	}
	//ctx.drawImage(this.bloodSplatCanvas, -parallaxX, -parallaxY);


	var minTileX = Math.floor(minX / TileSize)-1;
	var minTileY = Math.floor(minY / TileSize)-1;

	var maxTileX = Math.ceil(maxX / TileSize)+1;
	var maxTileY = Math.ceil(maxY / TileSize)+1;

	//ctx.fillStyle = '#43596d';
	//ctx.fillRect(0, 0, canvas.width, canvas.height);


	for (var tileY = minTileY; tileY <= maxTileY; ++tileY) {
		for (var tileX = minTileX; tileX <= maxTileX; ++tileX) {
			var tile = this.getTileInfo(tileX, tileY);
			if (tile == null || tile.type === 0) {
				continue;
			}
			var tileSpriteX = tile.sprite + (tile.type-1)*4;
			var tileSpriteY = tile.variant;
			ctx.drawImage(cardinalRotations[tile.rotation],
				tileSpriteX*TileSize,
				tileSpriteY*TileSize,
				TileSize, TileSize,
				tileX * TileSize - iMinX,
				tileY * TileSize - iMinY,
				TileSize,
				TileSize
			);
		}
	}

	if (!this.player.dead && ((this.player.invincibleTimer & 1) === 0)) {

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

		var tentacleColor = this.player.hitTimer === 0 ? 0xff103031 : 0xff72dfff;

		var tentacles = this.player.tentacles;

		var tentaclePixels = this.tentacleBuffer;
		tentaclePixels.reset();

		for (var i = 0, len = tentacles.length; i < len; ++i) {
			tentacles[i].drawOnPixels(this.tentacleBuffer, minX, minY, this.player.hitTimer === 0 ? tentacles[i].color : 0xff72dfff);
		}

		{
			var outlineColor = 0xff000000;
			var tMinX = Math.max((tentaclePixels.bounds.minX-1)|0, 0);
			var tMinY = Math.max((tentaclePixels.bounds.minY-1)|0, 0);
			var tMaxX = Math.min((tentaclePixels.bounds.maxX+1)|0, tentaclePixels.width-1);
			var tMaxY = Math.min((tentaclePixels.bounds.maxY+1)|0, tentaclePixels.height-1);
			var pix32 = tentaclePixels.pixels;
			var tpixW = tentaclePixels.width;
			var tpixH = tentaclePixels.height;
			for (var ty = tMinY; ty <= tMaxY; ++ty) {
				for (var tx = tMinX; tx <= tMaxX; ++tx) {
					var pixel = pix32[(tx+0) + (ty+0) * tpixW];

					if (pixel !== 0 && pixel !== 0xffff00ff) {
						continue;
					}
					//var tocol = //pixel === 0xffff00ff ? tentacleColor-1 : outlineColor;
					if (ty+1 < tpixH && pix32[(tx+0) + (ty+1) * tpixW] !== 0 && pix32[(tx+0) + (ty+1) * tpixW] !== outlineColor) {
						pix32[(tx+0) + (ty+0) * tpixW] = outlineColor;
					}
					else if (ty-1 >= 0 && pix32[(tx+0) + (ty-1) * tpixW] !== 0 && pix32[(tx+0) + (ty-1) * tpixW] !== outlineColor) {
						pix32[(tx+0) + (ty+0) * tpixW] = outlineColor;
					}
					else if (tx-1 >= 0 && pix32[(tx-1) + (ty+0) * tpixW] !== 0 && pix32[(tx-1) + (ty+0) * tpixW] !== outlineColor) {
						pix32[(tx+0) + (ty+0) * tpixW] = outlineColor;
					}
					else if (tx+1 < tpixW && pix32[(tx+1) + (ty+0) * tpixW] !== 0 && pix32[(tx+1) + (ty+0) * tpixW] !== outlineColor) {
						pix32[(tx+0) + (ty+0) * tpixW] = outlineColor;
					}
				}
			}
		}

		tentaclePixels.update();
		// this.tentacleLayerContext.clearRect(0, 0, this.tentacleLayer.width, this.tentacleLayer.height);
		// this.tentacleLayerContext.putImageData(this.tentaclePixels.imageData, 0, 0);

		ctx.drawImage(tentaclePixels.canvas, 0, 0);


		if (this.player.hitTimer !== 0) {

			var alpha = 1.0-Math.abs(this.player.hitTimer-10.0)/10.0;

			var oldAlpha = ctx.globalAlpha;
			ctx.globalAlpha = alpha;
			ctx.drawImage(
				Assets.images.sprites.image,

				//@TODO: hack
				this.player.width*6,
				this.player.spriteY(),
				this.player.width,
				this.player.height,

				Math.round(this.player.x - minX - this.player.width/2),
				Math.round(this.player.y - minY - this.player.height/2),
				this.player.width,
				this.player.height
			);

			ctx.globalAlpha = oldAlpha;
		}
	}

	this.effectBuffer.reset();

	for (var fxi = 0; fxi < this.effects.length; ++fxi) {
		if (this.camera.canSee(this.effects[fxi])) {
			this.effects[fxi].render(ctx, minX, minY, this.effectBuffer);
		}
	}
	BloodSystem.render(ctx, minX, minY, this.effectBuffer);

	for (var ei = 0; ei < this.entities.length; ++ei) {
		this.entities[ei].render(ctx, minX, minY, this.effectBuffer);
	}

	this.effectBuffer.update();
	//this.bloodSplatContext.drawImage(this.effectBuffer.canvas, parallaxX, parallaxY);
	ctx.drawImage(this.effectBuffer.canvas, 0, 0);
}

var PARTICLE_X = 0;
var PARTICLE_Y = 1;
var PARTICLE_VX = 2;
var PARTICLE_VY = 3;
var PARTICLE_LIFE = 4;
var PARTICLE_SIZE = 5;

function ParticleSystem(options) {
	Object.keys(ParticleSystem.defaults).forEach(function(option) {
		if (!(option in options)) {
			options[option] = ParticleSystem.defaults[option];
		}
	});
	this.options = options;

	this.rx = +options.rx;
	this.ry = +options.ry;
	this.game = null;

	this.gravity = +options.gravity;
	this.drag = +options.drag;
	this.bounce = +options.bounce;

	this.minLife = +options.minLife;
	this.maxLife = +options.maxLife;

	this.vxMul = +options.vxMul;
	this.vyMul = +options.vyMul;

	this.maxParticles = (options.maxParticles|0);

	this.particles = new Float32Array(this.maxParticles * PARTICLE_SIZE);

	this.particleCount = 0;
	this.nextParticleIndex = 0;
}

Engine.ParticleSystem = ParticleSystem;

ParticleSystem.defaults = {
	rx: 2,
	ry: 2,
	gravity: 0.08,
	drag: 0.998,
	bounce: 0.6,
	minLife: 20,
	maxLife: 60,
	vxMul: 1.0,
	vyMul: 2.0,
	maxParticles: 512,
};
ParticleSystem.prototype.setGame = function(g) {
	this.game = g;
}


ParticleSystem.prototype.add = function(x, y) {
	var index = this.nextParticleIndex++;
	if (this.nextParticleIndex === this.maxParticles) {
		this.nextParticleIndex = 0;
	}
	this.particleCount++;
	if (this.particleCount >= this.maxParticles) {
		this.particleCount = this.maxParticles;
	}
	index *= PARTICLE_SIZE;
	this.particles[index+PARTICLE_X] = x;
	this.particles[index+PARTICLE_Y] = y;
	var vx = 0.0;
	var vy = 0.0;
	do {
		vx = (Math.random() - 0.5) * 2.0;
		vy = (Math.random() - 0.5) * 2.0;
	} while (vx * vx + vy * vy > 1);

	var size = Math.sqrt(vx*vx+vy*vy);

	vx = this.vxMul*(vx/size);
	vy = this.vyMul*(vy/size);

	this.particles[index+PARTICLE_VX] = vx;
	this.particles[index+PARTICLE_VY] = vy;
	this.particles[index+PARTICLE_LIFE] = this.minLife + Math.random()*(this.maxLife - this.minLife);
	return index;
};

ParticleSystem.prototype.update = function() {
	var end = Math.min(this.maxParticles, this.particleCount)*PARTICLE_SIZE;
	var particles = this.particles;
	var drag = +this.drag;
	var grav = +this.gravity;
	var game = this.game;
	var bounce = this.bounce;
	for (var i = 0; i < end; i += PARTICLE_SIZE) {
		particles[i+PARTICLE_LIFE] -= 1.0;
		if (particles[i+PARTICLE_LIFE] <= 0.0) {
			continue;
		}
		particles[i+PARTICLE_VX] *= drag;
		particles[i+PARTICLE_VY] += grav;

		var vx = particles[i+PARTICLE_VX];
		var vy = particles[i+PARTICLE_VY];

		var x = particles[i+PARTICLE_X];
		var y = particles[i+PARTICLE_Y];

		var steps = Math.ceil(Math.sqrt(vx*vx + vy*vy));
		for (var step = 0; step < steps; ++step) {
			var nx = x + vx / steps;
			if (game.isBlocked(nx, y)) {
				vx *= -bounce;
			}
			else {
				x = nx;
			}

			var ny = y + vy / steps;
			if (game.isBlocked(x, ny)) {
				vy *= -bounce;
			}
			else {
				y = ny;
			}
		}
		particles[i+PARTICLE_VX] = vx;
		particles[i+PARTICLE_VY] = vy;
		particles[i+PARTICLE_X] = x;
		particles[i+PARTICLE_Y] = y;
	}
};

ParticleSystem.prototype.clearDead = function() {
	var end = Math.min(this.maxParticles, this.particleCount)*PARTICLE_SIZE;
	var j = 0;
	var newCount = 0;
	var particles = this.particles;
	for (var i = 0; i < end; i += PARTICLE_SIZE) {
		if (particles[i+PARTICLE_LIFE] > 0) {
			particles[j+PARTICLE_X] = particles[i+PARTICLE_X];
			particles[j+PARTICLE_Y] = particles[i+PARTICLE_Y];
			particles[j+PARTICLE_VX] = particles[i+PARTICLE_VX];
			particles[j+PARTICLE_VY] = particles[i+PARTICLE_VY];
			particles[j+PARTICLE_LIFE] = particles[i+PARTICLE_LIFE];
			j += PARTICLE_SIZE;
			newCount++;
		}
	}
	this.particleCount = newCount;
	this.nextParticleIndex = newCount >= this.maxParticles ? 0 : newCount;
};


function Particle(game, x, y) {
	this.game = game;
	this.active = true;

	this.x = x;
	this.y = y;

	this.rx = this.ry = 2;

	this.vx = 0;
	this.vy = 0;

	this.life = Math.floor(Math.random()*20)+40;
	this.bounce = 0.6;
	this.gravity = 0.08;
	this.drag = 0.998;
	do {
		this.vx = (Math.random() - 0.5) * 2.0;
		this.vy = (Math.random() - 0.5) * 2.0;
	} while (this.vx * this.vx + this.vy * this.vy > 1);

	var size = Math.sqrt(this.vx*this.vx+this.vy*this.vy);
	var speed = 1.0;

	var xSpeed = this.initialVxMul;
	var ySpeed = this.initialVyMul;

	this.vx = this.vx/size*xSpeed;
	this.vy = this.vy/size*ySpeed;

	this.sprite = -1;
}

Particle.prototype.initialVxMul = 1.0;
Particle.prototype.initialVyMul = 2.0;

Engine.Particle = Particle;

mixin(Particle, Movable);

Particle.prototype.update = function() {
	this.life--;
	if (this.life < 0) {
		this.active = false;
		return;
	}

	this.vx *= this.drag;
	this.vy += this.gravity;

	// var s = Math.ceil(Math.sqrt(this.vx*this.vx+this.vy*this.vy));
	// for (var i = 0; i < s; ++i)	{
	// 	var nx = this.vx / s;

	// 	if (this.game.hitTest(nx, y)) {
	// 		this.vx *= -this.bounce
	// 	}
	// 	else {
	// 		this.x = nx;
	// 	}
	// 	var ny = this.vy / s;
	// 	if (this.game.hitTest(x, ny)) {
	// 		this.vy *= -this.bounce
	// 	}
	// 	else {
	// 		this.y = ny;
	// 	}
	// }

	this.doMove();
};

Particle.prototype.collide = function(dx, dy) {
	if (dx !== 0) this.vx *= -this.bounce;
	if (dy !== 0) this.vy *= -this.bounce;
};

Particle.prototype.getColor = function() {
	return '#fbaf5d';
};

Particle.prototype.render = function(c, sx, sy) {
	var px = Math.round(this.x - sx)+0.5;
	var py = Math.round(this.y - sy)+0.5;
	if (this.sprite < 0) {
		c.fillStyle = this.getColor();
		c.fillRect(px-this.rx, py-this.ry, this.rx*2, this.ry*2);
	}
	else {
		var sx = this.sprite % 8;
		var sy = Math.floor(this.sprite / 8)+2;
		c.drawImage(
			Assets.images.misc.image,
			sx*8, sy*8, 8, 8,
			px-4, py-4, 8, 8);
	}
};

// function Blood(game, x, y) {
// 	Particle.call(this, game, x, y);
// 	this.rx = this.ry = 0.5;
// 	// this.color = '#a00000';
// 	this.sprite = -1;
// 	this.drag = 0.96;
// 	this.bounce = 0.1;
// }

// Blood.prototype = Object.create(Particle.prototype);
// Blood.prototype.constructor = Blood;
// Engine.Blood = Blood;

// Blood.prototype.blockCheck = function(x, y) {
// 	return this.game.isBlocked(x, y);
// };

// Blood.prototype.render = function(c, sx, sy, pix) {
// 	var px = Math.round(this.x - sx);
// 	var py = Math.round(this.y - sy);
// 	pix.putPixel(px, py, 0xff0000a0);
// }
var BloodSystem = new ParticleSystem({
	rx: 0.5,
	ry: 0.5,
	drag: 0.96,
	bounce: 0.1,
	maxParticles: 4096,
});

Engine.BloodSystem = BloodSystem;

BloodSystem.render = function(ctx, sx, sy, pix) {
	var end = Math.min(this.maxParticles, this.particleCount)*PARTICLE_SIZE;
	var particles = this.particles;
	var drag = +this.drag;
	var grav = +this.gravity;
	var game = this.game;

	var bloodColor = 0xff0000a0;
	var pixels = pix.pixels;
	var width = pix.width>>>0;
	var height = pix.height>>>0;
	for (var i = 0; i < end; i += PARTICLE_SIZE) {
		// if (particles[i+PARTICLE_LIFE] <= 0.0) {
		// 	continue;
		// }
		var x = particles[i+PARTICLE_X];
		var y = particles[i+PARTICLE_Y];
		var renderX = Math.floor(x-sx+0.5);
		var renderY = Math.floor(y-sy+0.5);
		if ((renderX>>>0) < width && (renderY>>>0) < height) {
			pixels[renderX+renderY*width] = bloodColor;
		}
	}
};

function Gib(game, x, y, isMonstrous) {
	Particle.call(this, game, x, y);
	this.sprite = isMonstrous ? 1 : 0;
}

Gib.prototype = Object.create(Particle.prototype);
Gib.prototype.constructor = Gib;

Engine.Gib = Gib;

Gib.prototype.update = function() {
	Particle.prototype.update.call(this);
	// var blood = new Blood(this.game, this.x, this.y);
	// blood.vx /= 20;
	// blood.vy /= 20;
	// blood.vx += this.vx / 2;
	// blood.vy += this.vy / 2;
	// this.game.addEffect(blood);
	var bloodIndex = BloodSystem.add(this.x, this.y);

	var bloodVx = BloodSystem.particles[bloodIndex+PARTICLE_VX];
	var bloodVy = BloodSystem.particles[bloodIndex+PARTICLE_VY];

	bloodVx = bloodVx/20.0 + this.vx/2.0;
	bloodVy = bloodVy/20.0 + this.vy/2.0;

	BloodSystem.particles[bloodIndex+PARTICLE_VX] = bloodVx;
	BloodSystem.particles[bloodIndex+PARTICLE_VY] = bloodVy;

};

function Smoke(game, x, y) {
	Particle.apply(this, arguments);
	this.gravity = -0.05;
	this.life >>= 1;
	this.age = this.life;
	this.drag = 0.9;
}

Smoke.prototype = Object.create(Particle.prototype);
Smoke.prototype.constructor = Smoke;
Engine.Smoke = Smoke;

//Smoke.prototype.initialVxMul = 0;
Smoke.prototype.initialVyMul = 0;

Smoke.prototype.render = function(c, sx, sy, pixbuf) {
	var px = Math.round(this.x - sx);
	var py = Math.round(this.y - sy);
	var shade = Math.floor(127 * this.life / this.age);
	var color = 0xff000000|(shade<<16)|(shade<<8)|shade;
	for (var y = -1; y < 1; ++y) {
		for (var x = -1; x < 1; ++x) {
			pixbuf.putPixel(px+x, py+y, color);
		}
	}
};

function Flame(game, x, y) {
	Particle.apply(this, arguments);
	this.gravity = 0;
	this.life >>= 1;
	this.age = this.life;
	this.dir = (Math.random()*3)|0
	this.drag = 0.92;
	this.emitSmoke = true;
}

Flame.prototype = Object.create(Particle.prototype);
Flame.prototype.constructor = Flame;
Engine.Flame = Flame;

Flame.prototype.initialVyMul = 1.0;
Flame.prototype.render = function() {
	this.sprite = (8*this.dir) + Math.floor(4 * this.life / this.age);
	Particle.prototype.render.apply(this, arguments);
};

Flame.prototype.update = function() {
	Particle.prototype.update.apply(this);
	if (!this.active && Math.random() < 0.2 && !this.emitSmoke) {
		var numSmokes = Math.ceil(Math.random() * 3);
		for (var i = 0; i < numSmokes; ++i) {
			var s = new Smoke(this.game, this.x+(Math.random()-0.5)*4, this.y+(Math.random()-0.5)*4);
			s.vx = s.vx/10 + this.vx;
			s.vy = s.vy/10 + this.vy;
			this.game.addEffect(s);
		}
	}
};

function ExitParticle(game, exit) {
	Particle.call(this, game, game.player.x, game.player.y);
	this.exit = exit;
	this.xOffset = 5*(Math.random() - 0.5);
	this.yOffset = 5*(Math.random() - 0.5);
	this.pos = Math.random() * 0.7;
	this.life = Math.floor(Math.random() * 20 + 20);
	this.speed = (Math.random() + 0.4)*0.02;
	this.opacity = Math.random();
	this.sprite = Math.floor(Math.random() * 4);
}

ExitParticle.prototype = Object.create(Particle.prototype);
ExitParticle.prototype.constructor = ExitParticle;
Engine.ExitParticle = ExitParticle;

ExitParticle.prototype.update = function() {
	if (--this.life < 0 || this.pos >= 1) {
		this.active = false;
		return;
	}

	var player = this.game.player;

	var heading = Math.atan2(player.vy, player.vx);

	var xs = player.x + Math.cos(heading)*2;
	var ys = player.y + Math.sin(heading)*2;

	var xm = player.x + Math.cos(heading)*20;
	var ym = player.y + Math.sin(heading)*20;

	var x0 = xs + (xm - player.x)*this.pos;
	var y0 = ys + (ym - player.y)*this.pos;

	var x1 = xm + (this.exit.x - xm)*this.pos;
	var y1 = ym + (this.exit.y - ym)*this.pos;

	this.x = x0 + (x1 - x0) * this.pos + this.xOffset * this.pos;
	this.y = y0 + (y1 - y0) * this.pos + this.yOffset * this.pos;

	this.pos += this.speed;
	this.sprite = (this.sprite+1)%4;
};

ExitParticle.prototype.render = function(ctx, sx, sy, pix) {
	var px = Math.round(this.x-sx);
	var py = Math.round(this.y-sy);
	if (px >= 0 && px < ctx.canvas.width && py >= 0 && py < ctx.canvas.height) {
		var oldAlpha = ctx.globalAlpha;
		ctx.globalAlpha = this.opacity;
		var sizeMul = 8 * ((1 - this.pos)*0.5 + 0.5);
		ctx.drawImage(
			Assets.images.misc.image,
			(4+this.sprite)*8, 3*8, 8, 8,
			px-sizeMul/2, py-sizeMul/2, sizeMul, sizeMul);
		ctx.globalAlpha = oldAlpha;
	}
}



function Explosion(game, x, y) {
	Particle.apply(this, arguments);
	this.vx = 0;
	this.vy = 0;

	this.life = this.age = 5;
	Assets.sounds.boom.play();
}
Explosion.prototype = Object.create(Particle.prototype);
Explosion.prototype.constructor = Explosion;
Engine.Explosion = Explosion;

Explosion.prototype.update = function() {
	if (--this.life < 0) {
		this.active = false;
		return;
	}
	var bits = Math.ceil(this.life * 40 / this.age);
	var dd = (this.age - this.life)/this.age + 0.2;
	for (var i = 0; i < bits; ++i) {
		var dir = Math.random() * Math.PI * 2;
		var dist = Math.random() * 6 * dd;
		var xx = this.x + Math.cos(dir) * dist;
		var yy = this.y + Math.sin(dir) * dist;
		var flame = new Flame(this.game, xx, yy);
		if (Math.random() < 0.5) {
			flame.age >>= 1;
			flame.life = flame.age;
		}
		flame.vx /= 10;
		flame.vy /= 10;
		flame.vx += (xx - this.x)/2.0;
		flame.vy += (yy - this.y)/2.0;
		flame.gravity = 0.1;
		this.game.addEffect(flame);
	}
};

Explosion.prototype.render = function() {};

function Entity(game) {
	this.game = game;
	this.active = true;

	this.x = 0;
	this.y = 0;

	this.vx = 0;
	this.vy = 0;

	this.rx = this.ry = 1;
}

mixin(Entity, Movable);

Engine.Entity = Entity;

Entity.prototype.update = function() {};
Entity.prototype.render = function(c, mx, my) {};

Entity.prototype.collidesWithPlayer = function() {
	var player = this.game.player;
	var pLeft = player.x - player.width/2;
	var pRight = player.x + player.width/2;
	var pTop = player.y - player.height/2;
	var pBottom = player.y + player.height/2;

	var tLeft = this.x - this.rx;
	var tRight = this.x + this.rx;
	var tBottom = this.y + this.ry;
	var tTop = this.y - this.ry;

	return !(
		pLeft > tLeft || pRight < tRight ||
		pTop > tTop || pBottom < tBottom);
};
Entity.prototype.setPosition = function(x, y) {
	this.y = y;
	this.x = x;
};

function Bullet(game, shooter, dx, dy, dmg, speed) {
	Entity.call(this, game);
	this.speed = speed || 4;
	this.damage = dmg || Math.ceil(Math.random() * 4);
	this.lastX = 0;
	this.lastY = 0;
	this.setPosition(shooter.x, shooter.y);

	this.maxDist = 300;
	var len = Math.sqrt(dx*dx + dy*dy);
	if (len !== 0) {
		dx /= len;
		dy /= len;
	}

	this.vx = dx * speed;
	this.vy = dy * speed;
	Assets.sounds.shootBullet.play();
};

Bullet.prototype = Object.create(Entity.prototype);
Bullet.prototype.constructor = Bullet;

Bullet.prototype.setPosition = function(x, y) {
	this.startY = this.y = this.lastY = y;
	this.startX = this.x = this.lastX = x;
};

Bullet.prototype.update = function() {
	this.lastX = this.x;
	this.lastY = this.y;
	Entity.prototype.update.call(this);
	this.doMove();
	if (this.collidesWithPlayer()) {
		this.onPlayerCollision();
	}
	else if (this.maxDist > 0 && distBetween(this.x, this.y, this.startX, this.startY) >= this.maxDist) {
		this.active = false;
	}

};

Bullet.prototype.onPlayerCollision = function() {
	this.active = false;
	var p = this.game.player;
	console.log("hurt: bullet")
	p.hurtFor(this.damage);
	var gib = new Gib(this.game, this.x, this.y, true);
	gib.vx += this.vx;
	gib.vy += this.vy;
	this.game.addEffect(gib);
};

Bullet.prototype.collide = function() {
	this.active = false;
};

Bullet.prototype.render = function(c, sx, sy, pix) {
	var px = Math.round(this.x - sx);
	var py = Math.round(this.y - sy);

	var opx = Math.round(this.lastX - sx);
	var opy = Math.round(this.lastY - sy);
	var dx = px-opx;
	var dy = py-opy;
	var steps = Math.ceil(Math.sqrt(dx*dx+dy*dy));
	for (var i = 0; i < steps; ++i) {
		if (Math.random() * steps < i) {
			continue;
		}
		var br = (255 - i * 128 / steps)&0xff;
		var xx = (px - dx * i / steps)|0;
		var yy = (py - dy * i / steps)|0;
		var pixel = 0xff000000|(br<<16)|(br<<8)|br;
		pix.putPixel(xx, yy, pixel);
		//c.globalAlpha = Math.max(0, Math.min(1, 0.5 + (br/255/2)));
		//c.fillRect(xx, yy, 1, 1);
	}
};

function Rocket(game, shooter, dx, dy, dmg, speed) {
	Bullet.apply(this, arguments);
	this.damage += 10; // :3
	this.rx = 4;
	this.ry = 4;
	// Assets.sounds.shootRocket.play();
};

Rocket.prototype = Object.create(Bullet.prototype);
Rocket.prototype.constructor = Rocket;
Engine.Rocket = Rocket;

Rocket.prototype.update = function() {
	var flame = new Flame(this.game, this.x-this.vx*2, this.y-this.vy*2);
	// flame.gravity = 0.1;
	flame.vx *= 0.1;
	flame.vy *= 0.1;

	flame.vx += this.vx;
	flame.vy += this.vy;

	flame.life = flame.age / 2;
	this.game.addEffect(flame);
	Bullet.prototype.update.call(this);
	// this.doMove();
};

Rocket.prototype.render = function(c, sx, sy, pix) {
	var sprite = (Math.floor(-Math.atan2(this.vy, this.vx) * 16 / (Math.PI*2)) + 4.5) & 7;
	c.drawImage(Assets.images.misc.image,
		sprite*8, 8, 8, 8,
		Math.round(this.x-sx-4)+0.5, Math.round(this.y-sy-4)+0.5, 8, 8);
};

Rocket.prototype.collide = function() {
	this.active = false;

	this.game.explode(this.x, this.y, this.damage);
};

Rocket.prototype.onPlayerCollision = function() {
	this.game.player.hurtFor(this.damage);
	this.active = false;
	var gibs = 4 + (Math.random()*3)|0
	for (var i = 0; i < gibs; ++i) {
		var ox = (Math.random() - 0.5)*this.game.player.rx;
		var oy = (Math.random() - 0.5)*this.game.player.ry;
		var gib = new Gib(this.game, this.game.player.x+ox, this.game.player.y+oy, true);
		gib.vx *= 0.1;
		gib.vy *= 0.1;
		gib.vx += this.vx;
		gib.vy += this.vy;
		this.game.addEffect(gib);
	}
	this.game.explode(this.x, this.y, this.damage);
}

function Exit(game, x, y) {
	Entity.call(this, game);
	this.setPosition(x, y);
	this.rx = 8;
	this.ry = 8;
	this.sprite = 0;
	this.bob = 0
	this.visible = false;
	this.heading = Math.random() * Math.PI*2;
	this.deltaHeading = (Math.random()-0.5)/100;
};

Engine.Exit = Exit;
Exit.prototype = Object.create(Entity.prototype);
Exit.prototype.constructor = Exit;

Exit.prototype.update = function() {
	if (!this.visible) {
		var ents = this.game.entities;
		var sawHostile = false;
		for (var i = 0; i < ents.length; ++i) {
			if (ents[i].isHostile) {
				sawHostile = true;
				break;
			}
		}
		if (!sawHostile) {
			this.visible = true;
			Assets.sounds.exitAppear.play();
		}
	}
	else {
		this.heading += this.deltaHeading;
		this.deltaHeading += (Math.random()-0.5)/100;
		this.deltaHeading = clamp(this.deltaHeading, -0.05, 0.05);
		this.sprite = (this.sprite + 1)&7;
		++this.bob;
		if (distBetween(this.x, this.y, this.game.player.x, this.game.player.y) < this.rx*3) {
		// if (this.collidesWithPlayer()) {
			this.game.wonLevel();
		}
		else if (Math.random() < 0.2) {
			this.game.addEffect(new ExitParticle(this.game, this))
		}
	}

};

Exit.bobRate = 10;
Exit.prototype.render = function(ctx, sx, sy) {
	if (!this.visible) {
		return;
	}
	var tx = this.x;
	var ty = this.y + Math.sin(this.bob/Exit.bobRate)*2;

	var px = Math.round(tx - sx);
	var py = Math.round(ty - sy);

	ctx.drawImage(
		Assets.images.exit.image,
		this.sprite*16, 0, 16, 16,
		px-8, py-8, 16, 16);
};


function Copter(game, x, y) {
	Entity.call(this, game);
	this.timer = new Timer();
	this.setPosition(x, y);
	this.hp = 15;
	this.gravity = 0;
	this.drag = 0.9;
	this.hit = 0;
	this.rx = this.ry = 8;
	this.bob = (Math.random() * 40)|0;
	this.sprite = (Math.random()*8)|0;
	this.weaponType = Math.random() < 0.9 ? Rocket : Bullet;
}

Engine.Copter = Copter;
Copter.prototype = Object.create(Entity.prototype);
Copter.prototype.constructor = Copter;

Copter.prototype.isHostile = true;

Copter.prototype.die = function() {
	Assets.sounds.mdie.play();
	this.active = false;
	for (var i = 0; i < 3; ++i) {
		this.game.addEffect(new Gib(this.game, this.x, this.y, false));
	}
	this.game.explode(this.x, this.y, 10);
	// this.game.addEffect(new Explosion(this.game, this.x, this.y));
};

Copter.prototype.hurtFor = function(dmg) {
	this.timer.set('hit', 5);
	this.hp -= dmg;
	if (this.hp <= 0) {
		this.hp = 0;
		this.die();
	}
	else {
		if (this.soundId == null || !Assets.sounds.hurtm.playing(this.soundId)) {
			this.soundId = Assets.sounds.hurtm.play();
		}
	}
};

Copter.prototype.overlapsPlayer = function() {
	// @HACK
	return (
		distBetween(this.x, this.y, this.game.player.x, this.game.player.y) <
		Math.min(this.rx+this.game.player.rx, this.ry+this.game.player.ry)
	);
};

Copter.bobRate = 8;
Copter.bobAmplitude = 0.1;
Copter.prototype.update = function() {
	Entity.prototype.update.call(this);
	this.sprite++;
	this.bob++;

	if (this.hit > 0) {
		--this.hit;
	}

	if (Math.random() < 0.01) {
		// this.game.addSmoke(this.x, this.y-this.ry);
	}


	this.timer.update();
	var distToPlayer = distBetween(this.x, this.y, this.game.player.x, this.game.player.y);
	if (this.overlapsPlayer()) {
		this.hurtFor(100);
	}
	else if (distToPlayer < 100) {
		if (this.timer.test('hit')) {
			if (this.game.tentacleTouched(this.x, this.y, this.rx, this.ry)) {
				// this.timer.set('hit', 5);
				this.hit = 5;
				this.hurtFor(1);
			}
		}

		if (this.weaponType && this.timer.testOrSet('shoot', 60)) {
			var dx = this.game.player.x - this.x;
			var dy = this.game.player.y - this.y;
			var len = normLen(dx, dy);
			dx /= len;
			dy /= len;
			dx += (Math.random()-0.5) / 10;
			dy += (Math.random()-0.5) / 10;
			len = normLen(dx, dy);
			this.game.addEntity(new this.weaponType(this.game, this, dx/len, dy/len, 10 + (Math.random() * 3)|0, 4));
		}

		if (distToPlayer < 50 && this.timer.testOrSet('dart', 40)) {
			// this.timer.set('dodge', 30);
			var dx = this.x - this.game.player.x;
			var dy = this.y - this.game.player.y;
			var len = normLen(dx, dy);
			dx /= len;
			dy /= len;
			this.vx += dx*4;
			this.vy += dy*4;
		}

	}
	else if (distToPlayer < 400) {
		if (this.timer.testOrSet('dive', 120)) {
			var dx = this.game.player.x - this.x;
			var dy = this.game.player.y - this.y;
			var len = normLen(dx, dy);
			dx /= len;
			dy /= len;
			dx += (Math.random()-0.5) / 10;
			dy += (Math.random()-0.5) / 10;
			len = normLen(dx, dy);
			this.vx += dx / len * 5;
			this.vy += dy / len * 5;

		}
	}
	else {

		if (this.timer.testOrSet('dart', 40)) {
			var dx, dy;
			var i = 0;
			do {

				dx = Math.random()*2-1;
				dy = Math.random()*2-1;
				var len = normLen(dx, dy);
				dx /= len;
				dy /= len;
			} while (i++ < 10 &&
				(this.game.isBlocked(this.x+dx, this.y+dy) ||
			     this.game.isBlocked(this.x+dx*TileSize, this.y+dy*TileSize)));
			this.vx += dx*5;
			this.vy += dy*5;
		}
	}
	this.vy += Math.sin(this.bob/Copter.bobRate)*Copter.bobAmplitude;

	this.vx *= this.drag;
	this.vy *= this.drag;

	this.doMove();
};

Copter.prototype.render = function(c, sx, sy, pix) {
	var px = Math.round(this.x - sx);
	var py = Math.round(this.y - sy);
	var isHit = this.hit !== 0;//!this.timer.test('hit');
	var sprite = pingPong(this.sprite, 7);
	//var sprite = this.sprite >= 8 ? 7 - this.sprite : this.sprite;

	var spriteX = sprite % 4;
	var spriteY = Math.floor(sprite/4);
	if (isHit) {
		spriteY += 2;
	}
	c.drawImage(
		Assets.images.copter.image,
		spriteX*16, spriteY*16, 16, 16,
		px-8, py-8, 16, 16);
};






Engine.overTime = 0;
Engine.gameOver = function() {
	Engine.overTime = Engine.now();
	Engine.didLose = true;
	Engine.isOver = true;
	Assets.music.fade(1.0, 0.0, 2.0);
	Assets.music.once('faded', function() {
		Assets.music.stop();
		Assets.deathMusic.play();
		Assets.deathMusic.fade(0.0, 1.0, 1.0);
	});
};

Engine.wonGame = function() {
	Engine.overTime = Engine.now();
	Engine.didLose = false;
	Engine.isOver = true;
	Assets.music.fade(1.0, 0.0, 2.0);
	Assets.music.once('faded', function() {
		Assets.music.stop();
		Assets.winMusic.play();
	});
}

Engine.update = function() {
	if (!Engine.isOver) {
		Engine.game.update();
	}

};

Engine.doOverlay = false;

Engine.render = function() {
	var drawCtx = Engine.drawCanvas.getContext('2d');
	drawCtx.imageSmoothingEnabled = false;
	drawCtx.mozImageSmoothingEnabled = false;
	drawCtx.webkitImageSmoothingEnabled = false;
	var screenCtx = Engine.screen.getContext('2d');
	screenCtx.imageSmoothingEnabled = false;
	screenCtx.mozImageSmoothingEnabled = false;
	screenCtx.webkitImageSmoothingEnabled = false;
	screenCtx.clearRect(0, 0, Engine.screen.width, Engine.screen.height);

	if (!Engine.isOver) {

		Engine.game.render(drawCtx, Engine.drawCanvas);

		// health bar
		drawCtx.drawImage(Assets.images.misc.image, 0, 0, 64, 8, 0, 0, 64, 8);

		drawCtx.fillStyle = '#ff0000';
		var playerHp = Engine.game.player.hp / Engine.game.player.maxHp;

		playerHp = Math.min(1, Math.max(0, playerHp));
		playerHp *= 37;
		playerHp = Math.round(playerHp);

		drawCtx.fillRect(14, 3, playerHp, 3);

		drawCtx.drawImage(
			Assets.images.misc.image,
			Engine.game.player.size*8, 48, 8, 8,
			61, 0, 8, 8);

		screenCtx.drawImage(Engine.drawCanvas, 0, 0, Engine.drawCanvas.width, Engine.drawCanvas.height, 0, 0, Engine.screen.width, Engine.screen.height);
		if (Engine.doOverlay) {
			var oldGco = screenCtx.globalCompositeOperation;
			screenCtx.globalCompositeOperation = 'overlay';

			screenCtx.drawImage(Engine.overlayCanvas,
				0, 0, Engine.overlayCanvas.width, Engine.overlayCanvas.height,
				0, 0, Engine.screen.width, Engine.screen.height);

			screenCtx.globalCompositeOperation = oldGco;
		}
	}
	else {
		var opacity = Math.min(1.0, (Engine.now() - Engine.overTime)/2000);
		screenCtx.fillStyle = 'rgba(0, 0, 0, '+opacity+')';
		screenCtx.fillRect(0, 0, Engine.screen.width, Engine.screen.height);

		screenCtx.font = '100px Source Sans Pro';
		screenCtx.textAlign = 'center';
		screenCtx.textBaseline = 'middle';

		screenCtx.fillStyle = 'rgba(255, 255, 255, '+opacity+')';
		if (Engine.didLose) {
			screenCtx.fillText("You were not a very good monster", Engine.screen.width/2, Engine.screen.height/4);
			screenCtx.fillText("Listen to the sad music", Engine.screen.width/2, Engine.screen.height*1/2)
			screenCtx.fillText("Refresh to try again", Engine.screen.width/2, Engine.screen.height*3/4)

		} else {
			screenCtx.fillText("You were the monster", Engine.screen.width/2, Engine.screen.height/4);
			screenCtx.fillText("Refresh to play again", Engine.screen.width/2, Engine.screen.height*3/4)
		}
	}

};

Engine.overlayCanvas = null;

Engine.init = function(canvas) {
	Engine.screen = canvas;
	canvas.width = Engine.screenWidth*Engine.devicePixels;
	canvas.height = Engine.screenHeight*Engine.devicePixels;
	canvas.style.width = Engine.screenWidth+"px";
	canvas.style.height = Engine.screenHeight+"px";

	Engine.Input.init(canvas);

	var drawCanvas = document.createElement('canvas');

	drawCanvas.width = Engine.screenWidth / Engine.scale;
	drawCanvas.height = Engine.screenHeight / Engine.scale;
	Engine.drawCanvas = drawCanvas;

	var overlayCanvas = Engine.overlayCanvas = document.createElement('canvas');
	overlayCanvas.width = Engine.screenWidth*Engine.devicePixels;
	overlayCanvas.height = Engine.screenHeight*Engine.devicePixels;
	if (Engine.scale !== 1) {
		var overlayCtx = overlayCanvas.getContext('2d');
		var scale = Engine.scale*Engine.devicePixels;
		var pix = new PixelBuffer(scale, scale);
		for (var x = 0; x < scale; ++x) {
			pix.putPixel(x, 0, 0x4cffffff);
			pix.putPixel(x, scale-1, 0x4c000000);
		}

		for (var y = 0; y < scale; ++y) {
			pix.putPixel(0, y, 0x4cffffff);
			pix.putPixel(scale-1, y, 0x4c000000);
		}

		pix.update();
		var sw = Engine.screenWidth/Engine.scale;
		var sh = Engine.screenHeight/Engine.scale;

		for (var j = 0; j < sh; ++j) {
			for (var i = 0; i < sw; ++i) {
				overlayCtx.drawImage(pix.canvas, i*scale, j*scale);
			}
		}
	}



	var drawCtx = drawCanvas.getContext('2d');


	// var drawCtx = drawCanvas.getContext('2d');

	var scrCtx = Engine.screen.getContext('2d');
	scrCtx.fillStyle = 'black';
	scrCtx.fillRect(0, 0, Engine.screen.width, Engine.screen.height);

	scrCtx.font = '250px Source Sans Pro';
	scrCtx.textAlign = 'center';
	scrCtx.textBaseline = 'middle';

	scrCtx.fillStyle = 'white';

	scrCtx.fillText("Loading!", Engine.screen.width/2, Engine.screen.height/2);

	Assets.loadAll()
	.then(function() {
		Monster.initTentaclePositions(Assets.images.sprites);
		Engine.game = new Game();
		Assets.music.play();
		// Assets.music.play('intro');
		// Assets.music.once('end', function() {
			// Assets.music.play('main')
		// });
		Engine.MainLoop.start();
	})
	.catch(function() {
		console.error(arguments)
		scrCtx.fillStyle = 'black';
		scrCtx.fillRect(0, 0, Engine.screen.width, Engine.screen.height);

		scrCtx.font = '150px Source Sans Pro';
		scrCtx.textAlign = 'center';
		scrCtx.textBaseline = 'middle';

		scrCtx.fillStyle = 'white';

		scrCtx.fillText("Init failed! D:", Engine.screen.width/2, Engine.screen.height/2);
	});


};

Engine.Assets = Assets;

function Main() {
	Engine.init(document.getElementById('screen'));
}
document.body.onload = Main;
//document.body.addEventListener('load', Main);


},{"./Assets":1}]},{},[2])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwic3JjL0Fzc2V0cy5qcyIsInNyYy9NYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcblxuLy8gdmFyIFByb21pc2UgPSByZXF1aXJlKCdibHVlYmlyZCcpO1xuXG52YXIgQXNzZXRzID0ge1xuXHRpbWFnZXM6IHt9LFxuXHRzb3VuZHM6IHtcblx0XHRvdWNoOiBuZXcgSG93bCh7XG5cdFx0XHRzcmM6IFsncmVzL291Y2gud2F2J11cblx0XHR9KSxcblx0XHRwbGF5ZXJEaWU6IG5ldyBIb3dsKHtcblx0XHRcdHNyYzogWydyZXMvcGxheWVyX2RpZS53YXYnXVxuXHRcdH0pLFxuXHRcdHNob290QnVsbGV0OiBuZXcgSG93bCh7XG5cdFx0XHRzcmM6IFsncmVzL2J1bGxldC53YXYnXVxuXHRcdH0pLFxuXHRcdGh1cnRtOiBuZXcgSG93bCh7XG5cdFx0XHRzcmM6IFsncmVzL2h1cnRtLndhdiddXG5cdFx0fSksXG5cdFx0bWRpZTogbmV3IEhvd2woe1xuXHRcdFx0c3JjOiBbJ3Jlcy9tZGllLndhdiddXG5cdFx0fSksXG5cdFx0Ym9vbTogbmV3IEhvd2woe1xuXHRcdFx0c3JjOiBbJ3Jlcy9ib29tLndhdiddXG5cdFx0fSksXG5cdFx0d2lubGV2ZWw6IG5ldyBIb3dsKHtcblx0XHRcdHNyYzogWydyZXMvd2lubGV2ZWwud2F2J11cblx0XHR9KSxcblx0XHRleGl0QXBwZWFyOiBuZXcgSG93bCh7XG5cdFx0XHRzcmM6IFsncmVzL2V4aXQtYXBwZWFyLndhdiddXG5cdFx0fSlcblx0fSxcblx0bXVzaWM6IG5ldyBIb3dsKHtcblx0XHRzcmM6IFsncmVzL3NvbmcxLm1wMycsICdyZXMvc29uZzEub2dnJ10sXG5cdFx0bG9vcDogdHJ1ZSxcblx0XHQvLyBzcHJpdGU6IHtcblx0XHQvLyBcdGludHJvOiBbMCwgMTAwMDBdLFxuXHRcdC8vIFx0bWFpbjogWzEwMDAwLCA1MjEwNCwgdHJ1ZV1cblx0XHQvLyB9XG5cdH0pLFxuXHRkZWF0aE11c2ljOiBuZXcgSG93bCh7XG5cdFx0c3JjOiBbJ3Jlcy9kZWF0aG11c2ljLm1wMycsICdyZXMvZGVhdGhtdXNpYy5vZ2cnXSxcblx0XHRsb29wOiB0cnVlXG5cdH0pLFxuXHR3aW5NdXNpYzogbmV3IEhvd2woe1xuXHRcdHNyYzogWydyZXMvd2lubmVyLW11c2ljLm1wMycsICdyZXMvd2lubmVyLW11c2ljLm9nZyddLFxuXHRcdGxvb3A6IHRydWVcblx0fSlcbn07XG5cbmZ1bmN0aW9uIEltYWdlQXNzZXQoaW1hZ2UsIG5hbWUpIHtcblx0dGhpcy5pbWFnZSA9IGltYWdlO1xuXHR0aGlzLndpZHRoID0gaW1hZ2UubmF0dXJhbFdpZHRoIHx8IGltYWdlLndpZHRoO1xuXHR0aGlzLmhlaWdodCA9IGltYWdlLm5hdHVyYWxIZWlnaHQgfHwgaW1hZ2UuaGVpZ2h0O1xuXHR0aGlzLm5hbWUgPSBuYW1lO1xuXHR0aGlzLnBpeGVscyA9IG51bGw7XG5cdHRoaXMucm90YXRpb25zID0gbnVsbDtcbn1cblxuSW1hZ2VBc3NldC5wcm90b3R5cGUuZ2V0Q2FyZGluYWxSb3RhdGlvbnMgPSBmdW5jdGlvbihzdywgc2gpIHtcblx0aWYgKHRoaXMucm90YXRpb25zID09IG51bGwpIHtcblx0XHR0aGlzLnJvdGF0aW9ucyA9IFtdO1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgNDsgKytpKSB7XG5cdFx0XHR2YXIgY2FudiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXHRcdFx0Y2Fudi53aWR0aCA9IHRoaXMud2lkdGg7XG5cdFx0XHRjYW52LmhlaWdodCA9IHRoaXMuaGVpZ2h0O1xuXHRcdFx0dmFyIGN0eCA9IGNhbnYuZ2V0Q29udGV4dCgnMmQnKTtcblx0XHRcdHZhciBjID0gTWF0aC5mbG9vcih0aGlzLndpZHRoL3N3KTtcblx0XHRcdHZhciByID0gTWF0aC5mbG9vcih0aGlzLmhlaWdodC9zaCk7XG5cdFx0XHRmb3IgKHZhciB5ID0gMDsgeSA8IHI7ICsreSkge1xuXHRcdFx0XHRmb3IgKHZhciB4ID0gMDsgeCA8IGM7ICsreCkge1xuXHRcdFx0XHRcdGN0eC5zYXZlKCk7XG5cdFx0XHRcdFx0Y3R4LnRyYW5zbGF0ZShzdyp4K3N3LzIsIHNoKnkrc2gvMik7XG5cdFx0XHRcdFx0Y3R4LnJvdGF0ZShpKk1hdGguUEkvMik7XG5cdFx0XHRcdFx0Y3R4LmRyYXdJbWFnZShcblx0XHRcdFx0XHRcdHRoaXMuaW1hZ2UsXG5cdFx0XHRcdFx0XHR4KnN3LCAgIHkqc2gsIHN3LCBzaCxcblx0XHRcdFx0XHRcdC1zdy8yLCAtc2gvMiwgc3csIHNoKTtcblx0XHRcdFx0XHRjdHgucmVzdG9yZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHR0aGlzLnJvdGF0aW9uc1tpXSA9IGNhbnY7XG5cdFx0fVxuXHR9XG5cdHJldHVybiB0aGlzLnJvdGF0aW9ucztcbn1cblxuXG5JbWFnZUFzc2V0LnByb3RvdHlwZS5nZXRQaXhlbERhdGEgPSBmdW5jdGlvbigpIHtcblx0aWYgKCF0aGlzLnBpeGVscykge1xuXHRcdHZhciBjYW52ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdFx0Y2Fudi53aWR0aCA9IHRoaXMud2lkdGg7XG5cdFx0Y2Fudi5oZWlnaHQgPSB0aGlzLmhlaWdodDtcblx0XHR2YXIgY3R4ID0gY2Fudi5nZXRDb250ZXh0KCcyZCcpO1xuXHRcdGN0eC5kcmF3SW1hZ2UodGhpcy5pbWFnZSwgMCwgMCwgY2Fudi53aWR0aCwgY2Fudi5oZWlnaHQpO1xuXHRcdHZhciBpbWFnZURhdGEgPSBjdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIGNhbnYud2lkdGgsIGNhbnYuaGVpZ2h0KTtcblx0XHR0aGlzLnBpeGVscyA9IHtcblx0XHRcdHdpZHRoOiBpbWFnZURhdGEud2lkdGgsXG5cdFx0XHRoZWlnaHQ6IGltYWdlRGF0YS5oZWlnaHQsXG5cdFx0XHRkYXRhOiBpbWFnZURhdGEuZGF0YSxcblx0XHRcdHBpeGVsczogbmV3IFVpbnQzMkFycmF5KGltYWdlRGF0YS5kYXRhLmJ1ZmZlcilcblx0XHR9O1xuXHR9XG5cdHJldHVybiB0aGlzLnBpeGVscztcbn07XG5cbmZ1bmN0aW9uIGxvYWRJbWFnZShuYW1lLCBzcmMpIHtcblx0cmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuXHRcdHZhciBpbWFnZSA9IG5ldyBJbWFnZSgpO1xuXHRcdGltYWdlLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0QXNzZXRzLmltYWdlc1tuYW1lXSA9IG5ldyBJbWFnZUFzc2V0KGltYWdlLCBuYW1lKTtcblx0XHRcdHJlc29sdmUoQXNzZXRzLmltYWdlc1tuYW1lXSk7XG5cdFx0fTtcblx0XHRpbWFnZS5vbmVycm9yID0gZnVuY3Rpb24oZSkge1xuXHRcdFx0Y29uc29sZS5sb2coZSk7XG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIGxvYWQ6IFwiK3NyYylcblx0XHRcdHJlamVjdChcIkZhaWxlZCB0byBsb2FkIGFzc2V0IChcIituYW1lK1wiKVwiKTtcblx0XHR9O1xuXHRcdGltYWdlLnNyYyA9IHNyYztcblx0fSk7XG59XG5cblxuQXNzZXRzLmxvYWRBbGwgPSBmdW5jdGlvbigpIHtcblxuXHRyZXR1cm4gUHJvbWlzZS5hbGwoW1xuXHRcdGxvYWRJbWFnZSgnc3ByaXRlcycsICdyZXMvc3ByaXRlcy5wbmcnKSxcblx0XHRsb2FkSW1hZ2UoJ2V5ZScsICdyZXMvZXllLnBuZycpLFxuXHRcdGxvYWRJbWFnZSgnbWlzYycsICdyZXMvbWlzYy5wbmcnKSxcblx0XHRsb2FkSW1hZ2UoJ2NvcHRlcicsICdyZXMvY29wdGVyLnBuZycpLFxuXHRcdGxvYWRJbWFnZSgndGlsZXMnLCAncmVzL3RpbGVzLW9ubHkucG5nJyksXG5cdFx0bG9hZEltYWdlKCdiYWNrZHJvcCcsICdyZXMvYmFja2Ryb3AucG5nJyksXG5cdFx0bG9hZEltYWdlKCdleGl0JywgJ3Jlcy9leGl0LXNwcml0ZS5wbmcnKSxcblx0XHRsb2FkSW1hZ2UoJ2w1JywgJ3Jlcy9sZXZlbHMvTDUucG5nJyksXG5cdFx0bG9hZEltYWdlKCdsNCcsICdyZXMvbGV2ZWxzL0w0LnBuZycpLFxuXHRcdGxvYWRJbWFnZSgnbDMnLCAncmVzL2xldmVscy9MMy5wbmcnKSxcblx0XHRsb2FkSW1hZ2UoJ2wyJywgJ3Jlcy9sZXZlbHMvTDIucG5nJyksXG5cdFx0bG9hZEltYWdlKCdsMScsICdyZXMvbGV2ZWxzL0wxLnBuZycpXG5cdFx0Ly8gbG9hZEltYWdlKCdmb250JywgJ3Jlcy9mb250LnBuZycpXG5cdF0pO1xufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gQXNzZXRzO1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbmlmICghY29uc29sZS5lcnJvcikge1xuXHRjb25zb2xlLmVycm9yID0gY29uc29sZS5sb2cuYmluZChjb25zb2xlLCBcIkVSUk9SOiBcIik7XG59XG5cbmlmICghY29uc29sZS53YXJuKSB7XG5cdGNvbnNvbGUud2FybiA9IGNvbnNvbGUubG9nLmJpbmQoY29uc29sZSwgXCJXQVJOOiBcIik7XG59XG5cbnZhciBBc3NldHMgPSByZXF1aXJlKCcuL0Fzc2V0cycpO1xuXG52YXIgRW5naW5lID0ge307XG5cbndpbmRvdy5FbmdpbmUgPSBFbmdpbmU7XG5cbkVuZ2luZS5zY3JlZW5XaWR0aCA9IDkwMDtcbkVuZ2luZS5zY3JlZW5IZWlnaHQgPSA1NDA7XG5FbmdpbmUuRlBTID0gNjAuMDtcbkVuZ2luZS5ERUJVRyA9IHdpbmRvdy5ERUJVRyA9IGZhbHNlO1xuXG5FbmdpbmUuZGVsdGFUaW1lID0gMS4wIC8gRW5naW5lLkZQUztcbkVuZ2luZS5yZWFsRGVsdGFUaW1lID0gRW5naW5lLmRlbHRhVGltZTtcblxuRW5naW5lLnRpbWUgPSAwO1xuRW5naW5lLmFjY3VtdWxhdGVkVGltZSA9IDA7XG5cbkVuZ2luZS5zY3JlZW4gPSBudWxsO1xuXG5FbmdpbmUuZGlkTG9zZSA9IGZhbHNlXG5FbmdpbmUuaXNPdmVyID0gZmFsc2U7XG5cbkVuZ2luZS5wYXVzZWQgPSBmYWxzZTtcblxuRW5naW5lLmRldmljZVBpeGVscyA9ICh3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyB8fCB3aW5kb3cud2Via2l0RGV2aWNlUGl4ZWxSYXRpbyB8fCAxLjApO1xuXG5FbmdpbmUuZHJhd0NhbnZhcyA9IG51bGw7XG5FbmdpbmUuc2NhbGUgPSAzO1xuXG5FbmdpbmUubm93ID0gKGZ1bmN0aW9uKCkge1xuXHRpZiAod2luZG93LnBlcmZvcm1hbmNlICYmIHdpbmRvdy5wZXJmb3JtYW5jZS5ub3cpIHtcblx0XHRyZXR1cm4gd2luZG93LnBlcmZvcm1hbmNlLm5vdy5iaW5kKHdpbmRvdy5wZXJmb3JtYW5jZSk7XG5cdH1cblx0ZWxzZSB7XG5cdFx0cmV0dXJuIERhdGUubm93O1xuXHR9XG59KCkpO1xuXG5mdW5jdGlvbiBBc3NlcnQodiwgbXNnKSB7XG5cdGlmICghRW5naW5lLkRFQlVHKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGlmIChtc2cgPT0gbnVsbCkge1xuXHRcdG1zZyA9IFwiYXNzZXJ0YXRpb24gZmFpbGVkXCI7XG5cdH1cblx0Y29uc29sZS5hc3NlcnQodiwgbXNnKTtcblx0aWYgKCF2KSB7XG5cdFx0aWYgKCFjb25maXJtKFwiYXNzZXJ0YXRpb24gZmFpbGVkOiBcIittc2crXCIuIGNvbnRpbnVlP1wiKSkge1xuXHRcdFx0ZGVidWdnZXI7XG5cdFx0fVxuXHR9XG59XG5cblxuZnVuY3Rpb24gTmFOQ2hlY2sodikge1xuXHRpZiAoIUVuZ2luZS5ERUJVRykge1xuXHRcdHJldHVybjtcblx0fVxuXHRBc3NlcnQoK3YgPT09IHYsIFwiTmFOQ2hlY2sgZmFpbGVkXCIpO1xufVxuXG5FbmdpbmUuTWFpbkxvb3AgPSAoZnVuY3Rpb24oKSB7XG5cdHZhciBsYXN0VXBkYXRlID0gMDtcblx0dmFyIGZyYW1lcyA9IDA7XG5cdHZhciB0aWNrcyA9IDA7XG5cdHZhciBhY2N1bSA9IDA7XG5cdHZhciBsYXN0U2Vjb25kID0gMDtcblxuXHR2YXIgZnBzRWxlbSA9IG51bGw7XG5cdHZhciB0cHNFbGVtID0gbnVsbDtcblx0dmFyIG1zcGZFbGVtID0gbnVsbDtcblxuXHRmdW5jdGlvbiBNYWluTG9vcCh0aW1lU3RhbXApIHtcblx0XHRpZiAoRW5naW5lLnBhdXNlZCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRpZiAoIWxhc3RVcGRhdGUpIHtcblx0XHRcdGxhc3RVcGRhdGUgPSB0aW1lU3RhbXA7XG5cdFx0XHRsYXN0U2Vjb25kID0gdGltZVN0YW1wO1xuXHRcdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lKEVuZ2luZS5NYWluTG9vcCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dmFyIGZyYW1lU3RhcnQgPSBFbmdpbmUubm93KCk7XG5cblx0XHRFbmdpbmUudGltZSA9IHRpbWVTdGFtcCAvIDEwMDAuMDtcblx0XHR2YXIgZHQgPSAodGltZVN0YW1wIC0gbGFzdFVwZGF0ZSkgLyAxMDAwLjA7XG5cdFx0bGFzdFVwZGF0ZSA9IHRpbWVTdGFtcDtcblx0XHRpZiAoZHQgPiAxLjApIHtcblx0XHRcdGNvbnNvbGUubG9nKFwiUmVsb2FkIGZyb20gZGVidWdnZXIgKG9yIHdoYXRldmVyKVwiKTtcblx0XHRcdGR0ID0gMS4wIC8gRW5naW5lLkZQUztcblx0XHR9XG5cblx0XHRFbmdpbmUuZGVsdGFUaW1lID0gMS4wIC8gRW5naW5lLkZQUztcblx0XHRFbmdpbmUucmVhbERlbHRhVGltZSA9IGR0O1xuXG5cdFx0YWNjdW0gKz0gZHQ7XG5cdFx0dmFyIGRpZFVwZGF0ZSA9IGZhbHNlO1xuXHRcdHdoaWxlIChhY2N1bSA+PSBFbmdpbmUuZGVsdGFUaW1lKSB7XG5cdFx0XHQrK3RpY2tzO1xuXHRcdFx0RW5naW5lLnVwZGF0ZSgpO1xuXHRcdFx0RW5naW5lLklucHV0LnVwZGF0ZSgpO1xuXHRcdFx0YWNjdW0gLT0gRW5naW5lLmRlbHRhVGltZTtcblx0XHRcdGRpZFVwZGF0ZSA9IHRydWU7XG5cdFx0XHRFbmdpbmUuYWNjdW11bGF0ZWRUaW1lICs9IEVuZ2luZS5kZWx0YVRpbWU7XG5cdFx0fVxuXG5cdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lKEVuZ2luZS5NYWluTG9vcCk7XG5cdFx0ZGlkVXBkYXRlID0gdHJ1ZTtcblx0XHRpZiAoZGlkVXBkYXRlKSB7XG5cdFx0XHQrK2ZyYW1lcztcblx0XHRcdEVuZ2luZS5yZW5kZXIoKTtcblx0XHR9XG5cblx0XHR2YXIgZnJhbWVFbmQgPSBFbmdpbmUubm93KCk7XG5cblx0XHRpZiAoRW5naW5lLkRFQlVHICYmIG1zcGZFbGVtICE9IG51bGwpIHtcblx0XHRcdG1zcGZFbGVtLnRleHRDb250ZW50ID0gJ21zcGY6ICcrKGZyYW1lRW5kLWZyYW1lU3RhcnQpLnRvRml4ZWQoMik7XG5cdFx0fVxuXG5cdFx0aWYgKCh0aW1lU3RhbXAgLSBsYXN0U2Vjb25kKSA+PSAxMDAwLjApIHtcblx0XHRcdGNvbnNvbGUubG9nKFwiZnBzOiBcIitmcmFtZXMrXCIsIHRwczogXCIrdGlja3MrJywgbXNwZjogJysoZnJhbWVFbmQtZnJhbWVTdGFydCkudG9GaXhlZCgyKSk7XG5cdFx0XHRpZiAoRW5naW5lLkRFQlVHKSB7XG5cdFx0XHRcdGlmICh0cHNFbGVtICE9IG51bGwpIHtcblx0XHRcdFx0XHR0cHNFbGVtLnRleHRDb250ZW50ID0gXCJ0cHM6IFwiK3RpY2tzO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChmcHNFbGVtICE9IG51bGwpIHtcblx0XHRcdFx0XHRmcHNFbGVtLnRleHRDb250ZW50ID0gXCJ0cHM6IFwiK3RpY2tzO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRsYXN0U2Vjb25kID0gdGltZVN0YW1wO1xuXHRcdFx0dGlja3MgPSBmcmFtZXMgPSAwO1xuXHRcdH1cblxuXHR9XG5cblx0TWFpbkxvb3Auc3RhcnQgPSBmdW5jdGlvbigpIHtcblx0XHRpZiAobXNwZkVsZW0gPT0gbnVsbCkge1xuXHRcdFx0bXNwZkVsZW0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbXNwZicpO1xuXHRcdH1cblx0XHRpZiAodHBzRWxlbSA9PSBudWxsKSB7XG5cdFx0XHR0cHNFbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RwcycpO1xuXHRcdH1cblx0XHRpZiAoZnBzRWxlbSA9PSBudWxsKSB7XG5cdFx0XHRmcHNFbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RwcycpO1xuXHRcdH1cblx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUoTWFpbkxvb3ApO1xuXHR9O1xuXG5cdHJldHVybiBNYWluTG9vcDtcbn0oKSk7XG5cbnZhciBJbnB1dCA9IEVuZ2luZS5JbnB1dCA9IChmdW5jdGlvbigpIHtcblxuXHRmdW5jdGlvbiBLZXkoKSB7XG5cdFx0dGhpcy5kb3duID0gZmFsc2U7XG5cdFx0dGhpcy5wcmVzc2VkID0gZmFsc2U7XG5cdFx0dGhpcy5yZWxlYXNlZCA9IGZhbHNlO1xuXHRcdHRoaXMudHJhbnNpdGlvbnMgPSAwO1xuXHR9XG5cblx0Ly8gS2V5LnByb3RvdHlwZSA9IE9iamVjdC5hc3NpZ24oS2V5LnByb3RvdHlwZSwgRXZlbnRFbWl0dGVyLnByb3RvdHlwZSk7XG5cblx0S2V5LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnByZXNzZWQgPSBmYWxzZTtcblx0XHR0aGlzLnJlbGVhc2VkID0gZmFsc2U7XG5cdFx0dGhpcy50cmFuc2l0aW9ucyA9IDA7XG5cdH07XG5cblx0S2V5LnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbih2KSB7XG5cdFx0dmFyIG9sZFZhbHVlID0gdGhpcy5kb3duO1xuXHRcdGlmICh0aGlzLmRvd24gPT09ICEhdikge1xuXHRcdFx0cmV0dXJuOyAvLyBobS4uLiBjYW4gdGhpcyBoYXBwZW4/XG5cdFx0fVxuXHRcdHRoaXMuZG93biA9ICEhdjtcblx0XHRpZiAodikge1xuXHRcdFx0dGhpcy5wcmVzc2VkID0gdHJ1ZTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHR0aGlzLnJlbGVhc2VkID0gdHJ1ZTtcblx0XHR9XG5cdFx0Kyt0aGlzLnRyYW5zaXRpb25zO1xuXHR9O1xuXG5cdEtleS5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnRyYW5zaXRpb25zID0gMDtcblx0XHR0aGlzLnByZXNzZWQgPSBmYWxzZTtcblx0XHR0aGlzLnJlbGVhc2VkID0gZmFsc2U7XG5cdFx0dGhpcy5kb3duID0gZmFsc2U7XG5cdH07XG5cblx0dmFyIElucHV0ID0ge1xuXHRcdG1vdXNlOiB7IHg6IDAsIHk6IDAsIHdvcmxkWDogMCwgd29ybGRZOiAwLCBidXR0b246IG5ldyBLZXkoKSB9LFxuXHRcdGtleXM6IHtcblx0XHRcdHVwOiBuZXcgS2V5KCksXG5cdFx0XHRkb3duOiBuZXcgS2V5KCksXG5cdFx0XHRsZWZ0OiBuZXcgS2V5KCksXG5cdFx0XHRyaWdodDogbmV3IEtleSgpLFxuXHRcdH0sXG5cdFx0YmluZGluZ3M6IHt9LFxuXHRcdGFsbEtleXM6IG51bGwsXG5cdFx0c2V0Qm91bmRzOiBmdW5jdGlvbih4LCB5KSB7XG5cdFx0XHR0aGlzLm1vdXNlLndvcmxkWCA9IHRoaXMubW91c2UueCArIHg7XG5cdFx0XHR0aGlzLm1vdXNlLndvcmxkWSA9IHRoaXMubW91c2UueSArIHk7XG5cdFx0fSxcblx0XHRpbml0OiBmdW5jdGlvbihjYW52YXMpIHtcblx0XHRcdHZhciBiaW5kaW5ncyA9IElucHV0LmJpbmRpbmdzO1xuXHRcdFx0Ly8gQFRPRE8odGhvbSkgaGFuZGxlIHNpbXVsdGFuZW91cyBrZXkgcHJlc3NlcyBmb3IgdGhlXG5cdFx0XHQvLyBzYW1lICdrZXknIGJ1dCBkaWZmZXJlbnQgYmluZGluZ3MgaW4gYSBzYW5lIHdheS5cblx0XHRcdGJpbmRpbmdzWzY1XSA9IGJpbmRpbmdzWzM3XSA9IElucHV0LmtleXMubGVmdDtcblx0XHRcdGJpbmRpbmdzWzM4XSA9IGJpbmRpbmdzWzg3XSA9IElucHV0LmtleXMudXA7XG5cdFx0XHRiaW5kaW5nc1szOV0gPSBiaW5kaW5nc1s2OF0gPSBJbnB1dC5rZXlzLnJpZ2h0O1xuXHRcdFx0YmluZGluZ3NbNDBdID0gYmluZGluZ3NbODNdID0gSW5wdXQua2V5cy5kb3duO1xuXG5cdFx0XHRJbnB1dC5hbGxLZXlzID0gW1xuXHRcdFx0XHRJbnB1dC5rZXlzLnVwLFxuXHRcdFx0XHRJbnB1dC5rZXlzLmRvd24sXG5cdFx0XHRcdElucHV0LmtleXMubGVmdCxcblx0XHRcdFx0SW5wdXQua2V5cy5yaWdodCxcblx0XHRcdFx0SW5wdXQubW91c2UuYnV0dG9uLFxuXHRcdFx0XTtcblxuXHRcdFx0ZnVuY3Rpb24gdXBkYXRlTW91c2VQb3MoY2xpZW50WCwgY2xpZW50WSkge1xuXHRcdFx0XHR2YXIgbHggPSBjbGllbnRYO1xuXHRcdFx0XHR2YXIgbHkgPSBjbGllbnRZO1xuXHRcdFx0XHR2YXIgcmVjdCA9IGNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblx0XHRcdFx0bHggLT0gcmVjdC5sZWZ0O1xuXHRcdFx0XHRseSAtPSByZWN0LnRvcDtcblx0XHRcdFx0dmFyIGN4ID0gSW5wdXQubW91c2UuY3ggPSBseCAvIEVuZ2luZS5kZXZpY2VQaXhlbHM7XG5cdFx0XHRcdHZhciBjeSA9IElucHV0Lm1vdXNlLmN5ID0gbHkgLyBFbmdpbmUuZGV2aWNlUGl4ZWxzO1xuXG5cdFx0XHRcdElucHV0Lm1vdXNlLnggPSBseCAvIEVuZ2luZS5zY2FsZTtcblx0XHRcdFx0SW5wdXQubW91c2UueSA9IGx5IC8gRW5naW5lLnNjYWxlO1xuXHRcdFx0fVxuXG5cdFx0XHRmdW5jdGlvbiBvbktleShlLCBzdGF0ZSkge1xuXHRcdFx0XHR2YXIga2V5Q29kZSA9IGUua2V5Q29kZTtcblx0XHRcdFx0aWYgKElucHV0LmJpbmRpbmdzW2tleUNvZGVdKSB7XG5cdFx0XHRcdFx0SW5wdXQuYmluZGluZ3Nba2V5Q29kZV0uc2V0KHN0YXRlKTtcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChzdGF0ZSkge1xuXHRcdFx0XHRcdHN3aXRjaCAoa2V5Q29kZSkge1xuXHRcdFx0XHRcdGNhc2UgNzc6IC8vIG0gKG11dGUpXG5cdFx0XHRcdFx0XHRBc3NldHMubXVzaWMubXV0ZSgpO1xuXHRcdFx0XHRcdGNhc2UgMjc6IC8vIGVzY2FwZSAocGF1c2UpXG5cdFx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0XHRFbmdpbmUudG9nZ2xlUGF1c2UoKTtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignYmx1cicsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgYWxsS2V5cyA9IElucHV0LmFsbEtleXM7XG5cdFx0XHRcdGZvciAodmFyIGkgPSAwLCBsID0gYWxsS2V5cy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcblx0XHRcdFx0XHRhbGxLZXlzW2ldLmNsZWFyKCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0fSk7XG5cblx0XHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdG9uS2V5KGUsIHRydWUpO1xuXHRcdFx0fSk7XG5cblx0XHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwia2V5dXBcIiwgZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRvbktleShlLCBmYWxzZSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0Y2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZXVwXCIsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRJbnB1dC5tb3VzZS5idXR0b24uc2V0KGZhbHNlKTtcblx0XHRcdFx0dXBkYXRlTW91c2VQb3MoZS5jbGllbnRYLCBlLmNsaWVudFkpO1xuXHRcdFx0fSk7XG5cblx0XHRcdGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRJbnB1dC5tb3VzZS5idXR0b24uc2V0KHRydWUpO1xuXHRcdFx0XHR1cGRhdGVNb3VzZVBvcyhlLmNsaWVudFgsIGUuY2xpZW50WSk7XG5cdFx0XHRcdGlmIChFbmdpbmUucGF1c2VkKSB7XG5cdFx0XHRcdFx0RW5naW5lLnVucGF1c2UoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHR1cGRhdGVNb3VzZVBvcyhlLmNsaWVudFgsIGUuY2xpZW50WSk7XG5cdFx0XHR9KTtcblxuXHRcdH0sXG5cdFx0dXBkYXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBhbGxLZXlzID0gSW5wdXQuYWxsS2V5cztcblx0XHRcdGZvciAodmFyIGkgPSAwLCBsID0gYWxsS2V5cy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcblx0XHRcdFx0YWxsS2V5c1tpXS51cGRhdGUoKTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0cmV0dXJuIElucHV0O1xufSgpKTtcblxuRW5naW5lLk1vdXNlID0gRW5naW5lLklucHV0Lm1vdXNlO1xuRW5naW5lLktleXMgPSBFbmdpbmUuSW5wdXQua2V5cztcblxuRW5naW5lLnRvZ2dsZVBhdXNlID0gZnVuY3Rpb24oKSB7XG5cdGlmICghRW5naW5lLnBhdXNlZCkge1xuXHRcdEVuZ2luZS5wYXVzZWQgPSB0cnVlO1xuXHRcdEFzc2V0cy5tdXNpYy5wYXVzZSgpO1xuXHR9XG5cdGVsc2Uge1xuXHRcdEVuZ2luZS5wYXVzZWQgPSBmYWxzZTtcblx0XHRBc3NldHMubXVzaWMucGxheSgpOy8vKCdtYWluJyk7XG5cdFx0RW5naW5lLk1haW5Mb29wLnN0YXJ0KCk7XG5cdH1cbn07XG5cbkVuZ2luZS51bnBhdXNlID0gZnVuY3Rpb24oKSB7XG5cdGlmIChFbmdpbmUucGF1c2VkKSB7XG5cdFx0RW5naW5lLnBhdXNlZCA9IGZhbHNlO1xuXHRcdEVuZ2luZS5NYWluTG9vcC5zdGFydCgpO1xuXHR9XG59O1xuXG5mdW5jdGlvbiBtaXhpbih0eXBlLCBtaXhpbikge1xuXHRPYmplY3Qua2V5cyhtaXhpbikuZm9yRWFjaChmdW5jdGlvbihrKSB7XG5cdFx0dHlwZS5wcm90b3R5cGVba10gPSBtaXhpbltrXTtcblx0fSk7XG5cdHJldHVybiB0eXBlO1xufVxuXG5cbmZ1bmN0aW9uIGxlcnAoYSwgYiwgdCkge1xuXHRyZXR1cm4gKDEuMC10KSphICsgYip0O1xufVxuXG5mdW5jdGlvbiBjbGFtcCh2LCBtaW4sIG1heCkge1xuXHRyZXR1cm4gdiA8IG1pbiA/IG1pbiA6ICh2ID4gbWF4ID8gbWF4IDogdik7XG59XG5cbmZ1bmN0aW9uIGNsYW1wMDEodikge1xuXHRyZXR1cm4gY2xhbXAodiwgMCwgMSk7XG59O1xuXG5mdW5jdGlvbiBwaW5nUG9uZyh0LCBsZW4pIHtcblx0dCAtPSBNYXRoLmZsb29yKHQvKGxlbioyKSkqbGVuKjI7XG5cdHJldHVybiBsZW4gLSBNYXRoLmFicyh0IC0gbGVuKTtcbn1cblxuZnVuY3Rpb24gZGlzdEJldHdlZW4oeDAsIHkwLCB4MSwgeTEpIHtcblx0dmFyIGR4ID0geDEgLSB4MDtcblx0dmFyIGR5ID0geTEgLSB5MDtcblx0cmV0dXJuIE1hdGguc3FydChkeCpkeCtkeSpkeSk7XG59XG5cbmZ1bmN0aW9uIG5vcm1MZW4oeCwgeSkge1xuXHR2YXIgbCA9IHgqeCt5Knk7XG5cdGlmIChsIDwgMC4wMDEpIHtcblx0XHRyZXR1cm4gMS4wO1xuXHR9XG5cdHJldHVybiBNYXRoLnNxcnQobCk7XG59XG5cbi8vIEBOT1RFOiBwYXJ0aWFsIHJlbmRlcmVyIGJvdHRsZW5lY2suLi4gc29tZXdoYXQgb3B0aW1pemVkXG5mdW5jdGlvbiBicmVzZW5oYW0oeDAsIHkwLCB4MSwgeTEsIHBpeGVsRGF0YSwgY29sb3IpIHtcblx0eDAgPSB4MHwwOyB5MCA9IHkwfDA7IHgxID0geDF8MDsgeTEgPSB5MXwwOyBjb2xvciA9IGNvbG9yfDA7XG5cdHZhciBkeCA9IE1hdGguYWJzKHgxIC0geDApfDA7XG5cdHZhciBkeSA9IE1hdGguYWJzKHkxIC0geTApfDA7XG5cdHZhciBzeCA9ICh4MCA8IHgxKSA/IDEgOiAtMTtcblx0dmFyIHN5ID0gKHkwIDwgeTEpID8gMSA6IC0xO1xuXHR2YXIgZXJyID0gZHggLSBkeTtcblx0dmFyIHBpeCA9IHBpeGVsRGF0YS5waXhlbHM7XG5cdHZhciB3aWR0aCA9IHBpeGVsRGF0YS53aWR0aD4+PjA7XG5cdHZhciBoZWlnaHQgPSBwaXhlbERhdGEuaGVpZ2h0Pj4+MDtcblx0aWYgKHgwID49IDAgJiYgeDAgPCB3aWR0aCAmJiB5MCA+PSAwICYmIHkwIDwgaGVpZ2h0KSB7XG5cdFx0cGl4W3gwK3kwKndpZHRoXSA9IGNvbG9yO1xuXHR9XG5cdGVsc2UgaWYgKHgxIDwgMCB8fCB4MSA+PSB3aWR0aCB8fCB5MSA8IDAgJiYgeTEgPj0gaGVpZ2h0KSB7XG5cdFx0Ly8gdGVjaG5pY2FsbHkgbm90IGNvcnJlY3QgdG8gZG8gdGhpcyBidXQgd2UgZG9uJ3QgY2FyZVxuXHRcdC8vIGFib3V0IGxpbmVzIHRoYXQgc3RhcnQgYW5kIGVuZCBvZmYgc2NyZWVuXG5cdFx0Ly8gY29uc29sZS53YXJuKFwiYnJlc2VuaGFtIGVudGlyZWx5IG9mZiBzY3JlZW5cIilcblx0XHRyZXR1cm47XG5cdH1cblx0d2hpbGUgKHRydWUpIHtcblx0XHRwaXhbeDAreTAqd2lkdGhdID0gY29sb3I7XG5cdFx0aWYgKHgwID09PSB4MSAmJiB5MCA9PT0geTEpIHtcblx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdHZhciBlMiA9IGVyciA8PCAxO1xuXHRcdGlmIChlMiA+IC1keSkge1xuXHRcdFx0ZXJyIC09IGR5O1xuXHRcdFx0eDAgKz0gc3g7XG5cdFx0XHRpZiAoeDAgPCAwIHx8IHgwID4gd2lkdGgpIHtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmIChlMiA8ICBkeCkge1xuXHRcdFx0ZXJyICs9IGR4O1xuXHRcdFx0eTAgKz0gc3k7XG5cdFx0XHRpZiAoeTAgPCAwIHx8IHkwID4gaGVpZ2h0KSB7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufVxuXG52YXIgVGlsZVNpemUgPSAxMjtcblxuXG52YXIgTW92YWJsZSA9IHt9O1xuXG5FbmdpbmUuTW92YWJsZSA9IE1vdmFibGU7XG5Nb3ZhYmxlLmRvTW92ZSA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgcyA9IE1hdGguY2VpbChNYXRoLnNxcnQodGhpcy52eCp0aGlzLnZ4K3RoaXMudnkqdGhpcy52eSkpO1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IHM7ICsraSlcdHtcblx0XHR0aGlzLl9tb3ZlKHRoaXMudngvcywgMCk7XG5cdFx0dGhpcy5fbW92ZSgwLCB0aGlzLnZ5L3MpO1xuXHR9XG59O1xuXG5Nb3ZhYmxlLmtub2NrQmFjayA9IGZ1bmN0aW9uKHgsIHkpIHtcblx0dGhpcy52eCArPSAoeCAtIHRoaXMudngpKjIvNTtcblx0dGhpcy52eSArPSAoeSAtIHRoaXMudnkpKjIvNTtcbn07XG5cbk1vdmFibGUuYmxvY2tDaGVjayA9IGZ1bmN0aW9uKHgsIHkpIHtcblx0cmV0dXJuIChcblx0XHR0aGlzLmdhbWUuaXNCbG9ja2VkKHgtdGhpcy5yeCwgeS10aGlzLnJ5KSB8fFxuXHRcdHRoaXMuZ2FtZS5pc0Jsb2NrZWQoeC10aGlzLnJ4LCB5K3RoaXMucnkpIHx8XG5cdFx0dGhpcy5nYW1lLmlzQmxvY2tlZCh4K3RoaXMucngsIHktdGhpcy5yeSkgfHxcblx0XHR0aGlzLmdhbWUuaXNCbG9ja2VkKHgrdGhpcy5yeCwgeSt0aGlzLnJ5KVxuXHQpO1xufTtcblxuTW92YWJsZS5fbW92ZSA9IGZ1bmN0aW9uKGR4LCBkeSkge1xuXHRpZiAoIXRoaXMuYWN0aXZlKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdHZhciBueCA9IHRoaXMueCtkeDtcblx0dmFyIG55ID0gdGhpcy55K2R5O1xuXHQvLyBobS4uLi5cblx0aWYgKHRoaXMuYmxvY2tDaGVjayhueCwgbnkpKSB7XG5cdFx0dGhpcy5jb2xsaWRlKGR4LCBkeSk7XG5cdH1cblx0ZWxzZSB7XG5cdFx0dGhpcy54ID0gbng7XG5cdFx0dGhpcy55ID0gbnk7XG5cdH1cbn07XG5cbk1vdmFibGUuY29sbGlkZSA9IGZ1bmN0aW9uKGR4LCBkeSkge307XG5cblxuLy8gdGVudGFjbGVzIGFyZSBzdG9yZWQgYXMgYW4gYXJyYXkgb2Ygc3RydWN0cyBvZlxuLy8ge3gsIHksIHZlbFgsIHZlbFksIG9sZFgsIG9sZFl9XG52YXIgU0VHX1ggPSAwO1xudmFyIFNFR19ZID0gMTtcbnZhciBTRUdfVlggPSAyO1xudmFyIFNFR19WWSA9IDM7XG52YXIgU0VHX09MRF9YID0gNDtcbnZhciBTRUdfT0xEX1kgPSA1O1xudmFyIFNFR19TSVpFID0gNjtcbi8vIEBOT1RFOiB1cGRhdGUgYm90dGxlbmVjaywgb3B0aW1pemVkXG5mdW5jdGlvbiBUZW50YWNsZShudW1Qb2ludHMsIG94LCBveSwgcGFyZW50KSB7XG5cdHRoaXMucGFyZW50ID0gcGFyZW50O1xuXHR0aGlzLm9mZnNldFggPSBveDtcblx0dGhpcy5vZmZzZXRZID0gb3k7XG5cdHRoaXMubnVtUG9pbnRzID0gbnVtUG9pbnRzO1xuXHR0aGlzLmRhdGEgPSBuZXcgRmxvYXQzMkFycmF5KG51bVBvaW50cypTRUdfU0laRSk7XG5cdC8vIHt4LCB5LCB2eCwgdnksIG94LCBveSwgbngsIG55LCBhbmdsZX1cblx0dGhpcy5kcmFnID0gTWF0aC5yYW5kb20oKSowLjIgKyAwLjc1O1xuXHR0aGlzLmRyaWZ0ID0gKE1hdGgucmFuZG9tKCkgLSAwLjUpLzEwMFxuXHR0aGlzLnNlZ0xlbmd0aCA9IE1hdGgucmFuZG9tKCkgKiAwLjggKyAxLjA7XG5cdHZhciB0ciA9ICgweDMxK01hdGguZmxvb3IoKE1hdGgucmFuZG9tKCkgLSAwLjUpKjEwKSkgJiAweGZmO1xuXHR2YXIgdGcgPSAoMHgzMCtNYXRoLmZsb29yKChNYXRoLnJhbmRvbSgpIC0gMC41KSoxMCkpICYgMHhmZjtcblx0dmFyIHRiID0gKDB4MTArTWF0aC5mbG9vcigoTWF0aC5yYW5kb20oKSAtIDAuNSkqMTApKSAmIDB4ZmY7XG5cblx0dGhpcy5jb2xvciA9IDB4ZmYwMDAwMDB8KHRiPDwxNil8KHRnPDw4KXwodHIpOy8vMHhmZjEwMzAzMTtcbn1cblxuVGVudGFjbGUuc3BhY2luZyA9IDU7XG5UZW50YWNsZS5zaXplID0gMTtcblRlbnRhY2xlLmdsb2JhbERyYWcgPSAwLjAyO1xuVGVudGFjbGUuZ3Jhdml0eSA9IDAuMTtcblxuVGVudGFjbGUucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKHgsIHkpIHtcblx0aWYgKE1hdGgucmFuZG9tKCkgPCAwLjAxKSB7XG5cdFx0dGhpcy5kcmlmdCArPSAoTWF0aC5yYW5kb20oKSAtIDAuNSkvMTAwO1xuXHRcdGlmIChNYXRoLmFicyh0aGlzLmRyaWZ0KSA+PSAwLjEpIHtcblx0XHRcdHRoaXMuZHJpZnQgPSAwO1xuXHRcdH1cblx0fVxuXHR2YXIgZHJpZnRNdWwgPSB0aGlzLmRyaWZ0O1xuXHRpZiAoTWF0aC5yYW5kb20oKSA8IDAuMDEpIHtcblx0XHRkcmlmdE11bCA9IChNYXRoLnJhbmRvbSgpIC0gMC41KS8xMDtcblx0fVxuXHR2YXIgZHJpZnQgPSBkcmlmdE11bCAqIE1hdGguc3FydChNYXRoLnNxcnQodGhpcy5wYXJlbnQudngqdGhpcy5wYXJlbnQudnggKyB0aGlzLnBhcmVudC52eSp0aGlzLnBhcmVudC52eSkpO1xuXG5cdHZhciBteCA9IElucHV0Lm1vdXNlLndvcmxkWDtcblx0dmFyIG15ID0gSW5wdXQubW91c2Uud29ybGRZO1xuXHR2YXIgcGFyZW50WCA9IHRoaXMucGFyZW50Lng7XG5cdHZhciBwYXJlbnRZID0gdGhpcy5wYXJlbnQueTtcblxuXHR2YXIgbXhTY2FsZSA9IDA7XG5cdHZhciBteVNjYWxlID0gMDtcblxuXHR2YXIgcHJldlggPSB0aGlzLmRhdGFbU0VHX1hdO1xuXHR2YXIgcHJldlkgPSB0aGlzLmRhdGFbU0VHX1ldO1xuXG5cdHZhciBsZW5ndGggPSArdGhpcy5udW1Qb2ludHM7XG5cdHZhciBkYXRhID0gdGhpcy5kYXRhO1xuXHR2YXIgZHJhZyA9IHRoaXMuZHJhZyAqICgxLjAgLSBUZW50YWNsZS5nbG9iYWxEcmFnKTtcblx0dmFyIHNpemUgPSBUZW50YWNsZS5zaXplO1xuXHRpZiAoSW5wdXQubW91c2UuYnV0dG9uLmRvd24pIHtcblx0XHRteFNjYWxlID0gMi4wLyhFbmdpbmUuc2NyZWVuV2lkdGgvRW5naW5lLnNjYWxlKTtcblx0XHRteVNjYWxlID0gMi4wLyhFbmdpbmUuc2NyZWVuSGVpZ2h0L0VuZ2luZS5zY2FsZSk7XG5cdFx0c2l6ZSAqPSAyLjBcblx0fVxuXHRzaXplICo9IHRoaXMuc2VnTGVuZ3RoO1xuXG5cdC8vIHZhciBweCA9IElucHV0Lm1vdXNlLmJ1dHRvbjtcblxuXHQvLyBARklYTUU6IHNob3VsZCBiZSB1c2luZyBkZWx0YVRpbWUuLi5cblx0dmFyIGkgPSAwO1xuXHRmb3IgKHZhciBzZWdJZHggPSBTRUdfU0laRSwgZW5kID0gZGF0YS5sZW5ndGg7IHNlZ0lkeCA8IGVuZDsgc2VnSWR4ICs9IFNFR19TSVpFKSB7XG5cdFx0KytpO1xuXHRcdGRhdGFbc2VnSWR4K1NFR19YXSArPSBkYXRhW3NlZ0lkeCtTRUdfVlhdO1xuXHRcdGRhdGFbc2VnSWR4K1NFR19ZXSArPSBkYXRhW3NlZ0lkeCtTRUdfVlldO1xuXG5cdFx0dmFyIHNlZ1ggPSBkYXRhW3NlZ0lkeCtTRUdfWF07XG5cdFx0dmFyIHNlZ1kgPSBkYXRhW3NlZ0lkeCtTRUdfWV07XG5cblx0XHR2YXIgZHggPSBwcmV2WCAtIHNlZ1g7XG5cdFx0dmFyIGR5ID0gcHJldlkgLSBzZWdZO1xuXG5cdFx0dmFyIGRhID0gTWF0aC5hdGFuMihkeSwgZHgpO1xuXG5cdFx0dmFyIHB4ID0gc2VnWCArIE1hdGguY29zKGRhKSAqIHNpemU7XG5cdFx0dmFyIHB5ID0gc2VnWSArIE1hdGguc2luKGRhKSAqIHNpemU7XG5cblx0XHR2YXIgbWR4ID0gKG14IC0gKChpJjEpID8gc2VnWCA6IHBhcmVudFgpKyhNYXRoLnJhbmRvbSgpLTAuNSkqMTUpICogbXhTY2FsZTtcblx0XHR2YXIgbWR5ID0gKG15IC0gKChpJjEpID8gc2VnWSA6IHBhcmVudFkpKyhNYXRoLnJhbmRvbSgpLTAuNSkqMTUpICogbXlTY2FsZTtcblxuXHRcdHNlZ1ggPSBkYXRhW3NlZ0lkeCtTRUdfWF0gPSBwcmV2WCAtIChweCAtIHNlZ1gpO1xuXHRcdHNlZ1kgPSBkYXRhW3NlZ0lkeCtTRUdfWV0gPSBwcmV2WSAtIChweSAtIHNlZ1kpO1xuXG5cblx0XHRkYXRhW3NlZ0lkeCtTRUdfVlhdID0gKHNlZ1ggLSBkYXRhW3NlZ0lkeCtTRUdfT0xEX1hdKSpkcmFnIC0gZHJpZnQgKyBtZHg7XG5cdFx0ZGF0YVtzZWdJZHgrU0VHX1ZZXSA9IChzZWdZIC0gZGF0YVtzZWdJZHgrU0VHX09MRF9ZXSkqZHJhZyArIFRlbnRhY2xlLmdyYXZpdHkgKyBtZHk7XG5cblx0XHRkYXRhW3NlZ0lkeCtTRUdfT0xEX1hdID0gc2VnWDtcblx0XHRkYXRhW3NlZ0lkeCtTRUdfT0xEX1ldID0gc2VnWTtcblxuXHRcdHByZXZYID0gc2VnWDtcblx0XHRwcmV2WSA9IHNlZ1k7XG5cdH1cbn1cblxuVGVudGFjbGUucHJvdG90eXBlLnBhcmVudE1vdmVkID0gZnVuY3Rpb24oeCwgeSkge1xuXHR0aGlzLmRhdGFbU0VHX1hdID0geCt0aGlzLm9mZnNldFg7XG5cdHRoaXMuZGF0YVtTRUdfWV0gPSB5K3RoaXMub2Zmc2V0WTtcbn07XG5cblRlbnRhY2xlLnByb3RvdHlwZS5zZXRQb3NpdGlvbiA9IGZ1bmN0aW9uKHgsIHkpIHtcblx0eCArPSB0aGlzLm9mZnNldFg7XG5cdHkgKz0gdGhpcy5vZmZzZXRZO1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZGF0YS5sZW5ndGg7IGkgKz0gU0VHX1NJWkUpIHtcblx0XHR0aGlzLmRhdGFbaStTRUdfWF0gPSB4ICsgKE1hdGgucmFuZG9tKCkgLSAwLjUpLzEwO1xuXHRcdHRoaXMuZGF0YVtpK1NFR19ZXSA9IHkgKyAoTWF0aC5yYW5kb20oKSAtIDAuNSkvMTA7XG5cdH1cbn07XG5cblRlbnRhY2xlLnByb3RvdHlwZS5kcmF3UGF0aCA9IGZ1bmN0aW9uKGN0eCwgc3gsIHN5KSB7XG5cdHZhciBkYXRhID0gdGhpcy5kYXRhO1xuXHRjdHguYmVnaW5QYXRoKCk7XG5cdGN0eC5tb3ZlVG8oZGF0YVtTRUdfWF0tc3gsIGRhdGFbU0VHX1ldLXN5KTtcblx0Zm9yICh2YXIgaSA9IFNFR19TSVpFLCBlbmQgPSBkYXRhLmxlbmd0aDsgaSA8IGVuZDsgaSArPSBTRUdfU0laRSkge1xuXHRcdGN0eC5saW5lVG8oZGF0YVtpK1NFR19YXS1zeCswLjUsIGRhdGFbaStTRUdfWV0tc3krMC41KTtcblx0fVxufTtcblxuVGVudGFjbGUucHJvdG90eXBlLmdpYmlmeSA9IGZ1bmN0aW9uKGdhbWUpIHtcblx0dmFyIHN0cmlkZSA9IChNYXRoLmZsb29yKHRoaXMubnVtUG9pbnRzIC8gNSkpKlNFR19TSVpFO1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZGF0YS5sZW5ndGg7IGkgKz0gc3RyaWRlKSB7XG5cdFx0aWYgKGdhbWUuaXNCbG9ja2VkKHRoaXMuZGF0YVtpK1NFR19YXSwgdGhpcy5kYXRhW2krU0VHX1ldKSkge1xuXHRcdFx0Y29udGludWU7XG5cdFx0fVxuXHRcdHZhciBnaWIgPSBuZXcgR2liKGdhbWUsIHRoaXMuZGF0YVtpK1NFR19YXSwgdGhpcy5kYXRhW2krU0VHX1ldLCB0cnVlKTtcblx0XHRnaWIudnggKz0gdGhpcy5kYXRhW2krU0VHX1ZYXS8yLjA7XG5cdFx0Z2liLnZ5ICs9IHRoaXMuZGF0YVtpK1NFR19WWV0vMi4wO1xuXHRcdGdhbWUuYWRkRWZmZWN0KGdpYik7XG5cdH1cbn07XG5UZW50YWNsZS5wcm90b3R5cGUubWFrZVJlZGRlciA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgciA9IHRoaXMuY29sb3IgJiAweGZmO1xuXHRyID0gY2xhbXAociArIE1hdGguY2VpbChNYXRoLnJhbmRvbSgpICogNCksIDAsIDB4ZmYpO1xuXHR0aGlzLmNvbG9yID0gKHRoaXMuY29sb3IgJiAweGZmZmZmZjAwKXxyO1xufTtcblRlbnRhY2xlLnByb3RvdHlwZS5kcmF3T25QaXhlbHMgPSBmdW5jdGlvbihwaXhlbHMsIHN4LCBzeSwgY29sb3IpIHtcblx0dmFyIGRhdGEgPSB0aGlzLmRhdGE7XG5cblx0dmFyIHB4ID0gZGF0YVtTRUdfWF07XG5cdHZhciBweSA9IGRhdGFbU0VHX1ldO1xuXG5cdHZhciBtaW5YU2VlbiA9IHBpeGVscy5ib3VuZHMubWluWDtcblx0dmFyIG1pbllTZWVuID0gcGl4ZWxzLmJvdW5kcy5taW5ZO1xuXHR2YXIgbWF4WFNlZW4gPSBwaXhlbHMuYm91bmRzLm1heFg7XG5cdHZhciBtYXhZU2VlbiA9IHBpeGVscy5ib3VuZHMubWF4WTtcblxuXHRmb3IgKHZhciBpID0gU0VHX1NJWkUsIGVuZCA9IGRhdGEubGVuZ3RoOyBpIDwgZW5kOyBpICs9IFNFR19TSVpFKSB7XG5cdFx0dmFyIG54ID0gZGF0YVtpK1NFR19YXTtcblx0XHR2YXIgbnkgPSBkYXRhW2krU0VHX1ldO1xuXHRcdHZhciBzdGFydFggPSBNYXRoLnJvdW5kKHB4LXN4KTtcblx0XHR2YXIgc3RhcnRZID0gTWF0aC5yb3VuZChweS1zeSk7XG5cdFx0dmFyIGVuZFggPSBNYXRoLnJvdW5kKG54LXN4KTtcblx0XHR2YXIgZW5kWSA9IE1hdGgucm91bmQobnktc3kpO1xuXHRcdGJyZXNlbmhhbShzdGFydFgsIHN0YXJ0WSwgZW5kWCwgZW5kWSwgcGl4ZWxzLCBjb2xvcik7XG5cblxuXHRcdG1pblhTZWVuID0gTWF0aC5taW4obWluWFNlZW4sIHN0YXJ0WCwgZW5kWCk7XG5cdFx0bWluWVNlZW4gPSBNYXRoLm1pbihtaW5ZU2Vlbiwgc3RhcnRZLCBlbmRZKTtcblxuXHRcdG1heFhTZWVuID0gTWF0aC5tYXgobWF4WFNlZW4sIHN0YXJ0WCwgZW5kWCk7XG5cdFx0bWF4WVNlZW4gPSBNYXRoLm1heChtYXhZU2Vlbiwgc3RhcnRZLCBlbmRZKTtcblxuXHRcdHB4ID0gbng7XG5cdFx0cHkgPSBueTtcblx0fVxuXHRwaXhlbHMuYm91bmRzLm1pblggPSBtaW5YU2Vlbjtcblx0cGl4ZWxzLmJvdW5kcy5taW5ZID0gbWluWVNlZW47XG5cdHBpeGVscy5ib3VuZHMubWF4WCA9IG1heFhTZWVuO1xuXHRwaXhlbHMuYm91bmRzLm1heFkgPSBtYXhZU2VlbjtcblxufTtcblxuZnVuY3Rpb24gTW9uc3RlcihnYW1lKSB7XG5cdHRoaXMudnggPSAwO1xuXHR0aGlzLnZ5ID0gMDtcblx0dGhpcy50aW1lciA9IG5ldyBUaW1lcigpO1xuXG5cdHRoaXMuaHAgPSAxMDA7XG5cdHRoaXMubWF4SHAgPSAxMDA7XG5cdHRoaXMuYWN0aXZlID0gdHJ1ZTtcblxuXHR0aGlzLmRlYXRoVGltZXIgPSAwO1xuXG5cdHRoaXMuYmxpbmtUaW1lID0gMDtcblx0dGhpcy5ibGlua2luZyA9IGZhbHNlO1xuXG5cdHRoaXMueCA9IDA7XG5cdHRoaXMueSA9IDA7XG5cdHRoaXMucnggPSAwXG5cdHRoaXMucnkgPSAwO1xuXG5cdHRoaXMuaGl0VGltZXIgPSAwO1xuXG5cdHRoaXMuc3ByaXRlcyA9IEFzc2V0cy5pbWFnZXMuc3ByaXRlcztcblx0dGhpcy50ZW50YWNsZXMgPSBbXTtcblx0dGhpcy5zZXRTaXplKDIpO1xuXHR0aGlzLmdhbWUgPSBnYW1lO1xuXHR0aGlzLmludmluY2libGVUaW1lciA9IDA7XG59XG5cbm1peGluKE1vbnN0ZXIsIE1vdmFibGUpO1xuXG5Nb25zdGVyLlNpemVEYXRhID0gW1xuXHR7XG5cdFx0c3ByaXRlczoge1xuXHRcdFx0d2lkdGg6IDE1LFxuXHRcdFx0aGVpZ2h0OiAxMSxcblx0XHRcdHg6IDAsXG5cdFx0XHR5OiAyNCxcblx0XHR9LFxuXHRcdHRlbnRhY2xlUG9zaXRpb25zOiBbXVxuXHR9LFxuXHR7XG5cdFx0c3ByaXRlczoge1xuXHRcdFx0d2lkdGg6IDE5LFxuXHRcdFx0aGVpZ2h0OiAxMixcblx0XHRcdHg6IDAsXG5cdFx0XHR5OiAxMixcblx0XHR9LFxuXHRcdHRlbnRhY2xlUG9zaXRpb25zOiBbXVxuXHR9LFxuXHR7XG5cdFx0c3ByaXRlczoge1xuXHRcdFx0d2lkdGg6IDIyLFxuXHRcdFx0aGVpZ2h0OiAxMixcblx0XHRcdHg6IDAsXG5cdFx0XHR5OiAwLFxuXHRcdH0sXG5cdFx0dGVudGFjbGVQb3NpdGlvbnM6IFtdXG5cdH0sXG5dO1xuXG5Nb25zdGVyLmluaXRUZW50YWNsZVBvc2l0aW9ucyA9IGZ1bmN0aW9uKGltYWdlKSB7XG5cdHZhciBwaXhlbERhdGEgPSBpbWFnZS5nZXRQaXhlbERhdGEoKTtcblx0dmFyIHBpeGVsV2lkdGggPSBwaXhlbERhdGEud2lkdGg7XG5cdHZhciBwaXhlbHMgPSBwaXhlbERhdGEucGl4ZWxzO1xuXHRNb25zdGVyLlNpemVEYXRhLmZvckVhY2goZnVuY3Rpb24oc2l6ZSwgaSkge1xuXHRcdHZhciBzcHJpdGVJbmZvID0gc2l6ZS5zcHJpdGVzO1xuXG5cdFx0dmFyIHN4ID0gc3ByaXRlSW5mby54ICsgc3ByaXRlSW5mby53aWR0aCo1O1xuXHRcdHZhciBzeSA9IHNwcml0ZUluZm8ueTtcblxuXHRcdHZhciBzaCA9IHNwcml0ZUluZm8uaGVpZ2h0O1xuXHRcdHZhciBzdyA9IHNwcml0ZUluZm8ud2lkdGg7XG5cblx0XHRmb3IgKHZhciB5ID0gMDsgeSA8IHNoOyArK3kpIHtcblx0XHRcdGZvciAodmFyIHggPSAwOyB4IDwgc3c7ICsreCkge1xuXHRcdFx0XHR2YXIgcHggPSBzeCArIHg7XG5cdFx0XHRcdHZhciBweSA9IHN5ICsgeTtcblx0XHRcdFx0dmFyIHBpeGVsID0gcGl4ZWxzW3B4ICsgcHkgKiBwaXhlbFdpZHRoXTtcblx0XHRcdFx0aWYgKChwaXhlbCAmIDB4ZmYwMDAwMDApICE9PSAwKSB7XG5cdFx0XHRcdFx0c2l6ZS50ZW50YWNsZVBvc2l0aW9ucy5wdXNoKHt4OiB4LXNwcml0ZUluZm8ud2lkdGgvMiwgeTogeS1zcHJpdGVJbmZvLmhlaWdodC8yfSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH0pO1xufVxuXG5Nb25zdGVyLnByb3RvdHlwZS5odXJ0Rm9yID0gZnVuY3Rpb24oYW10KSB7XG5cdGlmICh0aGlzLmludmluY2libGVUaW1lciA+IDApIHtcblx0XHRyZXR1cm47XG5cdH1cblx0aWYgKHRoaXMuaGl0VGltZXIgPiAwKSB7XG5cdFx0dGhpcy5oaXRUaW1lci0tO1xuXHRcdHJldHVybjtcblx0fVxuXHR0aGlzLmdhbWUuY2FtZXJhLnNjcmVlblNoYWtlKE1hdGguY2VpbChhbXQvMikpO1xuXHROYU5DaGVjayhhbXQpO1xuXHR0aGlzLmhpdFRpbWVyID0gMjA7XG5cdHRoaXMuaHAgLT0gYW10O1xuXHR0aGlzLmJsb29keVRlbnRhY2xlcyhhbXQpO1xuXG5cdGlmICh0aGlzLmhwIDwgMCkge1xuXHRcdHRoaXMuaHAgPSAwO1xuXHR9XG5cdEFzc2V0cy5zb3VuZHMub3VjaC5wbGF5KCk7XG5cdGlmICh0aGlzLmhwID09PSAwKSB7XG5cdFx0dGhpcy5kaWUoKTtcblx0fVxuXHRlbHNlIHtcblx0XHRpZiAoIXRoaXMuYmxpbmtpbmcpIHtcblx0XHRcdHRoaXMuYmxpbmtpbmcgPSB0cnVlO1xuXHRcdFx0Ly8gdGhpcy5ibGlua1RpbWUgPSAwO1xuXHRcdH1cblx0fVxufTtcblxuTW9uc3Rlci5wcm90b3R5cGUuZGllID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuZGVhZCA9IHRydWU7XG5cdHRoaXMuZGVhdGhUaW1lciA9IDEyMDtcblx0QXNzZXRzLnNvdW5kcy5wbGF5ZXJEaWUucGxheSgpO1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IDMwOyArK2kpIHtcblx0XHR2YXIgb3ggPSBNYXRoLnJhbmRvbSgpICogdGhpcy53aWR0aCAtIHRoaXMud2lkdGgvMjtcblx0XHR2YXIgb3kgPSBNYXRoLnJhbmRvbSgpICogdGhpcy5oZWlnaHQgLSB0aGlzLmhlaWdodCAvIDI7XG5cdFx0dGhpcy5nYW1lLmFkZEVmZmVjdChuZXcgR2liKHRoaXMuZ2FtZSwgdGhpcy54K294LCB0aGlzLnkrb3ksIHRydWUpKTtcblx0fVxuXHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMudGVudGFjbGVzLmxlbmd0aDsgKytpKSB7XG5cdFx0dGhpcy50ZW50YWNsZXNbaV0uZ2liaWZ5KHRoaXMuZ2FtZSk7XG5cdH1cbn07XG5cbi8vXG5Nb25zdGVyLnByb3RvdHlwZS5ibG9ja0NoZWNrID0gZnVuY3Rpb24oeCwgeSkge1xuXHRyZXR1cm4gKFxuXHRcdHRoaXMuZ2FtZS5pc0Jsb2NrZWQoeC10aGlzLnJ4LCB5LXRoaXMucnkpIHx8XG5cdFx0dGhpcy5nYW1lLmlzQmxvY2tlZCh4LXRoaXMucngsIHkrdGhpcy5yeSkgfHxcblx0XHR0aGlzLmdhbWUuaXNCbG9ja2VkKHgtdGhpcy5yeCwgeSkgfHxcblx0XHR0aGlzLmdhbWUuaXNCbG9ja2VkKHgrdGhpcy5yeCwgeS10aGlzLnJ5KSB8fFxuXHRcdHRoaXMuZ2FtZS5pc0Jsb2NrZWQoeCt0aGlzLnJ4LCB5K3RoaXMucnkpIHx8XG5cdFx0dGhpcy5nYW1lLmlzQmxvY2tlZCh4K3RoaXMucngsIHkpIHx8XG5cdFx0dGhpcy5nYW1lLmlzQmxvY2tlZCh4LCB5LXRoaXMucnkpIHx8XG5cdFx0dGhpcy5nYW1lLmlzQmxvY2tlZCh4LCB5K3RoaXMucnkpIHx8XG5cdFx0dGhpcy5nYW1lLmlzQmxvY2tlZCh4LCB5KVxuXHQpO1xufTtcbi8vIEBIQUNLXG5Nb25zdGVyLnByb3RvdHlwZS5zcGlrZUNoZWNrID0gZnVuY3Rpb24oeCwgeSkge1xuXHRyZXR1cm4gKFxuXHRcdHRoaXMuZ2FtZS5pc1NwaWtlVGlsZSh4LXRoaXMucngsIHktdGhpcy5yeSkgfHxcblx0XHR0aGlzLmdhbWUuaXNTcGlrZVRpbGUoeC10aGlzLnJ4LCB5K3RoaXMucnkpIHx8XG5cdFx0dGhpcy5nYW1lLmlzU3Bpa2VUaWxlKHgtdGhpcy5yeCwgeSkgfHxcblx0XHR0aGlzLmdhbWUuaXNTcGlrZVRpbGUoeCt0aGlzLnJ4LCB5LXRoaXMucnkpIHx8XG5cdFx0dGhpcy5nYW1lLmlzU3Bpa2VUaWxlKHgrdGhpcy5yeCwgeSt0aGlzLnJ5KSB8fFxuXHRcdHRoaXMuZ2FtZS5pc1NwaWtlVGlsZSh4K3RoaXMucngsIHkpIHx8XG5cdFx0dGhpcy5nYW1lLmlzU3Bpa2VUaWxlKHgsIHktdGhpcy5yeSkgfHxcblx0XHR0aGlzLmdhbWUuaXNTcGlrZVRpbGUoeCwgeSt0aGlzLnJ5KSB8fFxuXHRcdHRoaXMuZ2FtZS5pc1NwaWtlVGlsZSh4LCB5KVxuXHQpO1xufTtcblxuTW9uc3Rlci5wcm90b3R5cGUuc2V0UG9zaXRpb24gPSBmdW5jdGlvbih4LCB5KSB7XG5cdHRoaXMueCA9IHg7XG5cdHRoaXMueSA9IHk7XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy50ZW50YWNsZXMubGVuZ3RoOyArK2kpIHtcblx0XHR0aGlzLnRlbnRhY2xlc1tpXS5zZXRQb3NpdGlvbih4LCB5KTtcblx0fVxufVxuXG5Nb25zdGVyLnByb3RvdHlwZS5zZXRTaXplID0gZnVuY3Rpb24obCkge1xuXHR0aGlzLnNpemUgPSBsO1xuXHR2YXIgc2l6ZURhdGEgPSBNb25zdGVyLlNpemVEYXRhW2xdO1xuXHR0aGlzLndpZHRoID0gTW9uc3Rlci5TaXplRGF0YVtsXS5zcHJpdGVzLndpZHRoO1xuXHR0aGlzLnJ4ID0gdGhpcy53aWR0aC8yO1xuXHR0aGlzLmhlaWdodCA9IE1vbnN0ZXIuU2l6ZURhdGFbbF0uc3ByaXRlcy5oZWlnaHQ7XG5cdHRoaXMucnkgPSB0aGlzLmhlaWdodC8yO1xuXG5cdHRoaXMuc3ByaXRlID0gMDtcblx0dGhpcy50ZW50YWNsZXMubGVuZ3RoID0gMDtcblxuXHRmb3IgKHZhciBpID0gMDsgaSA8IHNpemVEYXRhLnRlbnRhY2xlUG9zaXRpb25zLmxlbmd0aDsgKytpKSB7XG5cdFx0dmFyIG51bVBvaW50cyA9IE1hdGguZmxvb3IobCAqIDUgKyA1ICogTWF0aC5yYW5kb20oKSArIDIwKTtcblx0XHR0aGlzLnRlbnRhY2xlcy5wdXNoKG5ldyBUZW50YWNsZShudW1Qb2ludHMsIHNpemVEYXRhLnRlbnRhY2xlUG9zaXRpb25zW2ldLngsIHNpemVEYXRhLnRlbnRhY2xlUG9zaXRpb25zW2ldLnksIHRoaXMpKTtcblx0XHRpZiAoTWF0aC5yYW5kb20oKSA8IDAuMSkge1xuXHRcdFx0dGhpcy50ZW50YWNsZXMucHVzaChuZXcgVGVudGFjbGUobnVtUG9pbnRzLCBzaXplRGF0YS50ZW50YWNsZVBvc2l0aW9uc1tpXS54LCBzaXplRGF0YS50ZW50YWNsZVBvc2l0aW9uc1tpXS55LCB0aGlzKSk7XG5cdFx0fVxuXHR9XG59O1xuXG5Nb25zdGVyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcblxuXG5cdGlmICh0aGlzLmRlYWQpIHtcblx0XHQtLXRoaXMuZGVhdGhUaW1lcjtcblx0XHRpZiAodGhpcy5kZWF0aFRpbWVyID09PSAwKSB7XG5cdFx0XHRpZiAodGhpcy5zaXplID09PSAwKSB7XG5cdFx0XHRcdEVuZ2luZS5nYW1lT3ZlcigpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHRoaXMuc2V0U2l6ZSh0aGlzLnNpemUtMSk7XG5cdFx0XHRcdHRoaXMuZGVhZCA9IGZhbHNlO1xuXHRcdFx0XHR0aGlzLmhwID0gdGhpcy5tYXhIcCA9IDEwMDtcblx0XHRcdFx0dGhpcy5pbnZpbmNpYmxlVGltZXIgPSAxMjA7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybjtcblx0fVxuXHR0aGlzLnRpbWVyLnVwZGF0ZSgpO1xuXHRpZiAoTWF0aC5yYW5kb20oKSA8IDAuMDEgJiYgdGhpcy50aW1lci50ZXN0T3JTZXQoJ2JsaW5rJywgMjQwKSkge1xuXHRcdHRoaXMuYmxpbmtpbmcgPSB0cnVlO1xuXHR9XG5cblx0aWYgKHRoaXMuYmxpbmtpbmcpIHtcblx0XHQrK3RoaXMuYmxpbmtUaW1lO1xuXHRcdGlmICh0aGlzLmJsaW5rVGltZSA+PSAyMCkge1xuXHRcdFx0dGhpcy5ibGlua1RpbWUgPSAwO1xuXHRcdFx0dGhpcy5ibGlua2luZyA9IGZhbHNlO1xuXHRcdH1cblx0fVxuXG5cdGlmICh0aGlzLmludmluY2libGVUaW1lciA+IDApIHtcblx0XHQtLXRoaXMuaW52aW5jaWJsZVRpbWVyO1xuXHR9XG5cdGlmICh0aGlzLmhpdFRpbWVyID4gMCkge1xuXHRcdC0tdGhpcy5oaXRUaW1lcjtcblx0fVxuXHRlbHNlIHtcblx0XHQvLyBpZiAodGhpcy5ocCA8IHRoaXMubWF4SHApIHtcblx0XHRcdC8vdGhpcy5ocCArPSAwLjA1O1xuXHRcdC8vIH1cblx0fVxuXHR0aGlzLm1vdmUoKTtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnRlbnRhY2xlcy5sZW5ndGg7ICsraSkge1xuXHRcdHRoaXMudGVudGFjbGVzW2ldLnBhcmVudE1vdmVkKHRoaXMueCwgdGhpcy55KTtcblx0XHR0aGlzLnRlbnRhY2xlc1tpXS51cGRhdGUoKTtcblx0fVxufTtcblxuTW9uc3Rlci5zcGVlZCA9IDEvMTA7XG5Nb25zdGVyLmRyYWcgPSAwLjk4O1xuXG5Nb25zdGVyLnByb3RvdHlwZS5tb3ZlID0gZnVuY3Rpb24oKSB7XG5cdHZhciBkZHggPSAwO1xuXHR2YXIgZGR5ID0gMDtcblx0Ly9pZiAodGhpcy5oaXRUaW1lciA9PT0gMClcblx0e1xuXHRcdGlmIChJbnB1dC5rZXlzLmxlZnQuZG93bikge1xuXHRcdFx0ZGR4LS07XG5cdFx0fVxuXHRcdGlmIChJbnB1dC5rZXlzLnJpZ2h0LmRvd24pIHtcblx0XHRcdGRkeCsrO1xuXHRcdH1cblx0XHRpZiAoSW5wdXQua2V5cy5kb3duLmRvd24pIHtcblx0XHRcdGRkeSsrO1xuXHRcdH1cblx0XHRpZiAoSW5wdXQua2V5cy51cC5kb3duKSB7XG5cdFx0XHRkZHktLTtcblx0XHR9XG5cblx0fVxuXG5cdC8vIHZhciBkZHkgPSAwO1xuXHQvLyBpZiAoSW5wdXQua2V5cy51cC5wcmVzc2VkKSB7XG5cdC8vIFx0ZGR5LS07XG5cdC8vIH1cblxuXG5cdGRkeCAqPSBNb25zdGVyLnNwZWVkO1xuXHRkZHkgKj0gTW9uc3Rlci5zcGVlZDsvLyBNb25zdGVyLmp1bXBQb3dlcjtcblxuXHQvL2RkeSArPSBNb25zdGVyLmdyYXZpdHk7IC8vIGdyYXZpdHlcblx0dGhpcy52eCArPSBkZHg7XG5cdHRoaXMudnkgKz0gZGR5O1xuXHR0aGlzLnZ4ICo9IE1vbnN0ZXIuZHJhZztcblx0dGhpcy52eSAqPSBNb25zdGVyLmRyYWc7XG5cblx0dGhpcy5kb01vdmUoKTtcblxufTtcblxuTW9uc3Rlci5wcm90b3R5cGUuY29sbGlkZSA9IGZ1bmN0aW9uKGR4LCBkeSkge1xuXHRpZiAoZHggIT09IDApIHRoaXMudnggPSAwO1xuXHRpZiAoZHkgIT09IDApIHRoaXMudnkgPSAwO1xuXG5cdHZhciBueCA9IHRoaXMueCArIGR4O1xuXHR2YXIgbnkgPSB0aGlzLnkgKyBkeTtcblxuXHRpZiAodGhpcy5zcGlrZUNoZWNrKG54LCBueSkpe1xuXHRcdGlmICh0aGlzLmhpdFRpbWVyID09PSAwKSB7XG5cdFx0XHRjb25zb2xlLmxvZyhcImh1cnQ6IHNwaWtlXCIpO1xuXHRcdFx0dGhpcy5odXJ0Rm9yKDEwKTtcblx0XHRcdGlmIChkeCAhPT0gMCkgdGhpcy52eCA9IC1keCozO1xuXHRcdFx0aWYgKGR5ICE9PSAwKSB0aGlzLnZ5ID0gLWR5KjM7XG5cdFx0fVxuXHR9XG59O1xuXG5Nb25zdGVyLnByb3RvdHlwZS5zcHJpdGVYID0gZnVuY3Rpb24oKSB7XG5cdHZhciBzaXplRGF0YSA9IE1vbnN0ZXIuU2l6ZURhdGFbdGhpcy5zaXplXVxuXHR2YXIgc3ByaXRlID0gdGhpcy5zcHJpdGU7XG5cdHZhciBibGlua1RpbWUgPSB0aGlzLmJsaW5rVGltZT4+MTtcblx0aWYgKGJsaW5rVGltZSA+IDUpIHtcblx0XHRibGlua1RpbWUgPSAxMCAtIGJsaW5rVGltZTtcblx0fVxuXHRlbHNlIHtcblx0XHRibGlua1RpbWUgPSBibGlua1RpbWU7XG5cdH1cblx0c3ByaXRlICs9IGJsaW5rVGltZTtcblxuXHRyZXR1cm4gc3ByaXRlICogc2l6ZURhdGEuc3ByaXRlcy53aWR0aDtcbn07XG5cbk1vbnN0ZXIucHJvdG90eXBlLnNwcml0ZVkgPSBmdW5jdGlvbigpIHtcblx0dmFyIHNpemVEYXRhID0gTW9uc3Rlci5TaXplRGF0YVt0aGlzLnNpemVdO1xuXHRyZXR1cm4gc2l6ZURhdGEuc3ByaXRlcy55O1xufTtcblxuTW9uc3Rlci5wcm90b3R5cGUuYmxvb2R5VGVudGFjbGVzID0gZnVuY3Rpb24oYW1vdW50KSB7XG5cdGlmICghYW1vdW50KSB7XG5cdFx0YW1vdW50ID0gMTsvL01hdGguY2VpbChNYXRoLnJhbmRvbSgpICogNSArIDUpO1xuXHR9XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhbW91bnQ7ICsraSkge1xuXHRcdHRoaXMudGVudGFjbGVzWyhNYXRoLnJhbmRvbSgpKnRoaXMudGVudGFjbGVzLmxlbmd0aCl8MF0ubWFrZVJlZGRlcigpO1xuXHR9XG59O1xuXG5FbmdpbmUuTW9uc3RlciA9IE1vbnN0ZXI7XG5cbmZ1bmN0aW9uIFBpeGVsQnVmZmVyKHcsIGgpIHtcblx0dGhpcy53aWR0aCA9IHc7XG5cdHRoaXMuaGVpZ2h0ID0gaDtcblx0dGhpcy5jYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblx0dGhpcy5jb250ZXh0ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxuXG5cdHRoaXMuY2FudmFzLndpZHRoID0gdztcblx0dGhpcy5jYW52YXMuaGVpZ2h0ID0gaDtcblx0dGhpcy5pbWFnZURhdGEgPSB0aGlzLmNvbnRleHQuY3JlYXRlSW1hZ2VEYXRhKHcsIGgpO1xuXHR0aGlzLmJvdW5kcyA9IHsgbWluWDogdywgbWF4WDogMCwgbWluWTogaCwgbWF4WTogMCB9O1xuXHR0aGlzLnBpeGVscyA9IG5ldyBVaW50MzJBcnJheSh0aGlzLmltYWdlRGF0YS5kYXRhLmJ1ZmZlcik7XG5cdHRoaXMudHJhY2tCb3VuZHMgPSBmYWxzZTtcbn1cblxuUGl4ZWxCdWZmZXIucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuYm91bmRzLm1pblggPSB0aGlzLndpZHRoO1xuXHR0aGlzLmJvdW5kcy5tYXhYID0gMDtcblx0dGhpcy5ib3VuZHMubWluWSA9IHRoaXMuaGVpZ2h0O1xuXHR0aGlzLmJvdW5kcy5tYXhZID0gMDtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnBpeGVscy5sZW5ndGg7ICsraSkge1xuXHRcdHRoaXMucGl4ZWxzW2ldID0gMDtcblx0fVxufTtcblxuUGl4ZWxCdWZmZXIucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLmNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcblx0dGhpcy5jb250ZXh0LnB1dEltYWdlRGF0YSh0aGlzLmltYWdlRGF0YSwgMCwgMCk7XG59O1xuXG5QaXhlbEJ1ZmZlci5wcm90b3R5cGUucHV0UGl4ZWwgPSBmdW5jdGlvbih4LCB5LCBjKSB7XG5cdGlmICh4ID49IDAgJiYgeCA8IHRoaXMud2lkdGggJiYgeSA+PSAwICYmIHkgPCB0aGlzLmhlaWdodCkge1xuXHRcdHRoaXMucGl4ZWxzW3greSp0aGlzLndpZHRoXSA9IGM7XG5cdFx0aWYgKHRoaXMudHJhY2tCb3VuZHMpIHtcblx0XHRcdHRoaXMubWluWCA9IE1hdGgubWluKHRoaXMubWluWCwgeCk7XG5cdFx0XHR0aGlzLm1heFggPSBNYXRoLm1heCh0aGlzLm1heFgsIHgpO1xuXHRcdFx0dGhpcy5taW5ZID0gTWF0aC5taW4odGhpcy5taW5ZLCB5KTtcblx0XHRcdHRoaXMubWF4WSA9IE1hdGgubWF4KHRoaXMubWF4WSwgeSk7XG5cdFx0fVxuXHR9XG59O1xuXG5mdW5jdGlvbiBUaW1lcigpIHtcblx0dGhpcy5pdGVtcyA9IFtdO1xufVxuXG5UaW1lci5wcm90b3R5cGUuZmluZCA9IGZ1bmN0aW9uKG5hbWUpIHtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLml0ZW1zLmxlbmd0aDsgKytpKSB7XG5cdFx0aWYgKHRoaXMuaXRlbXNbaV0ubmFtZSA9PT0gbmFtZSkge1xuXHRcdFx0cmV0dXJuIGk7XG5cdFx0fVxuXHR9XG5cdHJldHVybiAtMTtcbn07XG5cblRpbWVyLnByb3RvdHlwZS50ZXN0ID0gZnVuY3Rpb24obmFtZSkge1xuXHR2YXIgaWR4ID0gdGhpcy5maW5kKG5hbWUpO1xuXHRpZiAoaWR4IDwgMCkge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cdHJldHVybiB0aGlzLml0ZW1zW2lkeF0uZGVsYXkgPiAwO1xufTtcblxuVGltZXIucHJvdG90eXBlLnRlc3RPclNldCA9IGZ1bmN0aW9uKG5hbWUsIGRlbGF5KSB7XG5cdHZhciBpZHggPSB0aGlzLmZpbmQobmFtZSk7XG5cdGlmIChpZHggPCAwKSB7XG5cdFx0dGhpcy5pdGVtcy5wdXNoKHtkZWxheTogZGVsYXksIG5hbWU6IG5hbWV9KTtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXHRyZXR1cm4gZmFsc2U7XG59O1xuXG5UaW1lci5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24obmFtZSwgZGVsYXkpIHtcblx0dmFyIGlkeCA9IHRoaXMuZmluZChuYW1lKTtcblx0aWYgKGlkeCA8IDApIHtcblx0XHR0aGlzLml0ZW1zLnB1c2goe2RlbGF5OiBkZWxheSwgbmFtZTogbmFtZX0pO1xuXHR9XG5cdGVsc2Uge1xuXHRcdHRoaXMuaXRlbXNbaWR4XS5kZWxheSA9IGRlbGF5O1xuXHR9XG59O1xuXG5UaW1lci5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbihuYW1lKSB7XG5cdGlmICghbmFtZSkge1xuXHRcdHRoaXMuaXRlbXMubGVuZ3RoID0gMDtcblx0fVxuXHRlbHNlIHtcblx0XHR2YXIgaWR4ID0gdGhpcy5maW5kKG5hbWUpO1xuXHRcdGlmIChpZHggPj0gMCkge1xuXHRcdFx0dGhpcy5pdGVtc1tpZHhdID0gdGhpcy5pdGVtc1t0aGlzLml0ZW1zLmxlbmd0aC0xXTtcblx0XHRcdHRoaXMuaXRlbXMucG9wKCk7XG5cdFx0fVxuXHR9XG59O1xuXG5UaW1lci5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24obmFtZSkge1xuXHRpZiAoIW5hbWUpIHtcblx0XHR2YXIgaiA9IDA7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLml0ZW1zLmxlbmd0aDsgKytpKSB7XG5cdFx0XHR0aGlzLml0ZW1zW2ldLmRlbGF5LS07XG5cdFx0XHRpZiAodGhpcy5pdGVtc1tpXS5kZWxheSA+IDApIHtcblx0XHRcdFx0dGhpcy5pdGVtc1tqKytdID0gdGhpcy5pdGVtc1tpXTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dGhpcy5pdGVtcy5sZW5ndGggPSBqO1xuXHR9XG5cdGVsc2Uge1xuXHRcdHZhciBpZHggPSB0aGlzLmZpbmQobmFtZSk7XG5cdFx0aWYgKGlkeCA+PSAwKSB7XG5cdFx0XHR0aGlzLml0ZW1zW2lkeF0uZGVsYXktLTtcblx0XHRcdGlmICh0aGlzLml0ZW1zW2lkeF0uZGVsYXkgPD0gMCkge1xuXHRcdFx0XHR0aGlzLml0ZW1zW2lkeF0gPSB0aGlzLml0ZW1zW3RoaXMuaXRlbXMubGVuZ3RoLTFdO1xuXHRcdFx0XHR0aGlzLml0ZW1zLnBvcCgpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufTtcblxuRW5naW5lLlRpbWVyID0gVGltZXI7XG5cbmZ1bmN0aW9uIENhbWVyYShnYW1lKSB7XG5cdHRoaXMuZ2FtZSA9IGdhbWU7XG5cdC8vIHRoaXMueEJvdW5kID0gZ2FtZS5jb2x1bW5zICogVGlsZVNpemU7XG5cdC8vIHRoaXMueUJvdW5kID0gZ2FtZS5yb3dzICogVGlsZVNpemU7XG5cdHRoaXMuZm9jdXMgPSB0aGlzLmdhbWUucGxheWVyO1xuXHR0aGlzLndpZHRoID0gRW5naW5lLnNjcmVlbldpZHRoIC8gRW5naW5lLnNjYWxlO1xuXHR0aGlzLmhlaWdodCA9IEVuZ2luZS5zY3JlZW5IZWlnaHQgLyBFbmdpbmUuc2NhbGU7XG5cdHRoaXMubWluWCA9IDA7XG5cdHRoaXMubWF4WCA9IDA7XG5cdHRoaXMubWluWSA9IDA7XG5cdHRoaXMubWF4WSA9IDA7XG5cblx0dGhpcy54ID0gdGhpcy5mb2N1cy54O1xuXHR0aGlzLnkgPSB0aGlzLmZvY3VzLnk7XG59XG5cbkNhbWVyYS5sb29rYWhlYWQgPSAxLjI7XG5DYW1lcmEuc3BlZWQgPSAzLjU7XG5cbkNhbWVyYS5wcm90b3R5cGUuc2NyZWVuU2hha2UgPSBmdW5jdGlvbihhbXQpIHtcblx0aWYgKCFhbXQpIHtcblx0XHRhbXQgPSA0O1xuXHR9XG5cdHZhciBveCwgb3k7XG5cdGRvIHtcblx0XHRveCA9IE1hdGgucmFuZG9tKCkgKiAyIC0gMTtcblx0XHRveSA9IE1hdGgucmFuZG9tKCkgKiAyIC0gMTtcblx0fSB3aGlsZSAob3gqb3grb3kqb3kgPiAxKTtcblx0b3ggKj0gYW10O1xuXHRveSAqPSBhbXQ7XG5cdHRoaXMuc2V0UG9zaXRpb24odGhpcy54K294LCB0aGlzLnkrb3kpO1xufTtcblxuQ2FtZXJhLnByb3RvdHlwZS54Qm91bmQgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuZ2FtZS5jb2x1bW5zKlRpbGVTaXplO1xufTtcblxuQ2FtZXJhLnByb3RvdHlwZS55Qm91bmQgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuZ2FtZS5yb3dzKlRpbGVTaXplO1xufTtcblxuXG5DYW1lcmEucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgY3ggPSB0aGlzLng7XG5cdHZhciBjeSA9IHRoaXMueTtcblxuXHR2YXIgZnggPSB0aGlzLmZvY3VzLng7XG5cdHZhciBmeSA9IHRoaXMuZm9jdXMueTtcblxuXHR2YXIgZnZ4ID0gdGhpcy5mb2N1cy52eDtcblx0dmFyIGZ2eSA9IHRoaXMuZm9jdXMudnk7XG5cblx0dmFyIGd4ID0gZnggKyBmdnggKiBDYW1lcmEubG9va2FoZWFkO1xuXHR2YXIgZ3kgPSBmeSArIGZ2eSAqIENhbWVyYS5sb29rYWhlYWQ7XG5cblx0aWYgKElucHV0Lm1vdXNlLmJ1dHRvbi5kb3duKSB7XG5cdFx0dmFyIG13eCA9IElucHV0Lm1vdXNlLndvcmxkWDtcblx0XHR2YXIgbXd5ID0gSW5wdXQubW91c2Uud29ybGRZO1xuXG5cdFx0dmFyIGZyeCA9IG13eCAtIHRoaXMuZm9jdXMueDtcblx0XHR2YXIgZnJ5ID0gbXd5IC0gdGhpcy5mb2N1cy55O1xuXG5cdFx0Z3ggKz0gZnJ4IC8gMy4wO1xuXHRcdGd5ICs9IGZyeSAvIDMuMDtcblx0fVxuXHRneCA9IGNsYW1wKGd4LCB0aGlzLndpZHRoLzIsIHRoaXMueEJvdW5kKCktdGhpcy53aWR0aC8yKTtcblx0Z3kgPSBjbGFtcChneSwgdGhpcy5oZWlnaHQvMiwgdGhpcy55Qm91bmQoKS10aGlzLmhlaWdodC8yKTtcblxuXHR2YXIgbnggPSBneCAtIGN4O1xuXHR2YXIgbnkgPSBneSAtIGN5O1xuXG5cdHZhciByZWxheCA9IDEuMCAtIE1hdGguZXhwKC1DYW1lcmEuc3BlZWQqRW5naW5lLmRlbHRhVGltZSk7XG5cblx0bnggPSB0aGlzLnggKyBueCpyZWxheDtcblx0bnkgPSB0aGlzLnkgKyBueSpyZWxheDtcblxuXHR0aGlzLnNldFBvc2l0aW9uKG54LCBueSk7XG5cbn07XG5cbkNhbWVyYS5wcm90b3R5cGUuaXNJblZpZXcgPSBmdW5jdGlvbihsLCByLCB0LCBiKSB7XG5cdHJldHVybiAhKHIgPCB0aGlzLm1pblggfHwgbCA+IHRoaXMubWF4WCB8fCBiIDwgdGhpcy5taW5ZIHx8IHQgPiB0aGlzLm1heFkpO1xufTtcblxuQ2FtZXJhLnByb3RvdHlwZS5jYW5TZWUgPSBmdW5jdGlvbihlbnQpIHtcblx0cmV0dXJuIHRoaXMuaXNJblZpZXcoZW50LngtZW50LnJ4LCBlbnQueCtlbnQucngsIGVudC55LWVudC5yeSwgZW50LnkrZW50LnJ5KTtcbn07XG5cbkNhbWVyYS5wcm90b3R5cGUuc2V0UG9zaXRpb24gPSBmdW5jdGlvbihueCwgbnkpIHtcblx0dGhpcy54ID0gY2xhbXAobngsIHRoaXMud2lkdGgvMiwgdGhpcy54Qm91bmQoKS10aGlzLndpZHRoLzIpO1xuXHR0aGlzLnkgPSBjbGFtcChueSwgdGhpcy5oZWlnaHQvMiwgdGhpcy55Qm91bmQoKS10aGlzLmhlaWdodC8yKTtcblxuXHR0aGlzLm1pblggPSB0aGlzLngtdGhpcy53aWR0aC8yO1xuXHR0aGlzLm1pblkgPSB0aGlzLnktdGhpcy5oZWlnaHQvMjtcblxuXHR0aGlzLm1heFggPSB0aGlzLm1pblgrdGhpcy53aWR0aDtcblx0dGhpcy5tYXhZID0gdGhpcy5taW5ZK3RoaXMuaGVpZ2h0O1xuXHQvLyBASEFDSzogcHJldmVudCBjYW1lcmEgZnJvbSBub3QgY29udGFpbmluZyBwbGF5ZXIuLi5cblx0aWYgKHRoaXMuZm9jdXMueCAtIHRoaXMuZm9jdXMucnggPCB0aGlzLm1pblgpIHtcblx0XHR0aGlzLm1pblggPSB0aGlzLmZvY3VzLngtdGhpcy5mb2N1cy5yeDtcblx0XHR0aGlzLnggPSB0aGlzLm1pblggKyB0aGlzLndpZHRoLzI7XG5cdFx0dGhpcy5tYXhYID0gdGhpcy5taW5YICsgdGhpcy53aWR0aDtcblx0fVxuXG5cdGlmICh0aGlzLmZvY3VzLnkgLSB0aGlzLmZvY3VzLnJ5IDwgdGhpcy5taW5ZKSB7XG5cdFx0dGhpcy5taW5ZID0gdGhpcy5mb2N1cy55LXRoaXMuZm9jdXMucnk7XG5cdFx0dGhpcy55ID0gdGhpcy5taW5ZICsgdGhpcy5oZWlnaHQvMjtcblx0XHR0aGlzLm1heFkgPSB0aGlzLm1pblkgKyB0aGlzLmhlaWdodDtcblx0fVxuXG5cdGlmICh0aGlzLmZvY3VzLnggKyB0aGlzLmZvY3VzLnJ4ID4gdGhpcy5tYXhYKSB7XG5cdFx0dGhpcy5tYXhYID0gdGhpcy5mb2N1cy54ICsgdGhpcy5mb2N1cy5yeDtcblx0XHR0aGlzLnggPSB0aGlzLm1heFggLSB0aGlzLndpZHRoLzI7XG5cdFx0dGhpcy5taW5YID0gdGhpcy5tYXhYIC0gdGhpcy53aWR0aDtcblx0fVxuXG5cdGlmICh0aGlzLmZvY3VzLnkgKyB0aGlzLmZvY3VzLnJ5ID4gdGhpcy5tYXhZKSB7XG5cdFx0dGhpcy5tYXhZID0gdGhpcy5mb2N1cy55ICsgdGhpcy5mb2N1cy5yeTtcblx0XHR0aGlzLnkgPSB0aGlzLm1heFkgLSB0aGlzLmhlaWdodC8yO1xuXHRcdHRoaXMubWluWSA9IHRoaXMubWF4WSAtIHRoaXMuaGVpZ2h0O1xuXHR9XG59O1xuXG5FbmdpbmUuQ2FtZXJhID0gQ2FtZXJhO1xuXG5mdW5jdGlvbiBUaWxlKHR5cGUpIHtcblx0dGhpcy50eXBlID0gdHlwZTtcblx0dGhpcy5zcHJpdGUgPSAoTWF0aC5yYW5kb20oKSAqIDQpfDA7XG5cdHRoaXMucm90YXRpb24gPSAwO1xuXHR0aGlzLnZhcmlhbnQgPSAwO1xuXHR0aGlzLnN4ID0gMTtcblx0dGhpcy5zeSA9IDE7XG59XG5cblRpbGUuZml4VXBUaWxlQXJyYXkgPSBmdW5jdGlvbih0aWxlcywgY29sdW1ucywgcm93cykge1xuXHR2YXIgVSA9IDB4MTtcblx0dmFyIEQgPSAweDI7XG5cdHZhciBMID0gMHg0O1xuXHR2YXIgUiA9IDB4ODtcblx0Zm9yICh2YXIgeSA9IDA7IHkgPCByb3dzOyArK3kpIHtcblx0XHRmb3IgKHZhciB4ID0gMDsgeCA8IGNvbHVtbnM7ICsreCkge1xuXHRcdFx0dmFyIHQgPSB0aWxlc1t4K3kqY29sdW1uc107XG5cblx0XHRcdGlmICh0LnR5cGUgPT09IDApIHtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cblx0XHRcdHZhciB1ID0geSA9PT0gMCAgICAgICAgID8gMSA6IHRpbGVzW3grKHktMSkqY29sdW1uc10udHlwZTtcblx0XHRcdHZhciBkID0geSA9PT0gcm93cy0xICAgID8gMSA6IHRpbGVzW3grKHkrMSkqY29sdW1uc10udHlwZTtcblx0XHRcdHZhciByID0geCA9PT0gY29sdW1ucy0xID8gMSA6IHRpbGVzWyh4KzEpK3kqY29sdW1uc10udHlwZTtcblx0XHRcdHZhciBsID0geCA9PT0gMCAgICAgICAgID8gMSA6IHRpbGVzWyh4LTEpK3kqY29sdW1uc10udHlwZTtcblxuXHRcdFx0dmFyIG1hc2sgPSAwO1xuXG5cdFx0XHRpZiAodSkgbWFzayB8PSBVO1xuXHRcdFx0aWYgKGQpIG1hc2sgfD0gRDtcblx0XHRcdGlmIChsKSBtYXNrIHw9IEw7XG5cdFx0XHRpZiAocikgbWFzayB8PSBSO1xuXG5cdFx0XHRzd2l0Y2ggKG1hc2spIHtcblx0XHRcdFx0Y2FzZSAwOiB0LnJvdGF0aW9uID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKjQpOyB0LnZhcmlhbnQgPSA1OyBicmVhaztcblxuXHRcdFx0XHRjYXNlIFU6IHQucm90YXRpb24gPSAzOyB0LnZhcmlhbnQgPSA0OyAvKnQuc3kgPSBNYXRoLnJhbmRvbSgpIDwgMCA/IC0xIDogMTsqLyBicmVhaztcblx0XHRcdFx0Y2FzZSBEOiB0LnJvdGF0aW9uID0gMTsgdC52YXJpYW50ID0gNDsgLyp0LnN5ID0gTWF0aC5yYW5kb20oKSA8IDAgPyAtMSA6IDE7Ki8gYnJlYWs7XG5cdFx0XHRcdGNhc2UgTDogdC5yb3RhdGlvbiA9IDI7IHQudmFyaWFudCA9IDQ7IC8qdC5zeCA9IE1hdGgucmFuZG9tKCkgPCAwID8gLTEgOiAxOyovIGJyZWFrO1xuXHRcdFx0XHRjYXNlIFI6IHQucm90YXRpb24gPSAwOyB0LnZhcmlhbnQgPSA0OyAvKnQuc3ggPSBNYXRoLnJhbmRvbSgpIDwgMCA/IC0xIDogMTsqLyBicmVhaztcblxuXHRcdFx0XHRjYXNlIFV8RDogdC5yb3RhdGlvbiA9IChNYXRoLnJhbmRvbSgpIDwgMC41ID8gMSA6IDMpOyB0LnZhcmlhbnQgPSAzOyAvKnQuc3ggPSBNYXRoLnJhbmRvbSgpIDwgMCA/IC0xIDogMTsqLyBicmVhaztcblx0XHRcdFx0Y2FzZSBMfFI6IHQucm90YXRpb24gPSAoTWF0aC5yYW5kb20oKSA8IDAuNSA/IDAgOiAyKTsgdC52YXJpYW50ID0gMzsgLyp0LnN5ID0gTWF0aC5yYW5kb20oKSA8IDAgPyAtMSA6IDE7Ki8gYnJlYWs7XG5cblx0XHRcdFx0Y2FzZSBVfFI6IHQucm90YXRpb24gPSAzOyB0LnZhcmlhbnQgPSAyOyBicmVhaztcblx0XHRcdFx0Y2FzZSBVfEw6IHQucm90YXRpb24gPSAyOyB0LnZhcmlhbnQgPSAyOyBicmVhaztcblx0XHRcdFx0Y2FzZSBEfFI6IHQucm90YXRpb24gPSAwOyB0LnZhcmlhbnQgPSAyOyBicmVhaztcblx0XHRcdFx0Y2FzZSBEfEw6IHQucm90YXRpb24gPSAxOyB0LnZhcmlhbnQgPSAyOyBicmVhaztcblxuXHRcdFx0XHRjYXNlIER8THxSOiB0LnJvdGF0aW9uID0gMDsgdC52YXJpYW50ID0gMDsgYnJlYWs7XG5cdFx0XHRcdGNhc2UgVXxMfFI6IHQucm90YXRpb24gPSAyOyB0LnZhcmlhbnQgPSAwOyBicmVhaztcblx0XHRcdFx0Y2FzZSBVfER8UjogdC5yb3RhdGlvbiA9IDM7IHQudmFyaWFudCA9IDA7IGJyZWFrO1xuXHRcdFx0XHRjYXNlIFV8RHxMOiB0LnJvdGF0aW9uID0gMTsgdC52YXJpYW50ID0gMDsgYnJlYWs7XG5cblx0XHRcdFx0Y2FzZSBVfER8THxSOiB0LnJvdGF0aW9uID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKjQpOyB0LnZhcmlhbnQgPSAxOyBicmVhaztcblxuXHRcdFx0XHRkZWZhdWx0OiBBc3NlcnQoZmFsc2UsIFwidW5yZWFjaGFibGVcIik7IGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufTtcblxuRW5naW5lLlRpbGUgPSBUaWxlO1xuXG5mdW5jdGlvbiBHYW1lKCkge1xuXHR0aGlzLnBsYXllciA9IG5ldyBNb25zdGVyKHRoaXMpO1xuXHR0aGlzLmVmZmVjdHMgPSBbXTtcblx0dGhpcy5lbnRpdGllcyA9IFtdO1xuXHR0aGlzLnRpbGVzID0gW107XG5cblx0Ly8gdGhpcy5hZGRFbnRpdHkobmV3IENvcHRlcih0aGlzLCAyNSpUaWxlU2l6ZSwgMjUqVGlsZVNpemUpKTtcblxuXG5cdC8vIEBUT0RPOiB0aGlzIGJlbG9uZ3MgaW4gYSBzZXBhcmF0ZSByZW5kZXJlclxuXHR2YXIgdnB3aWR0aCA9IEVuZ2luZS5zY3JlZW5XaWR0aCAvIEVuZ2luZS5zY2FsZTtcblx0dmFyIHZwaGVpZ2h0ID0gRW5naW5lLnNjcmVlbkhlaWdodCAvIEVuZ2luZS5zY2FsZTtcblxuXHR0aGlzLnZpZXdwb3J0V2lkdGggPSB2cHdpZHRoO1xuXHR0aGlzLnZpZXdwb3J0SGVpZ2h0ID0gdnBoZWlnaHQ7XG5cblx0dGhpcy50ZW50YWNsZUJ1ZmZlciA9IG5ldyBQaXhlbEJ1ZmZlcih2cHdpZHRoLCB2cGhlaWdodCk7XG5cdHRoaXMuZWZmZWN0QnVmZmVyID0gbmV3IFBpeGVsQnVmZmVyKHZwd2lkdGgsIHZwaGVpZ2h0KTtcblx0dGhpcy5lZmZlY3RCdWZmZXIudHJhY2tCb3VuZHMgPSBmYWxzZTtcblx0dGhpcy5jYW1lcmEgPSBuZXcgQ2FtZXJhKHRoaXMpO1xuXHRCbG9vZFN5c3RlbS5zZXRHYW1lKHRoaXMpO1xuXHQvLyB0aGlzLmJsb29kU3BsYXRDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblx0Ly8gdGhpcy5ibG9vZFNwbGF0Q29udGV4dCA9IHRoaXMuYmxvb2RTcGxhdENhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXHQvLyB0aGlzLmVudGl0eVBvc0ZlZWRiYWNrID0gbmV3IFVpbnQ4QXJyYXkodGhpcy52aWV3cG9ydFdpZHRoKnRoaXMudmlld3BvcnRIZWlnaHQpO1xuXG5cdHRoaXMubG9hZExldmVsKDApO1xufVxuXG5HYW1lLkxldmVscyA9IFtcblx0e2ltYWdlTmFtZTogJ2wxJ30sXG5cdHtpbWFnZU5hbWU6ICdsMid9LFxuXHR7aW1hZ2VOYW1lOiAnbDMnfSxcblx0e2ltYWdlTmFtZTogJ2w0J30sXG5cdHtpbWFnZU5hbWU6ICdsNSd9XG5dO1xuXG5HYW1lLnByb3RvdHlwZS5sb2FkTGV2ZWwgPSBmdW5jdGlvbihsZXZlbE51bSkge1xuXHR0aGlzLmxldmVsTnVtID0gbGV2ZWxOdW07XG5cdHZhciB0aWxlcyA9IEFzc2V0cy5pbWFnZXNbR2FtZS5MZXZlbHNbbGV2ZWxOdW1dLmltYWdlTmFtZV07XG5cdHZhciBwaXhlbERhdGEgPSB0aWxlcy5nZXRQaXhlbERhdGEoKTtcblxuXHR0aGlzLmNvbHVtbnMgPSBwaXhlbERhdGEud2lkdGg7XG5cdHRoaXMucm93cyA9IHBpeGVsRGF0YS5oZWlnaHQ7XG5cblx0dmFyIHBpeCA9IHBpeGVsRGF0YS5waXhlbHM7XG5cdHZhciBsZW5ndGggPSB0aGlzLmNvbHVtbnMqdGhpcy5yb3dzO1xuXG5cdHRoaXMudGlsZXMubGVuZ3RoID0gbGVuZ3RoO1xuXHR0aGlzLmVmZmVjdHMubGVuZ3RoID0gMDtcblx0dGhpcy5lbnRpdGllcy5sZW5ndGggPSAwO1xuXG5cdC8vIHRoaXMuYmxvb2RTcGxhdENhbnZhcy53aWR0aCA9IHRoaXMucm93cypUaWxlU2l6ZTtcblx0Ly8gdGhpcy5ibG9vZFNwbGF0Q2FudmFzLmhlaWdodCA9IHRoaXMuY29sdW1ucypUaWxlU2l6ZTtcblx0Ly8gdGhpcy5ibG9vZFNwbGF0Q29udGV4dC5pbWFnZVNtb290aGluZ0VuYWJsZWQgPSBmYWxzZTtcblx0Ly8gdGhpcy5ibG9vZFNwbGF0Q29udGV4dC5tb3pJbWFnZVNtb290aGluZ0VuYWJsZWQgPSBmYWxzZTtcblx0Ly8gdGhpcy5ibG9vZFNwbGF0Q29udGV4dC53ZWJraXRJbWFnZVNtb290aGluZ0VuYWJsZWQgPSBmYWxzZTtcblx0Ly8gdGhpcy5ibG9vZFNwbGF0Q29udGV4dC5jbGVhclJlY3QoMCwgMCwgdGhpcy5ibG9vZFNwbGF0Q2FudmFzLndpZHRoLCB0aGlzLmJsb29kU3BsYXRDYW52YXMuaGVpZ2h0KTtcblx0Ly8gdGhpcy5ibG9vZFNwbGF0Q29udGV4dC5nbG9iYWxBbHBoYSA9IDAuMDU7XG5cdC8vIHRoaXMuYmxvb2RTcGxhdENvbnRleHQuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gJ3NjcmVlbidcblxuXHRmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG5cdFx0dmFyIHggPSBpICUgdGhpcy5jb2x1bW5zO1xuXHRcdHZhciB5ID0gTWF0aC5mbG9vcihpIC8gdGhpcy5jb2x1bW5zKTtcblxuXHRcdGlmIChwaXhbaV0gPT09IDB4ZmYwMDAwMDApIHtcblx0XHRcdHRoaXMudGlsZXNbaV0gPSBuZXcgVGlsZSgxKTtcblx0XHR9XG5cdFx0ZWxzZSBpZiAocGl4W2ldID09PSAweGZmODA4MDgwKSB7XG5cdFx0XHR0aGlzLnRpbGVzW2ldID0gbmV3IFRpbGUoMik7XG5cdFx0fVxuXHRcdGVsc2UgaWYgKHBpeFtpXSA9PT0gMHhmZjAwMDBmZikge1xuXHRcdFx0dGhpcy50aWxlc1tpXSA9IG5ldyBUaWxlKDMpO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHRoaXMudGlsZXNbaV0gPSBuZXcgVGlsZSgwKTtcblx0XHRcdGlmIChwaXhbaV0gPT09IDB4ZmZmZmZmZmYpIHtcblx0XHRcdFx0dGhpcy5wbGF5ZXIuc2V0UG9zaXRpb24oeCpUaWxlU2l6ZSwgeSpUaWxlU2l6ZSlcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKHBpeFtpXSA9PT0gMHhmZmZmMDBmZikge1xuXHRcdFx0XHR0aGlzLmFkZEVudGl0eShuZXcgQ29wdGVyKHRoaXMsIHgqVGlsZVNpemUsIHkqVGlsZVNpemUpKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKHBpeFtpXSA9PT0gMHhmZmZmMDAwMCkge1xuXHRcdFx0XHR0aGlzLmFkZEVudGl0eShuZXcgRXhpdCh0aGlzLCB4KlRpbGVTaXplLCB5KlRpbGVTaXplKSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0VGlsZS5maXhVcFRpbGVBcnJheSh0aGlzLnRpbGVzLCB0aGlzLmNvbHVtbnMsIHRoaXMucm93cylcbn07XG5cbkdhbWUucHJvdG90eXBlLndvbkxldmVsID0gZnVuY3Rpb24oKSB7XG5cdEFzc2V0cy5zb3VuZHMud2lubGV2ZWwucGxheSgpO1xuXHRpZiAodGhpcy5sZXZlbE51bSsxID49IEdhbWUuTGV2ZWxzLmxlbmd0aCkge1xuXHRcdEVuZ2luZS53b25HYW1lKCk7XG5cdH1cblx0ZWxzZSB7XG5cdFx0aWYgKHRoaXMucGxheWVyLnNpemUgPCAyKSB7XG5cdFx0XHR0aGlzLnBsYXllci5zZXRTaXplKHRoaXMucGxheWVyLnNpemUrMSk7XG5cdFx0fVxuXHRcdHRoaXMucGxheWVyLmhwID0gdGhpcy5wbGF5ZXIubWF4SHA7XG5cdFx0dGhpcy5sb2FkTGV2ZWwodGhpcy5sZXZlbE51bSsxKTtcblx0fVxufVxuXG5FbmdpbmUuR2FtZSA9IEdhbWU7XG5cbkdhbWUucHJvdG90eXBlLmFkZEVmZmVjdCA9IGZ1bmN0aW9uKGUpIHtcblx0aWYgKGUgaW5zdGFuY2VvZiBFeGl0UGFydGljbGUgfHwgdGhpcy5jYW1lcmEuY2FuU2VlKGUpKSB7XG5cdFx0dGhpcy5lZmZlY3RzLnB1c2goZSk7XG5cdH1cbn07XG5cbkdhbWUucHJvdG90eXBlLnVwZGF0ZUFycmF5ID0gZnVuY3Rpb24oYXJyLCBpc0VmZmVjdHMpIHtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyArK2kpIHtcblx0XHRhcnJbaV0udXBkYXRlKCk7XG5cdFx0aWYgKGlzRWZmZWN0cyAmJiAhKGFycltpXSBpbnN0YW5jZW9mIEV4aXRQYXJ0aWNsZSB8fCB0aGlzLmNhbWVyYS5jYW5TZWUoYXJyW2ldKSkpIHtcblx0XHRcdGFycltpXS5hY3RpdmUgPSBmYWxzZTtcblx0XHR9XG5cdH1cblxuXHR2YXIgaiA9IDA7XG5cdGZvciAoaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyArK2kpIHtcblx0XHRpZiAoYXJyW2ldLmFjdGl2ZSkge1xuXHRcdFx0YXJyW2orK10gPSBhcnJbaV07XG5cdFx0fVxuXHR9XG5cdGFyci5sZW5ndGggPSBqO1xufTtcblxuR2FtZS5wcm90b3R5cGUuYWRkU21va2UgPSBmdW5jdGlvbih4LCB5KSB7XG5cdHZhciBudW1DbG91ZHMgPSBNYXRoLmNlaWwoTWF0aC5yYW5kb20oKSozKTtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBudW1DbG91ZHM7ICsraSkge1xuXHRcdHZhciBveCA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKS0wLjUpKjg7XG5cdFx0dmFyIG95ID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpLTAuNSkqODtcblx0XHR0aGlzLmFkZEVmZmVjdChuZXcgU21va2UodGhpcywgeCtveCwgeStveSkpO1xuXHR9XG59XG5cbkdhbWUucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnBsYXllci51cGRhdGUoKTtcblxuXHR0aGlzLnVwZGF0ZUFycmF5KHRoaXMuZWZmZWN0cywgdHJ1ZSk7XG5cdEJsb29kU3lzdGVtLnVwZGF0ZSgpO1xuXHRCbG9vZFN5c3RlbS5jbGVhckRlYWQoKTtcblx0dGhpcy51cGRhdGVBcnJheSh0aGlzLmVudGl0aWVzLCBmYWxzZSk7XG5cblxuXHR0aGlzLmNhbWVyYS51cGRhdGUoKTtcbn07XG5cbkdhbWUucHJvdG90eXBlLmlzQmxvY2tlZCA9IGZ1bmN0aW9uKHgsIHkpIHtcblx0eCA9IE1hdGgucm91bmQoeC9UaWxlU2l6ZS0wLjUpO1xuXHR5ID0gTWF0aC5yb3VuZCh5L1RpbGVTaXplLTAuNSk7XG5cdHJldHVybiB0aGlzLmdldFRpbGUoeHwwLCB5fDApICE9PSAwO1xufTtcblxuR2FtZS5wcm90b3R5cGUuaXNTcGlrZVRpbGUgPSBmdW5jdGlvbih4LCB5KXtcblx0eCA9IE1hdGgucm91bmQoeC9UaWxlU2l6ZS0wLjUpO1xuXHR5ID0gTWF0aC5yb3VuZCh5L1RpbGVTaXplLTAuNSk7XG5cdHJldHVybiB0aGlzLmdldFRpbGUoeHwwLCB5fDApID09PSAzO1xufTtcblxuR2FtZS5wcm90b3R5cGUuZ2V0VGlsZSA9IGZ1bmN0aW9uKHgsIHkpIHtcblx0aWYgKHkgPCAwIHx8IHkgPj0gdGhpcy5yb3dzIHx8IHggPCAwIHx8IHggPj0gdGhpcy5jb2x1bW5zKSB7XG5cdFx0cmV0dXJuIC0xO1xuXHR9XG5cdHJldHVybiB0aGlzLnRpbGVzW3greSp0aGlzLmNvbHVtbnNdLnR5cGU7XG59O1xuXG5HYW1lLnByb3RvdHlwZS5nZXRUaWxlSW5mbyA9IGZ1bmN0aW9uKHgsIHkpIHtcblx0aWYgKHkgPCAwIHx8IHkgPj0gdGhpcy5yb3dzIHx8IHggPCAwIHx8IHggPj0gdGhpcy5jb2x1bW5zKSB7XG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cblx0cmV0dXJuIHRoaXMudGlsZXNbeCt5KnRoaXMuY29sdW1uc107XG59O1xuXG5HYW1lLnByb3RvdHlwZS5hZGRFbnRpdHkgPSBmdW5jdGlvbihlKSB7XG5cdHRoaXMuZW50aXRpZXMucHVzaChlKTtcbn07XG5cbkdhbWUucHJvdG90eXBlLnRlbnRhY2xlVG91Y2hlZCA9IGZ1bmN0aW9uKHgsIHksIHJ3LCByaCkge1xuXHR2YXIgbGVmdCA9IHgtcnc7XG5cdHZhciByaWdodCA9IHgrcnc7XG5cdHZhciB0b3AgPSB5LXJoO1xuXHR2YXIgYm90dG9tID0geStyaDtcblx0aWYgKHJpZ2h0IDwgdGhpcy5jYW1lcmEubWluWCB8fCBsZWZ0ID4gdGhpcy5jYW1lcmEubWF4WCB8fCBib3R0b20gPCB0aGlzLmNhbWVyYS5taW5ZIHx8IHRvcCA+IHRoaXMuY2FtZXJhLm1heFkpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0Ly8gbW92ZSB0byBzY3JlZW5zcGFjZVxuXHR2YXIgbHMgPSBNYXRoLnJvdW5kKGxlZnQgLSB0aGlzLmNhbWVyYS5taW5YKTtcblx0dmFyIHJzID0gTWF0aC5yb3VuZChyaWdodCAtIHRoaXMuY2FtZXJhLm1pblgpO1xuXHR2YXIgdHMgPSBNYXRoLnJvdW5kKHRvcCAtIHRoaXMuY2FtZXJhLm1pblkpO1xuXHR2YXIgYnMgPSBNYXRoLnJvdW5kKGJvdHRvbSAtIHRoaXMuY2FtZXJhLm1pblkpO1xuXG5cdHZhciB0YnVmID0gdGhpcy50ZW50YWNsZUJ1ZmZlcjtcblx0dmFyIGJib3ggPSB0YnVmLmJvdW5kcztcblxuXHRpZiAocnMgPCBiYm94Lm1pblggfHwgbHMgPiBiYm94Lm1heFggfHwgYnMgPCBiYm94Lm1pblkgfHwgdHMgPiBiYm94Lm1heFkpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRpZiAobHMgPCAwKSB7XG5cdFx0bHMgPSAwO1xuXHR9XG5cdGlmICh0cyA8IDApIHtcblx0XHR0cyA9IDBcblx0fVxuXHRpZiAocnMgPj0gdGhpcy52aWV3cG9ydFdpZHRoKSB7XG5cdFx0cnMgPSB0aGlzLnZpZXdwb3J0V2lkdGgtMTtcblx0fVxuXHRpZiAoYnMgPj0gdGhpcy52aWV3cG9ydEhlaWdodCkge1xuXHRcdGJzID0gdGhpcy52aWV3cG9ydEhlaWdodC0xO1xuXHR9XG5cblx0dmFyIHdpZHRoID0gdGhpcy52aWV3cG9ydFdpZHRoO1xuXHRmb3IgKHZhciB5ID0gdHM7IHkgPD0gYnM7ICsreSkge1xuXHRcdGZvciAodmFyIHggPSBsczsgeCA8PSByczsgKyt4KSB7XG5cdFx0XHRpZiAodGJ1Zi5waXhlbHNbeCt5KndpZHRoXSAhPT0gMCkge1xuXHRcdFx0XHR0aGlzLnBsYXllci5ibG9vZHlUZW50YWNsZXMoKTtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdHJldHVybiBmYWxzZTtcbn07XG5cbkdhbWUucHJvdG90eXBlLmV4cGxvc2lvbkNoZWNrID0gZnVuY3Rpb24oZSwgeCwgeSwgZG1nLCByKSB7XG5cdHZhciBkeCA9IGUueCAtIHg7XG5cdHZhciBkeSA9IGUueSAtIHk7XG5cdGlmIChkeCpkeCArIGR5KmR5IDwgcipyKSB7XG5cdFx0dmFyIGxlbiA9IE1hdGguc3FydChkeCpkeCtkeSpkeSk7XG5cdFx0ZHggLz0gbGVuO1xuXHRcdGR5IC89IGxlbjtcblx0XHRsZW4gLz0gcjtcblx0XHR2YXIgZmFsbG9mZiA9ICgxLjAgLSBsZW4pLzIgKyAwLjU7XG5cdFx0ZmFsbG9mZiAvPSAyO1xuXHRcdGlmIChlID09PSB0aGlzLnBsYXllcikgY29uc29sZS5sb2coXCJodXJ0OiBleHBsb2RlXCIpO1xuXHRcdGUuaHVydEZvcihNYXRoLm1heChNYXRoLmZsb29yKGRtZypmYWxsb2ZmKSwgMSkpO1xuXHRcdGUudnggKz0gZHggKiA1ICogKDEgLSBsZW4pO1xuXHRcdGUudnkgKz0gZHkgKiA1ICogKDEgLSBsZW4pO1xuXHR9XG59XG5cbkdhbWUucHJvdG90eXBlLmV4cGxvZGUgPSBmdW5jdGlvbih4LCB5LCBkbWcsIHJhZGl1cykge1xuXHRpZiAoZG1nID09IG51bGwpIHtcblx0XHRkbWcgPSAxMDtcblx0fVxuXHRpZiAocmFkaXVzID09IG51bGwpIHtcblx0XHRyYWRpdXMgPSAyNDtcblx0fVxuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5lbnRpdGllcy5sZW5ndGg7ICsraSkge1xuXHRcdHZhciBlID0gdGhpcy5lbnRpdGllc1tpXTtcblx0XHRpZiAoIWUuYWN0aXZlKSB7XG5cdFx0XHRjb250aW51ZTtcblx0XHR9XG5cdFx0aWYgKGUgaW5zdGFuY2VvZiBDb3B0ZXIpIHtcblx0XHRcdHRoaXMuZXhwbG9zaW9uQ2hlY2soZSwgeCwgeSwgZG1nLzQsIHJhZGl1cy8yKTtcblx0XHR9XG5cdH1cblx0dGhpcy5hZGRFZmZlY3QobmV3IEV4cGxvc2lvbih0aGlzLCB4LCB5KSlcbn07XG5cbkdhbWUucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKGN0eCwgY2FudmFzKSB7XG5cblx0dmFyIG1pblggPSB0aGlzLmNhbWVyYS5taW5YO1xuXHR2YXIgbWF4WCA9IHRoaXMuY2FtZXJhLm1heFg7XG5cdHZhciBtaW5ZID0gdGhpcy5jYW1lcmEubWluWTtcblx0dmFyIG1heFkgPSB0aGlzLmNhbWVyYS5tYXhZO1xuXG5cdHZhciBjYXJkaW5hbFJvdGF0aW9ucyA9IEFzc2V0cy5pbWFnZXMudGlsZXMuZ2V0Q2FyZGluYWxSb3RhdGlvbnMoVGlsZVNpemUsIFRpbGVTaXplKTtcblxuXHRJbnB1dC5zZXRCb3VuZHMobWluWCwgbWluWSk7XG5cblx0dmFyIGlNaW5YID0gTWF0aC5yb3VuZChtaW5YKTtcblx0dmFyIGlNaW5ZID0gTWF0aC5yb3VuZChtaW5ZKTtcblxuXHR2YXIgcGFyYWxsYXhYID0gbWluWCAvIDU7XG5cdHZhciBwYXJhbGxheFkgPSBtaW5ZIC8gNTtcblx0dmFyIGJhY2tkcm9wU2l6ZSA9IDEyODtcblxuXHR2YXIgYmFja2Ryb3BzWCA9IDIrTWF0aC5mbG9vcih0aGlzLmNhbWVyYS53aWR0aC9iYWNrZHJvcFNpemUpO1xuXHR2YXIgYmFja2Ryb3BzWSA9IDIrTWF0aC5mbG9vcih0aGlzLmNhbWVyYS5oZWlnaHQvYmFja2Ryb3BTaXplKTtcblx0Y3R4LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuXHRmb3IgKHZhciBieSA9IDA7IGJ5IDwgYmFja2Ryb3BzWTsgKytieSkge1xuXHRcdGZvciAodmFyIGJ4ID0gMDsgYnggPCBiYWNrZHJvcHNYOyArK2J4KSB7XG5cdFx0XHRjdHguZHJhd0ltYWdlKFxuXHRcdFx0XHRBc3NldHMuaW1hZ2VzLmJhY2tkcm9wLmltYWdlLFxuXHRcdFx0XHRieCpiYWNrZHJvcFNpemUtcGFyYWxsYXhYLFxuXHRcdFx0XHRieSpiYWNrZHJvcFNpemUtcGFyYWxsYXhZKTtcblx0XHR9XG5cdH1cblx0Ly9jdHguZHJhd0ltYWdlKHRoaXMuYmxvb2RTcGxhdENhbnZhcywgLXBhcmFsbGF4WCwgLXBhcmFsbGF4WSk7XG5cblxuXHR2YXIgbWluVGlsZVggPSBNYXRoLmZsb29yKG1pblggLyBUaWxlU2l6ZSktMTtcblx0dmFyIG1pblRpbGVZID0gTWF0aC5mbG9vcihtaW5ZIC8gVGlsZVNpemUpLTE7XG5cblx0dmFyIG1heFRpbGVYID0gTWF0aC5jZWlsKG1heFggLyBUaWxlU2l6ZSkrMTtcblx0dmFyIG1heFRpbGVZID0gTWF0aC5jZWlsKG1heFkgLyBUaWxlU2l6ZSkrMTtcblxuXHQvL2N0eC5maWxsU3R5bGUgPSAnIzQzNTk2ZCc7XG5cdC8vY3R4LmZpbGxSZWN0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XG5cblxuXHRmb3IgKHZhciB0aWxlWSA9IG1pblRpbGVZOyB0aWxlWSA8PSBtYXhUaWxlWTsgKyt0aWxlWSkge1xuXHRcdGZvciAodmFyIHRpbGVYID0gbWluVGlsZVg7IHRpbGVYIDw9IG1heFRpbGVYOyArK3RpbGVYKSB7XG5cdFx0XHR2YXIgdGlsZSA9IHRoaXMuZ2V0VGlsZUluZm8odGlsZVgsIHRpbGVZKTtcblx0XHRcdGlmICh0aWxlID09IG51bGwgfHwgdGlsZS50eXBlID09PSAwKSB7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXHRcdFx0dmFyIHRpbGVTcHJpdGVYID0gdGlsZS5zcHJpdGUgKyAodGlsZS50eXBlLTEpKjQ7XG5cdFx0XHR2YXIgdGlsZVNwcml0ZVkgPSB0aWxlLnZhcmlhbnQ7XG5cdFx0XHRjdHguZHJhd0ltYWdlKGNhcmRpbmFsUm90YXRpb25zW3RpbGUucm90YXRpb25dLFxuXHRcdFx0XHR0aWxlU3ByaXRlWCpUaWxlU2l6ZSxcblx0XHRcdFx0dGlsZVNwcml0ZVkqVGlsZVNpemUsXG5cdFx0XHRcdFRpbGVTaXplLCBUaWxlU2l6ZSxcblx0XHRcdFx0dGlsZVggKiBUaWxlU2l6ZSAtIGlNaW5YLFxuXHRcdFx0XHR0aWxlWSAqIFRpbGVTaXplIC0gaU1pblksXG5cdFx0XHRcdFRpbGVTaXplLFxuXHRcdFx0XHRUaWxlU2l6ZVxuXHRcdFx0KTtcblx0XHR9XG5cdH1cblxuXHRpZiAoIXRoaXMucGxheWVyLmRlYWQgJiYgKCh0aGlzLnBsYXllci5pbnZpbmNpYmxlVGltZXIgJiAxKSA9PT0gMCkpIHtcblxuXHRcdGN0eC5tb3ZlVG8odGhpcy5wbGF5ZXIueCwgdGhpcy5wbGF5ZXIueSk7XG5cdFx0Y3R4LmRyYXdJbWFnZShcblx0XHRcdEFzc2V0cy5pbWFnZXMuc3ByaXRlcy5pbWFnZSxcblxuXHRcdFx0dGhpcy5wbGF5ZXIuc3ByaXRlWCgpLFxuXHRcdFx0dGhpcy5wbGF5ZXIuc3ByaXRlWSgpLFxuXHRcdFx0dGhpcy5wbGF5ZXIud2lkdGgsXG5cdFx0XHR0aGlzLnBsYXllci5oZWlnaHQsXG5cblx0XHRcdE1hdGgucm91bmQodGhpcy5wbGF5ZXIueCAtIG1pblggLSB0aGlzLnBsYXllci53aWR0aC8yKSxcblx0XHRcdE1hdGgucm91bmQodGhpcy5wbGF5ZXIueSAtIG1pblkgLSB0aGlzLnBsYXllci5oZWlnaHQvMiksXG5cdFx0XHR0aGlzLnBsYXllci53aWR0aCxcblx0XHRcdHRoaXMucGxheWVyLmhlaWdodFxuXHRcdCk7XG5cblx0XHR2YXIgdGVudGFjbGVDb2xvciA9IHRoaXMucGxheWVyLmhpdFRpbWVyID09PSAwID8gMHhmZjEwMzAzMSA6IDB4ZmY3MmRmZmY7XG5cblx0XHR2YXIgdGVudGFjbGVzID0gdGhpcy5wbGF5ZXIudGVudGFjbGVzO1xuXG5cdFx0dmFyIHRlbnRhY2xlUGl4ZWxzID0gdGhpcy50ZW50YWNsZUJ1ZmZlcjtcblx0XHR0ZW50YWNsZVBpeGVscy5yZXNldCgpO1xuXG5cdFx0Zm9yICh2YXIgaSA9IDAsIGxlbiA9IHRlbnRhY2xlcy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuXHRcdFx0dGVudGFjbGVzW2ldLmRyYXdPblBpeGVscyh0aGlzLnRlbnRhY2xlQnVmZmVyLCBtaW5YLCBtaW5ZLCB0aGlzLnBsYXllci5oaXRUaW1lciA9PT0gMCA/IHRlbnRhY2xlc1tpXS5jb2xvciA6IDB4ZmY3MmRmZmYpO1xuXHRcdH1cblxuXHRcdHtcblx0XHRcdHZhciBvdXRsaW5lQ29sb3IgPSAweGZmMDAwMDAwO1xuXHRcdFx0dmFyIHRNaW5YID0gTWF0aC5tYXgoKHRlbnRhY2xlUGl4ZWxzLmJvdW5kcy5taW5YLTEpfDAsIDApO1xuXHRcdFx0dmFyIHRNaW5ZID0gTWF0aC5tYXgoKHRlbnRhY2xlUGl4ZWxzLmJvdW5kcy5taW5ZLTEpfDAsIDApO1xuXHRcdFx0dmFyIHRNYXhYID0gTWF0aC5taW4oKHRlbnRhY2xlUGl4ZWxzLmJvdW5kcy5tYXhYKzEpfDAsIHRlbnRhY2xlUGl4ZWxzLndpZHRoLTEpO1xuXHRcdFx0dmFyIHRNYXhZID0gTWF0aC5taW4oKHRlbnRhY2xlUGl4ZWxzLmJvdW5kcy5tYXhZKzEpfDAsIHRlbnRhY2xlUGl4ZWxzLmhlaWdodC0xKTtcblx0XHRcdHZhciBwaXgzMiA9IHRlbnRhY2xlUGl4ZWxzLnBpeGVscztcblx0XHRcdHZhciB0cGl4VyA9IHRlbnRhY2xlUGl4ZWxzLndpZHRoO1xuXHRcdFx0dmFyIHRwaXhIID0gdGVudGFjbGVQaXhlbHMuaGVpZ2h0O1xuXHRcdFx0Zm9yICh2YXIgdHkgPSB0TWluWTsgdHkgPD0gdE1heFk7ICsrdHkpIHtcblx0XHRcdFx0Zm9yICh2YXIgdHggPSB0TWluWDsgdHggPD0gdE1heFg7ICsrdHgpIHtcblx0XHRcdFx0XHR2YXIgcGl4ZWwgPSBwaXgzMlsodHgrMCkgKyAodHkrMCkgKiB0cGl4V107XG5cblx0XHRcdFx0XHRpZiAocGl4ZWwgIT09IDAgJiYgcGl4ZWwgIT09IDB4ZmZmZjAwZmYpIHtcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQvL3ZhciB0b2NvbCA9IC8vcGl4ZWwgPT09IDB4ZmZmZjAwZmYgPyB0ZW50YWNsZUNvbG9yLTEgOiBvdXRsaW5lQ29sb3I7XG5cdFx0XHRcdFx0aWYgKHR5KzEgPCB0cGl4SCAmJiBwaXgzMlsodHgrMCkgKyAodHkrMSkgKiB0cGl4V10gIT09IDAgJiYgcGl4MzJbKHR4KzApICsgKHR5KzEpICogdHBpeFddICE9PSBvdXRsaW5lQ29sb3IpIHtcblx0XHRcdFx0XHRcdHBpeDMyWyh0eCswKSArICh0eSswKSAqIHRwaXhXXSA9IG91dGxpbmVDb2xvcjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSBpZiAodHktMSA+PSAwICYmIHBpeDMyWyh0eCswKSArICh0eS0xKSAqIHRwaXhXXSAhPT0gMCAmJiBwaXgzMlsodHgrMCkgKyAodHktMSkgKiB0cGl4V10gIT09IG91dGxpbmVDb2xvcikge1xuXHRcdFx0XHRcdFx0cGl4MzJbKHR4KzApICsgKHR5KzApICogdHBpeFddID0gb3V0bGluZUNvbG9yO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIGlmICh0eC0xID49IDAgJiYgcGl4MzJbKHR4LTEpICsgKHR5KzApICogdHBpeFddICE9PSAwICYmIHBpeDMyWyh0eC0xKSArICh0eSswKSAqIHRwaXhXXSAhPT0gb3V0bGluZUNvbG9yKSB7XG5cdFx0XHRcdFx0XHRwaXgzMlsodHgrMCkgKyAodHkrMCkgKiB0cGl4V10gPSBvdXRsaW5lQ29sb3I7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2UgaWYgKHR4KzEgPCB0cGl4VyAmJiBwaXgzMlsodHgrMSkgKyAodHkrMCkgKiB0cGl4V10gIT09IDAgJiYgcGl4MzJbKHR4KzEpICsgKHR5KzApICogdHBpeFddICE9PSBvdXRsaW5lQ29sb3IpIHtcblx0XHRcdFx0XHRcdHBpeDMyWyh0eCswKSArICh0eSswKSAqIHRwaXhXXSA9IG91dGxpbmVDb2xvcjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHR0ZW50YWNsZVBpeGVscy51cGRhdGUoKTtcblx0XHQvLyB0aGlzLnRlbnRhY2xlTGF5ZXJDb250ZXh0LmNsZWFyUmVjdCgwLCAwLCB0aGlzLnRlbnRhY2xlTGF5ZXIud2lkdGgsIHRoaXMudGVudGFjbGVMYXllci5oZWlnaHQpO1xuXHRcdC8vIHRoaXMudGVudGFjbGVMYXllckNvbnRleHQucHV0SW1hZ2VEYXRhKHRoaXMudGVudGFjbGVQaXhlbHMuaW1hZ2VEYXRhLCAwLCAwKTtcblxuXHRcdGN0eC5kcmF3SW1hZ2UodGVudGFjbGVQaXhlbHMuY2FudmFzLCAwLCAwKTtcblxuXG5cdFx0aWYgKHRoaXMucGxheWVyLmhpdFRpbWVyICE9PSAwKSB7XG5cblx0XHRcdHZhciBhbHBoYSA9IDEuMC1NYXRoLmFicyh0aGlzLnBsYXllci5oaXRUaW1lci0xMC4wKS8xMC4wO1xuXG5cdFx0XHR2YXIgb2xkQWxwaGEgPSBjdHguZ2xvYmFsQWxwaGE7XG5cdFx0XHRjdHguZ2xvYmFsQWxwaGEgPSBhbHBoYTtcblx0XHRcdGN0eC5kcmF3SW1hZ2UoXG5cdFx0XHRcdEFzc2V0cy5pbWFnZXMuc3ByaXRlcy5pbWFnZSxcblxuXHRcdFx0XHQvL0BUT0RPOiBoYWNrXG5cdFx0XHRcdHRoaXMucGxheWVyLndpZHRoKjYsXG5cdFx0XHRcdHRoaXMucGxheWVyLnNwcml0ZVkoKSxcblx0XHRcdFx0dGhpcy5wbGF5ZXIud2lkdGgsXG5cdFx0XHRcdHRoaXMucGxheWVyLmhlaWdodCxcblxuXHRcdFx0XHRNYXRoLnJvdW5kKHRoaXMucGxheWVyLnggLSBtaW5YIC0gdGhpcy5wbGF5ZXIud2lkdGgvMiksXG5cdFx0XHRcdE1hdGgucm91bmQodGhpcy5wbGF5ZXIueSAtIG1pblkgLSB0aGlzLnBsYXllci5oZWlnaHQvMiksXG5cdFx0XHRcdHRoaXMucGxheWVyLndpZHRoLFxuXHRcdFx0XHR0aGlzLnBsYXllci5oZWlnaHRcblx0XHRcdCk7XG5cblx0XHRcdGN0eC5nbG9iYWxBbHBoYSA9IG9sZEFscGhhO1xuXHRcdH1cblx0fVxuXG5cdHRoaXMuZWZmZWN0QnVmZmVyLnJlc2V0KCk7XG5cblx0Zm9yICh2YXIgZnhpID0gMDsgZnhpIDwgdGhpcy5lZmZlY3RzLmxlbmd0aDsgKytmeGkpIHtcblx0XHRpZiAodGhpcy5jYW1lcmEuY2FuU2VlKHRoaXMuZWZmZWN0c1tmeGldKSkge1xuXHRcdFx0dGhpcy5lZmZlY3RzW2Z4aV0ucmVuZGVyKGN0eCwgbWluWCwgbWluWSwgdGhpcy5lZmZlY3RCdWZmZXIpO1xuXHRcdH1cblx0fVxuXHRCbG9vZFN5c3RlbS5yZW5kZXIoY3R4LCBtaW5YLCBtaW5ZLCB0aGlzLmVmZmVjdEJ1ZmZlcik7XG5cblx0Zm9yICh2YXIgZWkgPSAwOyBlaSA8IHRoaXMuZW50aXRpZXMubGVuZ3RoOyArK2VpKSB7XG5cdFx0dGhpcy5lbnRpdGllc1tlaV0ucmVuZGVyKGN0eCwgbWluWCwgbWluWSwgdGhpcy5lZmZlY3RCdWZmZXIpO1xuXHR9XG5cblx0dGhpcy5lZmZlY3RCdWZmZXIudXBkYXRlKCk7XG5cdC8vdGhpcy5ibG9vZFNwbGF0Q29udGV4dC5kcmF3SW1hZ2UodGhpcy5lZmZlY3RCdWZmZXIuY2FudmFzLCBwYXJhbGxheFgsIHBhcmFsbGF4WSk7XG5cdGN0eC5kcmF3SW1hZ2UodGhpcy5lZmZlY3RCdWZmZXIuY2FudmFzLCAwLCAwKTtcbn1cblxudmFyIFBBUlRJQ0xFX1ggPSAwO1xudmFyIFBBUlRJQ0xFX1kgPSAxO1xudmFyIFBBUlRJQ0xFX1ZYID0gMjtcbnZhciBQQVJUSUNMRV9WWSA9IDM7XG52YXIgUEFSVElDTEVfTElGRSA9IDQ7XG52YXIgUEFSVElDTEVfU0laRSA9IDU7XG5cbmZ1bmN0aW9uIFBhcnRpY2xlU3lzdGVtKG9wdGlvbnMpIHtcblx0T2JqZWN0LmtleXMoUGFydGljbGVTeXN0ZW0uZGVmYXVsdHMpLmZvckVhY2goZnVuY3Rpb24ob3B0aW9uKSB7XG5cdFx0aWYgKCEob3B0aW9uIGluIG9wdGlvbnMpKSB7XG5cdFx0XHRvcHRpb25zW29wdGlvbl0gPSBQYXJ0aWNsZVN5c3RlbS5kZWZhdWx0c1tvcHRpb25dO1xuXHRcdH1cblx0fSk7XG5cdHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cblx0dGhpcy5yeCA9ICtvcHRpb25zLnJ4O1xuXHR0aGlzLnJ5ID0gK29wdGlvbnMucnk7XG5cdHRoaXMuZ2FtZSA9IG51bGw7XG5cblx0dGhpcy5ncmF2aXR5ID0gK29wdGlvbnMuZ3Jhdml0eTtcblx0dGhpcy5kcmFnID0gK29wdGlvbnMuZHJhZztcblx0dGhpcy5ib3VuY2UgPSArb3B0aW9ucy5ib3VuY2U7XG5cblx0dGhpcy5taW5MaWZlID0gK29wdGlvbnMubWluTGlmZTtcblx0dGhpcy5tYXhMaWZlID0gK29wdGlvbnMubWF4TGlmZTtcblxuXHR0aGlzLnZ4TXVsID0gK29wdGlvbnMudnhNdWw7XG5cdHRoaXMudnlNdWwgPSArb3B0aW9ucy52eU11bDtcblxuXHR0aGlzLm1heFBhcnRpY2xlcyA9IChvcHRpb25zLm1heFBhcnRpY2xlc3wwKTtcblxuXHR0aGlzLnBhcnRpY2xlcyA9IG5ldyBGbG9hdDMyQXJyYXkodGhpcy5tYXhQYXJ0aWNsZXMgKiBQQVJUSUNMRV9TSVpFKTtcblxuXHR0aGlzLnBhcnRpY2xlQ291bnQgPSAwO1xuXHR0aGlzLm5leHRQYXJ0aWNsZUluZGV4ID0gMDtcbn1cblxuRW5naW5lLlBhcnRpY2xlU3lzdGVtID0gUGFydGljbGVTeXN0ZW07XG5cblBhcnRpY2xlU3lzdGVtLmRlZmF1bHRzID0ge1xuXHRyeDogMixcblx0cnk6IDIsXG5cdGdyYXZpdHk6IDAuMDgsXG5cdGRyYWc6IDAuOTk4LFxuXHRib3VuY2U6IDAuNixcblx0bWluTGlmZTogMjAsXG5cdG1heExpZmU6IDYwLFxuXHR2eE11bDogMS4wLFxuXHR2eU11bDogMi4wLFxuXHRtYXhQYXJ0aWNsZXM6IDUxMixcbn07XG5QYXJ0aWNsZVN5c3RlbS5wcm90b3R5cGUuc2V0R2FtZSA9IGZ1bmN0aW9uKGcpIHtcblx0dGhpcy5nYW1lID0gZztcbn1cblxuXG5QYXJ0aWNsZVN5c3RlbS5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24oeCwgeSkge1xuXHR2YXIgaW5kZXggPSB0aGlzLm5leHRQYXJ0aWNsZUluZGV4Kys7XG5cdGlmICh0aGlzLm5leHRQYXJ0aWNsZUluZGV4ID09PSB0aGlzLm1heFBhcnRpY2xlcykge1xuXHRcdHRoaXMubmV4dFBhcnRpY2xlSW5kZXggPSAwO1xuXHR9XG5cdHRoaXMucGFydGljbGVDb3VudCsrO1xuXHRpZiAodGhpcy5wYXJ0aWNsZUNvdW50ID49IHRoaXMubWF4UGFydGljbGVzKSB7XG5cdFx0dGhpcy5wYXJ0aWNsZUNvdW50ID0gdGhpcy5tYXhQYXJ0aWNsZXM7XG5cdH1cblx0aW5kZXggKj0gUEFSVElDTEVfU0laRTtcblx0dGhpcy5wYXJ0aWNsZXNbaW5kZXgrUEFSVElDTEVfWF0gPSB4O1xuXHR0aGlzLnBhcnRpY2xlc1tpbmRleCtQQVJUSUNMRV9ZXSA9IHk7XG5cdHZhciB2eCA9IDAuMDtcblx0dmFyIHZ5ID0gMC4wO1xuXHRkbyB7XG5cdFx0dnggPSAoTWF0aC5yYW5kb20oKSAtIDAuNSkgKiAyLjA7XG5cdFx0dnkgPSAoTWF0aC5yYW5kb20oKSAtIDAuNSkgKiAyLjA7XG5cdH0gd2hpbGUgKHZ4ICogdnggKyB2eSAqIHZ5ID4gMSk7XG5cblx0dmFyIHNpemUgPSBNYXRoLnNxcnQodngqdngrdnkqdnkpO1xuXG5cdHZ4ID0gdGhpcy52eE11bCoodngvc2l6ZSk7XG5cdHZ5ID0gdGhpcy52eU11bCoodnkvc2l6ZSk7XG5cblx0dGhpcy5wYXJ0aWNsZXNbaW5kZXgrUEFSVElDTEVfVlhdID0gdng7XG5cdHRoaXMucGFydGljbGVzW2luZGV4K1BBUlRJQ0xFX1ZZXSA9IHZ5O1xuXHR0aGlzLnBhcnRpY2xlc1tpbmRleCtQQVJUSUNMRV9MSUZFXSA9IHRoaXMubWluTGlmZSArIE1hdGgucmFuZG9tKCkqKHRoaXMubWF4TGlmZSAtIHRoaXMubWluTGlmZSk7XG5cdHJldHVybiBpbmRleDtcbn07XG5cblBhcnRpY2xlU3lzdGVtLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcblx0dmFyIGVuZCA9IE1hdGgubWluKHRoaXMubWF4UGFydGljbGVzLCB0aGlzLnBhcnRpY2xlQ291bnQpKlBBUlRJQ0xFX1NJWkU7XG5cdHZhciBwYXJ0aWNsZXMgPSB0aGlzLnBhcnRpY2xlcztcblx0dmFyIGRyYWcgPSArdGhpcy5kcmFnO1xuXHR2YXIgZ3JhdiA9ICt0aGlzLmdyYXZpdHk7XG5cdHZhciBnYW1lID0gdGhpcy5nYW1lO1xuXHR2YXIgYm91bmNlID0gdGhpcy5ib3VuY2U7XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgZW5kOyBpICs9IFBBUlRJQ0xFX1NJWkUpIHtcblx0XHRwYXJ0aWNsZXNbaStQQVJUSUNMRV9MSUZFXSAtPSAxLjA7XG5cdFx0aWYgKHBhcnRpY2xlc1tpK1BBUlRJQ0xFX0xJRkVdIDw9IDAuMCkge1xuXHRcdFx0Y29udGludWU7XG5cdFx0fVxuXHRcdHBhcnRpY2xlc1tpK1BBUlRJQ0xFX1ZYXSAqPSBkcmFnO1xuXHRcdHBhcnRpY2xlc1tpK1BBUlRJQ0xFX1ZZXSArPSBncmF2O1xuXG5cdFx0dmFyIHZ4ID0gcGFydGljbGVzW2krUEFSVElDTEVfVlhdO1xuXHRcdHZhciB2eSA9IHBhcnRpY2xlc1tpK1BBUlRJQ0xFX1ZZXTtcblxuXHRcdHZhciB4ID0gcGFydGljbGVzW2krUEFSVElDTEVfWF07XG5cdFx0dmFyIHkgPSBwYXJ0aWNsZXNbaStQQVJUSUNMRV9ZXTtcblxuXHRcdHZhciBzdGVwcyA9IE1hdGguY2VpbChNYXRoLnNxcnQodngqdnggKyB2eSp2eSkpO1xuXHRcdGZvciAodmFyIHN0ZXAgPSAwOyBzdGVwIDwgc3RlcHM7ICsrc3RlcCkge1xuXHRcdFx0dmFyIG54ID0geCArIHZ4IC8gc3RlcHM7XG5cdFx0XHRpZiAoZ2FtZS5pc0Jsb2NrZWQobngsIHkpKSB7XG5cdFx0XHRcdHZ4ICo9IC1ib3VuY2U7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0eCA9IG54O1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgbnkgPSB5ICsgdnkgLyBzdGVwcztcblx0XHRcdGlmIChnYW1lLmlzQmxvY2tlZCh4LCBueSkpIHtcblx0XHRcdFx0dnkgKj0gLWJvdW5jZTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHR5ID0gbnk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHBhcnRpY2xlc1tpK1BBUlRJQ0xFX1ZYXSA9IHZ4O1xuXHRcdHBhcnRpY2xlc1tpK1BBUlRJQ0xFX1ZZXSA9IHZ5O1xuXHRcdHBhcnRpY2xlc1tpK1BBUlRJQ0xFX1hdID0geDtcblx0XHRwYXJ0aWNsZXNbaStQQVJUSUNMRV9ZXSA9IHk7XG5cdH1cbn07XG5cblBhcnRpY2xlU3lzdGVtLnByb3RvdHlwZS5jbGVhckRlYWQgPSBmdW5jdGlvbigpIHtcblx0dmFyIGVuZCA9IE1hdGgubWluKHRoaXMubWF4UGFydGljbGVzLCB0aGlzLnBhcnRpY2xlQ291bnQpKlBBUlRJQ0xFX1NJWkU7XG5cdHZhciBqID0gMDtcblx0dmFyIG5ld0NvdW50ID0gMDtcblx0dmFyIHBhcnRpY2xlcyA9IHRoaXMucGFydGljbGVzO1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IGVuZDsgaSArPSBQQVJUSUNMRV9TSVpFKSB7XG5cdFx0aWYgKHBhcnRpY2xlc1tpK1BBUlRJQ0xFX0xJRkVdID4gMCkge1xuXHRcdFx0cGFydGljbGVzW2orUEFSVElDTEVfWF0gPSBwYXJ0aWNsZXNbaStQQVJUSUNMRV9YXTtcblx0XHRcdHBhcnRpY2xlc1tqK1BBUlRJQ0xFX1ldID0gcGFydGljbGVzW2krUEFSVElDTEVfWV07XG5cdFx0XHRwYXJ0aWNsZXNbaitQQVJUSUNMRV9WWF0gPSBwYXJ0aWNsZXNbaStQQVJUSUNMRV9WWF07XG5cdFx0XHRwYXJ0aWNsZXNbaitQQVJUSUNMRV9WWV0gPSBwYXJ0aWNsZXNbaStQQVJUSUNMRV9WWV07XG5cdFx0XHRwYXJ0aWNsZXNbaitQQVJUSUNMRV9MSUZFXSA9IHBhcnRpY2xlc1tpK1BBUlRJQ0xFX0xJRkVdO1xuXHRcdFx0aiArPSBQQVJUSUNMRV9TSVpFO1xuXHRcdFx0bmV3Q291bnQrKztcblx0XHR9XG5cdH1cblx0dGhpcy5wYXJ0aWNsZUNvdW50ID0gbmV3Q291bnQ7XG5cdHRoaXMubmV4dFBhcnRpY2xlSW5kZXggPSBuZXdDb3VudCA+PSB0aGlzLm1heFBhcnRpY2xlcyA/IDAgOiBuZXdDb3VudDtcbn07XG5cblxuZnVuY3Rpb24gUGFydGljbGUoZ2FtZSwgeCwgeSkge1xuXHR0aGlzLmdhbWUgPSBnYW1lO1xuXHR0aGlzLmFjdGl2ZSA9IHRydWU7XG5cblx0dGhpcy54ID0geDtcblx0dGhpcy55ID0geTtcblxuXHR0aGlzLnJ4ID0gdGhpcy5yeSA9IDI7XG5cblx0dGhpcy52eCA9IDA7XG5cdHRoaXMudnkgPSAwO1xuXG5cdHRoaXMubGlmZSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSoyMCkrNDA7XG5cdHRoaXMuYm91bmNlID0gMC42O1xuXHR0aGlzLmdyYXZpdHkgPSAwLjA4O1xuXHR0aGlzLmRyYWcgPSAwLjk5ODtcblx0ZG8ge1xuXHRcdHRoaXMudnggPSAoTWF0aC5yYW5kb20oKSAtIDAuNSkgKiAyLjA7XG5cdFx0dGhpcy52eSA9IChNYXRoLnJhbmRvbSgpIC0gMC41KSAqIDIuMDtcblx0fSB3aGlsZSAodGhpcy52eCAqIHRoaXMudnggKyB0aGlzLnZ5ICogdGhpcy52eSA+IDEpO1xuXG5cdHZhciBzaXplID0gTWF0aC5zcXJ0KHRoaXMudngqdGhpcy52eCt0aGlzLnZ5KnRoaXMudnkpO1xuXHR2YXIgc3BlZWQgPSAxLjA7XG5cblx0dmFyIHhTcGVlZCA9IHRoaXMuaW5pdGlhbFZ4TXVsO1xuXHR2YXIgeVNwZWVkID0gdGhpcy5pbml0aWFsVnlNdWw7XG5cblx0dGhpcy52eCA9IHRoaXMudngvc2l6ZSp4U3BlZWQ7XG5cdHRoaXMudnkgPSB0aGlzLnZ5L3NpemUqeVNwZWVkO1xuXG5cdHRoaXMuc3ByaXRlID0gLTE7XG59XG5cblBhcnRpY2xlLnByb3RvdHlwZS5pbml0aWFsVnhNdWwgPSAxLjA7XG5QYXJ0aWNsZS5wcm90b3R5cGUuaW5pdGlhbFZ5TXVsID0gMi4wO1xuXG5FbmdpbmUuUGFydGljbGUgPSBQYXJ0aWNsZTtcblxubWl4aW4oUGFydGljbGUsIE1vdmFibGUpO1xuXG5QYXJ0aWNsZS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMubGlmZS0tO1xuXHRpZiAodGhpcy5saWZlIDwgMCkge1xuXHRcdHRoaXMuYWN0aXZlID0gZmFsc2U7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0dGhpcy52eCAqPSB0aGlzLmRyYWc7XG5cdHRoaXMudnkgKz0gdGhpcy5ncmF2aXR5O1xuXG5cdC8vIHZhciBzID0gTWF0aC5jZWlsKE1hdGguc3FydCh0aGlzLnZ4KnRoaXMudngrdGhpcy52eSp0aGlzLnZ5KSk7XG5cdC8vIGZvciAodmFyIGkgPSAwOyBpIDwgczsgKytpKVx0e1xuXHQvLyBcdHZhciBueCA9IHRoaXMudnggLyBzO1xuXG5cdC8vIFx0aWYgKHRoaXMuZ2FtZS5oaXRUZXN0KG54LCB5KSkge1xuXHQvLyBcdFx0dGhpcy52eCAqPSAtdGhpcy5ib3VuY2Vcblx0Ly8gXHR9XG5cdC8vIFx0ZWxzZSB7XG5cdC8vIFx0XHR0aGlzLnggPSBueDtcblx0Ly8gXHR9XG5cdC8vIFx0dmFyIG55ID0gdGhpcy52eSAvIHM7XG5cdC8vIFx0aWYgKHRoaXMuZ2FtZS5oaXRUZXN0KHgsIG55KSkge1xuXHQvLyBcdFx0dGhpcy52eSAqPSAtdGhpcy5ib3VuY2Vcblx0Ly8gXHR9XG5cdC8vIFx0ZWxzZSB7XG5cdC8vIFx0XHR0aGlzLnkgPSBueTtcblx0Ly8gXHR9XG5cdC8vIH1cblxuXHR0aGlzLmRvTW92ZSgpO1xufTtcblxuUGFydGljbGUucHJvdG90eXBlLmNvbGxpZGUgPSBmdW5jdGlvbihkeCwgZHkpIHtcblx0aWYgKGR4ICE9PSAwKSB0aGlzLnZ4ICo9IC10aGlzLmJvdW5jZTtcblx0aWYgKGR5ICE9PSAwKSB0aGlzLnZ5ICo9IC10aGlzLmJvdW5jZTtcbn07XG5cblBhcnRpY2xlLnByb3RvdHlwZS5nZXRDb2xvciA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gJyNmYmFmNWQnO1xufTtcblxuUGFydGljbGUucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKGMsIHN4LCBzeSkge1xuXHR2YXIgcHggPSBNYXRoLnJvdW5kKHRoaXMueCAtIHN4KSswLjU7XG5cdHZhciBweSA9IE1hdGgucm91bmQodGhpcy55IC0gc3kpKzAuNTtcblx0aWYgKHRoaXMuc3ByaXRlIDwgMCkge1xuXHRcdGMuZmlsbFN0eWxlID0gdGhpcy5nZXRDb2xvcigpO1xuXHRcdGMuZmlsbFJlY3QocHgtdGhpcy5yeCwgcHktdGhpcy5yeSwgdGhpcy5yeCoyLCB0aGlzLnJ5KjIpO1xuXHR9XG5cdGVsc2Uge1xuXHRcdHZhciBzeCA9IHRoaXMuc3ByaXRlICUgODtcblx0XHR2YXIgc3kgPSBNYXRoLmZsb29yKHRoaXMuc3ByaXRlIC8gOCkrMjtcblx0XHRjLmRyYXdJbWFnZShcblx0XHRcdEFzc2V0cy5pbWFnZXMubWlzYy5pbWFnZSxcblx0XHRcdHN4KjgsIHN5KjgsIDgsIDgsXG5cdFx0XHRweC00LCBweS00LCA4LCA4KTtcblx0fVxufTtcblxuLy8gZnVuY3Rpb24gQmxvb2QoZ2FtZSwgeCwgeSkge1xuLy8gXHRQYXJ0aWNsZS5jYWxsKHRoaXMsIGdhbWUsIHgsIHkpO1xuLy8gXHR0aGlzLnJ4ID0gdGhpcy5yeSA9IDAuNTtcbi8vIFx0Ly8gdGhpcy5jb2xvciA9ICcjYTAwMDAwJztcbi8vIFx0dGhpcy5zcHJpdGUgPSAtMTtcbi8vIFx0dGhpcy5kcmFnID0gMC45Njtcbi8vIFx0dGhpcy5ib3VuY2UgPSAwLjE7XG4vLyB9XG5cbi8vIEJsb29kLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUGFydGljbGUucHJvdG90eXBlKTtcbi8vIEJsb29kLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEJsb29kO1xuLy8gRW5naW5lLkJsb29kID0gQmxvb2Q7XG5cbi8vIEJsb29kLnByb3RvdHlwZS5ibG9ja0NoZWNrID0gZnVuY3Rpb24oeCwgeSkge1xuLy8gXHRyZXR1cm4gdGhpcy5nYW1lLmlzQmxvY2tlZCh4LCB5KTtcbi8vIH07XG5cbi8vIEJsb29kLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbihjLCBzeCwgc3ksIHBpeCkge1xuLy8gXHR2YXIgcHggPSBNYXRoLnJvdW5kKHRoaXMueCAtIHN4KTtcbi8vIFx0dmFyIHB5ID0gTWF0aC5yb3VuZCh0aGlzLnkgLSBzeSk7XG4vLyBcdHBpeC5wdXRQaXhlbChweCwgcHksIDB4ZmYwMDAwYTApO1xuLy8gfVxudmFyIEJsb29kU3lzdGVtID0gbmV3IFBhcnRpY2xlU3lzdGVtKHtcblx0cng6IDAuNSxcblx0cnk6IDAuNSxcblx0ZHJhZzogMC45Nixcblx0Ym91bmNlOiAwLjEsXG5cdG1heFBhcnRpY2xlczogNDA5Nixcbn0pO1xuXG5FbmdpbmUuQmxvb2RTeXN0ZW0gPSBCbG9vZFN5c3RlbTtcblxuQmxvb2RTeXN0ZW0ucmVuZGVyID0gZnVuY3Rpb24oY3R4LCBzeCwgc3ksIHBpeCkge1xuXHR2YXIgZW5kID0gTWF0aC5taW4odGhpcy5tYXhQYXJ0aWNsZXMsIHRoaXMucGFydGljbGVDb3VudCkqUEFSVElDTEVfU0laRTtcblx0dmFyIHBhcnRpY2xlcyA9IHRoaXMucGFydGljbGVzO1xuXHR2YXIgZHJhZyA9ICt0aGlzLmRyYWc7XG5cdHZhciBncmF2ID0gK3RoaXMuZ3Jhdml0eTtcblx0dmFyIGdhbWUgPSB0aGlzLmdhbWU7XG5cblx0dmFyIGJsb29kQ29sb3IgPSAweGZmMDAwMGEwO1xuXHR2YXIgcGl4ZWxzID0gcGl4LnBpeGVscztcblx0dmFyIHdpZHRoID0gcGl4LndpZHRoPj4+MDtcblx0dmFyIGhlaWdodCA9IHBpeC5oZWlnaHQ+Pj4wO1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IGVuZDsgaSArPSBQQVJUSUNMRV9TSVpFKSB7XG5cdFx0Ly8gaWYgKHBhcnRpY2xlc1tpK1BBUlRJQ0xFX0xJRkVdIDw9IDAuMCkge1xuXHRcdC8vIFx0Y29udGludWU7XG5cdFx0Ly8gfVxuXHRcdHZhciB4ID0gcGFydGljbGVzW2krUEFSVElDTEVfWF07XG5cdFx0dmFyIHkgPSBwYXJ0aWNsZXNbaStQQVJUSUNMRV9ZXTtcblx0XHR2YXIgcmVuZGVyWCA9IE1hdGguZmxvb3IoeC1zeCswLjUpO1xuXHRcdHZhciByZW5kZXJZID0gTWF0aC5mbG9vcih5LXN5KzAuNSk7XG5cdFx0aWYgKChyZW5kZXJYPj4+MCkgPCB3aWR0aCAmJiAocmVuZGVyWT4+PjApIDwgaGVpZ2h0KSB7XG5cdFx0XHRwaXhlbHNbcmVuZGVyWCtyZW5kZXJZKndpZHRoXSA9IGJsb29kQ29sb3I7XG5cdFx0fVxuXHR9XG59O1xuXG5mdW5jdGlvbiBHaWIoZ2FtZSwgeCwgeSwgaXNNb25zdHJvdXMpIHtcblx0UGFydGljbGUuY2FsbCh0aGlzLCBnYW1lLCB4LCB5KTtcblx0dGhpcy5zcHJpdGUgPSBpc01vbnN0cm91cyA/IDEgOiAwO1xufVxuXG5HaWIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShQYXJ0aWNsZS5wcm90b3R5cGUpO1xuR2liLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEdpYjtcblxuRW5naW5lLkdpYiA9IEdpYjtcblxuR2liLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcblx0UGFydGljbGUucHJvdG90eXBlLnVwZGF0ZS5jYWxsKHRoaXMpO1xuXHQvLyB2YXIgYmxvb2QgPSBuZXcgQmxvb2QodGhpcy5nYW1lLCB0aGlzLngsIHRoaXMueSk7XG5cdC8vIGJsb29kLnZ4IC89IDIwO1xuXHQvLyBibG9vZC52eSAvPSAyMDtcblx0Ly8gYmxvb2QudnggKz0gdGhpcy52eCAvIDI7XG5cdC8vIGJsb29kLnZ5ICs9IHRoaXMudnkgLyAyO1xuXHQvLyB0aGlzLmdhbWUuYWRkRWZmZWN0KGJsb29kKTtcblx0dmFyIGJsb29kSW5kZXggPSBCbG9vZFN5c3RlbS5hZGQodGhpcy54LCB0aGlzLnkpO1xuXG5cdHZhciBibG9vZFZ4ID0gQmxvb2RTeXN0ZW0ucGFydGljbGVzW2Jsb29kSW5kZXgrUEFSVElDTEVfVlhdO1xuXHR2YXIgYmxvb2RWeSA9IEJsb29kU3lzdGVtLnBhcnRpY2xlc1tibG9vZEluZGV4K1BBUlRJQ0xFX1ZZXTtcblxuXHRibG9vZFZ4ID0gYmxvb2RWeC8yMC4wICsgdGhpcy52eC8yLjA7XG5cdGJsb29kVnkgPSBibG9vZFZ5LzIwLjAgKyB0aGlzLnZ5LzIuMDtcblxuXHRCbG9vZFN5c3RlbS5wYXJ0aWNsZXNbYmxvb2RJbmRleCtQQVJUSUNMRV9WWF0gPSBibG9vZFZ4O1xuXHRCbG9vZFN5c3RlbS5wYXJ0aWNsZXNbYmxvb2RJbmRleCtQQVJUSUNMRV9WWV0gPSBibG9vZFZ5O1xuXG59O1xuXG5mdW5jdGlvbiBTbW9rZShnYW1lLCB4LCB5KSB7XG5cdFBhcnRpY2xlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cdHRoaXMuZ3Jhdml0eSA9IC0wLjA1O1xuXHR0aGlzLmxpZmUgPj49IDE7XG5cdHRoaXMuYWdlID0gdGhpcy5saWZlO1xuXHR0aGlzLmRyYWcgPSAwLjk7XG59XG5cblNtb2tlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUGFydGljbGUucHJvdG90eXBlKTtcblNtb2tlLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNtb2tlO1xuRW5naW5lLlNtb2tlID0gU21va2U7XG5cbi8vU21va2UucHJvdG90eXBlLmluaXRpYWxWeE11bCA9IDA7XG5TbW9rZS5wcm90b3R5cGUuaW5pdGlhbFZ5TXVsID0gMDtcblxuU21va2UucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKGMsIHN4LCBzeSwgcGl4YnVmKSB7XG5cdHZhciBweCA9IE1hdGgucm91bmQodGhpcy54IC0gc3gpO1xuXHR2YXIgcHkgPSBNYXRoLnJvdW5kKHRoaXMueSAtIHN5KTtcblx0dmFyIHNoYWRlID0gTWF0aC5mbG9vcigxMjcgKiB0aGlzLmxpZmUgLyB0aGlzLmFnZSk7XG5cdHZhciBjb2xvciA9IDB4ZmYwMDAwMDB8KHNoYWRlPDwxNil8KHNoYWRlPDw4KXxzaGFkZTtcblx0Zm9yICh2YXIgeSA9IC0xOyB5IDwgMTsgKyt5KSB7XG5cdFx0Zm9yICh2YXIgeCA9IC0xOyB4IDwgMTsgKyt4KSB7XG5cdFx0XHRwaXhidWYucHV0UGl4ZWwocHgreCwgcHkreSwgY29sb3IpO1xuXHRcdH1cblx0fVxufTtcblxuZnVuY3Rpb24gRmxhbWUoZ2FtZSwgeCwgeSkge1xuXHRQYXJ0aWNsZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXHR0aGlzLmdyYXZpdHkgPSAwO1xuXHR0aGlzLmxpZmUgPj49IDE7XG5cdHRoaXMuYWdlID0gdGhpcy5saWZlO1xuXHR0aGlzLmRpciA9IChNYXRoLnJhbmRvbSgpKjMpfDBcblx0dGhpcy5kcmFnID0gMC45Mjtcblx0dGhpcy5lbWl0U21va2UgPSB0cnVlO1xufVxuXG5GbGFtZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFBhcnRpY2xlLnByb3RvdHlwZSk7XG5GbGFtZS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBGbGFtZTtcbkVuZ2luZS5GbGFtZSA9IEZsYW1lO1xuXG5GbGFtZS5wcm90b3R5cGUuaW5pdGlhbFZ5TXVsID0gMS4wO1xuRmxhbWUucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnNwcml0ZSA9ICg4KnRoaXMuZGlyKSArIE1hdGguZmxvb3IoNCAqIHRoaXMubGlmZSAvIHRoaXMuYWdlKTtcblx0UGFydGljbGUucHJvdG90eXBlLnJlbmRlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuRmxhbWUucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRQYXJ0aWNsZS5wcm90b3R5cGUudXBkYXRlLmFwcGx5KHRoaXMpO1xuXHRpZiAoIXRoaXMuYWN0aXZlICYmIE1hdGgucmFuZG9tKCkgPCAwLjIgJiYgIXRoaXMuZW1pdFNtb2tlKSB7XG5cdFx0dmFyIG51bVNtb2tlcyA9IE1hdGguY2VpbChNYXRoLnJhbmRvbSgpICogMyk7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBudW1TbW9rZXM7ICsraSkge1xuXHRcdFx0dmFyIHMgPSBuZXcgU21va2UodGhpcy5nYW1lLCB0aGlzLngrKE1hdGgucmFuZG9tKCktMC41KSo0LCB0aGlzLnkrKE1hdGgucmFuZG9tKCktMC41KSo0KTtcblx0XHRcdHMudnggPSBzLnZ4LzEwICsgdGhpcy52eDtcblx0XHRcdHMudnkgPSBzLnZ5LzEwICsgdGhpcy52eTtcblx0XHRcdHRoaXMuZ2FtZS5hZGRFZmZlY3Qocyk7XG5cdFx0fVxuXHR9XG59O1xuXG5mdW5jdGlvbiBFeGl0UGFydGljbGUoZ2FtZSwgZXhpdCkge1xuXHRQYXJ0aWNsZS5jYWxsKHRoaXMsIGdhbWUsIGdhbWUucGxheWVyLngsIGdhbWUucGxheWVyLnkpO1xuXHR0aGlzLmV4aXQgPSBleGl0O1xuXHR0aGlzLnhPZmZzZXQgPSA1KihNYXRoLnJhbmRvbSgpIC0gMC41KTtcblx0dGhpcy55T2Zmc2V0ID0gNSooTWF0aC5yYW5kb20oKSAtIDAuNSk7XG5cdHRoaXMucG9zID0gTWF0aC5yYW5kb20oKSAqIDAuNztcblx0dGhpcy5saWZlID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMjAgKyAyMCk7XG5cdHRoaXMuc3BlZWQgPSAoTWF0aC5yYW5kb20oKSArIDAuNCkqMC4wMjtcblx0dGhpcy5vcGFjaXR5ID0gTWF0aC5yYW5kb20oKTtcblx0dGhpcy5zcHJpdGUgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiA0KTtcbn1cblxuRXhpdFBhcnRpY2xlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUGFydGljbGUucHJvdG90eXBlKTtcbkV4aXRQYXJ0aWNsZS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBFeGl0UGFydGljbGU7XG5FbmdpbmUuRXhpdFBhcnRpY2xlID0gRXhpdFBhcnRpY2xlO1xuXG5FeGl0UGFydGljbGUucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRpZiAoLS10aGlzLmxpZmUgPCAwIHx8IHRoaXMucG9zID49IDEpIHtcblx0XHR0aGlzLmFjdGl2ZSA9IGZhbHNlO1xuXHRcdHJldHVybjtcblx0fVxuXG5cdHZhciBwbGF5ZXIgPSB0aGlzLmdhbWUucGxheWVyO1xuXG5cdHZhciBoZWFkaW5nID0gTWF0aC5hdGFuMihwbGF5ZXIudnksIHBsYXllci52eCk7XG5cblx0dmFyIHhzID0gcGxheWVyLnggKyBNYXRoLmNvcyhoZWFkaW5nKSoyO1xuXHR2YXIgeXMgPSBwbGF5ZXIueSArIE1hdGguc2luKGhlYWRpbmcpKjI7XG5cblx0dmFyIHhtID0gcGxheWVyLnggKyBNYXRoLmNvcyhoZWFkaW5nKSoyMDtcblx0dmFyIHltID0gcGxheWVyLnkgKyBNYXRoLnNpbihoZWFkaW5nKSoyMDtcblxuXHR2YXIgeDAgPSB4cyArICh4bSAtIHBsYXllci54KSp0aGlzLnBvcztcblx0dmFyIHkwID0geXMgKyAoeW0gLSBwbGF5ZXIueSkqdGhpcy5wb3M7XG5cblx0dmFyIHgxID0geG0gKyAodGhpcy5leGl0LnggLSB4bSkqdGhpcy5wb3M7XG5cdHZhciB5MSA9IHltICsgKHRoaXMuZXhpdC55IC0geW0pKnRoaXMucG9zO1xuXG5cdHRoaXMueCA9IHgwICsgKHgxIC0geDApICogdGhpcy5wb3MgKyB0aGlzLnhPZmZzZXQgKiB0aGlzLnBvcztcblx0dGhpcy55ID0geTAgKyAoeTEgLSB5MCkgKiB0aGlzLnBvcyArIHRoaXMueU9mZnNldCAqIHRoaXMucG9zO1xuXG5cdHRoaXMucG9zICs9IHRoaXMuc3BlZWQ7XG5cdHRoaXMuc3ByaXRlID0gKHRoaXMuc3ByaXRlKzEpJTQ7XG59O1xuXG5FeGl0UGFydGljbGUucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKGN0eCwgc3gsIHN5LCBwaXgpIHtcblx0dmFyIHB4ID0gTWF0aC5yb3VuZCh0aGlzLngtc3gpO1xuXHR2YXIgcHkgPSBNYXRoLnJvdW5kKHRoaXMueS1zeSk7XG5cdGlmIChweCA+PSAwICYmIHB4IDwgY3R4LmNhbnZhcy53aWR0aCAmJiBweSA+PSAwICYmIHB5IDwgY3R4LmNhbnZhcy5oZWlnaHQpIHtcblx0XHR2YXIgb2xkQWxwaGEgPSBjdHguZ2xvYmFsQWxwaGE7XG5cdFx0Y3R4Lmdsb2JhbEFscGhhID0gdGhpcy5vcGFjaXR5O1xuXHRcdHZhciBzaXplTXVsID0gOCAqICgoMSAtIHRoaXMucG9zKSowLjUgKyAwLjUpO1xuXHRcdGN0eC5kcmF3SW1hZ2UoXG5cdFx0XHRBc3NldHMuaW1hZ2VzLm1pc2MuaW1hZ2UsXG5cdFx0XHQoNCt0aGlzLnNwcml0ZSkqOCwgMyo4LCA4LCA4LFxuXHRcdFx0cHgtc2l6ZU11bC8yLCBweS1zaXplTXVsLzIsIHNpemVNdWwsIHNpemVNdWwpO1xuXHRcdGN0eC5nbG9iYWxBbHBoYSA9IG9sZEFscGhhO1xuXHR9XG59XG5cblxuXG5mdW5jdGlvbiBFeHBsb3Npb24oZ2FtZSwgeCwgeSkge1xuXHRQYXJ0aWNsZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXHR0aGlzLnZ4ID0gMDtcblx0dGhpcy52eSA9IDA7XG5cblx0dGhpcy5saWZlID0gdGhpcy5hZ2UgPSA1O1xuXHRBc3NldHMuc291bmRzLmJvb20ucGxheSgpO1xufVxuRXhwbG9zaW9uLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUGFydGljbGUucHJvdG90eXBlKTtcbkV4cGxvc2lvbi5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBFeHBsb3Npb247XG5FbmdpbmUuRXhwbG9zaW9uID0gRXhwbG9zaW9uO1xuXG5FeHBsb3Npb24ucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRpZiAoLS10aGlzLmxpZmUgPCAwKSB7XG5cdFx0dGhpcy5hY3RpdmUgPSBmYWxzZTtcblx0XHRyZXR1cm47XG5cdH1cblx0dmFyIGJpdHMgPSBNYXRoLmNlaWwodGhpcy5saWZlICogNDAgLyB0aGlzLmFnZSk7XG5cdHZhciBkZCA9ICh0aGlzLmFnZSAtIHRoaXMubGlmZSkvdGhpcy5hZ2UgKyAwLjI7XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgYml0czsgKytpKSB7XG5cdFx0dmFyIGRpciA9IE1hdGgucmFuZG9tKCkgKiBNYXRoLlBJICogMjtcblx0XHR2YXIgZGlzdCA9IE1hdGgucmFuZG9tKCkgKiA2ICogZGQ7XG5cdFx0dmFyIHh4ID0gdGhpcy54ICsgTWF0aC5jb3MoZGlyKSAqIGRpc3Q7XG5cdFx0dmFyIHl5ID0gdGhpcy55ICsgTWF0aC5zaW4oZGlyKSAqIGRpc3Q7XG5cdFx0dmFyIGZsYW1lID0gbmV3IEZsYW1lKHRoaXMuZ2FtZSwgeHgsIHl5KTtcblx0XHRpZiAoTWF0aC5yYW5kb20oKSA8IDAuNSkge1xuXHRcdFx0ZmxhbWUuYWdlID4+PSAxO1xuXHRcdFx0ZmxhbWUubGlmZSA9IGZsYW1lLmFnZTtcblx0XHR9XG5cdFx0ZmxhbWUudnggLz0gMTA7XG5cdFx0ZmxhbWUudnkgLz0gMTA7XG5cdFx0ZmxhbWUudnggKz0gKHh4IC0gdGhpcy54KS8yLjA7XG5cdFx0ZmxhbWUudnkgKz0gKHl5IC0gdGhpcy55KS8yLjA7XG5cdFx0ZmxhbWUuZ3Jhdml0eSA9IDAuMTtcblx0XHR0aGlzLmdhbWUuYWRkRWZmZWN0KGZsYW1lKTtcblx0fVxufTtcblxuRXhwbG9zaW9uLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbigpIHt9O1xuXG5mdW5jdGlvbiBFbnRpdHkoZ2FtZSkge1xuXHR0aGlzLmdhbWUgPSBnYW1lO1xuXHR0aGlzLmFjdGl2ZSA9IHRydWU7XG5cblx0dGhpcy54ID0gMDtcblx0dGhpcy55ID0gMDtcblxuXHR0aGlzLnZ4ID0gMDtcblx0dGhpcy52eSA9IDA7XG5cblx0dGhpcy5yeCA9IHRoaXMucnkgPSAxO1xufVxuXG5taXhpbihFbnRpdHksIE1vdmFibGUpO1xuXG5FbmdpbmUuRW50aXR5ID0gRW50aXR5O1xuXG5FbnRpdHkucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge307XG5FbnRpdHkucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKGMsIG14LCBteSkge307XG5cbkVudGl0eS5wcm90b3R5cGUuY29sbGlkZXNXaXRoUGxheWVyID0gZnVuY3Rpb24oKSB7XG5cdHZhciBwbGF5ZXIgPSB0aGlzLmdhbWUucGxheWVyO1xuXHR2YXIgcExlZnQgPSBwbGF5ZXIueCAtIHBsYXllci53aWR0aC8yO1xuXHR2YXIgcFJpZ2h0ID0gcGxheWVyLnggKyBwbGF5ZXIud2lkdGgvMjtcblx0dmFyIHBUb3AgPSBwbGF5ZXIueSAtIHBsYXllci5oZWlnaHQvMjtcblx0dmFyIHBCb3R0b20gPSBwbGF5ZXIueSArIHBsYXllci5oZWlnaHQvMjtcblxuXHR2YXIgdExlZnQgPSB0aGlzLnggLSB0aGlzLnJ4O1xuXHR2YXIgdFJpZ2h0ID0gdGhpcy54ICsgdGhpcy5yeDtcblx0dmFyIHRCb3R0b20gPSB0aGlzLnkgKyB0aGlzLnJ5O1xuXHR2YXIgdFRvcCA9IHRoaXMueSAtIHRoaXMucnk7XG5cblx0cmV0dXJuICEoXG5cdFx0cExlZnQgPiB0TGVmdCB8fCBwUmlnaHQgPCB0UmlnaHQgfHxcblx0XHRwVG9wID4gdFRvcCB8fCBwQm90dG9tIDwgdEJvdHRvbSk7XG59O1xuRW50aXR5LnByb3RvdHlwZS5zZXRQb3NpdGlvbiA9IGZ1bmN0aW9uKHgsIHkpIHtcblx0dGhpcy55ID0geTtcblx0dGhpcy54ID0geDtcbn07XG5cbmZ1bmN0aW9uIEJ1bGxldChnYW1lLCBzaG9vdGVyLCBkeCwgZHksIGRtZywgc3BlZWQpIHtcblx0RW50aXR5LmNhbGwodGhpcywgZ2FtZSk7XG5cdHRoaXMuc3BlZWQgPSBzcGVlZCB8fCA0O1xuXHR0aGlzLmRhbWFnZSA9IGRtZyB8fCBNYXRoLmNlaWwoTWF0aC5yYW5kb20oKSAqIDQpO1xuXHR0aGlzLmxhc3RYID0gMDtcblx0dGhpcy5sYXN0WSA9IDA7XG5cdHRoaXMuc2V0UG9zaXRpb24oc2hvb3Rlci54LCBzaG9vdGVyLnkpO1xuXG5cdHRoaXMubWF4RGlzdCA9IDMwMDtcblx0dmFyIGxlbiA9IE1hdGguc3FydChkeCpkeCArIGR5KmR5KTtcblx0aWYgKGxlbiAhPT0gMCkge1xuXHRcdGR4IC89IGxlbjtcblx0XHRkeSAvPSBsZW47XG5cdH1cblxuXHR0aGlzLnZ4ID0gZHggKiBzcGVlZDtcblx0dGhpcy52eSA9IGR5ICogc3BlZWQ7XG5cdEFzc2V0cy5zb3VuZHMuc2hvb3RCdWxsZXQucGxheSgpO1xufTtcblxuQnVsbGV0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRW50aXR5LnByb3RvdHlwZSk7XG5CdWxsZXQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQnVsbGV0O1xuXG5CdWxsZXQucHJvdG90eXBlLnNldFBvc2l0aW9uID0gZnVuY3Rpb24oeCwgeSkge1xuXHR0aGlzLnN0YXJ0WSA9IHRoaXMueSA9IHRoaXMubGFzdFkgPSB5O1xuXHR0aGlzLnN0YXJ0WCA9IHRoaXMueCA9IHRoaXMubGFzdFggPSB4O1xufTtcblxuQnVsbGV0LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5sYXN0WCA9IHRoaXMueDtcblx0dGhpcy5sYXN0WSA9IHRoaXMueTtcblx0RW50aXR5LnByb3RvdHlwZS51cGRhdGUuY2FsbCh0aGlzKTtcblx0dGhpcy5kb01vdmUoKTtcblx0aWYgKHRoaXMuY29sbGlkZXNXaXRoUGxheWVyKCkpIHtcblx0XHR0aGlzLm9uUGxheWVyQ29sbGlzaW9uKCk7XG5cdH1cblx0ZWxzZSBpZiAodGhpcy5tYXhEaXN0ID4gMCAmJiBkaXN0QmV0d2Vlbih0aGlzLngsIHRoaXMueSwgdGhpcy5zdGFydFgsIHRoaXMuc3RhcnRZKSA+PSB0aGlzLm1heERpc3QpIHtcblx0XHR0aGlzLmFjdGl2ZSA9IGZhbHNlO1xuXHR9XG5cbn07XG5cbkJ1bGxldC5wcm90b3R5cGUub25QbGF5ZXJDb2xsaXNpb24gPSBmdW5jdGlvbigpIHtcblx0dGhpcy5hY3RpdmUgPSBmYWxzZTtcblx0dmFyIHAgPSB0aGlzLmdhbWUucGxheWVyO1xuXHRjb25zb2xlLmxvZyhcImh1cnQ6IGJ1bGxldFwiKVxuXHRwLmh1cnRGb3IodGhpcy5kYW1hZ2UpO1xuXHR2YXIgZ2liID0gbmV3IEdpYih0aGlzLmdhbWUsIHRoaXMueCwgdGhpcy55LCB0cnVlKTtcblx0Z2liLnZ4ICs9IHRoaXMudng7XG5cdGdpYi52eSArPSB0aGlzLnZ5O1xuXHR0aGlzLmdhbWUuYWRkRWZmZWN0KGdpYik7XG59O1xuXG5CdWxsZXQucHJvdG90eXBlLmNvbGxpZGUgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5hY3RpdmUgPSBmYWxzZTtcbn07XG5cbkJ1bGxldC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oYywgc3gsIHN5LCBwaXgpIHtcblx0dmFyIHB4ID0gTWF0aC5yb3VuZCh0aGlzLnggLSBzeCk7XG5cdHZhciBweSA9IE1hdGgucm91bmQodGhpcy55IC0gc3kpO1xuXG5cdHZhciBvcHggPSBNYXRoLnJvdW5kKHRoaXMubGFzdFggLSBzeCk7XG5cdHZhciBvcHkgPSBNYXRoLnJvdW5kKHRoaXMubGFzdFkgLSBzeSk7XG5cdHZhciBkeCA9IHB4LW9weDtcblx0dmFyIGR5ID0gcHktb3B5O1xuXHR2YXIgc3RlcHMgPSBNYXRoLmNlaWwoTWF0aC5zcXJ0KGR4KmR4K2R5KmR5KSk7XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgc3RlcHM7ICsraSkge1xuXHRcdGlmIChNYXRoLnJhbmRvbSgpICogc3RlcHMgPCBpKSB7XG5cdFx0XHRjb250aW51ZTtcblx0XHR9XG5cdFx0dmFyIGJyID0gKDI1NSAtIGkgKiAxMjggLyBzdGVwcykmMHhmZjtcblx0XHR2YXIgeHggPSAocHggLSBkeCAqIGkgLyBzdGVwcyl8MDtcblx0XHR2YXIgeXkgPSAocHkgLSBkeSAqIGkgLyBzdGVwcyl8MDtcblx0XHR2YXIgcGl4ZWwgPSAweGZmMDAwMDAwfChicjw8MTYpfChicjw8OCl8YnI7XG5cdFx0cGl4LnB1dFBpeGVsKHh4LCB5eSwgcGl4ZWwpO1xuXHRcdC8vYy5nbG9iYWxBbHBoYSA9IE1hdGgubWF4KDAsIE1hdGgubWluKDEsIDAuNSArIChici8yNTUvMikpKTtcblx0XHQvL2MuZmlsbFJlY3QoeHgsIHl5LCAxLCAxKTtcblx0fVxufTtcblxuZnVuY3Rpb24gUm9ja2V0KGdhbWUsIHNob290ZXIsIGR4LCBkeSwgZG1nLCBzcGVlZCkge1xuXHRCdWxsZXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0dGhpcy5kYW1hZ2UgKz0gMTA7IC8vIDozXG5cdHRoaXMucnggPSA0O1xuXHR0aGlzLnJ5ID0gNDtcblx0Ly8gQXNzZXRzLnNvdW5kcy5zaG9vdFJvY2tldC5wbGF5KCk7XG59O1xuXG5Sb2NrZXQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShCdWxsZXQucHJvdG90eXBlKTtcblJvY2tldC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBSb2NrZXQ7XG5FbmdpbmUuUm9ja2V0ID0gUm9ja2V0O1xuXG5Sb2NrZXQucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgZmxhbWUgPSBuZXcgRmxhbWUodGhpcy5nYW1lLCB0aGlzLngtdGhpcy52eCoyLCB0aGlzLnktdGhpcy52eSoyKTtcblx0Ly8gZmxhbWUuZ3Jhdml0eSA9IDAuMTtcblx0ZmxhbWUudnggKj0gMC4xO1xuXHRmbGFtZS52eSAqPSAwLjE7XG5cblx0ZmxhbWUudnggKz0gdGhpcy52eDtcblx0ZmxhbWUudnkgKz0gdGhpcy52eTtcblxuXHRmbGFtZS5saWZlID0gZmxhbWUuYWdlIC8gMjtcblx0dGhpcy5nYW1lLmFkZEVmZmVjdChmbGFtZSk7XG5cdEJ1bGxldC5wcm90b3R5cGUudXBkYXRlLmNhbGwodGhpcyk7XG5cdC8vIHRoaXMuZG9Nb3ZlKCk7XG59O1xuXG5Sb2NrZXQucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKGMsIHN4LCBzeSwgcGl4KSB7XG5cdHZhciBzcHJpdGUgPSAoTWF0aC5mbG9vcigtTWF0aC5hdGFuMih0aGlzLnZ5LCB0aGlzLnZ4KSAqIDE2IC8gKE1hdGguUEkqMikpICsgNC41KSAmIDc7XG5cdGMuZHJhd0ltYWdlKEFzc2V0cy5pbWFnZXMubWlzYy5pbWFnZSxcblx0XHRzcHJpdGUqOCwgOCwgOCwgOCxcblx0XHRNYXRoLnJvdW5kKHRoaXMueC1zeC00KSswLjUsIE1hdGgucm91bmQodGhpcy55LXN5LTQpKzAuNSwgOCwgOCk7XG59O1xuXG5Sb2NrZXQucHJvdG90eXBlLmNvbGxpZGUgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5hY3RpdmUgPSBmYWxzZTtcblxuXHR0aGlzLmdhbWUuZXhwbG9kZSh0aGlzLngsIHRoaXMueSwgdGhpcy5kYW1hZ2UpO1xufTtcblxuUm9ja2V0LnByb3RvdHlwZS5vblBsYXllckNvbGxpc2lvbiA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLmdhbWUucGxheWVyLmh1cnRGb3IodGhpcy5kYW1hZ2UpO1xuXHR0aGlzLmFjdGl2ZSA9IGZhbHNlO1xuXHR2YXIgZ2licyA9IDQgKyAoTWF0aC5yYW5kb20oKSozKXwwXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgZ2liczsgKytpKSB7XG5cdFx0dmFyIG94ID0gKE1hdGgucmFuZG9tKCkgLSAwLjUpKnRoaXMuZ2FtZS5wbGF5ZXIucng7XG5cdFx0dmFyIG95ID0gKE1hdGgucmFuZG9tKCkgLSAwLjUpKnRoaXMuZ2FtZS5wbGF5ZXIucnk7XG5cdFx0dmFyIGdpYiA9IG5ldyBHaWIodGhpcy5nYW1lLCB0aGlzLmdhbWUucGxheWVyLngrb3gsIHRoaXMuZ2FtZS5wbGF5ZXIueStveSwgdHJ1ZSk7XG5cdFx0Z2liLnZ4ICo9IDAuMTtcblx0XHRnaWIudnkgKj0gMC4xO1xuXHRcdGdpYi52eCArPSB0aGlzLnZ4O1xuXHRcdGdpYi52eSArPSB0aGlzLnZ5O1xuXHRcdHRoaXMuZ2FtZS5hZGRFZmZlY3QoZ2liKTtcblx0fVxuXHR0aGlzLmdhbWUuZXhwbG9kZSh0aGlzLngsIHRoaXMueSwgdGhpcy5kYW1hZ2UpO1xufVxuXG5mdW5jdGlvbiBFeGl0KGdhbWUsIHgsIHkpIHtcblx0RW50aXR5LmNhbGwodGhpcywgZ2FtZSk7XG5cdHRoaXMuc2V0UG9zaXRpb24oeCwgeSk7XG5cdHRoaXMucnggPSA4O1xuXHR0aGlzLnJ5ID0gODtcblx0dGhpcy5zcHJpdGUgPSAwO1xuXHR0aGlzLmJvYiA9IDBcblx0dGhpcy52aXNpYmxlID0gZmFsc2U7XG5cdHRoaXMuaGVhZGluZyA9IE1hdGgucmFuZG9tKCkgKiBNYXRoLlBJKjI7XG5cdHRoaXMuZGVsdGFIZWFkaW5nID0gKE1hdGgucmFuZG9tKCktMC41KS8xMDA7XG59O1xuXG5FbmdpbmUuRXhpdCA9IEV4aXQ7XG5FeGl0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRW50aXR5LnByb3RvdHlwZSk7XG5FeGl0LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEV4aXQ7XG5cbkV4aXQucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRpZiAoIXRoaXMudmlzaWJsZSkge1xuXHRcdHZhciBlbnRzID0gdGhpcy5nYW1lLmVudGl0aWVzO1xuXHRcdHZhciBzYXdIb3N0aWxlID0gZmFsc2U7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBlbnRzLmxlbmd0aDsgKytpKSB7XG5cdFx0XHRpZiAoZW50c1tpXS5pc0hvc3RpbGUpIHtcblx0XHRcdFx0c2F3SG9zdGlsZSA9IHRydWU7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAoIXNhd0hvc3RpbGUpIHtcblx0XHRcdHRoaXMudmlzaWJsZSA9IHRydWU7XG5cdFx0XHRBc3NldHMuc291bmRzLmV4aXRBcHBlYXIucGxheSgpO1xuXHRcdH1cblx0fVxuXHRlbHNlIHtcblx0XHR0aGlzLmhlYWRpbmcgKz0gdGhpcy5kZWx0YUhlYWRpbmc7XG5cdFx0dGhpcy5kZWx0YUhlYWRpbmcgKz0gKE1hdGgucmFuZG9tKCktMC41KS8xMDA7XG5cdFx0dGhpcy5kZWx0YUhlYWRpbmcgPSBjbGFtcCh0aGlzLmRlbHRhSGVhZGluZywgLTAuMDUsIDAuMDUpO1xuXHRcdHRoaXMuc3ByaXRlID0gKHRoaXMuc3ByaXRlICsgMSkmNztcblx0XHQrK3RoaXMuYm9iO1xuXHRcdGlmIChkaXN0QmV0d2Vlbih0aGlzLngsIHRoaXMueSwgdGhpcy5nYW1lLnBsYXllci54LCB0aGlzLmdhbWUucGxheWVyLnkpIDwgdGhpcy5yeCozKSB7XG5cdFx0Ly8gaWYgKHRoaXMuY29sbGlkZXNXaXRoUGxheWVyKCkpIHtcblx0XHRcdHRoaXMuZ2FtZS53b25MZXZlbCgpO1xuXHRcdH1cblx0XHRlbHNlIGlmIChNYXRoLnJhbmRvbSgpIDwgMC4yKSB7XG5cdFx0XHR0aGlzLmdhbWUuYWRkRWZmZWN0KG5ldyBFeGl0UGFydGljbGUodGhpcy5nYW1lLCB0aGlzKSlcblx0XHR9XG5cdH1cblxufTtcblxuRXhpdC5ib2JSYXRlID0gMTA7XG5FeGl0LnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbihjdHgsIHN4LCBzeSkge1xuXHRpZiAoIXRoaXMudmlzaWJsZSkge1xuXHRcdHJldHVybjtcblx0fVxuXHR2YXIgdHggPSB0aGlzLng7XG5cdHZhciB0eSA9IHRoaXMueSArIE1hdGguc2luKHRoaXMuYm9iL0V4aXQuYm9iUmF0ZSkqMjtcblxuXHR2YXIgcHggPSBNYXRoLnJvdW5kKHR4IC0gc3gpO1xuXHR2YXIgcHkgPSBNYXRoLnJvdW5kKHR5IC0gc3kpO1xuXG5cdGN0eC5kcmF3SW1hZ2UoXG5cdFx0QXNzZXRzLmltYWdlcy5leGl0LmltYWdlLFxuXHRcdHRoaXMuc3ByaXRlKjE2LCAwLCAxNiwgMTYsXG5cdFx0cHgtOCwgcHktOCwgMTYsIDE2KTtcbn07XG5cblxuZnVuY3Rpb24gQ29wdGVyKGdhbWUsIHgsIHkpIHtcblx0RW50aXR5LmNhbGwodGhpcywgZ2FtZSk7XG5cdHRoaXMudGltZXIgPSBuZXcgVGltZXIoKTtcblx0dGhpcy5zZXRQb3NpdGlvbih4LCB5KTtcblx0dGhpcy5ocCA9IDE1O1xuXHR0aGlzLmdyYXZpdHkgPSAwO1xuXHR0aGlzLmRyYWcgPSAwLjk7XG5cdHRoaXMuaGl0ID0gMDtcblx0dGhpcy5yeCA9IHRoaXMucnkgPSA4O1xuXHR0aGlzLmJvYiA9IChNYXRoLnJhbmRvbSgpICogNDApfDA7XG5cdHRoaXMuc3ByaXRlID0gKE1hdGgucmFuZG9tKCkqOCl8MDtcblx0dGhpcy53ZWFwb25UeXBlID0gTWF0aC5yYW5kb20oKSA8IDAuOSA/IFJvY2tldCA6IEJ1bGxldDtcbn1cblxuRW5naW5lLkNvcHRlciA9IENvcHRlcjtcbkNvcHRlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVudGl0eS5wcm90b3R5cGUpO1xuQ29wdGVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENvcHRlcjtcblxuQ29wdGVyLnByb3RvdHlwZS5pc0hvc3RpbGUgPSB0cnVlO1xuXG5Db3B0ZXIucHJvdG90eXBlLmRpZSA9IGZ1bmN0aW9uKCkge1xuXHRBc3NldHMuc291bmRzLm1kaWUucGxheSgpO1xuXHR0aGlzLmFjdGl2ZSA9IGZhbHNlO1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IDM7ICsraSkge1xuXHRcdHRoaXMuZ2FtZS5hZGRFZmZlY3QobmV3IEdpYih0aGlzLmdhbWUsIHRoaXMueCwgdGhpcy55LCBmYWxzZSkpO1xuXHR9XG5cdHRoaXMuZ2FtZS5leHBsb2RlKHRoaXMueCwgdGhpcy55LCAxMCk7XG5cdC8vIHRoaXMuZ2FtZS5hZGRFZmZlY3QobmV3IEV4cGxvc2lvbih0aGlzLmdhbWUsIHRoaXMueCwgdGhpcy55KSk7XG59O1xuXG5Db3B0ZXIucHJvdG90eXBlLmh1cnRGb3IgPSBmdW5jdGlvbihkbWcpIHtcblx0dGhpcy50aW1lci5zZXQoJ2hpdCcsIDUpO1xuXHR0aGlzLmhwIC09IGRtZztcblx0aWYgKHRoaXMuaHAgPD0gMCkge1xuXHRcdHRoaXMuaHAgPSAwO1xuXHRcdHRoaXMuZGllKCk7XG5cdH1cblx0ZWxzZSB7XG5cdFx0aWYgKHRoaXMuc291bmRJZCA9PSBudWxsIHx8ICFBc3NldHMuc291bmRzLmh1cnRtLnBsYXlpbmcodGhpcy5zb3VuZElkKSkge1xuXHRcdFx0dGhpcy5zb3VuZElkID0gQXNzZXRzLnNvdW5kcy5odXJ0bS5wbGF5KCk7XG5cdFx0fVxuXHR9XG59O1xuXG5Db3B0ZXIucHJvdG90eXBlLm92ZXJsYXBzUGxheWVyID0gZnVuY3Rpb24oKSB7XG5cdC8vIEBIQUNLXG5cdHJldHVybiAoXG5cdFx0ZGlzdEJldHdlZW4odGhpcy54LCB0aGlzLnksIHRoaXMuZ2FtZS5wbGF5ZXIueCwgdGhpcy5nYW1lLnBsYXllci55KSA8XG5cdFx0TWF0aC5taW4odGhpcy5yeCt0aGlzLmdhbWUucGxheWVyLnJ4LCB0aGlzLnJ5K3RoaXMuZ2FtZS5wbGF5ZXIucnkpXG5cdCk7XG59O1xuXG5Db3B0ZXIuYm9iUmF0ZSA9IDg7XG5Db3B0ZXIuYm9iQW1wbGl0dWRlID0gMC4xO1xuQ29wdGVyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcblx0RW50aXR5LnByb3RvdHlwZS51cGRhdGUuY2FsbCh0aGlzKTtcblx0dGhpcy5zcHJpdGUrKztcblx0dGhpcy5ib2IrKztcblxuXHRpZiAodGhpcy5oaXQgPiAwKSB7XG5cdFx0LS10aGlzLmhpdDtcblx0fVxuXG5cdGlmIChNYXRoLnJhbmRvbSgpIDwgMC4wMSkge1xuXHRcdC8vIHRoaXMuZ2FtZS5hZGRTbW9rZSh0aGlzLngsIHRoaXMueS10aGlzLnJ5KTtcblx0fVxuXG5cblx0dGhpcy50aW1lci51cGRhdGUoKTtcblx0dmFyIGRpc3RUb1BsYXllciA9IGRpc3RCZXR3ZWVuKHRoaXMueCwgdGhpcy55LCB0aGlzLmdhbWUucGxheWVyLngsIHRoaXMuZ2FtZS5wbGF5ZXIueSk7XG5cdGlmICh0aGlzLm92ZXJsYXBzUGxheWVyKCkpIHtcblx0XHR0aGlzLmh1cnRGb3IoMTAwKTtcblx0fVxuXHRlbHNlIGlmIChkaXN0VG9QbGF5ZXIgPCAxMDApIHtcblx0XHRpZiAodGhpcy50aW1lci50ZXN0KCdoaXQnKSkge1xuXHRcdFx0aWYgKHRoaXMuZ2FtZS50ZW50YWNsZVRvdWNoZWQodGhpcy54LCB0aGlzLnksIHRoaXMucngsIHRoaXMucnkpKSB7XG5cdFx0XHRcdC8vIHRoaXMudGltZXIuc2V0KCdoaXQnLCA1KTtcblx0XHRcdFx0dGhpcy5oaXQgPSA1O1xuXHRcdFx0XHR0aGlzLmh1cnRGb3IoMSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMud2VhcG9uVHlwZSAmJiB0aGlzLnRpbWVyLnRlc3RPclNldCgnc2hvb3QnLCA2MCkpIHtcblx0XHRcdHZhciBkeCA9IHRoaXMuZ2FtZS5wbGF5ZXIueCAtIHRoaXMueDtcblx0XHRcdHZhciBkeSA9IHRoaXMuZ2FtZS5wbGF5ZXIueSAtIHRoaXMueTtcblx0XHRcdHZhciBsZW4gPSBub3JtTGVuKGR4LCBkeSk7XG5cdFx0XHRkeCAvPSBsZW47XG5cdFx0XHRkeSAvPSBsZW47XG5cdFx0XHRkeCArPSAoTWF0aC5yYW5kb20oKS0wLjUpIC8gMTA7XG5cdFx0XHRkeSArPSAoTWF0aC5yYW5kb20oKS0wLjUpIC8gMTA7XG5cdFx0XHRsZW4gPSBub3JtTGVuKGR4LCBkeSk7XG5cdFx0XHR0aGlzLmdhbWUuYWRkRW50aXR5KG5ldyB0aGlzLndlYXBvblR5cGUodGhpcy5nYW1lLCB0aGlzLCBkeC9sZW4sIGR5L2xlbiwgMTAgKyAoTWF0aC5yYW5kb20oKSAqIDMpfDAsIDQpKTtcblx0XHR9XG5cblx0XHRpZiAoZGlzdFRvUGxheWVyIDwgNTAgJiYgdGhpcy50aW1lci50ZXN0T3JTZXQoJ2RhcnQnLCA0MCkpIHtcblx0XHRcdC8vIHRoaXMudGltZXIuc2V0KCdkb2RnZScsIDMwKTtcblx0XHRcdHZhciBkeCA9IHRoaXMueCAtIHRoaXMuZ2FtZS5wbGF5ZXIueDtcblx0XHRcdHZhciBkeSA9IHRoaXMueSAtIHRoaXMuZ2FtZS5wbGF5ZXIueTtcblx0XHRcdHZhciBsZW4gPSBub3JtTGVuKGR4LCBkeSk7XG5cdFx0XHRkeCAvPSBsZW47XG5cdFx0XHRkeSAvPSBsZW47XG5cdFx0XHR0aGlzLnZ4ICs9IGR4KjQ7XG5cdFx0XHR0aGlzLnZ5ICs9IGR5KjQ7XG5cdFx0fVxuXG5cdH1cblx0ZWxzZSBpZiAoZGlzdFRvUGxheWVyIDwgNDAwKSB7XG5cdFx0aWYgKHRoaXMudGltZXIudGVzdE9yU2V0KCdkaXZlJywgMTIwKSkge1xuXHRcdFx0dmFyIGR4ID0gdGhpcy5nYW1lLnBsYXllci54IC0gdGhpcy54O1xuXHRcdFx0dmFyIGR5ID0gdGhpcy5nYW1lLnBsYXllci55IC0gdGhpcy55O1xuXHRcdFx0dmFyIGxlbiA9IG5vcm1MZW4oZHgsIGR5KTtcblx0XHRcdGR4IC89IGxlbjtcblx0XHRcdGR5IC89IGxlbjtcblx0XHRcdGR4ICs9IChNYXRoLnJhbmRvbSgpLTAuNSkgLyAxMDtcblx0XHRcdGR5ICs9IChNYXRoLnJhbmRvbSgpLTAuNSkgLyAxMDtcblx0XHRcdGxlbiA9IG5vcm1MZW4oZHgsIGR5KTtcblx0XHRcdHRoaXMudnggKz0gZHggLyBsZW4gKiA1O1xuXHRcdFx0dGhpcy52eSArPSBkeSAvIGxlbiAqIDU7XG5cblx0XHR9XG5cdH1cblx0ZWxzZSB7XG5cblx0XHRpZiAodGhpcy50aW1lci50ZXN0T3JTZXQoJ2RhcnQnLCA0MCkpIHtcblx0XHRcdHZhciBkeCwgZHk7XG5cdFx0XHR2YXIgaSA9IDA7XG5cdFx0XHRkbyB7XG5cblx0XHRcdFx0ZHggPSBNYXRoLnJhbmRvbSgpKjItMTtcblx0XHRcdFx0ZHkgPSBNYXRoLnJhbmRvbSgpKjItMTtcblx0XHRcdFx0dmFyIGxlbiA9IG5vcm1MZW4oZHgsIGR5KTtcblx0XHRcdFx0ZHggLz0gbGVuO1xuXHRcdFx0XHRkeSAvPSBsZW47XG5cdFx0XHR9IHdoaWxlIChpKysgPCAxMCAmJlxuXHRcdFx0XHQodGhpcy5nYW1lLmlzQmxvY2tlZCh0aGlzLngrZHgsIHRoaXMueStkeSkgfHxcblx0XHRcdCAgICAgdGhpcy5nYW1lLmlzQmxvY2tlZCh0aGlzLngrZHgqVGlsZVNpemUsIHRoaXMueStkeSpUaWxlU2l6ZSkpKTtcblx0XHRcdHRoaXMudnggKz0gZHgqNTtcblx0XHRcdHRoaXMudnkgKz0gZHkqNTtcblx0XHR9XG5cdH1cblx0dGhpcy52eSArPSBNYXRoLnNpbih0aGlzLmJvYi9Db3B0ZXIuYm9iUmF0ZSkqQ29wdGVyLmJvYkFtcGxpdHVkZTtcblxuXHR0aGlzLnZ4ICo9IHRoaXMuZHJhZztcblx0dGhpcy52eSAqPSB0aGlzLmRyYWc7XG5cblx0dGhpcy5kb01vdmUoKTtcbn07XG5cbkNvcHRlci5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oYywgc3gsIHN5LCBwaXgpIHtcblx0dmFyIHB4ID0gTWF0aC5yb3VuZCh0aGlzLnggLSBzeCk7XG5cdHZhciBweSA9IE1hdGgucm91bmQodGhpcy55IC0gc3kpO1xuXHR2YXIgaXNIaXQgPSB0aGlzLmhpdCAhPT0gMDsvLyF0aGlzLnRpbWVyLnRlc3QoJ2hpdCcpO1xuXHR2YXIgc3ByaXRlID0gcGluZ1BvbmcodGhpcy5zcHJpdGUsIDcpO1xuXHQvL3ZhciBzcHJpdGUgPSB0aGlzLnNwcml0ZSA+PSA4ID8gNyAtIHRoaXMuc3ByaXRlIDogdGhpcy5zcHJpdGU7XG5cblx0dmFyIHNwcml0ZVggPSBzcHJpdGUgJSA0O1xuXHR2YXIgc3ByaXRlWSA9IE1hdGguZmxvb3Ioc3ByaXRlLzQpO1xuXHRpZiAoaXNIaXQpIHtcblx0XHRzcHJpdGVZICs9IDI7XG5cdH1cblx0Yy5kcmF3SW1hZ2UoXG5cdFx0QXNzZXRzLmltYWdlcy5jb3B0ZXIuaW1hZ2UsXG5cdFx0c3ByaXRlWCoxNiwgc3ByaXRlWSoxNiwgMTYsIDE2LFxuXHRcdHB4LTgsIHB5LTgsIDE2LCAxNik7XG59O1xuXG5cblxuXG5cblxuRW5naW5lLm92ZXJUaW1lID0gMDtcbkVuZ2luZS5nYW1lT3ZlciA9IGZ1bmN0aW9uKCkge1xuXHRFbmdpbmUub3ZlclRpbWUgPSBFbmdpbmUubm93KCk7XG5cdEVuZ2luZS5kaWRMb3NlID0gdHJ1ZTtcblx0RW5naW5lLmlzT3ZlciA9IHRydWU7XG5cdEFzc2V0cy5tdXNpYy5mYWRlKDEuMCwgMC4wLCAyLjApO1xuXHRBc3NldHMubXVzaWMub25jZSgnZmFkZWQnLCBmdW5jdGlvbigpIHtcblx0XHRBc3NldHMubXVzaWMuc3RvcCgpO1xuXHRcdEFzc2V0cy5kZWF0aE11c2ljLnBsYXkoKTtcblx0XHRBc3NldHMuZGVhdGhNdXNpYy5mYWRlKDAuMCwgMS4wLCAxLjApO1xuXHR9KTtcbn07XG5cbkVuZ2luZS53b25HYW1lID0gZnVuY3Rpb24oKSB7XG5cdEVuZ2luZS5vdmVyVGltZSA9IEVuZ2luZS5ub3coKTtcblx0RW5naW5lLmRpZExvc2UgPSBmYWxzZTtcblx0RW5naW5lLmlzT3ZlciA9IHRydWU7XG5cdEFzc2V0cy5tdXNpYy5mYWRlKDEuMCwgMC4wLCAyLjApO1xuXHRBc3NldHMubXVzaWMub25jZSgnZmFkZWQnLCBmdW5jdGlvbigpIHtcblx0XHRBc3NldHMubXVzaWMuc3RvcCgpO1xuXHRcdEFzc2V0cy53aW5NdXNpYy5wbGF5KCk7XG5cdH0pO1xufVxuXG5FbmdpbmUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG5cdGlmICghRW5naW5lLmlzT3Zlcikge1xuXHRcdEVuZ2luZS5nYW1lLnVwZGF0ZSgpO1xuXHR9XG5cbn07XG5cbkVuZ2luZS5kb092ZXJsYXkgPSBmYWxzZTtcblxuRW5naW5lLnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgZHJhd0N0eCA9IEVuZ2luZS5kcmF3Q2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cdGRyYXdDdHguaW1hZ2VTbW9vdGhpbmdFbmFibGVkID0gZmFsc2U7XG5cdGRyYXdDdHgubW96SW1hZ2VTbW9vdGhpbmdFbmFibGVkID0gZmFsc2U7XG5cdGRyYXdDdHgud2Via2l0SW1hZ2VTbW9vdGhpbmdFbmFibGVkID0gZmFsc2U7XG5cdHZhciBzY3JlZW5DdHggPSBFbmdpbmUuc2NyZWVuLmdldENvbnRleHQoJzJkJyk7XG5cdHNjcmVlbkN0eC5pbWFnZVNtb290aGluZ0VuYWJsZWQgPSBmYWxzZTtcblx0c2NyZWVuQ3R4Lm1vekltYWdlU21vb3RoaW5nRW5hYmxlZCA9IGZhbHNlO1xuXHRzY3JlZW5DdHgud2Via2l0SW1hZ2VTbW9vdGhpbmdFbmFibGVkID0gZmFsc2U7XG5cdHNjcmVlbkN0eC5jbGVhclJlY3QoMCwgMCwgRW5naW5lLnNjcmVlbi53aWR0aCwgRW5naW5lLnNjcmVlbi5oZWlnaHQpO1xuXG5cdGlmICghRW5naW5lLmlzT3Zlcikge1xuXG5cdFx0RW5naW5lLmdhbWUucmVuZGVyKGRyYXdDdHgsIEVuZ2luZS5kcmF3Q2FudmFzKTtcblxuXHRcdC8vIGhlYWx0aCBiYXJcblx0XHRkcmF3Q3R4LmRyYXdJbWFnZShBc3NldHMuaW1hZ2VzLm1pc2MuaW1hZ2UsIDAsIDAsIDY0LCA4LCAwLCAwLCA2NCwgOCk7XG5cblx0XHRkcmF3Q3R4LmZpbGxTdHlsZSA9ICcjZmYwMDAwJztcblx0XHR2YXIgcGxheWVySHAgPSBFbmdpbmUuZ2FtZS5wbGF5ZXIuaHAgLyBFbmdpbmUuZ2FtZS5wbGF5ZXIubWF4SHA7XG5cblx0XHRwbGF5ZXJIcCA9IE1hdGgubWluKDEsIE1hdGgubWF4KDAsIHBsYXllckhwKSk7XG5cdFx0cGxheWVySHAgKj0gMzc7XG5cdFx0cGxheWVySHAgPSBNYXRoLnJvdW5kKHBsYXllckhwKTtcblxuXHRcdGRyYXdDdHguZmlsbFJlY3QoMTQsIDMsIHBsYXllckhwLCAzKTtcblxuXHRcdGRyYXdDdHguZHJhd0ltYWdlKFxuXHRcdFx0QXNzZXRzLmltYWdlcy5taXNjLmltYWdlLFxuXHRcdFx0RW5naW5lLmdhbWUucGxheWVyLnNpemUqOCwgNDgsIDgsIDgsXG5cdFx0XHQ2MSwgMCwgOCwgOCk7XG5cblx0XHRzY3JlZW5DdHguZHJhd0ltYWdlKEVuZ2luZS5kcmF3Q2FudmFzLCAwLCAwLCBFbmdpbmUuZHJhd0NhbnZhcy53aWR0aCwgRW5naW5lLmRyYXdDYW52YXMuaGVpZ2h0LCAwLCAwLCBFbmdpbmUuc2NyZWVuLndpZHRoLCBFbmdpbmUuc2NyZWVuLmhlaWdodCk7XG5cdFx0aWYgKEVuZ2luZS5kb092ZXJsYXkpIHtcblx0XHRcdHZhciBvbGRHY28gPSBzY3JlZW5DdHguZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uO1xuXHRcdFx0c2NyZWVuQ3R4Lmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9ICdvdmVybGF5JztcblxuXHRcdFx0c2NyZWVuQ3R4LmRyYXdJbWFnZShFbmdpbmUub3ZlcmxheUNhbnZhcyxcblx0XHRcdFx0MCwgMCwgRW5naW5lLm92ZXJsYXlDYW52YXMud2lkdGgsIEVuZ2luZS5vdmVybGF5Q2FudmFzLmhlaWdodCxcblx0XHRcdFx0MCwgMCwgRW5naW5lLnNjcmVlbi53aWR0aCwgRW5naW5lLnNjcmVlbi5oZWlnaHQpO1xuXG5cdFx0XHRzY3JlZW5DdHguZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gb2xkR2NvO1xuXHRcdH1cblx0fVxuXHRlbHNlIHtcblx0XHR2YXIgb3BhY2l0eSA9IE1hdGgubWluKDEuMCwgKEVuZ2luZS5ub3coKSAtIEVuZ2luZS5vdmVyVGltZSkvMjAwMCk7XG5cdFx0c2NyZWVuQ3R4LmZpbGxTdHlsZSA9ICdyZ2JhKDAsIDAsIDAsICcrb3BhY2l0eSsnKSc7XG5cdFx0c2NyZWVuQ3R4LmZpbGxSZWN0KDAsIDAsIEVuZ2luZS5zY3JlZW4ud2lkdGgsIEVuZ2luZS5zY3JlZW4uaGVpZ2h0KTtcblxuXHRcdHNjcmVlbkN0eC5mb250ID0gJzEwMHB4IFNvdXJjZSBTYW5zIFBybyc7XG5cdFx0c2NyZWVuQ3R4LnRleHRBbGlnbiA9ICdjZW50ZXInO1xuXHRcdHNjcmVlbkN0eC50ZXh0QmFzZWxpbmUgPSAnbWlkZGxlJztcblxuXHRcdHNjcmVlbkN0eC5maWxsU3R5bGUgPSAncmdiYSgyNTUsIDI1NSwgMjU1LCAnK29wYWNpdHkrJyknO1xuXHRcdGlmIChFbmdpbmUuZGlkTG9zZSkge1xuXHRcdFx0c2NyZWVuQ3R4LmZpbGxUZXh0KFwiWW91IHdlcmUgbm90IGEgdmVyeSBnb29kIG1vbnN0ZXJcIiwgRW5naW5lLnNjcmVlbi53aWR0aC8yLCBFbmdpbmUuc2NyZWVuLmhlaWdodC80KTtcblx0XHRcdHNjcmVlbkN0eC5maWxsVGV4dChcIkxpc3RlbiB0byB0aGUgc2FkIG11c2ljXCIsIEVuZ2luZS5zY3JlZW4ud2lkdGgvMiwgRW5naW5lLnNjcmVlbi5oZWlnaHQqMS8yKVxuXHRcdFx0c2NyZWVuQ3R4LmZpbGxUZXh0KFwiUmVmcmVzaCB0byB0cnkgYWdhaW5cIiwgRW5naW5lLnNjcmVlbi53aWR0aC8yLCBFbmdpbmUuc2NyZWVuLmhlaWdodCozLzQpXG5cblx0XHR9IGVsc2Uge1xuXHRcdFx0c2NyZWVuQ3R4LmZpbGxUZXh0KFwiWW91IHdlcmUgdGhlIG1vbnN0ZXJcIiwgRW5naW5lLnNjcmVlbi53aWR0aC8yLCBFbmdpbmUuc2NyZWVuLmhlaWdodC80KTtcblx0XHRcdHNjcmVlbkN0eC5maWxsVGV4dChcIlJlZnJlc2ggdG8gcGxheSBhZ2FpblwiLCBFbmdpbmUuc2NyZWVuLndpZHRoLzIsIEVuZ2luZS5zY3JlZW4uaGVpZ2h0KjMvNClcblx0XHR9XG5cdH1cblxufTtcblxuRW5naW5lLm92ZXJsYXlDYW52YXMgPSBudWxsO1xuXG5FbmdpbmUuaW5pdCA9IGZ1bmN0aW9uKGNhbnZhcykge1xuXHRFbmdpbmUuc2NyZWVuID0gY2FudmFzO1xuXHRjYW52YXMud2lkdGggPSBFbmdpbmUuc2NyZWVuV2lkdGgqRW5naW5lLmRldmljZVBpeGVscztcblx0Y2FudmFzLmhlaWdodCA9IEVuZ2luZS5zY3JlZW5IZWlnaHQqRW5naW5lLmRldmljZVBpeGVscztcblx0Y2FudmFzLnN0eWxlLndpZHRoID0gRW5naW5lLnNjcmVlbldpZHRoK1wicHhcIjtcblx0Y2FudmFzLnN0eWxlLmhlaWdodCA9IEVuZ2luZS5zY3JlZW5IZWlnaHQrXCJweFwiO1xuXG5cdEVuZ2luZS5JbnB1dC5pbml0KGNhbnZhcyk7XG5cblx0dmFyIGRyYXdDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblxuXHRkcmF3Q2FudmFzLndpZHRoID0gRW5naW5lLnNjcmVlbldpZHRoIC8gRW5naW5lLnNjYWxlO1xuXHRkcmF3Q2FudmFzLmhlaWdodCA9IEVuZ2luZS5zY3JlZW5IZWlnaHQgLyBFbmdpbmUuc2NhbGU7XG5cdEVuZ2luZS5kcmF3Q2FudmFzID0gZHJhd0NhbnZhcztcblxuXHR2YXIgb3ZlcmxheUNhbnZhcyA9IEVuZ2luZS5vdmVybGF5Q2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdG92ZXJsYXlDYW52YXMud2lkdGggPSBFbmdpbmUuc2NyZWVuV2lkdGgqRW5naW5lLmRldmljZVBpeGVscztcblx0b3ZlcmxheUNhbnZhcy5oZWlnaHQgPSBFbmdpbmUuc2NyZWVuSGVpZ2h0KkVuZ2luZS5kZXZpY2VQaXhlbHM7XG5cdGlmIChFbmdpbmUuc2NhbGUgIT09IDEpIHtcblx0XHR2YXIgb3ZlcmxheUN0eCA9IG92ZXJsYXlDYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblx0XHR2YXIgc2NhbGUgPSBFbmdpbmUuc2NhbGUqRW5naW5lLmRldmljZVBpeGVscztcblx0XHR2YXIgcGl4ID0gbmV3IFBpeGVsQnVmZmVyKHNjYWxlLCBzY2FsZSk7XG5cdFx0Zm9yICh2YXIgeCA9IDA7IHggPCBzY2FsZTsgKyt4KSB7XG5cdFx0XHRwaXgucHV0UGl4ZWwoeCwgMCwgMHg0Y2ZmZmZmZik7XG5cdFx0XHRwaXgucHV0UGl4ZWwoeCwgc2NhbGUtMSwgMHg0YzAwMDAwMCk7XG5cdFx0fVxuXG5cdFx0Zm9yICh2YXIgeSA9IDA7IHkgPCBzY2FsZTsgKyt5KSB7XG5cdFx0XHRwaXgucHV0UGl4ZWwoMCwgeSwgMHg0Y2ZmZmZmZik7XG5cdFx0XHRwaXgucHV0UGl4ZWwoc2NhbGUtMSwgeSwgMHg0YzAwMDAwMCk7XG5cdFx0fVxuXG5cdFx0cGl4LnVwZGF0ZSgpO1xuXHRcdHZhciBzdyA9IEVuZ2luZS5zY3JlZW5XaWR0aC9FbmdpbmUuc2NhbGU7XG5cdFx0dmFyIHNoID0gRW5naW5lLnNjcmVlbkhlaWdodC9FbmdpbmUuc2NhbGU7XG5cblx0XHRmb3IgKHZhciBqID0gMDsgaiA8IHNoOyArK2opIHtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc3c7ICsraSkge1xuXHRcdFx0XHRvdmVybGF5Q3R4LmRyYXdJbWFnZShwaXguY2FudmFzLCBpKnNjYWxlLCBqKnNjYWxlKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXG5cblx0dmFyIGRyYXdDdHggPSBkcmF3Q2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cblxuXHQvLyB2YXIgZHJhd0N0eCA9IGRyYXdDYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxuXHR2YXIgc2NyQ3R4ID0gRW5naW5lLnNjcmVlbi5nZXRDb250ZXh0KCcyZCcpO1xuXHRzY3JDdHguZmlsbFN0eWxlID0gJ2JsYWNrJztcblx0c2NyQ3R4LmZpbGxSZWN0KDAsIDAsIEVuZ2luZS5zY3JlZW4ud2lkdGgsIEVuZ2luZS5zY3JlZW4uaGVpZ2h0KTtcblxuXHRzY3JDdHguZm9udCA9ICcyNTBweCBTb3VyY2UgU2FucyBQcm8nO1xuXHRzY3JDdHgudGV4dEFsaWduID0gJ2NlbnRlcic7XG5cdHNjckN0eC50ZXh0QmFzZWxpbmUgPSAnbWlkZGxlJztcblxuXHRzY3JDdHguZmlsbFN0eWxlID0gJ3doaXRlJztcblxuXHRzY3JDdHguZmlsbFRleHQoXCJMb2FkaW5nIVwiLCBFbmdpbmUuc2NyZWVuLndpZHRoLzIsIEVuZ2luZS5zY3JlZW4uaGVpZ2h0LzIpO1xuXG5cdEFzc2V0cy5sb2FkQWxsKClcblx0LnRoZW4oZnVuY3Rpb24oKSB7XG5cdFx0TW9uc3Rlci5pbml0VGVudGFjbGVQb3NpdGlvbnMoQXNzZXRzLmltYWdlcy5zcHJpdGVzKTtcblx0XHRFbmdpbmUuZ2FtZSA9IG5ldyBHYW1lKCk7XG5cdFx0QXNzZXRzLm11c2ljLnBsYXkoKTtcblx0XHQvLyBBc3NldHMubXVzaWMucGxheSgnaW50cm8nKTtcblx0XHQvLyBBc3NldHMubXVzaWMub25jZSgnZW5kJywgZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyBBc3NldHMubXVzaWMucGxheSgnbWFpbicpXG5cdFx0Ly8gfSk7XG5cdFx0RW5naW5lLk1haW5Mb29wLnN0YXJ0KCk7XG5cdH0pXG5cdC5jYXRjaChmdW5jdGlvbigpIHtcblx0XHRjb25zb2xlLmVycm9yKGFyZ3VtZW50cylcblx0XHRzY3JDdHguZmlsbFN0eWxlID0gJ2JsYWNrJztcblx0XHRzY3JDdHguZmlsbFJlY3QoMCwgMCwgRW5naW5lLnNjcmVlbi53aWR0aCwgRW5naW5lLnNjcmVlbi5oZWlnaHQpO1xuXG5cdFx0c2NyQ3R4LmZvbnQgPSAnMTUwcHggU291cmNlIFNhbnMgUHJvJztcblx0XHRzY3JDdHgudGV4dEFsaWduID0gJ2NlbnRlcic7XG5cdFx0c2NyQ3R4LnRleHRCYXNlbGluZSA9ICdtaWRkbGUnO1xuXG5cdFx0c2NyQ3R4LmZpbGxTdHlsZSA9ICd3aGl0ZSc7XG5cblx0XHRzY3JDdHguZmlsbFRleHQoXCJJbml0IGZhaWxlZCEgRDpcIiwgRW5naW5lLnNjcmVlbi53aWR0aC8yLCBFbmdpbmUuc2NyZWVuLmhlaWdodC8yKTtcblx0fSk7XG5cblxufTtcblxuRW5naW5lLkFzc2V0cyA9IEFzc2V0cztcblxuZnVuY3Rpb24gTWFpbigpIHtcblx0RW5naW5lLmluaXQoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NjcmVlbicpKTtcbn1cbmRvY3VtZW50LmJvZHkub25sb2FkID0gTWFpbjtcbi8vZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgTWFpbik7XG5cbiJdfQ==
