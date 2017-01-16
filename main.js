'use strict';
var lat = 37.7858;
var lon = -122.401;
var zoom = 17;
var headingDegrees = 0;
var deg2rad = Math.PI / 180.0;
var time = 0;
var dt = 0;
var startPos = [37.7858, -122.401];

var basicRadius = 0.0001;

var Keys = {
        up: false,
        down: false,
        left: false,
        right: false,
        shoot: false,
        zoom: false
    };

var eegeoMap = null;
var miniMap = null;

var boundsUK = [-4.652186, 57.345345, 0.420994, 51.013547];
var boundsUS = [-124.226277, 48.085071, -76.853229, 31.024249];

var themeWeathers = [L.eeGeo.themes.weather.Clear, L.eeGeo.themes.weather.Overcast, L.eeGeo.themes.weather.Rainy, L.eeGeo.themes.weather.Snowy];
var themeTimes = [L.eeGeo.themes.time.Dawn, L.eeGeo.themes.time.Day, L.eeGeo.themes.time.Dusk, L.eeGeo.themes.time.Night];

// Swimming Pools

var spritePoolSize = 128;
var nextSpritePoolIndex = 0;
var spritePool = null;

var minimapSpritePoolSize = 16;
var nextMinimapSpritePoolIndex = 0;
var minimapSpritePool = null;

var actorPoolSize = 70;
var nextActorPoolIndex = 0;
var actorPool = null;

var bulletsPoolSize = 16;
var nextBulletPoolIndex = 0;
var bulletPool  = null

var explosionPoolSize = 8;
var nextExplosionPoolIndex = 0;
var explosionPool  = null

var debrisPoolSize = 8;
var nextdebrisPoolIndex = 0;
var debrisPool  = null

var enemyPoolSize = 8;
var nextEnemyPoolIndex = 0;
var enemyPool = null;

var bossPoolSize = 16;
var bossPool = null;

var teleporterPoolSize = 8;
var teleporterPool = null;
var closestTeleporter = null;
var teleportPopup = null;

var enemyTimer = 0;
var activeEnemyCount = 0;
var stage = 0;

var minimapZoomLevels = [13, 9];
var minimapZoomIndex = 0;

// Audio
var music = new Audio('assets/music.ogg');
music.loop = true;
music.volume = 0.5;
music.play();

var fx_shoot = new Audio("assets/shoot.wav");
var fx_badshoot = new Audio("assets/badshoot.wav");
var fx_hit = new Audio("assets/hit.wav");
var fx_teleport = new Audio("assets/teleport.wav");
var fx_explode = new Audio("assets/explode.wav");

window.onload = function () {
   
	miniMap = L.map(document.getElementById('mapid'));
	miniMap.setView(startPos, minimapZoomLevels[minimapZoomIndex]);

	L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	}).addTo(miniMap);

   eegeoMap = L.eeGeo.map(document.getElementById('map'), '0bf148ea610f23311264a49846658387', {
      center: startPos,
      zoom: zoom
   });

   

   teleportPopup = L.popup().setLatLng(startPos).setContent("Hello");
   teleportPopup.options.className = "custom";

   initialiseSprites();
   initialiseActorPool();
   initPlayer();
   initBullets();
   initExplosions();
   initEnemies();
   initDebris();
   initTeleporterPool();

   loadTeleportersForCurrentLocation();
}

window.onkeydown = function(e) {
    var kc = e.keyCode;
    e.preventDefault();

    if (kc === 37) Keys.left = true;
    else if (kc === 38) Keys.up = true;
    else if (kc === 39) Keys.right = true;
    else if (kc === 40) Keys.down = true;
    else if (kc == 90) Keys.shoot = true;
    else if (kc == 88) Keys.zoom = true;
};

window.onkeyup = function(e) {
    var kc = e.keyCode;
    e.preventDefault();

    if (kc === 37) Keys.left = false;
    else if (kc === 38) Keys.up = false;
    else if (kc === 39) Keys.right = false;
    else if (kc === 40) Keys.down = false;
    else if (kc == 90) Keys.shoot = false;
    else if (kc == 88) Keys.zoom = false;
};

var isDirty = true;

