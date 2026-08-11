console.log(gsap);

const canvas = document.querySelector('canvas');
const c = canvas.getContext('2d');

canvas.width = innerWidth;
canvas.height = innerHeight;

// DOM elements
const scoreDOM = document.querySelector('#score');
const gameOverDOM = document.querySelector('#gameOver');
const gameOverScoreDOM = document.querySelector('#gameOverScore')
const quoteDOM = document.querySelector('#quote');
const authorDOM = document.querySelector('#author');
const startButtonDOM = document.querySelector('#startButton');

const upgradeModalDOM = document.querySelector('#upgradeModal');

const whooshSound = new Audio('./assets/whoosh.mp3');
const bellSound = new Audio('./assets/bell.mp3');
const deathSound = new Audio('./assets/You_Are_Dead!.mp3');
const upgradeSound = new Audio('./assets/yoshiyuki_tatsuya-melting-excitement-519511.mp3');

const playerImage = new Image();
playerImage.src = './assets/player.svg';

let paused = false;
let upgradeModalActive = false;

const upgradePool = [
  {
    key: 'damageDealt',
    label: 'Damage dealt',
    changeAmount: Math.floor(Math.random() * 5) + 2,
    icon: 'assets/icons/damage.png',
    unit: ''
  },
  {
    key: 'pierceChance',
    label: 'Pierce chance',
    changeAmount: Math.floor((Math.random() * 15) + 2) / 100,
    icon: 'assets/icons/pierce.png',
    unit: '%'
  },
  {
    key: 'critChance',
    label: 'Crit chance',
    changeAmount: Math.floor((Math.random() * 11) + 2) / 100,
    icon: 'assets/icons/crit.png',
    unit: '%'
  },
  {
    key: 'radius',
    label: 'Size increase',
    changeAmount: Math.floor(Math.random() * 7) + 2,
    icon: 'assets/icons/grow.png',
    unit: 'px'
  },
  {
    key: 'radius',
    label: 'Size decrease',
    changeAmount: -Math.floor(Math.random() * 7) + 2, // note the minus in front
    icon: 'assets/icons/shrink.png',
    unit: 'px'
  },
  {
	key: 'rotationSpeed',
	label: 'Rotation speed',
	changeAmount: Math.floor((Math.random() * 25) + 1) / 100,
	icon: 'assets/icons/rotate.png',
	unit: '%'
  }
];

class Player {
	constructor(x, y, radius, color) {
		this.x = x;
		this.y = y;
		this.radius = radius;
		this.color = color;
		this.rotation = 0;
		this.rotationSpeed = 0.03;
		this.score = 0;
		this.isAlive = true;
		this.damageDealt = 5;
		this.pierceChance = 0.01;
		this.critChance = 0.01;
		this.bounceChance = 0.3;
	}
	
	draw() {
		this.rotation += this.rotationSpeed;

		c.save();
		c.translate(this.x, this.y);
		c.rotate(this.rotation);
		c.drawImage(playerImage, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
		c.restore();
	}
}

class Projectile {
	constructor(x, y, radius, color, velocity) {
		this.lifespan = 1000; // time measured in frames
		this.isPiercing = Math.random() < player.pierceChance;
		this.isCritical = Math.random() < player.critChance;
		this.isBouncy = this.isPiercing && this.isCritical && Math.random() < player.bounceChance;
		this.x = x;
		this.y = y;
		this.radius = radius;
		this.color = this.isBouncy ?
						'rgb(255, 198, 10)' :
							this.isCritical && this.isPiercing ?
							'rgb(164, 7, 255)' :
							this.isCritical ?
							'rgb(192, 56, 56)' : 
							this.isPiercing ?
							'rgb(81, 128, 230)' :
							color;
		this.velocity = velocity;
	}

	draw() {
		c.beginPath();
		c.fillStyle = this.color;
		c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
		c.fill();
	}

	update() {
		this.draw();
		this.x += this.velocity.x;
		this.y += this.velocity.y;
		this.lifespan--;
	}
}


class Enemy {
	constructor(x, y, radius, color, velocity) {
		this.x = x;
		this.y = y;
		this.radius = radius;
		this.color = color;
		this.velocity = velocity;
		this.immunityFrames = 0;
	}

	draw() {
		c.beginPath();
		c.fillStyle = this.color;
		c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
		c.fill();
	}

