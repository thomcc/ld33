

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