function initialiseSprites()
{
	// Create a pool of sprites, which consist of icons and markers.
	// This is going to be some Pico-8 level faff.
	spritePool=new Array()
	for (var i = 0; i < spritePoolSize; i++) { 
		var icon = L.icon({
	   		iconUrl: 'assets/test.png',
	   		iconSize: [32, 32],
	   		iconAnchor: [16, 16]
	   	});
	   	//var marker = L.marker([37.7858 + i*0.0001, -122.401], {icon: icon, alt: 0});
	   	var marker = L.eeGeo.marker([37.7858 + i*0.0001, -122.401], 0);
		var sprite = {marker:marker, icon:icon, enabled:false, addedToMap:false};
 	    spritePool.push(sprite);
	}
	
	minimapSpritePool = new Array();
	for (var i = 0; i < minimapSpritePoolSize; i++) {
		var icon = L.icon({
	   		iconUrl: 'assets/minimap_blue.png',
	   		iconSize: [32, 32],
	   		iconAnchor: [16, 16]
	   	});
	   	var marker = L.marker([37.7858 + i*0.0001, -122.401], 0);
		var sprite = {marker:marker, icon:icon, enabled:false, addedToMap:false};
 	    minimapSpritePool.push(sprite);
	}
}

function clearSprites()
{
	if(spritePool == null)
	{
		return;
	}

	for (var i = 0; i < spritePoolSize; i++) { 
		var sprite = spritePool[i];
		sprite.enabled = false;
	}

	for (var i = 0; i < minimapSpritePool; i++) { 
		var sprite = minimapSpritePool[i];
		sprite.enabled = false;
	}

	nextSpritePoolIndex = 0;
	nextMinimapSpritePoolIndex = 0;
}

function drawSprite(latLonAlt, image, size, anchor, priority=-1)
{
	var sprite = spritePool[nextSpritePoolIndex];
	var marker = sprite.marker;
	var icon = sprite.icon;
	icon.options.iconUrl = image;
	icon.options.iconSize = size;
	icon.options.iconAnchor = anchor;

	marker.setIcon(icon);
	marker.setLatLng([latLonAlt[0], latLonAlt[1]]);
	marker.setElevation(latLonAlt[2]);
	if(priority == -1)
	{
		marker.setZIndexOffset(latLonAlt[2]);
	}
	else 
	{
		marker.setZIndexOffset(priority);
	}
	sprite.enabled = true;

	nextSpritePoolIndex++;
}

function drawMinimapSprite(latLon, image, size, anchor)
{
	var sprite = minimapSpritePool[nextMinimapSpritePoolIndex];
	var marker = sprite.marker;
	var icon = sprite.icon;
	icon.options.iconUrl = image;
	icon.options.iconSize = size;
	icon.options.iconAnchor = anchor;

	marker.setIcon(icon);
	marker.setLatLng([latLon[0], latLon[1]]);
	sprite.enabled = true;

	nextMinimapSpritePoolIndex++;
}

function refreshMarkerState()
{
	for (var i = 0; i < spritePoolSize; i++) { 
		var sprite = spritePool[i];
		if(!sprite.addedToMap && sprite.enabled)
		{
			sprite.marker.addTo(eegeoMap);
			sprite.addedToMap = true;
		}
		else if(sprite.addedToMap && !sprite.enabled)
		{
			sprite.marker.removeFrom(eegeoMap);	
			sprite.addedToMap = false;
		}
	}

	for (var i = 0; i < minimapSpritePool.length; i++) { 
		var sprite = minimapSpritePool[i];
		if(!sprite.addedToMap && sprite.enabled)
		{
			sprite.marker.addTo(miniMap);
			sprite.addedToMap = true;
		}
		else if(sprite.addedToMap && !sprite.enabled)
		{
			sprite.marker.removeFrom(miniMap);	
			sprite.addedToMap = false;
		}
	}

	
}

// == Actor stuff == //

function initialiseActorPool()
{
	actorPool = new Array();

	for (var i = 0; i < actorPoolSize; i++) { 
		var actor = {
			position:[0,0,0],
			headingDegrees:0,
			active: false,
			frames: null,
			frame: 0,
			update: null,
			scale: 1,
			size: [32,32],
			anchor: [16,16],
		};
		actorPool.push(actor);
	}
}

function createActor(updateFunction, frames, drawFunction=null)
{
	var actor = actorPool[nextActorPoolIndex]
	nextActorPoolIndex++;
	actor.frames = frames;
	actor.update = updateFunction;
	actor.draw = drawFunction;
	actor.active = true;
	actor.drawPriority = -1;
	actor.radius = basicRadius;
	return actor;
}

