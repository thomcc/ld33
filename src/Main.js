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

var Engine = Object.assign({}, EventEmitter.prototype);

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
			console.log("fps: "+frames);
			console.log("tps: "+ticks);
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

Movable.collide = function(dx, dy) {
};


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
		console.log('BLINK')
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
	if (blinkTime !== 0) {
		console.log("blinkTime: "+blinkTime);
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
	// this.pixels.fill(0);
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
				console.log("player ", x, y);
				this.player.setPosition(x*TileSize, y*TileSize)
			}
			else if (pix[i] === 0xffff00ff) {
				console.log("copter ", x, y);
				this.addEntity(new Copter(this, x*TileSize, y*TileSize));
			}
			else if (pix[i] === 0xffff0000) {
				console.log("exit ", x, y);
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
	if (rs >= this.viewportHeight) {
		rs = this.viewportHeight-1;
	}
	if (bs >= this.viewportWidth) {
		bs = this.viewportWidth-1;
	}

	// Assert(rs >= ls && bs >= ts);

	// Assert(ls >= 0 && ls < this.viewportWidth &&
	// 	rs >= 0 && rs < this.viewportWidth &&
	// 	ts >= 0 && ts < this.viewportHeight &&
	// 	bs >= 0 && bs < this.viewportHeight, "tentacleTouch failure");

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
					/*
					else if (pixel === 0xffff00ff) {
						pix32[(tx+0) + (ty+0) * tpixW] = tentacleColor-1;
						if (pixel === 0xffff00ff && ty+1 < tpixH && pix32[(tx+0) + (ty+1) * tpixW] === 0) {
							pix32[(tx+0) + (ty+1) * tpixW] = outlineColor
						}
					}*/
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

	for (var ei = 0; ei < this.entities.length; ++ei) {
		this.entities[ei].render(ctx, minX, minY, this.effectBuffer);
	}

	this.effectBuffer.update();
	//this.bloodSplatContext.drawImage(this.effectBuffer.canvas, parallaxX, parallaxY);
	ctx.drawImage(this.effectBuffer.canvas, 0, 0);
}


// @TODO: need to optimize: game chokes when a lot of blood/gibs are on screen
// @NOTE: seems to be better since we started writing them onto the screen using pixel manipulation.
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
	//this.vy *= this.drag;

	this.vy += this.gravity;
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

function Blood(game, x, y) {
	Particle.call(this, game, x, y);
	this.rx = this.ry = 0.5;
	// this.color = '#a00000';
	this.sprite = -1;
	this.drag = 0.96;
	this.bounce = 0.1;
}

Blood.prototype = Object.create(Particle.prototype);
Blood.prototype.constructor = Blood;
Engine.Blood = Blood;
Blood.prototype.blockCheck = function(x, y) {
	return this.game.isBlocked(x, y);
};

Blood.prototype.render = function(c, sx, sy, pix) {
	var px = Math.round(this.x - sx);
	var py = Math.round(this.y - sy);
	pix.putPixel(px, py, 0xff0000a0);
}

function Gib(game, x, y, isMonstrous) {
	Particle.call(this, game, x, y);
	this.sprite = isMonstrous ? 1 : 0;
}

Gib.prototype = Object.create(Particle.prototype);
Gib.prototype.constructor = Gib;

Engine.Gib = Gib;

Gib.prototype.update = function() {
	Particle.prototype.update.call(this);
	var blood = new Blood(this.game, this.x, this.y);
	blood.vx /= 20;
	blood.vy /= 20;
	blood.vx += this.vx / 2;
	blood.vy += this.vy / 2;
	this.game.addEffect(blood);
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
	Particle.call(this, game, exit.x, exit.y);
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

	var xs = this.exit.x// + Math.cos(this.exit.heading)*2;
	var ys = this.exit.y// + Math.sin(this.exit.heading)*2;
	var xm = this.exit.x// + Math.cos(this.exit.heading)*20;
	var ym = this.exit.y// + Math.sin(this.exit.heading)*20;

	var x0 = xs + (xm - this.exit.x)*this.pos;
	var y0 = ys + (ym - this.exit.y)*this.pos;

	var x1 = xm + (this.game.player.x - xm)*this.pos;
	var y1 = ym + (this.game.player.y - ym)*this.pos;

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
	// this.doMove();
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
	this.doMove();
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
	Engine.emit('update');
	if (!Engine.isOver) {
		Engine.game.update();
	}

};

Engine.doOverlay = false;

Engine.render = function() {
	Engine.emit('render');
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

