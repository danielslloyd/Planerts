// Game Configuration
const CONFIG = {
    PLANET_MIN_DISTANCE: 150,
    PLANET_COUNT: 12,
    PULSE_INTERVAL: 2000, // milliseconds
    PHOTON_SPEED: 100, // pixels per second
    ORBIT_RADIUS: 60,
    ORBIT_SPEED: 1, // radians per second
    ATTRACTION_RANGE: 80, // roughly large planet diameter
    PHOTON_SIZE: 4,
    PLANET_BASE_RADIUS: 15,
    SELECTION_HALO_SIZE: 8
};

const TEAMS = {
    NONE: 'gray',
    RED: '#ff4444',
    GREEN: '#44ff44',
    BLUE: '#4444ff'
};

// Utility functions
function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

// Planet Class
class Planet {
    constructor(x, y, size, team = 'NONE') {
        this.x = x;
        this.y = y;
        this.size = size; // 1, 2, or 3
        this.team = team;
        this.hp = team === 'NONE' ? 0 : size * 100;
        this.maxHP = size * 100;
        this.lastPulse = 0;
        this.pulsePhase = 0;
        this.orbitingPhotons = [];
    }

    get radius() {
        return CONFIG.PLANET_BASE_RADIUS * this.size;
    }

    get color() {
        return TEAMS[this.team];
    }

    get currentSize() {
        // Calculate current size based on HP
        if (this.hp >= 300) return 3;
        if (this.hp >= 200) return 2;
        if (this.hp >= 100) return 1;
        return 0;
    }

    update(deltaTime) {
        this.pulsePhase += deltaTime / 1000;
    }

    pulse(currentTime) {
        if (this.team === 'NONE' || currentTime - this.lastPulse < CONFIG.PULSE_INTERVAL) {
            return [];
        }

        this.lastPulse = currentTime;
        const photons = [];
        const emitCount = this.size;

        for (let i = 0; i < emitCount; i++) {
            const angle = (Math.PI * 2 * i) / emitCount + Math.random() * 0.3;
            photons.push(new Photon(
                this.x + Math.cos(angle) * this.radius,
                this.y + Math.sin(angle) * this.radius,
                this.team,
                angle
            ));
        }

        return photons;
    }

    addHP(amount) {
        const oldSize = this.currentSize;
        this.hp = Math.max(0, Math.min(this.maxHP, this.hp + amount));

        // Check if size changed
        const newSize = this.currentSize;
        if (newSize !== oldSize) {
            this.size = newSize;
            this.maxHP = newSize * 100;
        }

        // Planet becomes uninhabited at 0 HP
        if (this.hp === 0) {
            this.team = 'NONE';
        }
    }

    colonize(team) {
        if (this.team === 'NONE' && this.hp >= 100) {
            this.team = team;
            this.size = 1;
            this.maxHP = 100;
        }
    }

    draw(ctx) {
        // Main planet
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Pulse effect
        const pulseScale = 1 + Math.sin(this.pulsePhase * 3) * 0.1;
        ctx.strokeStyle = this.color;
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * pulseScale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // HP bar
        if (this.team !== 'NONE') {
            const barWidth = this.radius * 2;
            const barHeight = 5;
            const barX = this.x - barWidth / 2;
            const barY = this.y + this.radius + 10;

            // Background
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            // HP fill
            const hpPercent = this.hp / this.maxHP;
            ctx.fillStyle = this.color;
            ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

            // HP text
            ctx.fillStyle = '#fff';
            ctx.font = '10px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText(`${this.hp}/${this.maxHP}`, this.x, barY + barHeight + 12);
        }
    }
}

// Photon Class
class Photon {
    constructor(x, y, team, angle = 0) {
        this.x = x;
        this.y = y;
        this.team = team;
        this.vx = Math.cos(angle) * 20;
        this.vy = Math.sin(angle) * 20;
        this.selected = false;
        this.state = 'free'; // free, moving, orbiting
        this.targetX = null;
        this.targetY = null;
        this.orbitPlanet = null;
        this.orbitAngle = 0;
        this.dead = false;
    }

    get color() {
        return TEAMS[this.team];
    }

    setTarget(x, y) {
        this.state = 'moving';
        this.targetX = x;
        this.targetY = y;
        this.orbitPlanet = null;
    }