var playerActor = null;
function initPlayer()
{
	playerActor = createActor(updatePlayer, ["assets/heroship_idle.png"]);
	playerActor.position = [startPos[0], startPos[1], 100];
	playerActor.size = [48*2,48*2];
	playerActor.anchor = [24*2,24*2];
	playerActor.forwardX = 1;
	playerActor.forwardY = 0;
	playerActor.vx = 0;
	playerActor.vy = 0;
	playerActor.av = 0;
	playerActor.isAccelerating = false;
	playerActor.reload = 0;
	playerActor.idleFrames = ["assets/heroship_idle.png"];
	playerActor.accelFrames = ["assets/heroship_accel_01.png", "assets/heroship_accel_02.png"];
	playerActor.reverseFrames = ["assets/heroship_reverse_01.png", "assets/heroship_reverse_02.png"];
}

function initBullets()
{
	bulletPool = new Array();

	for(var i = 0; i < bulletsPoolSize; i++) {
		var bulletActor = createActor(updateBullet, ["assets/bullet_01.png"]);
		bulletActor.position = [0,0, 100];
		bulletActor.size = [48*2,48*2];
		bulletActor.anchor = [24*2,24*2];
		bulletActor.forwardX = 1;
		bulletActor.forwardY = 0;
		bulletActor.vx = 0;
		bulletActor.vy = 0;
		bulletActor.friendly = false;
		bulletActor.life = 0;
		bulletActor.active = false;
		bulletActor.goodFrames = ["assets/bullet_01.png"];
		bulletActor.badFrames = ["assets/bullet2_01.png","assets/bullet2_02.png","assets/bullet2_03.png","assets/bullet2_04.png","assets/bullet2_03.png","assets/bullet2_02.png"];
		bulletActor.frameTime = 0;
		bulletActor.index = i;

		bulletPool.push(bulletActor);
	}
}

function initExplosions()
{
	explosionPool = new Array();

	for(var i = 0; i < explosionPoolSize; i++) {
		var explosion = createActor(updateExplosion, ["assets/explosion_01.png","assets/explosion_02.png","assets/explosion_03.png","assets/explosion_04.png","assets/explosion_05.png","assets/explosion_06.png","assets/explosion_07.png","assets/explosion_08.png"]);
		explosion.position = [startPos[0], startPos[1], 100];
		explosion.size = [48*2,48*2];
		explosion.anchor = [24*2,24*2];
		explosion.vx = 0;
		explosion.vy = 0;
		explosion.active = false;
		explosion.time = 0;
		explosionPool.push(explosion);
	}	
}

function initDebris()
{
	debrisPool = new Array();

	for(var i = 0; i < debrisPoolSize; i++) {
		var debris = createActor(updateDebris, ["assets/debris_01.png", "assets/debris_02.png", "assets/debris_03.png", "assets/debris_04.png", "assets/debris_05.png", "assets/debris_06.png"]);
		debris.position = [startPos[0], startPos[1], 100];
		debris.size = [48,48];
		debris.anchor = [24,24];
		debris.vx = 0;
		debris.vy = 0;
		debris.vz = 0;
		debris.active = false;
		debris.frameTime = 0;
		debrisPool.push(debris);
	}	
}

function initEnemies()
{
	enemyPool = new Array();
	for(var i = 0; i < enemyPoolSize; i++){
		var enemy = createActor(updateEnemy, ["assets/enemy_01.png","assets/enemy_02.png","assets/enemy_03.png","assets/enemy_04.png"]);
		enemy.position = [0,0,0];
		enemy.size = [48*2,48*2];
		enemy.anchor = [24*2,24*2];
		enemy.forwardX = 0;
		enemy.forwardY = 0;
		enemy.headingDegrees = 0;
		enemy.vx = 0;
		enemy.vy = 0;
		enemy.active = false;
		enemy.frameTime = 0;
		enemy.life = 0;
		enemyPool.push(enemy);

	}

	enemyTimer = 5;

	bossPool = new Array();
	for(var i = 0; i < bossPoolSize; i++)
	{
		var boss = createActor(updateBoss, i == 0 ? ["assets/boss_head.png"] : ["assets/boss_segment.png"]);
		boss.position = [0,0,0];
		boss.size = [96,96];
		boss.anchor = [48,48];
		boss.vx = 0;
		boss.vy = 0;
		boss.active = false;
		boss.time = 0;
		boss.life = 6;
		boss.segmentIndex = i;
		bossPool.push(boss);
	}
}

function initTeleporterPool()
{
	teleporterPool = new Array();
	for(var i = 0; i < teleporterPoolSize; i++){
		var teleporter = createActor(updateTeleporter, [], drawTeleporter);
		teleporter.position = [0,0,0];
		teleporter.size = [48*2,48*2];
		teleporter.anchor = [24*2,24*2];
		teleporter.active = false;
		teleporter.frameTime = 0;
		teleporter.teleportTo = [0,0];
		teleporter.name = "Somewhere";
		teleporterPool.push(teleporter);

	}
}