	update() {
		this.draw();
		this.x += this.velocity.x;
		this.y += this.velocity.y;
	}
}

class Particle {
	constructor(x, y, radius, color, velocity) {
		this.x = x;
		this.y = y;
		this.radius = radius;
		this.color = color;
		this.velocity = velocity;
	}

	draw() {
		c.beginPath();
		c.fillStyle = this.color;
		c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
		c.fill();
	}

	update() {
		this.draw();
		this.x += this.velocity.x;
		this.y += this.velocity.y;
	}
}

let player;
const projectiles = [];
const enemies = [];
const particles = [];

let animationID;
let prevTimestamp;
function animate(timestamp) {
	if(paused || upgradeModalActive) {
		cancelAnimationFrame(animationID);
		return;
	}

	animationID = requestAnimationFrame(animate);
	
	if(!prevTimestamp) {
		prevTimestamp = timestamp;
	} else {
		const deltaTime = timestamp - prevTimestamp;
		if(deltaTime > 2100 - player.score * 7) {
			spawnEnemy();
			prevTimestamp = timestamp;
		}
	}

	c.fillStyle = `rgba(0,0,0,0.7)`
	c.fillRect(0, 0, canvas.width, canvas.height);


	player.draw();
	projectiles.forEach((projectile, projectileIndex) => {
		projectile.update();

		if(projectile.lifespan <= 0) {
			setTimeout(() => {
				projectiles.splice(projectileIndex, 1);
			}, 0)
			
			return;
		}

		if(projectile.isBouncy) {
			// Bounce off the walls
			if (projectile.x < 0) {
				projectile.x = 3;
				projectile.velocity.x *= -1;
			} else if (projectile.x > canvas.width) {
				projectile.x = canvas.width - 3;
				projectile.velocity.x *= -1;
			} else if (projectile.y < 0) {
				projectile.y = 3;
				projectile.velocity.y *= -1;
			} else if (projectile.y > canvas.height) {
				projectile.y = canvas.height - 3;
				projectile.velocity.y *= -1;
			}
		} else if(
			projectile.x + projectile.radius < 0
			|| projectile.x - projectile.radius > canvas.width
			|| projectile.y + projectile.radius < 0
			|| projectile.y - projectile.radius > canvas.height
		) {
			setTimeout(() => {
				projectiles.splice(projectileIndex, 1);
			}, 0)
		}
	})
	
	if(player.score > 0 && player.score % 11 === 0 && !upgradeModalActive) {
		upgradeSound.currentTime = 0;
		upgradeSound.play();
		generateUpgradeModal();
		triggerUpgradeModal();
		player.score+=0.1; //to prevent the modal from triggering multiple times for the same score
	}


	enemies.forEach((enemy, enemyIndex) => {
		//if enemy out of bounds remove it
		if(
			enemy.x - enemy.radius > canvas.width + 100
			|| enemy.x + enemy.radius < -100
			|| enemy.y - enemy.radius > canvas.height + 100
			|| enemy.y + enemy.radius < -100
		) {
			enemies.splice(enemyIndex, 1);
		}

		// update enemy position
		enemy.update();

		// reduce immunity frames count by one each loop (frame) if greater than 0
		if(enemy.immunityFrames > 0) enemy.immunityFrames--;

		// enemy <-> player
		const distancePlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);
		if(distancePlayer - player.radius - enemy.radius < 1) {
			//if so end the game
			player.isAlive = false;
			deathSound.play();
			
			const particleAmount = 20;
			for(let i=0; i<particleAmount; i++) {
				particles.push(
					new Particle(
						player.x,
						player.y,
						Math.random()+0.4,
						`hsl(${360/particleAmount * i}, 70%, 50%)`,
						{
							x: (Math.random()-0.5)*10 + enemy.velocity.x*5,
							y: (Math.random()-0.5)*10 + enemy.velocity.y*5
						}
					)
				)
			}
			player.radius = 0;

			setTimeout(() => {
				cancelAnimationFrame(animationID);
				gameOver();
			}, 1000)
		}


		// enemy <-> projectile
		projectiles.forEach((projectile, projectileIndex) => {
			const distanceProjectileToEnemy = Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y);
			const distanceProjectileToPlayer = Math.hypot(player.x - projectile.x, player.y - projectile.y);
			
			if(
				distanceProjectileToEnemy - enemy.radius - projectile.radius < 1 && enemy.immunityFrames === 0
			) {
				let knockout;
				if(Math.random() < player.critChance) {
					knockout = true;
				} else {
					enemy.radius - player.damageDealt <= 7 ? knockout = true : knockout = false;
				}

				setTimeout(() => {
					if (!knockout) {
						gsap.to(enemy, {
							radius: enemy.radius - player.damageDealt
						})
						
						enemy.velocity.x += projectile.velocity.x/11;
						enemy.velocity.y += projectile.velocity.y/11;
						enemy.immunityFrames = 8; // set immunity frames to 8 to prevent immediate re-hit
					} else {
						bellSound.currentTime = 0;
						bellSound.play();
	
						 for(let i=0; i<enemy.radius; i++){
							particles.push(
								new Particle(
									enemy.x,
									enemy.y,
									Math.random()+0.4,
									enemy.color,
									{
										x: (Math.random()-0.5)*4 - enemy.velocity.x + projectile.velocity.x/3,
										y: (Math.random()-0.5)*4 - enemy.velocity.y + projectile.velocity.y/3
									}
								))
								
						}
	
						enemies.splice(enemyIndex, 1);
						player.score++;
						player.score = Math.floor(player.score);

					}

					// remove projectile if it is not piercing
					if(!projectile.isPiercing) projectiles.splice(projectileIndex, 1);
				}, 0)
			}
		})
		})

	particles.forEach((particle, index) => {
		particle.update();
		if(
			particle.x - particle.radius > canvas.width
			|| particle.x + particle.radius < 0
			|| particle.y - particle.radius > canvas.height
			|| particle.y + particle.radius < 0
		) {
			particles.splice(index, 1);
		}
	})

	scoreDOM.innerHTML = Math.floor(player.score);
}

