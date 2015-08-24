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
Engine.DEBUG = window.DEBUG = true;

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

Movable._move = function(dx, dy) {
	if (!this.active) {
		return;
	}
	var nx = this.x+dx;
	var ny = this.y+dy;
	// hm....
	if (this.game.isBlocked(nx-this.rx, ny-this.ry) ||
		this.game.isBlocked(nx-this.rx, ny+this.ry) ||
		this.game.isBlocked(nx-this.rx, ny) ||
		this.game.isBlocked(nx+this.rx, ny-this.ry) ||
		this.game.isBlocked(nx+this.rx, ny+this.ry) ||
		this.game.isBlocked(nx+this.rx, ny) ||
		this.game.isBlocked(nx, ny-this.ry) ||
		this.game.isBlocked(nx, ny+this.ry) ||
		this.game.isBlocked(nx, ny))
	{
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

Tentacle.prototype.drawOnPixels = function(pixels, sx, sy, color) {
	var data = this.data;

	var px = data[SEG_X];
	var py = data[SEG_Y];

	var tentacleStartX = Math.round(px-sx+0.5);
	var tentacleStartY = Math.round(py-sy+0.5);

	var minXSeen = pixels.bounds.minX;
	var minYSeen = pixels.bounds.minY;
	var maxXSeen = pixels.bounds.maxX;
	var maxYSeen = pixels.bounds.maxY;
	var drewInitialDots = false;

	for (var i = SEG_SIZE, end = data.length; i < end; i += SEG_SIZE) {
		var nx = data[i+SEG_X];
		var ny = data[i+SEG_Y];
		var startX = Math.round(px-sx+0.5);
		var startY = Math.round(py-sy+0.5);
		var endX = Math.round(nx-sx+0.5);
		var endY = Math.round(ny-sy+0.5);
		bresenham(startX, startY, endX, endY, pixels, color);
		if (!drewInitialDots) {

			if (tentacleStartX >= 0 && tentacleStartX < pixels.width &&
				tentacleStartY >= 0 && tentacleStartY < pixels.height) {
				//pixels.pixels[tentacleStartX + tentacleStartY * pixels.width] = 0xffff00ff;
			}
			drewInitialDots = true;
		}

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

	this.hp = 100;
	this.maxHp = 100;
	this.active = true;

	this.deathTimer = 0;

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
	NaNCheck(amt);
	this.hitTimer = 20;
	this.hp -= amt;
	if (this.hp < 0) {
		this.hp = 0;
	}
	Assets.sounds.ouch.play();
	if (this.hp === 0) {
		this.die();
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
	if (this.invincibleTimer > 0) {
		--this.invincibleTimer;
	}
	if (this.hitTimer > 0) {
		--this.hitTimer;
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
};
/*
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

	if (this.game.isBlocked(newLeft, newTop)) return false;
	if (this.game.isBlocked(newLeft, newBottom)) return false;

	if (this.game.isBlocked(newRight, newTop)) return false;
	if (this.game.isBlocked(newRight, newBottom)) return false;

	return true;

};*/

Monster.prototype.spriteX = function() {
	var sizeData = Monster.SizeData[this.size]
	return this.sprite * sizeData.sprites.width;
};

Monster.prototype.spriteY = function() {
	var sizeData = Monster.SizeData[this.size];
	return sizeData.sprites.y;
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
	this.pixels.fill(0);
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
	this.xBound = game.columns * TileSize;
	this.yBound = game.rows * TileSize;
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
	gx = clamp(gx, this.width/2, this.xBound-this.width/2);
	gy = clamp(gy, this.height/2, this.yBound-this.height/2);

	var nx = gx - cx;
	var ny = gy - cy;

	var relax = 1.0 - Math.exp(-Camera.speed*Engine.deltaTime);

	nx = this.x + nx*relax;
	ny = this.y + ny*relax;

	this.setPosition(nx, ny);

};

Camera.prototype.setPosition = function(nx, ny) {
	this.x = clamp(nx, this.width/2, this.xBound-this.width/2);
	this.y = clamp(ny, this.height/2, this.yBound-this.height/2);

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
	var tiles = Assets.images.level;
	var pixelData = tiles.getPixelData();
	this.columns = pixelData.width;
	this.rows = pixelData.height;
	var pix = pixelData.pixels;
	var length = this.columns*this.rows;

	this.tiles = new Array(length);

	this.effects = [];
	this.entities = [];

	this.player = new Monster(this);
	for (var i = 0; i < length; ++i) {
		var x = i % this.columns;
		var y = Math.floor(i / this.columns);

		if (pix[i] === 0xff000000) {
			this.tiles[i] = new Tile(1);
		}
		else if (pix[i] === 0xff808080) {
			this.tiles[i] = new Tile(2);
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
		}
	}

	Tile.fixUpTileArray(this.tiles, this.columns, this.rows)


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

	this.entityPosFeedback = new Uint8Array(this.viewportWidth*this.viewportHeight);

};


Engine.Game = Game;

Game.prototype.addEffect = function(e) {
	this.effects.push(e);
};

Game.prototype.updateArray = function(arr) {
	for (var i = 0; i < arr.length; ++i) {
		arr[i].update();
	}

	var j = 0;
	for (i = 0; i < arr.length; ++i) {
		if (arr[i].active) {
			arr[j++] = arr[i];
		}
	}
	arr.length = j;
};

Game.prototype.update = function() {
	this.player.update();

	this.updateArray(this.effects);
	this.updateArray(this.entities);
	/*
	if (Math.random() < 0.05) {
		var x = 25*TileSize;
		var y = 25*TileSize;
		var dx = this.player.x - x;
		var dy = this.player.y - y;
		this.addEntity(new Bullet(this, {x: x, y: y}, dx, dy));
	}*/
	this.camera.update();
};

Game.prototype.isBlocked = function(x, y) {
	x = Math.round(x/TileSize-0.5);
	y = Math.round(y/TileSize-0.5);
	return this.getTile(x|0, y|0) !== 0;
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
				return true;
			}
		}
	}
	return false;
}


Game.prototype.render = function(ctx, canvas) {

	var minX = this.camera.minX;
	var maxX = this.camera.maxX;
	var minY = this.camera.minY;
	var maxY = this.camera.maxY;

	var cardinalRotations = Assets.images.tiles.getCardinalRotations(TileSize, TileSize);


	Input.setBounds(minX, minY);

	var iMinX = Math.round(minX);
	var iMinY = Math.round(minY);

	var minTileX = Math.floor(minX / TileSize)-1;
	var minTileY = Math.floor(minY / TileSize)-1;

	var maxTileX = Math.ceil(maxX / TileSize)+1;
	var maxTileY = Math.ceil(maxY / TileSize)+1;

	ctx.fillStyle = '#43596d';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	// ctx.strokeStyle = 'green';

	for (var tileY = minTileY; tileY <= maxTileY; ++tileY) {
		for (var tileX = minTileX; tileX <= maxTileX; ++tileX) {
			var tile = this.getTileInfo(tileX, tileY);
			if (tile == null || tile.type === 0) {
				continue;
			}
			var tileSpriteX = tile.sprite + (tile.type-1)*4;
			var tileSpriteY = tile.variant;
			ctx.drawImage(
					cardinalRotations[tile.rotation],
					tileSpriteX*TileSize,
					tileSpriteY*TileSize,
					TileSize, TileSize,
					tileX * TileSize - iMinX,
					tileY * TileSize - iMinY,
					TileSize,
					TileSize);
			// @TODO: see if this has a lot of overhead, and blit pixels manually if it does...
			/*ctx.save();
			{
				//ctx.translate(tileX * TileSize - iMinX + TileSize/2, tileY * TileSize - iMinY + TileSize/2);
				//ctx.rotate(tile.rotation*Math.PI/2);
				ctx.drawImage(Assets.images.tiles.image,
					tileSpriteX*TileSize, tileSpriteY*TileSize,
					TileSize, TileSize,
					-TileSize/2, -TileSize/2,
					TileSize, TileSize)
			}
			*/ctx.restore();



			// switch (tile) {
			// case -1:
			// 	ctx.fillStyle = 'rgb(128, 128, 128)';
			// 	break;
			// case 0:
			// 	continue;
			// case 1:
			// 	ctx.fillStyle = 'black';
			// 	break;
			// default:
			// 	console.log("unhandled tile: "+tile);
			// }
			// ctx.fillRect(tileX * TileSize - iMinX, tileY * TileSize - iMinY, TileSize, TileSize);
			// ctx.strokeRect(tileX * TileSize - iMinX+0.5, tileY * TileSize - iMinY+0.5, TileSize-1, TileSize-1)
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
			tentacles[i].drawOnPixels(this.tentacleBuffer, minX, minY, tentacleColor);
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
						// if ()  {
						// 	pix32[(tx+0) + (ty+0) * tpixW] = tentacleColor;
						// 	if (tx !== 0 && pix32[(tx-1) + (ty+0) * tpixW] === 0) {
						// 		pix32[(tx-1) + (ty+0) * tpixW] = tentacleColor;
						// 	}
						// }
						continue;
					}
					var tocol = pixel === 0xffff00ff ? tentacleColor-1 : outlineColor;
					if (ty+1 < tpixH && pix32[(tx+0) + (ty+1) * tpixW] === tentacleColor) {
						pix32[(tx+0) + (ty+0) * tpixW] = tocol;
					}
					else if (ty-1 >= 0 && (pix32[(tx+0) + (ty-1) * tpixW] === tentacleColor)) {
						pix32[(tx+0) + (ty+0) * tpixW] = tocol;
					}
					else if (tx-1 >= 0 && pix32[(tx-1) + (ty+0) * tpixW] === tentacleColor) {
						pix32[(tx+0) + (ty+0) * tpixW] = tocol;
					}
					else if (tx+1 < tpixW && pix32[(tx+1) + (ty+0) * tpixW] === tentacleColor) {
						pix32[(tx+0) + (ty+0) * tpixW] = tocol;
					}
					else if (pixel === 0xffff00ff) {
						pix32[(tx+0) + (ty+0) * tpixW] = tentacleColor-1;
						if (pixel === 0xffff00ff && ty+1 < tpixH && pix32[(tx+0) + (ty+1) * tpixW] === 0) {
							pix32[(tx+0) + (ty+1) * tpixW] = outlineColor
						}
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
		// var fx = this.effects[fxi];
		// var fxx = fx.x-minX;
		// var fxy = fx.y-minY;
		// if (fxx)
		// if (fx.x - minX < 0 || fx.x - )
		this.effects[fxi].render(ctx, minX, minY, this.effectBuffer);
	}

	for (var ei = 0; ei < this.entities.length; ++ei) {
		this.entities[ei].render(ctx, minX, minY, this.effectBuffer);
	}

	this.effectBuffer.update();
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
	var xSpeed = 1.0;
	var ySpeed = 2.0;
	this.vx = this.vx/size*xSpeed;
	this.vy = this.vy/size*ySpeed;

	this.sprite = -1;
}

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

// Blood.prototype.getColor = function() {
	// return 'rgb(160, 0, 0)';
// };

Engine.Blood = Blood;

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

Entity.prototype.update = function() {}
Entity.prototype.render = function(c, mx, my) {};

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

Bullet.prototype.collidesWithPlayer = function() {
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
}

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
		var br = (200 - i * 200 / steps)|0;
		var xx = (px - dx * i / steps)|0;
		var yy = (py - dy * i / steps)|0;
		var pixel = (0x010101*br)|0xff000000;
		pix.putPixel(xx, yy, pixel);
		//c.globalAlpha = Math.max(0, Math.min(1, 0.5 + (br/255/2)));
		//c.fillRect(xx, yy, 1, 1);
	}
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
	this.sprite = (Math.random()*8)|0;
}

Engine.Copter = Copter;
Copter.prototype = Object.create(Entity.prototype);
Copter.prototype.constructor = Copter;

Copter.prototype.die = function() {
	Assets.sounds.mdie.play();
	this.active = false;
	for (var i = 0; i < 3; ++i) {
		this.game.addEffect(new Gib(this.game, this.x, this.y, false));
	}
}

Copter.prototype.hurt = function(dmg) {
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
	return false;
};
Copter.prototype.update = function() {
	Entity.prototype.update.call(this);
	this.sprite++;
	if (this.hit > 0) {
		--this.hit;
	}

	this.timer.update();
	var distToPlayer = distBetween(this.x, this.y, this.game.player.x, this.game.player.y);
	if (this.overlapsPlayer()) {
		this.explode();
	}
	else if (distToPlayer < 100) {
		if (this.timer.test('hit')) {
			if (this.game.tentacleTouched(this.x, this.y, this.rx, this.ry)) {
				// this.timer.set('hit', 5);
				this.hit = 5;
				this.hurt(1);
			}
		}

		if (this.timer.testOrSet('shoot', 60)) {
			var dx = this.game.player.x - this.x;
			var dy = this.game.player.y - this.y;
			var len = normLen(dx, dy);
			dx /= len;
			dy /= len;
			dx += (Math.random()-0.5) / 10;
			dy += (Math.random()-0.5) / 10;
			len = normLen(dx, dy);
			this.game.addEntity(new Bullet(this.game, this, dx/len, dy/len, 6 + (Math.random() * 3)|0, 4));
		}

		if (distToPlayer < 50 && this.timer.test('dart')) {
			this.timer.set('dodge', 30);
			var dx = this.x - this.game.player.x;
			var dy = this.y - this.game.player.y;
			var len = normLen(dx, dy);
			dx /= len;
			dy /= len;
			this.vx += dx*5;
			this.vy += dy*5;
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
		// this.game.addEntity(new Bullet(this.game, this, dx/len, dy/len, 4 + (Math.random() * 4)|0));
	}
	else {

		if (this.timer.testOrSet('dart', 40)) {
			var dx, dy;
			do {
				dx = Math.random()*2-1;
				dy = Math.random()*2-1;
				var len = normLen(dx, dy);
				dx /= len;
				dy /= len;
			} while (this.game.isBlocked(this.x+dx, this.y+dy) ||
			         this.game.isBlocked(this.x+dx*TileSize, this.y+dy*TileSize));
			this.vx += dx*5;
			this.vy += dy*5;
		}
	}

	this.vx *= this.drag;
	this.vy *= this.drag;

	this.doMove();


}

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




}



function Guy(game) {
	Entity.call(this, game);

}

Engine.Guy = Guy;

Guy.prototype = Object.create(Entity.prototype);




Engine.loseTime = 0;
Engine.gameOver = function() {
	Engine.loseTime = Engine.now();
	Engine.didLose = true;
	Engine.isOver = true;
	Assets.music.fade(1.0, 0.0, 2.0);
	Assets.music.once('faded', function() {
		Assets.music.stop();
		Assets.deathMusic.play();
		Assets.deathMusic.fade(0.0, 1.0, 1.0);
	});
};

Engine.update = function() {
	Engine.emit('update');
	if (!Engine.isOver) {
		Engine.game.update();
	}

	/*

	var ctx = Engine.drawCanvas.getContext('2d');
	ctx.imageSmoothingEnabled = false;
	ctx.mozImageSmoothingEnabled = false;
	ctx.webkitImageSmoothingEnabled = false;
	ctx.fillStyle = 'white';
	ctx.fillRect(0, 0, Engine.drawCanvas.width, Engine.drawCanvas.height);

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

	}
	else {
		var opacity = Math.min(1.0, (Engine.now() - Engine.loseTime)/2000);
		screenCtx.fillStyle = 'rgba(0, 0, 0, '+opacity+')';
		screenCtx.fillRect(0, 0, Engine.screen.width, Engine.screen.height);

		screenCtx.font = '100px Source Sans Pro';
		screenCtx.textAlign = 'center';
		screenCtx.textBaseline = 'middle';

		screenCtx.fillStyle = 'rgba(255, 255, 255, '+opacity+')';
		if (Engine.didLose) {
			screenCtx.fillText("You were not a very good monster", Engine.screen.width/2, Engine.screen.height/4);
			screenCtx.fillText("Refresh to try again", Engine.screen.width/2, Engine.screen.height*3/4)

		} else {
			screenCtx.fillText("You were the monster", Engine.screen.width/2, Engine.screen.height/4);
			screenCtx.fillText("Refresh to play again", Engine.screen.width/2, Engine.screen.height*3/4)
		}
	}

};


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