function loadTeleportersForCurrentLocation()
{
	var currentPos = playerActor.position;

	var xhr = new XMLHttpRequest();
	xhr.open('GET', "http://api.geonames.org/findNearbyJSON?formatted=true&lat="+currentPos[0]+"&lng="+currentPos[1]+"&radius=20&fclass=P&username=eegeo&style=full", true);
	xhr.onreadystatechange = function(e) {
		if (xhr.readyState == 4 && xhr.status == 200) {
        	var response = JSON.parse(xhr.responseText);
        	
        	var results = response.geonames;
        	var teleporterCount = Math.min(teleporterPoolSize, results.length);
        	if(teleporterCount > 0)
        	{
	        	for(var i = 0; i < teleporterCount; i++)
	        	{
	        		createTeleporter(i, results[i]);
	        	}
	        	console.log("Found " + teleporterCount + " teleporters");
        	}
        	else
        	{
        		console.log("Found nothing");
        		createTeleporter(0, {name: "Unknown", lat:currentPos[0]+0.001, lng:currentPos[1]+0.001});
        	}
    	}
	};
	xhr.send();
}

function createTeleporter(index, geonamesResult)
{
	var teleporter = teleporterPool[index];
	teleporter.active = true;
	teleporter.name = geonamesResult.name;
	teleporter.position = [Number(geonamesResult.lat), Number(geonamesResult.lng), 0];
	teleporter.time = 0;
	teleporter.radius = basicRadius * 2;
	teleporter.teleportTo = getRandomLocation();
}

function getRandomLocation()
{
	var bounds = Math.random() > 0.5 ? boundsUK : boundsUS;
	var lat = bounds[0] + (bounds[2]-bounds[0])*Math.random();
	var lon = bounds[1] + (bounds[3]-bounds[1])*Math.random();
	return [lat, lon];
}

function teleportTo(location)
{
	// Destroy all enemies
	for(var i = 0; i < enemyPool.length; i++)
	{
		enemyPool[i].active = false;
	}
	activeEnemyCount = 0;

	for(var i = 0; i < teleporterPool.length; i++)
	{
		teleporterPool[i].active = false;
	}

	for(var i = 0; i < bossPool.length; i++)
	{
		bossPool[i].active = false;
	}

	fx_teleport.play();

	//teleportPopup.removeFrom(eegeoMap);
	teleportPopup.closePopup();
	teleportPopup.removeFrom(eegeoMap);
	closestTeleporter = null;

	playerActor.position = [location[1], location[0], playerActor.position[2]];

	loadTeleportersForCurrentLocation();

	// Assign random theme state
	var time = Math.ceil(Math.random()*themeTimes.length)-1
	eegeoMap.themes.setTime(themeTimes[time]);

	var weather = Math.ceil(Math.random()*themeWeathers.length)-1
	eegeoMap.themes.setWeather(themeWeathers[weather]);

	stage++;
	if(stage % 5 == 0)
	{
		createBoss();
	}
}

function createBoss()
{
	var angle = Math.random()*Math.PI*2;
	var x = Math.sin(angle) * 0.0075;
	var y = Math.cos(angle) * 0.0075;
	var enemySpawnPos = [playerActor.position[0]+y, playerActor.position[1]+x, playerActor.position[2]];

	for(var i = 0; i < bossPool.length; i++)
	{
		var bossbit = bossPool[i];
		bossbit.active = true;
		bossbit.life = i == 0 ? 20 : 6;
		bossbit.position = enemySpawnPos;
		bossbit.reload = 0;
		bossbit.drawPriority = i == 0 ? 1000 : -1;
	}
}

function createExplosion(position, size)
{
	var explosion = explosionPool[nextExplosionPoolIndex];
	explosion.position = position;
	explosion.active = true;
	explosion.size = size;
	explosion.anchor = [size[0]/2, size[1]/2];
	explosion.time = 0;
	nextExplosionPoolIndex = (nextExplosionPoolIndex+1)%explosionPoolSize;
}

function createDebris(position)
{
	var debris = debrisPool[nextdebrisPoolIndex];
	debris.vx = (Math.random()-Math.random())*0.00002;
	debris.vy = (Math.random()-Math.random())*0.00002;
	debris.vz = (Math.random())*2;
	var x = position[1] + debris.vx;
	var y = position[0] + debris.vy;
	var z = position[2] + debris.vz;
	debris.position = [y,x,z];
	debris.active = true;
	debris.frameTime = 0;
	
	nextdebrisPoolIndex = (nextdebrisPoolIndex+1)%debrisPoolSize;
}