    update(deltaTime, planets) {
        if (this.dead) return;

        const dt = deltaTime / 1000;

        if (this.state === 'orbiting' && this.orbitPlanet) {
            // Orbit around planet
            this.orbitAngle += CONFIG.ORBIT_SPEED * dt;
            this.x = this.orbitPlanet.x + Math.cos(this.orbitAngle) * CONFIG.ORBIT_RADIUS;
            this.y = this.orbitPlanet.y + Math.sin(this.orbitAngle) * CONFIG.ORBIT_RADIUS;
        } else if (this.state === 'moving' && this.targetX !== null) {
            // Move towards target
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 5) {
                this.state = 'free';
                this.targetX = null;
                this.targetY = null;
                this.vx = 0;
                this.vy = 0;
            } else {
                this.vx = (dx / dist) * CONFIG.PHOTON_SPEED;
                this.vy = (dy / dist) * CONFIG.PHOTON_SPEED;
                this.x += this.vx * dt;
                this.y += this.vy * dt;
            }
        } else {
            // Free floating - slow down
            this.vx *= 0.95;
            this.vy *= 0.95;
            this.x += this.vx * dt;
            this.y += this.vy * dt;
        }

        // Check for orbit capture by friendly planets
        if (this.state !== 'orbiting') {
            for (const planet of planets) {
                if (planet.team === this.team) {
                    const dist = distance(this.x, this.y, planet.x, planet.y);
                    if (dist < CONFIG.ORBIT_RADIUS && dist > planet.radius) {
                        this.state = 'orbiting';
                        this.orbitPlanet = planet;
                        this.orbitAngle = Math.atan2(this.y - planet.y, this.x - planet.x);
                        break;
                    }
                }
            }
        }

        // Check for planet interaction
        for (const planet of planets) {
            const dist = distance(this.x, this.y, planet.x, planet.y);
            if (dist < planet.radius) {
                if (planet.team === 'NONE') {
                    // Colonize
                    planet.addHP(1);
                    planet.colonize(this.team);
                } else if (planet.team === this.team) {
                    // Heal/Upgrade
                    planet.addHP(1);
                } else {
                    // Attack
                    planet.addHP(-1);
                }
                this.dead = true;
                break;
            }
        }
    }

    draw(ctx) {
        if (this.dead) return;

        // Main photon
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, CONFIG.PHOTON_SIZE, 0, Math.PI * 2);
        ctx.fill();

        // Selection halo
        if (this.selected) {
            ctx.strokeStyle = this.color;
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, CONFIG.SELECTION_HALO_SIZE, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }
}

