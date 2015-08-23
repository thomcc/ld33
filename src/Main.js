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

Game.didLose = false
Game.isOver = false;

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

function Assert(v, msg) {
	if (!Game.DEBUG) {
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
	if (!Game.DEBUG) {
		return;
	}
	Assert(+v === v, "NaNCheck failed");
}

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
		console.warn("bresenham entirely off screen")
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

var TileSize = 10;

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
	this.drag = Math.random()*0.2 + 0.7;
	this.drift = (Math.random() - 0.5)/100
	this.nodeDistance = Math.random() * 0.8 + 1.0;
}

Tentacle.spacing = 5;
Tentacle.size = 1;
Tentacle.globalDrag = 0.02;
Tentacle.gravity = 0.05;

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
	var mouseDeltaX = mx - this.parent.x;
	var mouseDeltaY = my - this.parent.y;
	if (Input.mouse.button.down) {
		mouseDeltaX /= Game.screenWidth/Game.scale;
		mouseDeltaY /= Game.screenHeight/Game.scale;
		mouseDeltaX *= 2;
		mouseDeltaY *= 2;
	}
	else {
		mouseDeltaX = 0;
		mouseDeltaY = 0;
	}

	var prevX = this.data[SEG_X];
	var prevY = this.data[SEG_Y];

	var length = +this.numPoints;
	var data = this.data;
	var drag = this.drag * (1.0 - Tentacle.globalDrag);
	var size = Tentacle.size;
	if (Input.mouse.button.down) {
		size *= 1.5
	}
	size *= this.nodeDistance;

	// var px = Input.mouse.button;

	// @FIXME: should be using deltaTime...
	for (var segIdx = SEG_SIZE, end = data.length; segIdx < end; segIdx += SEG_SIZE) {
		data[segIdx+SEG_X] += data[segIdx+SEG_VX];
		data[segIdx+SEG_Y] += data[segIdx+SEG_VY];

		var segX = data[segIdx+SEG_X];
		var segY = data[segIdx+SEG_Y];

		var dx = prevX - segX;
		var dy = prevY - segY;

		var da = Math.atan2(dy, dx);

		var px = segX + Math.cos(da) * size;
		var py = segY + Math.sin(da) * size;

		segX = data[segIdx+SEG_X] = prevX - (px - segX);
		segY = data[segIdx+SEG_Y] = prevY - (py - segY);

		data[segIdx+SEG_VX] = (segX - data[segIdx+SEG_OLD_X])*drag - drift + mouseDeltaX;
		data[segIdx+SEG_VY] = (segY - data[segIdx+SEG_OLD_Y])*drag + Tentacle.gravity + mouseDeltaY;

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

Tentacle.prototype.gibify = function(level) {
	for (var i = 0; i < this.data.length; i += SEG_SIZE*4) {
		if (level.isBlocked(this.data[i+SEG_X], this.data[i+SEG_Y])) {
			continue;
		}
		var gib = new Gib(level, this.data[i+SEG_X], this.data[i+SEG_Y]);
		gib.vx += this.data[i+SEG_VX]/2.0;
		gib.vy += this.data[i+SEG_VY]/2.0;
		level.addEffect(gib);
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

function Monster(level) {
	this.vx = 0;
	this.vy = 0;

	this.hp = 100;
	this.maxHp = 100;

	this.deathTimer = 0;

	this.x = 0;
	this.y = 0;

	this.hitTimer = 0;

	this.sprites = Assets.images.sprites;
	this.tentacles = [];
	this.setSize(2);
	this.level = level;
	this.invincibleTimer = 0;
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
		this.level.addEffect(new Gib(this.level, this.x+ox, this.y+oy));
	}
	for (var i = 0; i < this.tentacles.length; ++i) {
		this.tentacles[i].gibify(this.level);
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
	this.height = Monster.SizeData[l].sprites.height;

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
				Game.gameOver();
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
		this.hurtFor(40);
		// this.hitTimer = 20;
		// Assets.sounds.ouch.play();
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
	this.columns = pixelData.width;
	this.rows = pixelData.height;
	var pix = pixelData.pixels;
	var length = this.columns*this.rows;
	this.tiles = [];

	this.effects = [];
	this.entities = [];

	this.player = new Monster(this);
	for (var i = 0; i < length; ++i) {
		var x = i % this.columns;
		var y = Math.floor(i / this.columns);

		if (pix[i] === 0xff000000) {
			this.tiles.push(1);
		}
		else {
			this.tiles.push(0);
			if (pix[i] === 0xffffffff) {
				this.player.setPosition(x*TileSize, y*TileSize)
			}
		}
	}

	// @TODO: this belongs in a separate renderer
	this.tentacleLayer = document.createElement('canvas');
	var ctx = this.tentacleLayerContext = this.tentacleLayer.getContext('2d')

	this.tentacleLayer.width = Game.screenWidth / Game.scale;
	this.tentacleLayer.height = Game.screenHeight / Game.scale;
	var tentaclePixels = ctx.createImageData(this.tentacleLayer.width, this.tentacleLayer.height);

	this.tentaclePixels = {
		imageData: tentaclePixels,
		width: tentaclePixels.width,
		height: tentaclePixels.height,
		data: tentaclePixels.data,
		bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
		pixels: new Uint32Array(tentaclePixels.data.buffer)
	};
};

Game.Level = Level;

Level.prototype.addEffect = function(e) {
	this.effects.push(e);
};

Level.prototype.updateArray = function(arr) {
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

Level.prototype.update = function() {
	//if (!this.player.dead) {
		this.player.update();
	//}
	this.updateArray(this.effects);
	this.updateArray(this.entities);
};

Level.prototype.isBlocked = function(x, y) {
	x = Math.round(x/TileSize-0.5);
	y = Math.round(y/TileSize-0.5);
	return this.getTile(x|0, y|0) !== 0;
};

Level.prototype.getTile = function(x, y) {
	if (y < 0 || y >= this.rows || x < 0 || x >= this.columns) {
		return -1;
	}
	return this.tiles[x+y*this.columns];
};

Level.prototype.render = function(ctx, canvas) {
	var minX = this.player.x - canvas.width/2;
	var minY = this.player.y - canvas.height/2;

	var maxX = this.player.x + canvas.width/2;
	var maxY = this.player.y + canvas.height/2;

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
		var tentaclePixels = this.tentaclePixels;
		tentaclePixels.pixels.fill(0);
		tentaclePixels.bounds.minX = 1000;
		tentaclePixels.bounds.maxX = -1000;
		tentaclePixels.bounds.minY = 1000;
		tentaclePixels.bounds.maxY = -1000;


		for (var i = 0, len = tentacles.length; i < len; ++i) {
			tentacles[i].drawOnPixels(this.tentaclePixels, minX, minY, tentacleColor);
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


		this.tentacleLayerContext.clearRect(0, 0, this.tentacleLayer.width, this.tentacleLayer.height);
		this.tentacleLayerContext.putImageData(this.tentaclePixels.imageData, 0, 0);

		ctx.drawImage(this.tentacleLayer, 0, 0);

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

	for (var fxi = 0; fxi < this.effects.length; ++fxi) {
		this.effects[fxi].render(ctx, minX, minY);
	}

	for (var ei = 0; ei < this.entities.length; ++ei) {
		this.entities[ei].render(ctx, minX, minY);
	}
}

function Particle(level, x, y) {
	this.level = level;
	this.active = true;

	this.x = x;
	this.y = y;

	this.r = 2;

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

	this.sprite = -1
}

Game.Particle = Particle;

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

Particle.prototype.doMove = function() {
	var s = Math.ceil(Math.sqrt(this.vx*this.vx+this.vy*this.vy));
	for (var i = 0; i < s; ++i)	{
		this._move(this.vx/s, 0);
		this._move(0, this.vy/s);
	}
};

Particle.prototype._move = function(dx, dy) {
	if (!this.active) {
		return;
	}
	var nx = this.x+dx;
	var ny = this.y+dy;
	if (this.level.isBlocked(nx-this.r, ny-this.r) ||
		this.level.isBlocked(nx-this.r, ny+this.r) ||
		this.level.isBlocked(nx+this.r, ny-this.r) ||
		this.level.isBlocked(nx+this.r, ny+this.r)) {
		this.collide(dx, dy);
	}
	else {
		this.x = nx;
		this.y = ny;
	}
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
		c.fillRect(px-this.r, py-this.r, this.r*2, this.r*2);
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


function Blood(level, x, y) {
	Particle.call(this, level, x, y);
	this.r = 0.5;
	// this.color = '#a00000';
	this.sprite = -1;
	this.drag = 0.96;
	this.bounce = 0.1;

}

Blood.prototype = Object.create(Particle.prototype);
Blood.prototype.constructor = Blood;

Blood.prototype.getColor = function() {
	return 'rgb(160, 0, 0)';
};

Game.Blood = Blood;

function Gib(level, x, y) {
	Particle.call(this, level, x, y);
	this.sprite = 0;
}

Gib.prototype = Object.create(Particle.prototype);
Gib.prototype.constructor = Gib;

Game.Gib = Gib;

Gib.prototype.update = function() {
	Particle.prototype.update.call(this);
	var blood = new Blood(this.level, this.x, this.y);
	blood.vx /= 20;
	blood.vy /= 20;
	blood.vx += this.vx / 2;
	blood.vy += this.vy / 2;
	this.level.addEffect(blood);
}

Game.loseTime = 0;
Game.gameOver = function() {
	Game.loseTime = Game.now();
	Game.didLose = true;
	Game.isOver = true;
	Assets.music.fade(1.0, 0.0, 2.0);
	Assets.music.once('faded', function() {
		Assets.music.stop();
		Assets.deathMusic.play();
		Assets.deathMusic.fade(0.0, 1.0, 1.0);
	})
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
	var screenCtx = Game.screen.getContext('2d');
	screenCtx.imageSmoothingEnabled = false;
	screenCtx.mozImageSmoothingEnabled = false;
	screenCtx.webkitImageSmoothingEnabled = false;
	screenCtx.clearRect(0, 0, Game.screen.width, Game.screen.height);

	if (!Game.isOver) {

		Game.level.render(drawCtx, Game.drawCanvas);

		// health bar
		drawCtx.drawImage(Assets.images.misc.image, 0, 0, 64, 8, 0, 0, 64, 8);

		drawCtx.fillStyle = '#ff0000';
		var playerHp = Game.level.player.hp / Game.level.player.maxHp;

		playerHp = Math.min(1, Math.max(0, playerHp));
		playerHp *= 37;
		playerHp = Math.round(playerHp);

		drawCtx.fillRect(14, 3, playerHp, 3);

		drawCtx.drawImage(
			Assets.images.misc.image,
			Game.level.player.size*8, 48, 8, 8,
			61, 0, 8, 8);

		screenCtx.drawImage(Game.drawCanvas, 0, 0, Game.drawCanvas.width, Game.drawCanvas.height, 0, 0, Game.screen.width, Game.screen.height);

	}
	else {
		var opacity = Math.min(1.0, (Game.now() - Game.loseTime)/2000);
		screenCtx.fillStyle = 'rgba(0, 0, 0, '+opacity+')';
		screenCtx.fillRect(0, 0, Game.screen.width, Game.screen.height);

		screenCtx.font = '100px Source Sans Pro';
		screenCtx.textAlign = 'center';
		screenCtx.textBaseline = 'middle';

		screenCtx.fillStyle = 'rgba(255, 255, 255, '+opacity+')';
		if (Game.didLose) {
			screenCtx.fillText("You were not a very good monster", Game.screen.width/2, Game.screen.height/4);
			screenCtx.fillText("Refresh to try again", Game.screen.width/2, Game.screen.height*3/4)

		} else {
			screenCtx.fillText("You were the monster!", Game.screen.width/2, Game.screen.height/4);
			screenCtx.fillText("Refresh to play again", Game.screen.width/2, Game.screen.height*3/4)
		}
	}

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
		Monster.initTentaclePositions(Assets.images.sprites);
		Game.level = new Level();
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