function spawnEnemy() {
	let x
	let y
	const radius = Math.random() * (30 - 10) + 10;

	if(Math.random() < 0.5) {
		x = Math.random() < 0.5 ? -radius : canvas.width + radius;
		y = Math.random() * canvas.height;
	} else {
		x = Math.random() * canvas.width;
		y = Math.random() < 0.5 ? -radius : canvas.height + radius;
	}

	const hue = Math.floor(Math.random()*361)
	const color = `hsl(${hue}, 70%, 50%)`

	const angle = Math.atan2(canvas.height/2 - y, canvas.width/2 - x);

	const velocity = {
		x: Math.cos(angle),
		y: Math.sin(angle)
	}

	enemies.push(new Enemy(x, y, radius, color, velocity));
}

function gameOver() {
	const boxWidth = 400;
	const boxHeight = 250;
	gameOverDOM.style.width = `${boxWidth}px`;
	gameOverDOM.style.height = `${boxHeight}px`;


	gameOverDOM.style.left = `${canvas.width/2 - boxWidth/2}px`
	gameOverDOM.style.top = `${canvas.height/2 - boxHeight/2}px`

	gameOverScoreDOM.innerHTML = `${player.score}`;
	
	
	gameOverDOM.style.visibility = 'visible';
}

function generateUpgradeModal() {
	const boxWidth = 400;
	const boxHeight = 250;
	upgradeModalDOM.style.width = `${boxWidth}px`;
	upgradeModalDOM.style.height = `${boxHeight}px`;


	upgradeModalDOM.style.left = `${canvas.width/2 - boxWidth/2}px`
	upgradeModalDOM.style.top = `${canvas.height/2 - boxHeight/2}px`
}

async function setQuote() {
	let quote, author
	try {
		const response = await fetch('https://random-quotes-freeapi.vercel.app/api/random')
		const data = await response.json();

		quote = data.quote;
		author = data.author;

		console.log(`${quote} - ${author}`);
	} catch (e) {
		console.error("Failed to fetch quote data: ", e);
		const quote = "Don't ever, for any reason, do anything to anyone for any reason ever, no matter what, no matter where, or who, or who you are with, or where you are going, or where you've been...  ever, for any reason whatsoever."
		const author = 'Michael Scott'
	}

	quoteDOM.innerHTML = `"${quote}"`;
	authorDOM.innerHTML = `- ${author}`;
}

function getRandomUpgrades(pool, count) {
	const shuffled = [...pool].sort(() => 0.5 - Math.random());
	return shuffled.slice(0, count);
}