function updateExplosion(actor)
{
	actor.time += dt*15;
	actor.frame = Math.floor(actor.time);
	if(actor.frame >= actor.frames.length - 1)
	{
		actor.active = false;
		actor.frame = 0;
	}
}

function updateDebris(actor)
{
	actor.frameTime += dt*20;
	actor.frame = Math.floor(actor.frameTime)%actor.frames.length;

	var y = actor.position[0];
	var x = actor.position[1];
	var z = actor.position[2];
	x += actor.vx;
	y += actor.vy;
	z += actor.vz;

	actor.position = [y, x, z];
	actor.vz -= dt * 5;

	if(z <= 0)
	{
		createExplosion(actor.position, [32,32]);
		actor.active = false;
		fx_hit.play();
	}
}

function updatePlayer(actor)
{
	var accel = 0;
	if (Keys.up) {
        accel=0.0001;
    }
    else if(Keys.down) {
    	accel=-0.0001;
    }

    // TODO: Turn accel
    var angularAccel = 0;
    if (Keys.left) {
    	angularAccel = -5.5;
        //dx+=0.0001
        //playerActor.headingDegrees -= 0.5;
    }
    else if (Keys.right) {
        //dx-=0.0001;
        angularAccel = 5.5;
     	//playerActor.headingDegrees += 0.5;
    }

    if(actor.reload > 0)
    {
    	actor.reload -= dt;
    }
    else if(Keys.shoot)
    {
    	shootBullet(actor.position, [actor.vx + actor.forwardX*0.0001, actor.vy + actor.forwardY*0.0001], 3, true);
    	fx_shoot.play();
    	//createExplosion(actor.position, [48*2,48*2]);
    	actor.reload = 0.25;
    }

    for(var i = 0; i < teleporterPoolSize; i++)
    {
    	var teleporter = teleporterPool[i];
    	if(teleporter.active && collision(playerActor, teleporter))
    	{
    		teleportTo(teleporter.teleportTo);
    	}
    }

    var lat = actor.position[0];
    var lon = actor.position[1];
    var alt = actor.position[2];

    actor.av += angularAccel * dt;
    actor.av *= 0.9;
    if(Math.abs(actor.av) < 0.01)
    {
    	actor.av = 0.0;
    }
    actor.headingDegrees += actor.av;

    actor.forwardX = Math.sin(actor.headingDegrees*deg2rad);
	actor.forwardY = Math.cos(actor.headingDegrees*deg2rad);

	// Acceleration.
	actor.isAccelerating = false;
	if(accel != 0)
	{	
		actor.isAccelerating = true;
		actor.vx += accel * actor.forwardX*dt;	
		actor.vy += accel * actor.forwardY*dt;
	}
	
	actor.frames = actor.isAccelerating ? ( accel > 0 ? actor.accelFrames : actor.reverseFrames) : actor.idleFrames;
	actor.frame++;
	actor.frame %= actor.frames.length;

	actor.vx *= 0.98;
	actor.vy *= 0.98;
	
	var maxSpeed = 0.001;
	actor.vx = Math.min(Math.max(actor.vx, -maxSpeed), maxSpeed);
	actor.vy = Math.min(Math.max(actor.vy, -maxSpeed), maxSpeed);
	
	lat += actor.vy;
	lon += actor.vx;
	actor.position = [lat, lon, alt];
}

function shootBullet(fromPosition, velocity, life, friendly)
{
	var bullet = bulletPool[nextBulletPoolIndex];
	bullet.position = fromPosition;
	bullet.vx = velocity[0];
	bullet.vy = velocity[1];
	bullet.active = true;
	bullet.life = life;
	bullet.size = [48,48];
	bullet.anchor = [24,24];
	bullet.scale = 1;
	bullet.frameTime = 0;
	bullet.frames = friendly ? bullet.goodFrames : bullet.badFrames;
	bullet.friendly = friendly;
	nextBulletPoolIndex = (nextBulletPoolIndex+1)%bulletsPoolSize;
}

