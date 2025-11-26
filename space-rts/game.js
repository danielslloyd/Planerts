// Game Configuration
const CONFIG = {
    // Planet settings
    PLANET_MIN_DISTANCE: 150,
    PLANET_COUNT: 12,
    PLANET_BASE_RADIUS: 15,
    PULSE_INTERVAL: 2000, // milliseconds

    // Photon settings
    PHOTON_SPEED: 100, // pixels per second
    PHOTON_SIZE: 4,
    SELECTION_HALO_SIZE: 8,

    // Orbit settings
    ORBIT_RADIUS: 60,
    ORBIT_SPEED: 1, // radians per second

    // Physics - Enemy photon attraction
    ENEMY_ATTRACTION_RANGE: 240, // tripled from 80
    ENEMY_ATTRACTION_FORCE: 50,
    ENEMY_COLLISION_DISTANCE: 8, // PHOTON_SIZE * 2

    // Physics - Friendly photon repulsion
    FRIENDLY_REPULSION_RANGE: 20,
    FRIENDLY_REPULSION_FORCE: 5,

    // Physics - Free floating deceleration
    FREE_FLOAT_DECELERATION: 0.95
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
    constructor(x, y, initialHP, team = 'NONE', maxPotential = 3) {
        this.x = x;
        this.y = y;
        this.maxPotential = maxPotential; // Maximum size this planet can grow to (1, 2, or 3)
        this.lastPulse = 0;
        this.pulsePhase = 0;
        this.rotation = Math.random() * Math.PI * 2; // Random starting rotation
        this.rotationSpeed = 0.2 + Math.random() * 0.3; // Random rotation speed
        this.orbitingPhotons = [];
        this.routeTarget = null; // Planet to send newly pulsed photons to (null for self-routing)
        this.isHome = false; // Tracks if this is a home planet

        // Colored HP system - each team has separate HP
        this.hpByTeam = {
            RED: 0,
            GREEN: 0,
            BLUE: 0
        };

        // Initialize HP for starting team
        if (team !== 'NONE') {
            this.hpByTeam[team] = initialHP;
        }
    }

    get radius() {
        // Radius determined by current HP and potential
        // Always show at least size 1 radius, even for neutral/0 HP planets
        const size = Math.max(1, this.size);
        return CONFIG.PLANET_BASE_RADIUS * size;
    }

    get size() {
        // Size determined purely by HP
        const hp = this.hp;
        if (hp >= 300 && this.maxPotential >= 3) return 3;
        if (hp >= 200 && this.maxPotential >= 2) return 2;
        if (hp >= 100) return 1;
        return 0;
    }

    get orbitRadius() {
        // Orbit radius is based on max potential, not current size
        return CONFIG.PLANET_BASE_RADIUS * this.maxPotential + CONFIG.ORBIT_RADIUS;
    }

    get color() {
        return TEAMS[this.team];
    }

    get team() {
        // Team is determined by who has the most HP
        let maxHP = 0;
        let controllingTeam = 'NONE';

        for (const [team, hp] of Object.entries(this.hpByTeam)) {
            if (hp > maxHP) {
                maxHP = hp;
                controllingTeam = team;
            }
        }

        // Must have at least 100 HP to control a planet
        if (maxHP < 100) {
            return 'NONE';
        }

        return controllingTeam;
    }

    get hp() {
        // Return the controlling team's HP, or total HP if neutral
        const team = this.team;
        if (team === 'NONE') {
            return Math.max(this.hpByTeam.RED, this.hpByTeam.GREEN, this.hpByTeam.BLUE);
        }
        return this.hpByTeam[team];
    }

    get maxHP() {
        return this.maxPotential * 100;
    }

    update(deltaTime) {
        this.pulsePhase += deltaTime / 1000;
        this.rotation += this.rotationSpeed * (deltaTime / 1000);
    }

    pulse(currentTime) {
        // Home planets always produce at size 1 rate, even if HP < 100
        const canPulse = this.isHome ? this.team !== 'NONE' : (this.team !== 'NONE' && this.hp >= 100);

        if (!canPulse || currentTime - this.lastPulse < CONFIG.PULSE_INTERVAL) {
            return [];
        }

        this.lastPulse = currentTime;
        const photons = [];
        const emitCount = this.size;

        for (let i = 0; i < emitCount; i++) {
            const angle = (Math.PI * 2 * i) / emitCount + Math.random() * 0.3;
            const photon = new Photon(
                this.x + Math.cos(angle) * this.radius,
                this.y + Math.sin(angle) * this.radius,
                this.team,
                angle
            );

            // If there's a route target, send the photon there
            if (this.routeTarget) {
                // RouteTarget can be a Planet or coordinates {x, y}
                // This will be handled when photons are created in game.update()
                photon.routeTargetPlanet = this.routeTarget;
            }

            photons.push(photon);
        }

        return photons;
    }

    addHP(team, amount) {
        const oldTeam = this.team;

        // Add HP to the specific team's pool (capped at maxPotential * 100)
        this.hpByTeam[team] = Math.max(0, Math.min(this.maxPotential * 100, this.hpByTeam[team] + amount));

        // If control changed, clear routes (unless self-routed)
        const newTeam = this.team;
        if (oldTeam !== newTeam && this.routeTarget !== this) {
            this.routeTarget = null;
        }

        // If a team's HP drops to 0 and they were controlling, planet may become neutral
        // (handled automatically by the team getter)
    }

    draw(ctx) {
        // Draw potential size halos first (behind the planet)
        if (this.size < this.maxPotential) {
            ctx.globalAlpha = 0.15;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1;

            for (let potentialSize = this.size + 1; potentialSize <= this.maxPotential; potentialSize++) {
                const haloRadius = CONFIG.PLANET_BASE_RADIUS * potentialSize;
                ctx.beginPath();
                ctx.arc(this.x, this.y, haloRadius, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        // Determine base color - gray/beige for neutral, team color otherwise
        let baseColor = this.color;
        if (this.team === 'NONE') {
            baseColor = '#a89968'; // Beige for uncontrolled
        }

        // Parse the color to RGB for manipulation
        const parseColor = (hex) => {
            if (hex === 'gray') hex = '#888888';
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return { r, g, b };
        };

        const rgb = parseColor(baseColor);

        // Draw cloudy swirling planet surface
        ctx.save();

        // Create clipping region for the planet
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.clip();

        // Draw base planet color
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw swirling cloud layers
        const cloudCount = 8;
        for (let i = 0; i < cloudCount; i++) {
            const angle = (i / cloudCount) * Math.PI * 2 + this.rotation;
            const distance = (this.radius * 0.4) * Math.sin(i * 2.1 + this.rotation * 0.5);
            const cloudX = this.x + Math.cos(angle) * distance;
            const cloudY = this.y + Math.sin(angle) * distance;
            const cloudSize = this.radius * (0.4 + Math.sin(i * 1.7 + this.rotation) * 0.2);

            // Create lighter/darker variations
            const brightness = 0.7 + Math.sin(i * 1.3 + this.rotation * 0.3) * 0.3;
            const r = Math.min(255, Math.floor(rgb.r * brightness));
            const g = Math.min(255, Math.floor(rgb.g * brightness));
            const b = Math.min(255, Math.floor(rgb.b * brightness));

            const gradient = ctx.createRadialGradient(cloudX, cloudY, 0, cloudX, cloudY, cloudSize);
            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.4)`);
            gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.2)`);
            gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(cloudX, cloudY, cloudSize, 0, Math.PI * 2);
            ctx.fill();
        }

        // Add swirl patterns
        const swirlCount = 5;
        for (let i = 0; i < swirlCount; i++) {
            const angle = (i / swirlCount) * Math.PI * 2 - this.rotation * 1.5;
            const swirlRadius = this.radius * 0.6;
            const swirlX = this.x + Math.cos(angle) * swirlRadius;
            const swirlY = this.y + Math.sin(angle) * swirlRadius;

            const brightness = 0.5 + Math.sin(i * 2.1 - this.rotation) * 0.3;
            const r = Math.min(255, Math.floor(rgb.r * brightness));
            const g = Math.min(255, Math.floor(rgb.g * brightness));
            const b = Math.min(255, Math.floor(rgb.b * brightness));

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.15)`;
            ctx.beginPath();
            ctx.arc(swirlX, swirlY, this.radius * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // Pulse effect - LARGER when birthing photons
        const pulseScale = 1 + Math.sin(this.pulsePhase * 3) * 0.25; // Increased from 0.1 to 0.25
        ctx.strokeStyle = baseColor;
        ctx.globalAlpha = 0.5; // Increased from 0.3
        ctx.lineWidth = 3; // Increased from 2
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * pulseScale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // HP bars - show N bars for potential N (each bar = 100 HP)
        const barWidth = this.radius * 2;
        const barHeight = 5;
        const barSpacing = 2;
        const barX = this.x - barWidth / 2;
        let barY = this.y + this.radius + 10;

        const currentHP = this.hp;
        const controllingTeam = this.team;

        for (let barIndex = 0; barIndex < this.maxPotential; barIndex++) {
            const barMinHP = barIndex * 100;
            const barMaxHP = (barIndex + 1) * 100;
            const barCurrentHP = Math.max(0, Math.min(100, currentHP - barMinHP));

            // Background
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            // HP fill (only if there's HP in this bar)
            if (barCurrentHP > 0) {
                const fillPercent = barCurrentHP / 100;
                ctx.fillStyle = TEAMS[controllingTeam];
                ctx.fillRect(barX, barY, barWidth * fillPercent, barHeight);
            }

            barY += barHeight + barSpacing;
        }

        // HP text below all bars
        ctx.fillStyle = '#fff';
        ctx.font = '10px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(`${currentHP}/${this.maxHP}`, this.x, barY + 8);

        // Show control message if neutral with some HP
        if (this.team === 'NONE' && currentHP > 0) {
            ctx.fillStyle = '#888';
            ctx.fillText(`Need 100 to control`, this.x, barY + 20);
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

        // Mission tracking
        this.missionTarget = null; // Can be {x, y} for coordinates or a Planet reference
        this.missionIsAbsorbable = false; // True if mission target is enemy, neutral, or non-maxed friendly planet
    }

    get color() {
        return TEAMS[this.team];
    }

    setTarget(x, y, planets = []) {
        this.state = 'moving';
        this.targetX = x;
        this.targetY = y;
        this.orbitPlanet = null;

        // Set mission and determine if it's absorbable
        this.missionTarget = { x, y };
        this.missionIsAbsorbable = false;

        // Check if mission is to a planet
        for (const planet of planets) {
            const dist = distance(x, y, planet.x, planet.y);
            if (dist < planet.radius) {
                this.missionTarget = planet;
                // Mission is absorbable if: enemy, neutral, or friendly but not at max HP
                this.missionIsAbsorbable =
                    planet.team !== this.team || // Enemy or neutral
                    planet.hpByTeam[this.team] < planet.maxHP; // Friendly but not maxed
                break;
            }
        }
    }

    update(deltaTime, planets) {
        if (this.dead) return;

        const dt = deltaTime / 1000;

        if (this.state === 'orbiting' && this.orbitPlanet) {
            // Orbit around planet at its orbit radius
            this.orbitAngle += CONFIG.ORBIT_SPEED * dt;
            this.x = this.orbitPlanet.x + Math.cos(this.orbitAngle) * this.orbitPlanet.orbitRadius;
            this.y = this.orbitPlanet.y + Math.sin(this.orbitAngle) * this.orbitPlanet.orbitRadius;
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
            this.vx *= CONFIG.FREE_FLOAT_DECELERATION;
            this.vy *= CONFIG.FREE_FLOAT_DECELERATION;
            this.x += this.vx * dt;
            this.y += this.vy * dt;
        }

        // Check for orbit capture by friendly planets (but not if moving to a target)
        if (this.state !== 'orbiting' && this.state !== 'moving') {
            for (const planet of planets) {
                if (planet.team === this.team) {
                    const dist = distance(this.x, this.y, planet.x, planet.y);
                    if (dist < planet.orbitRadius && dist > planet.radius) {
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
                // Find which team currently has HP on this planet
                let currentTeamWithHP = null;
                for (const [team, hp] of Object.entries(planet.hpByTeam)) {
                    if (hp > 0) {
                        currentTeamWithHP = team;
                        break;
                    }
                }

                // Check if planet is at max HP
                const isAtMaxHP = planet.hpByTeam[this.team] >= planet.maxHP;

                if (currentTeamWithHP === this.team && isAtMaxHP) {
                    // Friendly planet at max HP - inherit its routing
                    if (planet.routeTarget === planet) {
                        // Self-routed: enter orbit
                        if (this.state !== 'orbiting') {
                            this.state = 'orbiting';
                            this.orbitPlanet = planet;
                            this.orbitAngle = Math.atan2(this.y - planet.y, this.x - planet.x);
                        }
                    } else if (planet.routeTarget) {
                        // Routed to another planet or coordinates: adopt that route
                        // routeTarget can be a Planet or coordinates {x, y}
                        this.setTarget(planet.routeTarget.x, planet.routeTarget.y, planets);
                    }
                    // Don't die - continue with new mission
                } else {
                    // Not at max HP - proceed with normal interaction
                    if (currentTeamWithHP === null) {
                        // No team has HP - add to this photon's team
                        planet.addHP(this.team, 1);
                    } else if (currentTeamWithHP === this.team) {
                        // Same team - add HP
                        planet.addHP(this.team, 1);
                    } else {
                        // Different team - reduce their HP
                        planet.addHP(currentTeamWithHP, -1);
                        // If we brought them to 0, start building our HP
                        if (planet.hpByTeam[currentTeamWithHP] === 0) {
                            planet.addHP(this.team, 1);
                        }
                    }

                    this.dead = true;
                }
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
        this.dragSourcePlanet = null; // Planet where drag started

        this.lastTime = performance.now();
        this.lastPulseCheck = 0;
        this.gameTime = 0; // Game time in milliseconds (affected by speed)

        // Stats tracking
        this.stats = {
            history: [],
            lastLogTime: 0 // Use game time for stats
        };
        this.gameActive = true;
        this.gameSpeed = 1; // 1x, 2x, or 10x

        this.setupEventListeners();
        this.generatePlanets();
        this.setGameSpeed(1); // Initialize speed button state
        this.gameLoop();
    }

    setGameSpeed(speed) {
        this.gameSpeed = speed;
        // Update button states
        ['1x', '2x', '10x'].forEach(s => {
            const btn = document.getElementById(`speed${s}`);
            if (btn) {
                btn.style.background = s === `${speed}x` ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.5)';
            }
        });
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    getPlanetAtPosition(x, y) {
        for (const planet of this.planets) {
            if (distance(x, y, planet.x, planet.y) <= planet.radius) {
                return planet;
            }
        }
        return null;
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.resizeCanvas());

        this.canvas.addEventListener('mousedown', (e) => {
            this.mouseDown = true;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            this.dragCurrentX = e.clientX;
            this.dragCurrentY = e.clientY;

            // Check if starting drag from a planet
            this.dragSourcePlanet = this.getPlanetAtPosition(e.clientX, e.clientY);
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
                const targetPlanet = this.getPlanetAtPosition(e.clientX, e.clientY);

                // Check for planet routing (to planet or empty space)
                if (this.dragSourcePlanet && dragDist > 10) {
                    if (targetPlanet) {
                        // Set up route to target planet (including self)
                        this.dragSourcePlanet.routeTarget = targetPlanet;
                    } else {
                        // Check if close to any planet (snapping)
                        let closestPlanet = null;
                        let closestDist = 50; // Snap radius
                        for (const planet of this.planets) {
                            const dist = distance(e.clientX, e.clientY, planet.x, planet.y);
                            if (dist < closestDist) {
                                closestDist = dist;
                                closestPlanet = planet;
                            }
                        }
                        // If close enough to a planet, snap to it; otherwise route to coordinates
                        this.dragSourcePlanet.routeTarget = closestPlanet || { x: e.clientX, y: e.clientY };
                    }
                } else if (dragDist > 10 && !this.dragSourcePlanet) {
                    // Drag selection (only if not dragging from a planet)
                    // Center circle halfway between start and end points
                    const centerX = (this.dragStartX + e.clientX) / 2;
                    const centerY = (this.dragStartY + e.clientY) / 2;
                    // Use dragDist / 2 as radius (dragDist is diameter)
                    this.selectPhotonsInCircle(centerX, centerY, dragDist / 2);
                } else if (dragDist <= 10) {
                    // Click - check what to do
                    if (this.selectedPhotons.size > 0) {
                        // Move selected photons (priority over route clearing)
                        for (const photon of this.selectedPhotons) {
                            photon.setTarget(e.clientX, e.clientY, this.planets);
                        }
                    } else if (this.dragSourcePlanet) {
                        // Toggle self-routing if clicking on same planet
                        this.dragSourcePlanet.routeTarget = this.dragSourcePlanet.routeTarget === this.dragSourcePlanet ? null : this.dragSourcePlanet;
                    }
                }
            }
            this.mouseDown = false;
            this.dragSourcePlanet = null;
        });
    }

    generatePlanets() {
        const teams = ['RED', 'GREEN', 'BLUE'];

        // Generate home planets for each team (all start at potential 3, HP 100)
        for (let i = 0; i < teams.length; i++) {
            const angle = (Math.PI * 2 * i) / teams.length;
            const dist = Math.min(this.canvas.width, this.canvas.height) * 0.3;
            const x = this.canvas.width / 2 + Math.cos(angle) * dist;
            const y = this.canvas.height / 2 + Math.sin(angle) * dist;
            const initialHP = 100;
            const maxPotential = 3; // All home planets have potential 3

            const planet = new Planet(x, y, initialHP, teams[i], maxPotential);
            planet.isHome = true;
            planet.routeTarget = planet; // Default to self-routing
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
                const initialHP = 0;
                const maxPotential = Math.floor(randomRange(1, 4));
                const planet = new Planet(x, y, initialHP, 'NONE', maxPotential);
                planet.routeTarget = planet; // Default to self-routing
                this.planets.push(planet);
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
            if (p1.dead) continue;

            for (let j = i + 1; j < this.photons.length; j++) {
                const p2 = this.photons[j];
                if (p2.dead) continue;

                const dist = distance(p1.x, p1.y, p2.x, p2.y);

                if (p1.team !== p2.team) {
                    // Enemy photons attract and collide
                    // Exception: Don't apply pull if photon is on mission to absorbable planet
                    if (dist < CONFIG.ENEMY_ATTRACTION_RANGE) {
                        const dx = p2.x - p1.x;
                        const dy = p2.y - p1.y;
                        const force = CONFIG.ENEMY_ATTRACTION_FORCE / (dist + 1);

                        // Apply force to p1 if: not orbiting AND (no mission OR mission not absorbable)
                        if (p1.state !== 'orbiting' && !p1.missionIsAbsorbable) {
                            p1.vx += (dx / dist) * force;
                            p1.vy += (dy / dist) * force;
                        }

                        // Apply force to p2 if: not orbiting AND (no mission OR mission not absorbable)
                        if (p2.state !== 'orbiting' && !p2.missionIsAbsorbable) {
                            p2.vx -= (dx / dist) * force;
                            p2.vy -= (dy / dist) * force;
                        }

                        // Collision - neutralize
                        if (dist < CONFIG.ENEMY_COLLISION_DISTANCE) {
                            p1.dead = true;
                            p2.dead = true;
                        }
                    }
                } else {
                    // Friendly photons repel slightly to prevent dense clusters
                    if (dist < CONFIG.FRIENDLY_REPULSION_RANGE && p1.state !== 'orbiting' && p2.state !== 'orbiting') {
                        const dx = p2.x - p1.x;
                        const dy = p2.y - p1.y;
                        const force = CONFIG.FRIENDLY_REPULSION_FORCE / (dist + 1);

                        p1.vx -= (dx / dist) * force;
                        p1.vy -= (dy / dist) * force;
                        p2.vx += (dx / dist) * force;
                        p2.vy += (dy / dist) * force;
                    }
                }
            }
        }
    }

    update(deltaTime) {
        // Increment game time (already multiplied by speed in gameLoop)
        this.gameTime += deltaTime;

        // Update planets
        for (const planet of this.planets) {
            planet.update(deltaTime);
        }

        // Pulse planets (using game time)
        if (this.gameTime - this.lastPulseCheck > 100) {
            this.lastPulseCheck = this.gameTime;
            for (const planet of this.planets) {
                const newPhotons = planet.pulse(this.gameTime);
                // Set targets for routed photons
                for (const photon of newPhotons) {
                    if (photon.routeTargetPlanet) {
                        // routeTargetPlanet can be a Planet or coordinates {x, y}
                        const target = photon.routeTargetPlanet;
                        photon.setTarget(target.x, target.y, this.planets);
                        delete photon.routeTargetPlanet;
                    }
                }
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

        // Log stats every second (using game time)
        if (this.gameTime - this.stats.lastLogTime >= 1000) {
            this.logStats(this.gameTime);
            this.stats.lastLogTime = this.gameTime;
        }

        // Check for home planet transfers and auto self-routing
        this.manageHomePlanets();

        // Check for game end
        this.checkGameEnd();

        // Update UI
        this.updateUI();
    }

    manageHomePlanets() {
        const teams = ['RED', 'GREEN', 'BLUE'];

        for (const team of teams) {
            const teamPlanets = this.planets.filter(p => p.team === team);
            const homePlanet = teamPlanets.find(p => p.isHome);

            // If home planet lost, transfer home status to largest potential planet
            if (!homePlanet && teamPlanets.length > 0) {
                const newHome = teamPlanets.reduce((max, p) => p.maxPotential > max.maxPotential ? p : max, teamPlanets[0]);
                newHome.isHome = true;
            }

            // If down to one planet with HP < 100, set to self-routing
            if (teamPlanets.length === 1) {
                const lastPlanet = teamPlanets[0];
                if (lastPlanet.hp < 100 && lastPlanet.routeTarget !== lastPlanet) {
                    lastPlanet.routeTarget = lastPlanet;
                }
            }
        }
    }

    checkGameEnd() {
        if (!this.gameActive) return;

        const teams = ['RED', 'GREEN', 'BLUE'];
        const activePlayers = teams.filter(team => {
            return this.planets.some(p => p.team === team);
        });

        if (activePlayers.length === 1) {
            this.gameActive = false;
            setTimeout(() => {
                alert(`${activePlayers[0]} wins!`);
                this.showStats();
            }, 500);
        }
    }

    logStats(gameTime) {
        const counts = {
            RED: { planets: 0, photons: 0 },
            GREEN: { planets: 0, photons: 0 },
            BLUE: { planets: 0, photons: 0 }
        };

        // Count planets
        for (const planet of this.planets) {
            if (planet.team !== 'NONE') {
                counts[planet.team].planets++;
            }
        }

        // Count photons
        for (const photon of this.photons) {
            counts[photon.team].photons++;
        }

        this.stats.history.push({
            time: Math.floor(gameTime / 1000), // Game time in seconds
            ...counts
        });
    }

    showStats() {
        const overlay = document.getElementById('statsOverlay');
        overlay.style.display = 'block';

        const canvas = document.getElementById('statsChart');
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const padding = 50;

        // Clear canvas
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, width, height);

        if (this.stats.history.length < 2) {
            ctx.fillStyle = '#fff';
            ctx.font = '16px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText('Not enough data yet - play for a while!', width / 2, height / 2);
            return;
        }

        // Find max values for scaling
        let maxPlanets = 0;
        let maxPhotons = 0;
        for (const entry of this.stats.history) {
            maxPlanets = Math.max(maxPlanets, entry.RED.planets + entry.GREEN.planets + entry.BLUE.planets);
            maxPhotons = Math.max(maxPhotons, entry.RED.photons, entry.GREEN.photons, entry.BLUE.photons);
        }

        const maxTime = this.stats.history[this.stats.history.length - 1].time;

        // Draw axes
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();

        // Draw legend
        ctx.font = '12px Courier New';
        ctx.textAlign = 'left';
        const legendX = width - 150;
        const legendY = padding;

        ctx.fillStyle = TEAMS.RED;
        ctx.fillRect(legendX, legendY, 20, 10);
        ctx.fillStyle = '#fff';
        ctx.fillText('Red Photons', legendX + 25, legendY + 10);

        ctx.fillStyle = TEAMS.GREEN;
        ctx.fillRect(legendX, legendY + 20, 20, 10);
        ctx.fillStyle = '#fff';
        ctx.fillText('Green Photons', legendX + 25, legendY + 30);

        ctx.fillStyle = TEAMS.BLUE;
        ctx.fillRect(legendX, legendY + 40, 20, 10);
        ctx.fillStyle = '#fff';
        ctx.fillText('Blue Photons', legendX + 25, legendY + 50);

        // Draw planet counts
        ctx.fillStyle = '#fff';
        ctx.fillText('Planets: ', legendX, legendY + 80);
        let planetY = legendY + 100;
        const lastEntry = this.stats.history[this.stats.history.length - 1];
        ctx.fillStyle = TEAMS.RED;
        ctx.fillText(`Red: ${lastEntry.RED.planets}`, legendX, planetY);
        planetY += 20;
        ctx.fillStyle = TEAMS.GREEN;
        ctx.fillText(`Green: ${lastEntry.GREEN.planets}`, legendX, planetY);
        planetY += 20;
        ctx.fillStyle = TEAMS.BLUE;
        ctx.fillText(`Blue: ${lastEntry.BLUE.planets}`, legendX, planetY);

        // Draw photon count lines
        const teams = ['RED', 'GREEN', 'BLUE'];
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;

        for (const team of teams) {
            ctx.strokeStyle = TEAMS[team];
            ctx.lineWidth = 2;
            ctx.beginPath();

            for (let i = 0; i < this.stats.history.length; i++) {
                const entry = this.stats.history[i];
                const x = padding + (entry.time / maxTime) * chartWidth;
                const y = height - padding - (entry[team].photons / maxPhotons) * chartHeight;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }

            ctx.stroke();
        }

        // Labels
        ctx.fillStyle = '#fff';
        ctx.font = '14px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('Time (seconds)', width / 2, height - 10);

        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Photon Count', 0, 0);
        ctx.restore();
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

        // Draw routes (to planets or coordinates)
        for (const planet of this.planets) {
            if (planet.routeTarget) {
                this.ctx.strokeStyle = planet.color;
                this.ctx.globalAlpha = 0.4;
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                this.ctx.moveTo(planet.x, planet.y);
                this.ctx.lineTo(planet.routeTarget.x, planet.routeTarget.y);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
                this.ctx.globalAlpha = 1;

                // Draw arrow at the end
                const dx = planet.routeTarget.x - planet.x;
                const dy = planet.routeTarget.y - planet.y;
                const angle = Math.atan2(dy, dx);
                const arrowSize = 10;
                // If routeTarget is a Planet, offset by radius; otherwise use exact coordinates
                const targetRadius = planet.routeTarget.radius || 0;
                const endX = planet.routeTarget.x - Math.cos(angle) * targetRadius;
                const endY = planet.routeTarget.y - Math.sin(angle) * targetRadius;

                this.ctx.fillStyle = planet.color;
                this.ctx.globalAlpha = 0.6;
                this.ctx.beginPath();
                this.ctx.moveTo(endX, endY);
                this.ctx.lineTo(
                    endX - Math.cos(angle - Math.PI / 6) * arrowSize,
                    endY - Math.sin(angle - Math.PI / 6) * arrowSize
                );
                this.ctx.lineTo(
                    endX - Math.cos(angle + Math.PI / 6) * arrowSize,
                    endY - Math.sin(angle + Math.PI / 6) * arrowSize
                );
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.globalAlpha = 1;

                // If routing to empty space (not a planet), draw a target marker
                if (!planet.routeTarget.radius) {
                    this.ctx.strokeStyle = planet.color;
                    this.ctx.globalAlpha = 0.6;
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.arc(planet.routeTarget.x, planet.routeTarget.y, 8, 0, Math.PI * 2);
                    this.ctx.stroke();
                    this.ctx.beginPath();
                    this.ctx.moveTo(planet.routeTarget.x - 12, planet.routeTarget.y);
                    this.ctx.lineTo(planet.routeTarget.x + 12, planet.routeTarget.y);
                    this.ctx.moveTo(planet.routeTarget.x, planet.routeTarget.y - 12);
                    this.ctx.lineTo(planet.routeTarget.x, planet.routeTarget.y + 12);
                    this.ctx.stroke();
                    this.ctx.globalAlpha = 1;
                }
            }
        }

        // Draw planets
        for (const planet of this.planets) {
            planet.draw(this.ctx);
        }

        // Draw photons
        for (const photon of this.photons) {
            photon.draw(this.ctx);
        }

        // Draw selection circle or planet-to-planet drag line
        if (this.mouseDown) {
            if (this.dragSourcePlanet) {
                // Draw line from source planet to current mouse position
                const targetPlanet = this.getPlanetAtPosition(this.dragCurrentX, this.dragCurrentY);
                this.ctx.strokeStyle = this.dragSourcePlanet.color;
                this.ctx.globalAlpha = 0.5;
                this.ctx.lineWidth = 3;
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                this.ctx.moveTo(this.dragSourcePlanet.x, this.dragSourcePlanet.y);
                this.ctx.lineTo(this.dragCurrentX, this.dragCurrentY);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
                this.ctx.globalAlpha = 1;

                // Highlight target planet if hovering over one
                if (targetPlanet && targetPlanet !== this.dragSourcePlanet) {
                    this.ctx.strokeStyle = '#fff';
                    this.ctx.lineWidth = 3;
                    this.ctx.beginPath();
                    this.ctx.arc(targetPlanet.x, targetPlanet.y, targetPlanet.radius + 5, 0, Math.PI * 2);
                    this.ctx.stroke();
                }
            } else {
                // Draw selection circle centered between start and current drag points
                const diameter = distance(this.dragStartX, this.dragStartY, this.dragCurrentX, this.dragCurrentY);
                const radius = diameter / 2;
                const centerX = (this.dragStartX + this.dragCurrentX) / 2;
                const centerY = (this.dragStartY + this.dragCurrentY) / 2;
                this.ctx.strokeStyle = '#fff';
                this.ctx.globalAlpha = 0.3;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.globalAlpha = 1;
            }
        }
    }

    gameLoop() {
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) * this.gameSpeed; // Apply speed multiplier
        this.lastTime = currentTime;

        // Update FPS
        const fps = Math.round(1000 / (deltaTime / this.gameSpeed));
        document.getElementById('fps').textContent = fps;

        this.update(deltaTime);
        this.draw();

        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game and make it globally accessible
window.game = new Game();