function triggerUpgradeModal() {
	upgradeModalActive = true;

	//reset the contents
	upgradeModalDOM.innerHTML = '';

	//get 2 random upgrades from the pool
	const theTwoRandomUpgrades = getRandomUpgrades(upgradePool, 2);

	theTwoRandomUpgrades.forEach((upgrade, index) => {
		const formattedValue = upgrade.unit === '%'
			? `+${upgrade.changeAmount * 100}%`
			: `+${upgrade.changeAmount}${upgrade.unit}`;
		
		//create the upgrade option child div
		const optionDiv = document.createElement('div');
		optionDiv.id = `option${index + 1}`;
		optionDiv.className = 'upgradeOption';

		// store target property and changeAmount on the div itself
		optionDiv.dataset.prop = upgrade.key;
		optionDiv.dataset.amount = upgrade.changeAmount;

		//populate the innerHTML of the optionDiv with the upgrade details
		optionDiv.innerHTML = `
			<div class="upgradeImage" id="option${index+1}Image">
				<img src="./${upgrade.icon}" alt="${upgrade.label}" />
			</div>
			<div class="upgradeDetails" id="option${index+1}Details">
				<span>${upgrade.label} ${formattedValue}</span>
			</div>
		`;

		// append the child div to the upgrade modal
		upgradeModalDOM.appendChild(optionDiv);
	})

	// show the upgrade modal
	upgradeModalDOM.classList.remove('hidden');
}


upgradeModalDOM.addEventListener('click', (ev) => {
	// check if the clicked element is an upgrade option or a child of it
	const selectedOption = ev.target.closest('.upgradeOption');

	// if clicked outside of an option, do nothing
	if (!selectedOption) return;

	// extract the prop and amount from HTML dataset attributes
	const prop = selectedOption.dataset.prop;
	const amount = parseFloat(selectedOption.dataset.amount);

	// update player's prop by amount
	if (player.hasOwnProperty(prop)) {
		player[prop] += amount;
		console.log(`Upgraded ${prop} by ${amount}. New value: ${player[prop]}`);
	}
	
	// hide the upgrade modal
	closeUpgradeModal();
})

function closeUpgradeModal() {
	upgradeModalActive = false;
	upgradeModalDOM.classList.add('hidden');
	upgradeSound.pause();
	animate();
}

addEventListener('click', (event) => {
	if(player.isAlive === false || paused || upgradeModalActive) return;

	whooshSound.currentTime = 0;
	whooshSound.play();

	const angle = Math.atan2(event.clientY - canvas.height/2, event.clientX - canvas.width /2);
	const hypot = Math.hypot(event.clientX - player.x, event.clientY - player.y);

	//speed multiplier capped at 5
	const speedFactor = hypot/(canvas.width/2) * 5;


	projectiles.push(
		new Projectile(
			canvas.width/2, 
			canvas.height/2, 
			5, 
			'rgb(211, 211, 211)', 
			{
				x: Math.cos(angle) * speedFactor, 
				y: Math.sin(angle) * speedFactor
			}
		));
})

addEventListener('resize', () => {
	canvas.width = innerWidth;
	canvas.height = innerHeight;
})

addEventListener('keydown', (event) => {
	console.log(enemies.length);
	if(event.key === 'p' || event.key === 'P' || event.key === 'Escape' && player.isAlive) {
		paused = !paused;
		if(paused) {
			// cancelAnimationFrame(animationID);

			c.fillStyle = `rgba(75, 31, 31, 0.5)`
			c.fillRect(0, 0, canvas.width, canvas.height);
			c.fillStyle = 'white';
			c.font = '81px Blocky';
			c.textAlign = 'center';
			c.fillText('PAUSED', canvas.width/2, canvas.height/2);
		} else {
			prevTimestamp = null;
			animate();
		}
	}
	// if(event.key === 'r' || event.key === 'R' && player.isAlive) {
	// 	upgradeModalActive = !upgradeModalActive;
	// 	if (upgradeModalActive) {
	// 		upgradeSound.currentTime = 0;
	// 		upgradeSound.play();
	// 		generateUpgradeModal();
	// 		triggerUpgradeModal();
	// 	} else {
	// 		upgradeSound.pause();
	// 		upgradeModalDOM.style.visibility = 'hidden';
	// 		animate();
	// 	}
	// }
})

newGame();

startButtonDOM.addEventListener('click', () => {
	gameOverDOM.style.visibility = 'hidden';
	
	newGame();
	
})

function setup() {
	player = new Player(canvas.width / 2, canvas.height / 2, 25, 'rgb(223, 223, 223)');

	projectiles.length = 0;
	enemies.length = 0;
	particles.length = 0;

	setQuote();
	generateUpgradeModal();
}

function newGame() {
	setup();
	animate();
}