function updateBullet(actor)
{
	var lat = actor.position[0];
    var lon = actor.position[1];
    var alt = actor.position[2];

    lat += actor.vy;
	lon += actor.vx;
	actor.position = [lat, lon, alt];

	actor.frameTime += dt*20;
	actor.frame = Math.floor(actor.frameTime)%actor.frames.length;

	// collision check
	if(!actor.friendly && collision(actor, playerActor))
	{
		// Collide with player
		createExplosion(actor.position, [48,48])
		actor.life = 0;
		actor.active = false;
		fx_hit.play();
		//playerActor.life--;
	}

	if(actor.friendly)
	{
		for(var i = 0; i < enemyPoolSize; i++)
		{
			var enemy = enemyPool[i];
			if(enemy.active && collision(actor, enemy))
			{
				console.log("Hit enemy " + enemy);
				createExplosion(actor.position, [48,48])
				actor.life = 0;
				actor.active = false;
				enemy.life--;
				fx_hit.play();
			}
		}

		for(var i = 0; i < bossPool.length; i++)
		{
			var boss = bossPool[i];
			if(boss.active && collision(actor, boss))
			{
				createExplosion(actor.position, [48,48])
				actor.life = 0;
				actor.active = false;
				boss.life--;
				fx_hit.play();
			}
		}
	}

	actor.life -= dt;
	actor.scale -= dt * 0.25;
	if(actor.life < 0)
	{
		actor.active = false;
	}
}

function collision(actorA, actorB, nudge=false)
{
	var p0x = actorA.position[1];
	var p0y = actorA.position[0];
	var p1x = actorB.position[1];
	var p1y = actorB.position[0];
	var dx = p1x-p0x;
	var dy = p1y-p0y;
	var mag = Math.sqrt(dx*dx + dy*dy);
	var hit = mag <= actorA.radius + actorB.radius

	if(hit && nudge)
	{
		// Clamp actor a's position at
		var nx = dx/mag;
		var ny = dy/mag;
		p0x = actorB.position[1] - nx * (actorB.radius + actorA.radius) ;
		p0y = actorB.position[0] - ny * (actorB.radius + actorA.radius) ;
		actorA.position = [p0y, p0x, actorA.position[2]];
	}
	return hit;
}

function createEnemy(position)
{
	var enemy = enemyPool[nextEnemyPoolIndex];
	enemy.frameTime = 0;
	enemy.life = 3;
	enemy.position = position;
	enemy.active = true;
	enemy.reload = 0;
	enemy.radius = basicRadius*2;
	nextEnemyPoolIndex = (nextEnemyPoolIndex+1)%enemyPoolSize;
	activeEnemyCount++;
}

function updateBoss(actor)
{
	// Each section follows the previous section, apart from the head which follows the player.
	var targetActor = actor.segmentIndex == 0 ? playerActor : bossPool[actor.segmentIndex-1];
	var targetPos = [targetActor.position[0], targetActor.position[1]];
	if(actor.segmentIndex == 0)
	{
		targetPos[0] += Math.sin(time*3)*playerActor.forwardX*0.001;
		targetPos[1] += Math.sin(time*3)*playerActor.forwardY*0.001;
	}
	var toTargetX = targetPos[1] - actor.position[1];
	var toTargetY = targetPos[0] - actor.position[0];
	var mag = Math.sqrt(toTargetX*toTargetX + toTargetY*toTargetY);
	var nx = mag != 0 ? toTargetX/mag : 0;
	var ny = mag != 0 ? toTargetY/mag : 0;
	var follow = actor.segmentIndex == 0 ? (mag > 0.000001) : (mag > 0.0003);
	
	var accel = 0;
	if(follow)
	{
		accel = actor.segmentIndex == 0 ? 0.0002 : 0.001;
	}

	actor.vx += nx * accel * dt;
	actor.vy += ny * accel * dt;

	actor.vx *= 0.95;
	actor.vy *= 0.95;
	var maxSpeed = 0.00002;
	actor.vx = Math.min(Math.max(actor.vx, -maxSpeed), maxSpeed);
	actor.vy = Math.min(Math.max(actor.vy, -maxSpeed), maxSpeed);

	// Shooting.
	if(actor.segmentIndex == 0)
	{
		if(actor.reload > 0)
		{
			actor.reload -= dt;
		}

		if(mag < 0.005 && actor.reload <= 0)
		{
			shootBullet(actor.position, [actor.vx + nx*0.00005, actor.vy + ny*0.00005], 1.5, false);
			fx_badshoot.play();
			actor.reload = 0.25;
		}
	}

	var x = actor.position[1];
	var y = actor.position[0];
	x += actor.vx;
	y += actor.vy;
	var z = 100 + Math.sin((time*10.0+actor.segmentIndex))*20;
	actor.position = [y, x, z];

	if(actor.life <= 0)
	{
		fx_explode.play();
		actor.active = false;
		createExplosion(actor.position, [96, 96]);
		for(var j = 0; j < 5; j++)
		{
			createDebris(actor.position);
		}

		for(var j = actor.segmentIndex+1; j < bossPool.length; j++)
		{
			var otherbit = bossPool[j];
			if(otherbit.active)
			{
				otherbit.life = 0;
			}
		}
	}
}

