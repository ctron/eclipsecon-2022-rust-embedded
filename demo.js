class Points {

    hits;
    bugs;
    #label;

    constructor(scene) {
        this.hits = 0;
        this.bugs = 0;
        this.#label = scene.add.bitmapText(20, scene.physics.world.bounds.height - 120, "font", "");
        this.#updateLabel();
    }

    addHit() {
        this.hits += 1;
        this.#updateLabel();
    }

    addBugs(inc) {
        this.bugs += inc;
        this.#updateLabel();
    }

    #updateLabel() {
        this.#label.setText(`Bugs: ${this.bugs} Hits: ${this.hits}`);
    }

}

class Bullet extends Phaser.Physics.Arcade.Image {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
    }

    fire(x, y) {
        this.body.reset(x, y);

        this.setActive(true);
        this.setVisible(true);

        this.setVelocityY(-300);
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (this.y <= -32) {
            this.kill();
        }
    }

    kill() {
        this.setActive(false);
        this.setVisible(false);
    }
}

class Bullets extends Phaser.Physics.Arcade.Group {
    constructor(scene) {
        super(scene.physics.world, scene);

        this.createMultiple({
            frameQuantity: 5,
            key: 'bullet',
            active: false,
            visible: false,
            classType: Bullet,
        }).forEach(b => {
            b.scaleX = 4; b.scaleY = 4;
        });
    }

    fireBullet(x, y) {
        let bullet = this.getFirstDead(false);

        if (bullet) {
            bullet.fire(x, y);
        }
    }
}

class Target extends Phaser.Physics.Arcade.Sprite {
    points;

    constructor(scene, x, y, texture, frame) {
        super(scene, x, y, texture, frame);
        scene.add.existing(this);
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);

        if (this.y >= this.scene.physics.world.bounds.height) {
            this.kill();
            this.points.addBugs(1);
        }
    }

    kill() {
        this.setActive(false);
        this.setVisible(false);
        this.destroy();
    }
}

class Targets extends Phaser.Physics.Arcade.Group {
    #points;

    constructor(scene, points) {
        super(scene.physics.world, scene);
        this.#points = points;
        this.classType = Target;
    }

    spawn(x, y) {
        const target = this.create(x, y);
        target.points = this.#points;
        target.scaleX = 2;
        target.scaleY = 2;
        target.setVelocityY(150);
        target.play("bugs");
    }
}

class DemoScene extends Phaser.Scene {
    #ship;
    #ble;

    maxTargets = 4;

    constructor(ble) {
        super();
        this.#ble = ble;
    }

    preload() {
        this.load.image("ship", new URL("assets/ferris.png", document.baseURI).href);
        this.load.image("bullet", new URL("assets/bullet1.png", document.baseURI).href);
        this.load.spritesheet("target", new URL("assets/bugs1.png", document.baseURI).href, {
            frameWidth: 34, frameHeight: 20, endFrame: 4
        });
        this.load.setBaseURL("https://labs.phaser.io");
        //this.load.image('sky', "assets/skies/space3.png");
        //this.load.image("ship", "assets/sprites/fmship.png");
        //this.load.image("target", "assets/sprites/ufo.png");
        //this.load.image("bullet", "assets/sprites/crate32.png");
        this.load.bitmapFont("font", "assets/fonts/bitmap/carrier_command.png", "assets/fonts/bitmap/carrier_command.xml")
    }

    create() {
        //this.physics.world.setBounds(0, 0, 400, 300);
        this.physics.world.setBoundsCollision(true, true, true, true);

        const sx = this.physics.world.bounds.width / 2;
        const sy = this.physics.world.bounds.height - 200;

        this.#ship = this.physics.add.image(sx, sy, "ship");
        this.#ship.scaleX = 4;
        this.#ship.scaleY = 4;
        this.#ship.setCollideWorldBounds(true);

        this.#ble.externalizeEvents = {
            onButton: (button) => this.#onButton(button),
        };

        this.anims.create({
            key: "bugs",
            frames: this.anims.generateFrameNumbers("target", {start: 0, end: 4}),
            frameRate: 3,
            repeat: -1
        });

        this.points = new Points(this);

        this.bullets = new Bullets(this);
        this.targets = new Targets(this, this.points);
        this.physics.add.collider(
            this.bullets,
            this.targets,
            (bullet, target) => {
                bullet.kill();
                target.kill();
                this.points.addHit();
            },
        );
        this.physics.add.collider(
            this.#ship,
            this.targets,
            (o1, o2) => {},
            (o1, o2) => {
                if (o1 instanceof Target) {
                    o1.kill();
                }
                if (o2 instanceof Target) {
                    o2.kill();
                }
                this.points.addBugs(5);
                return false;
            }
        )

        this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                this.checkSpawn();
            }
        })
    }

    fire() {
        const sx = this.#ship.body.x + this.#ship.body.width / 2;
        const sy = this.#ship.body.y;

        this.bullets.fireBullet(sx, sy);
    }

    spawn() {
        let start = this.physics.world.bounds.width * Math.random() * 0.8;

        this.targets.spawn(start, 100);
    }

    checkSpawn() {
        const num = this.targets.getLength();
        //console.debug("Check spawn", num);
        if (num < this.maxTargets) {
            if (Math.random() < 0.75) {
                this.spawn();
            }
        }
    }

    #onButton(button) {
        if (button === "a") {
            this.fire();
        }
    }

    update() {

        const a = this.#ble.acceleration;

        if (a !== null) {
            this.#ship.setVelocityX(a.x / 2.0);
        }
    }
}

class Demo {
    #target;
    #disposed;
    #game;
    #ble;

    constructor(target) {
        this.#target = target;

        console.log("Start demo");
        this.#init();
    }

    #init() {
        this.#ble = Reveal.getConfig().ble;
        this.#game = new Phaser.Game({
            type: Phaser.AUTO,
            //canvas: this.#target,
            parent: "demo",
            pixelArt: true,
            physics: {
                default: 'arcade',
            },
            scene: new DemoScene(this.#ble),
        });
    }

    dispose() {
        this.#disposed = true;
        this.#ble.externalizeEvents = undefined;
        console.log("End demo");
        this.#game.destroy({
            removeCanvas: false
        });
    }
}
