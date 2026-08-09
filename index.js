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

const powerUpContainerDOM = document.querySelector('#powerUpContainer');
const powerUpOption1DOM = document.querySelector('#option1');
const powerUpOption1TextDOM = document.querySelector('#option1details');
const powerUpOption2DOM = document.querySelector('#option2');
const powerUpOption2TextDOM = document.querySelector('#option2details');

const whooshSound = new Audio('./assets/whoosh.mp3');
const bellSound = new Audio('./assets/bell.mp3');
const deathSound = new Audio('./assets/You_Are_Dead!.mp3');
const powerUpSound = new Audio('./assets/yoshiyuki_tatsuya-melting-excitement-519511.mp3');

let paused = false;
let powerUpScreenActive = false;

const powerUpPool = [
  {
    key: 'damageDealt',
    label: 'Damage dealt',
    changeAmount: 2,
    icon: 'assets/icons/damage.png',
    unit: ''
  },
  {
    key: 'pierceChance',
    label: 'Pierce chance',
    changeAmount: 0.05,
    icon: 'assets/icons/pierce.png',
    unit: '%'
  },
  {
    key: 'critChance',
    label: 'Crit chance',
    changeAmount: 0.05,
    icon: 'assets/icons/crit.png',
    unit: '%'
  },
  {
    key: 'radius',
    label: 'Size increase',
    changeAmount: 10,
    icon: 'assets/icons/grow.png',
    unit: 'px'
  },
  {
    key: 'radius',
    label: 'Size decrease',
    changeAmount: -5,
    icon: 'assets/icons/shrink.png',
    unit: 'px'
  }
];

class Player {
	constructor(x, y, radius, color) {
		this.x = x;
		this.y = y;
		this.radius = radius;
		this.color = color;
		this.score = 0;
		this.isAlive = true;
		this.damageDealt = 7;
		this.pierceChance = 0.1;
		this.critChance = 0.2;
	}
	
	draw() {
		c.beginPath();
		c.fillStyle = this.color;
		c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
		c.fill();
	}
}

class Projectile {
	constructor(x, y, radius, color, velocity) {
		this.x = x;
		this.y = y;
		this.radius = radius;
		this.color = color;
		this.velocity = velocity;
		this.isPiercing = Math.random() < player.pierceChance;
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


class Enemy {
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

let player = new Player(canvas.width / 2, canvas.height / 2, 15, 'rgb(223, 223, 223)');
const projectiles = [];
const enemies = [];
const particles = [];

let animationID;
let prevTimestamp;
function animate(timestamp) {
	if(paused || powerUpScreenActive) {
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
		if(
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


		enemy.update();
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
				distanceProjectileToEnemy - enemy.radius - projectile.radius < 1
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
						
						enemy.velocity.x += projectile.velocity.x/7;
						enemy.velocity.y += projectile.velocity.y/7;
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

					}						

					if(projectile.isPiercing && knockout) {
						//do nothing, projectile pierces enemy
					} else {
						projectiles.splice(projectileIndex, 1);
					}
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

	scoreDOM.innerHTML = player.score;
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

function generatePowerUpScreen() {
	const boxWidth = 400;
	const boxHeight = 250;
	powerUpContainerDOM.style.width = `${boxWidth}px`;
	powerUpContainerDOM.style.height = `${boxHeight}px`;


	powerUpContainerDOM.style.left = `${canvas.width/2 - boxWidth/2}px`
	powerUpContainerDOM.style.top = `${canvas.height/2 - boxHeight/2}px`
	
	powerUpContainerDOM.style.visibility = 'visible';

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

addEventListener('click', (event) => {
	if(player.isAlive === false || paused || powerUpScreenActive) return;

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
	if(event.key === 'r' || event.key === 'R' && player.isAlive) {
		powerUpScreenActive = !powerUpScreenActive;
		if (powerUpScreenActive) {
			powerUpSound.currentTime = 0;
			powerUpSound.play();
			generatePowerUpScreen();
			powerUpContainerDOM.style.visibility = 'visible';
		} else {
			powerUpSound.pause();
			powerUpContainerDOM.style.visibility = 'hidden';
			animate();
		}
	}
})

newGame();

startButtonDOM.addEventListener('click', () => {
	gameOverDOM.style.visibility = 'hidden';
	
	newGame();
	
})

function setup() {
	player = new Player(canvas.width / 2, canvas.height / 2, 15, 'rgb(223, 223, 223)');

	projectiles.length = 0;
	enemies.length = 0;
	particles.length = 0;

	setQuote();
}

function newGame() {
	setup();
	animate();
}