function updateEnemy(actor)
{
	actor.frameTime += dt*20;
	actor.frame = Math.floor(actor.frameTime)%actor.frames.length;

	var toPlayerX = playerActor.position[1] - actor.position[1];
	var toPlayerY = playerActor.position[0] - actor.position[0];
	var mag = Math.sqrt(toPlayerX*toPlayerX + toPlayerY*toPlayerY);
	var nx = toPlayerX/mag;
	var ny = toPlayerY/mag;

	var follow = (mag > 0.001)
	
	var accel = 0;
	if(follow)
	{
		accel = 0.0001
	}

	// Collision with other ships.
	for(var i = 0; i < enemyPoolSize; i++)
	{
		var otherEnemy = enemyPool[i];
		if(otherEnemy == actor)
		{
			continue;
		}

		if(collision(otherEnemy, actor, true))
		{
			// Push away.

		}
	}

	actor.vx += nx * accel * dt;
	actor.vy += ny * accel * dt;

	actor.vx *= 0.95;
	actor.vy *= 0.95;
	var maxSpeed = 0.00002;
	actor.vx = Math.min(Math.max(actor.vx, -maxSpeed), maxSpeed);
	actor.vy = Math.min(Math.max(actor.vy, -maxSpeed), maxSpeed);

	// Shooting.
	if(actor.reload > 0)
	{
		actor.reload -= dt;
	}

	if(mag < 0.005 && actor.reload <= 0)
	{
		shootBullet(actor.position, [actor.vx + nx*0.00005, actor.vy + ny*0.00005], 1.5, false);
		fx_badshoot.play();
		actor.reload = 0.75;
	}

	if(mag > 0.02)
	{
		actor.active = false;
		activeEnemyCount--;
		return;
	}

	var x = actor.position[1];
	var y = actor.position[0];
	x += actor.vx;
	y += actor.vy;
	actor.position = [y, x, actor.position[2]];

	if(actor.life <= 0)
	{
		fx_explode.play();
		actor.active = false;
		activeEnemyCount--;
		createExplosion(actor.position, [96, 96]);
		for(var j = 0; j < 5; j++)
		{
			createDebris(actor.position);
		}
	}
}

function distance(actorA, actorB)
{
	var p0x = actorA.position[1];
	var p0y = actorA.position[0];
	var p1x = actorB.position[1];
	var p1y = actorB.position[0];
	var dx = p1x-p0x;
	var dy = p1y-p0y;
	var mag = Math.sqrt(dx*dx + dy*dy);
	return mag;
}

function updateTeleporter(actor)
{

	actor.time += dt;

	// distance from player.
	var dist = distance(actor, playerActor);
	if(dist < 0.005 && closestTeleporter != actor)
	{
		closestTeleporter = actor;
		teleportPopup.options.closeButton = false;
		teleportPopup.options.closeOnClick = false;
		teleportPopup.setLatLng([actor.position[0], actor.position[1]]);
		teleportPopup.setContent("<b>" + actor.name + " Teleporter</b>");
		teleportPopup.addTo(eegeoMap);
	}
}

function drawTeleporter(actor)
{
	drawSprite(actor.position, "assets/teleporter_base.png", actor.size, actor.anchor);

	for(var i = 0; i < 3; i++)
	{
		var localTime = actor.time % 1.0;
		var offset = 50 * localTime;
		var scale = 0.75 + Math.sin(actor.time*5 + i*0.5) * 0.35;
		var size = [actor.size[0]*scale, actor.size[1]*scale];
		var anchor = [actor.anchor[0]*scale, actor.anchor[1]*scale];
		var ringPos = [actor.position[0], actor.position[1], i * 50 + offset];
		drawSprite(ringPos, "assets/teleporter_ring.png", size, anchor);
	}
}

var frame = 0;
function updateActors()
{
	for (var i = 0; i < actorPool.length; i++) { 
		var actor = actorPool[i];
		if(actor.active && actor.update != null)
		{		
			actor.update(actor);			
		}
	}
}