// Game Class
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();

        this.planets = [];
        this.photons = [];
        this.selectedPhotons = new Set();

        this.mouseDown = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragCurrentX = 0;
        this.dragCurrentY = 0;

        this.lastTime = performance.now();
        this.lastPulseCheck = 0;

        this.setupEventListeners();
        this.generatePlanets();
        this.gameLoop();
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.resizeCanvas());

        this.canvas.addEventListener('mousedown', (e) => {
            this.mouseDown = true;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            this.dragCurrentX = e.clientX;
            this.dragCurrentY = e.clientY;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.mouseDown) {
                this.dragCurrentX = e.clientX;
                this.dragCurrentY = e.clientY;
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (this.mouseDown) {
                const dragDist = distance(this.dragStartX, this.dragStartY, e.clientX, e.clientY);

                if (dragDist > 10) {
                    // Drag selection
                    this.selectPhotonsInCircle(this.dragStartX, this.dragStartY, dragDist);
                } else {
                    // Click to move selected photons
                    if (this.selectedPhotons.size > 0) {
                        for (const photon of this.selectedPhotons) {
                            photon.setTarget(e.clientX, e.clientY);
                        }
                    }
                }
            }
            this.mouseDown = false;
        });
    }

    generatePlanets() {
        const teams = ['RED', 'GREEN', 'BLUE'];
        const homePlanets = [];

        // Generate home planets for each team
        for (let i = 0; i < teams.length; i++) {
            const angle = (Math.PI * 2 * i) / teams.length;
            const dist = Math.min(this.canvas.width, this.canvas.height) * 0.3;
            const x = this.canvas.width / 2 + Math.cos(angle) * dist;
            const y = this.canvas.height / 2 + Math.sin(angle) * dist;
            const size = Math.floor(randomRange(1, 4));

            const planet = new Planet(x, y, size, teams[i]);
            homePlanets.push(planet);
            this.planets.push(planet);
        }

        // Generate neutral planets
        let attempts = 0;
        while (this.planets.length < CONFIG.PLANET_COUNT && attempts < 1000) {
            attempts++;
            const x = randomRange(100, this.canvas.width - 100);
            const y = randomRange(100, this.canvas.height - 100);

            // Check minimum distance
            let valid = true;
            for (const planet of this.planets) {
                if (distance(x, y, planet.x, planet.y) < CONFIG.PLANET_MIN_DISTANCE) {
                    valid = false;
                    break;
                }
            }

            if (valid) {
                const size = Math.floor(randomRange(1, 4));
                this.planets.push(new Planet(x, y, size, 'NONE'));
            }
        }
    }

    selectPhotonsInCircle(centerX, centerY, radius) {
        this.selectedPhotons.clear();

        for (const photon of this.photons) {
            const dist = distance(centerX, centerY, photon.x, photon.y);
            if (dist <= radius) {
                photon.selected = true;
                this.selectedPhotons.add(photon);
            } else {
                photon.selected = false;
            }
        }
    }

    checkPhotonCollisions() {
        for (let i = 0; i < this.photons.length; i++) {
            const p1 = this.photons[i];
            if (p1.dead || p1.state === 'orbiting') continue;

            for (let j = i + 1; j < this.photons.length; j++) {
                const p2 = this.photons[j];
                if (p2.dead || p2.state === 'orbiting') continue;

                // Only enemy photons attract and collide
                if (p1.team !== p2.team) {
                    const dist = distance(p1.x, p1.y, p2.x, p2.y);

                    if (dist < CONFIG.ATTRACTION_RANGE) {
                        // Attract towards each other
                        const dx = p2.x - p1.x;
                        const dy = p2.y - p1.y;
                        const force = 50 / (dist + 1);

                        p1.vx += (dx / dist) * force;
                        p1.vy += (dy / dist) * force;
                        p2.vx -= (dx / dist) * force;
                        p2.vy -= (dy / dist) * force;

                        // Collision - neutralize
                        if (dist < CONFIG.PHOTON_SIZE * 2) {
                            p1.dead = true;
                            p2.dead = true;
                        }
                    }
                }
            }
        }
    }

    update(deltaTime) {
        // Update planets
        for (const planet of this.planets) {
            planet.update(deltaTime);
        }

        // Pulse planets
        const currentTime = performance.now();
        if (currentTime - this.lastPulseCheck > 100) {
            this.lastPulseCheck = currentTime;
            for (const planet of this.planets) {
                const newPhotons = planet.pulse(currentTime);
                this.photons.push(...newPhotons);
            }
        }

        // Update photons
        for (const photon of this.photons) {
            photon.update(deltaTime, this.planets);
        }

        // Check photon collisions
        this.checkPhotonCollisions();

        // Remove dead photons
        this.photons = this.photons.filter(p => !p.dead);
        this.selectedPhotons = new Set([...this.selectedPhotons].filter(p => !p.dead));

        // Update UI
        this.updateUI();
    }

    updateUI() {
        const counts = { RED: 0, GREEN: 0, BLUE: 0 };
        for (const planet of this.planets) {
            if (planet.team !== 'NONE') {
                counts[planet.team]++;
            }
        }

        document.getElementById('redCount').textContent = counts.RED;
        document.getElementById('greenCount').textContent = counts.GREEN;
        document.getElementById('blueCount').textContent = counts.BLUE;
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw stars background
        this.ctx.fillStyle = '#fff';
        for (let i = 0; i < 100; i++) {
            const x = (i * 137.5) % this.canvas.width;
            const y = (i * 217.3) % this.canvas.height;
            this.ctx.fillRect(x, y, 1, 1);
        }

        // Draw planets
        for (const planet of this.planets) {
            planet.draw(this.ctx);
        }

        // Draw photons
        for (const photon of this.photons) {
            photon.draw(this.ctx);
        }

        // Draw selection circle
        if (this.mouseDown) {
            const radius = distance(this.dragStartX, this.dragStartY, this.dragCurrentX, this.dragCurrentY);
            this.ctx.strokeStyle = '#fff';
            this.ctx.globalAlpha = 0.3;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(this.dragStartX, this.dragStartY, radius, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.globalAlpha = 1;
        }
    }

    gameLoop() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Update FPS
        const fps = Math.round(1000 / deltaTime);
        document.getElementById('fps').textContent = fps;

        this.update(deltaTime);
        this.draw();

        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game
new Game();