function drawActors()
{

	for (var i = 0; i < actorPoolSize; i++) { 
		var actor = actorPool[i];
		if(actor.active)
		{
			if(actor.draw == null)
			{
				drawSprite(actor.position, actor.frames[actor.frame%actor.frames.length], [actor.size[0]*actor.scale, actor.size[1]*actor.scale], [actor.anchor[0]*actor.scale, actor.anchor[1]*actor.scale], actor.drawPriority)

				// 'shadows'
				drawSprite([actor.position[0], actor.position[1], 0], "assets/shadow.png", [actor.size[0]*actor.scale, actor.size[1]*actor.scale], [actor.anchor[0]*actor.scale, actor.anchor[1]*actor.scale]);
			}
			else 
			{
				actor.draw(actor);
			}
		}

		
	}
}

function drawMinimap()
{
	// Draw player + orientation
	drawMinimapSprite([playerActor.position[0], playerActor.position[1]], "assets/minimap_blue.png", [16,16], [8,8]);
	drawMinimapSprite([playerActor.position[0] + playerActor.forwardY*0.001, playerActor.position[1]+ playerActor.forwardX*0.001], "assets/minimap_blue.png", [8,8], [4,4]);
	drawMinimapSprite([playerActor.position[0] + playerActor.forwardY*0.002, playerActor.position[1]+ playerActor.forwardX*0.002], "assets/minimap_blue.png", [8,8], [4,4]);

	for(var i = 0; i < enemyPool.length; i++)
	{
		var enemy = enemyPool[i];
		if(enemy.active)
		{
			drawMinimapSprite([enemy.position[0], enemy.position[1]], "assets/minimap_red.png", [16,16], [8,8]);
		}
	}

	for(var i = 0; i < teleporterPool.length; i++)
	{
		var teleporter = teleporterPool[i];
		if(teleporter.active)
		{
			drawMinimapSprite([teleporter.position[0], teleporter.position[1]], "assets/minimap_warp.png", [16,16], [8,8]);	
		}
	}

	if(bossPool[0].active)
	{
		drawMinimapSprite([bossPool[0].position[0], bossPool[0].position[1]], "assets/minimap_boss.png", [16,16], [8,8]);	
	}
}

function drawTargeter()
{
	var pos = [playerActor.position[0], playerActor.position[1]];
	for(var i = 1; i < 4; i++)
	{
		var size = [64/i, 64/i];
		var anchor = [32/i, 32/i];
		drawSprite([pos[0] + (playerActor.forwardY*0.001*i), pos[1] + (playerActor.forwardX*0.001*i), playerActor.position[2]], "assets/targeter.png", size, anchor);
	}
}

function update() {

	dt = 0.0166666666666667;
	time += dt;
	enemyTimer -= dt;

	if(enemyTimer <= 0 && activeEnemyCount < 5 && playerActor != null && stage % 5 != 0)
	{
		var angle = Math.random()*Math.PI*2;
		var x = Math.sin(angle) * 0.0075;
		var y = Math.cos(angle) * 0.0075;
		var enemySpawnPos = [playerActor.position[0]+y, playerActor.position[1]+x, playerActor.position[2]];
  		createEnemy(enemySpawnPos);
		enemyTimer = 5 - (stage*0.25);
	}

	clearSprites();

	if(actorPool != null)
	{
		updateActors();
		drawActors();
	}


	if(eegeoMap != null && playerActor != null)
	{
		if(Keys.zoom)
		{
			minimapZoomIndex = (minimapZoomIndex+1)%minimapZoomLevels.length;
			miniMap.setZoom(minimapZoomLevels[minimapZoomIndex]);
			Keys.zoom = false;
		}

		drawMinimap();
		drawTargeter();

		var camPosLat = playerActor.position[0]+playerActor.forwardY*0.0015;
		var camPosLon = playerActor.position[1]+playerActor.forwardX*0.0015;
		eegeoMap.setView([camPosLat, camPosLon], zoom, {"animate":false,  "headingDegrees":playerActor.headingDegrees, "tiltDegrees": 0});

		miniMap.panTo([camPosLat, camPosLon], {animate: false} );

		// Drawing stuff.
		// for (i = 0; i < spritePoolSize; i++) { 
		// 	var alt = 50+50*Math.sin(time+i*0.5);
		// 	if(alt >= 25)
		// 	{
		// 		drawSprite([37.7858 + i*0.0001, -122.401+0.0005*Math.sin(time+i*0.2), alt], "assets/test.png", [32,32], [16,16]); // This actually works!
		//  	}
		// }

		refreshMarkerState();
	}



    requestAnimationFrame(update);
}
requestAnimationFrame(update);
