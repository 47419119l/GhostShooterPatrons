/// <reference path="phaser/phaser.d.ts"/>
/// <reference path="joypad/GamePad.ts"/>

class mainState extends Phaser.State {
    private factoryMonster:FactoryMonstruos;
    private player:Player;
    private cursors:Phaser.CursorKeys;
    private bullets:Phaser.Group;
    private tilemap:Phaser.Tilemap;
    private background:Phaser.TilemapLayer;
    private walls:Phaser.TilemapLayer;
    private monsters:Phaser.Group;
    private explosions:Phaser.Group;
    private scoreText:Phaser.Text;
    private livesText:Phaser.Text;
    private stateText:Phaser.Text;
    private gamepad:Gamepads.GamePad;
    private displayVidas:DisplayVidas;


    private PLAYER_ACCELERATION = 500;
    private MONSTER_SPEED = 100;
    private BULLET_SPEED = 800;
    private FIRE_RATE = 200;
    private TEXT_MARGIN = 50;
    private nextFire = 0;
    private score = 0;


    preload():void {
        super.preload();

        this.load.image('bg', 'assets/bg.png');
        this.load.image('player', 'assets/survivor1_machine.png');
        this.load.image('bullet', 'assets/bulletBeigeSilver_outline.png');
        this.load.image('zombie1', 'assets/zoimbie1_hold.png');
        this.load.image('zombie2', 'assets/zombie2_hold.png');
        this.load.image('robot', 'assets/robot1_hold.png');

        this.load.image('explosion', 'assets/smokeWhite0.png');
        this.load.image('explosion2', 'assets/smokeWhite1.png');
        this.load.image('explosion3', 'assets/smokeWhite2.png');
        this.load.tilemap('tilemap', 'assets/tiles.json', null, Phaser.Tilemap.TILED_JSON);
        this.load.image('tiles', 'assets/tilesheet_complete.png');

        this.load.image('joystick_base', 'assets/transparentDark05.png');
        this.load.image('joystick_segment', 'assets/transparentDark09.png');
        this.load.image('joystick_knob', 'assets/transparentDark49.png');

        this.physics.startSystem(Phaser.Physics.ARCADE);

        if (this.game.device.desktop) {
            this.cursors = this.input.keyboard.createCursorKeys();
        } else {
            this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
            this.scale.pageAlignHorizontally = true;
            this.scale.pageAlignVertically = true;
            this.scale.pageAlignHorizontally = true;
            this.scale.pageAlignVertically = true;
            this.scale.forceOrientation(true);
            this.scale.startFullScreen(false);
        }
    }

    create():void {
        super.create();

        this.createTilemap();
        this.createBackground();
        this.createWalls();
        this.createExplosions();
        this.createBullets();
        this.createPlayer();
        this.setupCamera();
        this.createMonsters();

        //funciones comentadas, nueva ubicación en -> createPlayer();
        this.createTexts();
        this.displayVidas = new DisplayVidas(this.player,this.livesText);
        if (!this.game.device.desktop) {
            this.createVirtualJoystick();
        }
    }

    private createTexts() {
        var width = this.scale.bounds.width;
        var height = this.scale.bounds.height;

        this.scoreText = this.add.text(this.TEXT_MARGIN, this.TEXT_MARGIN, 'Score: ' + this.score,
            {font: "30px Arial", fill: "#ffffff"});
        this.scoreText.fixedToCamera = true;
        this.livesText = this.add.text(width - this.TEXT_MARGIN, this.TEXT_MARGIN, 'Lives: ' + this.player.health,
            {font: "30px Arial", fill: "#ffffff"});
        this.livesText.anchor.setTo(1, 0);
        this.livesText.fixedToCamera = true;

        this.stateText = this.add.text(width / 2, height / 2, '', {font: '84px Arial', fill: '#fff'});
        this.stateText.anchor.setTo(0.5, 0.5);
        this.stateText.visible = false;
        this.stateText.fixedToCamera = true;
    };
    private createExplosions() {
        this.explosions = this.add.group();
        this.explosions.createMultiple(20, 'explosion');

        this.explosions.setAll('anchor.x', 0.5);
        this.explosions.setAll('anchor.y', 0.5);

        this.explosions.forEach((explosion:Phaser.Sprite) => {
            explosion.loadTexture(this.rnd.pick(['explosion', 'explosion2', 'explosion3']));
        }, this);
    };
    private createWalls() {
        this.walls = this.tilemap.createLayer('walls');
        this.walls.x = this.world.centerX;
        this.walls.y = this.world.centerY;

        this.walls.resizeWorld();

        this.tilemap.setCollisionBetween(1, 195, true, 'walls');
    };
    private createBackground() {
        this.background = this.tilemap.createLayer('background');
        this.background.x = this.world.centerX;
        this.background.y = this.world.centerY;
    };
    private createTilemap() {
        this.tilemap = this.game.add.tilemap('tilemap');
        this.tilemap.addTilesetImage('tilesheet_complete', 'tiles');

    };
    private createMonsters() {
        this.monsters = this.add.group();
        this.monsters.enableBody = true;
        this.monsters.physicsBodyType = Phaser.Physics.ARCADE;

        this.factoryMonster = new FactoryMonstruos();
        var tmpMonster;
        for (var i = 0; i < 35; i++){
            tmpMonster = this.factoryMonster.crearMonstruo(this.game, this.rnd.pick(['zombie1', 'zombie2', 'robot']));
            this.monsters.add(tmpMonster);
        }
        this.monsters.setAll('checkWorldBounds', true);
        this.monsters.callAll('events.onOutOfBounds.add', 'events.onOutOfBounds', this.resetMonster, this);
    };
    private resetMonster(monster:Phaser.Sprite) {
        monster.rotation = this.physics.arcade.angleBetween(
            monster,
            this.player
        );
    }
    private createBullets() {
        this.bullets = this.add.group();
        this.bullets.enableBody = true;
        this.bullets.physicsBodyType = Phaser.Physics.ARCADE;
        this.bullets.createMultiple(20, 'bullet');

        this.bullets.setAll('anchor.x', 0.5);
        this.bullets.setAll('anchor.y', 0.5);
        this.bullets.setAll('scale.x', 0.5);
        this.bullets.setAll('scale.y', 0.5);
        this.bullets.setAll('outOfBoundsKill', true);
        this.bullets.setAll('checkWorldBounds', true);
    };
    private createVirtualJoystick() {
        this.gamepad = new Gamepads.GamePad(this.game, Gamepads.GamepadType.DOUBLE_STICK);
    };

    private setupCamera() {
        this.camera.follow(this.player);
    };

    private createPlayer() {
        /**
         * Al Webstorm surt com si hi hagues un error pero despres al compilar funciona correctement.
         * També es podria fer així perque no dongues error :
         *
         *  var jugadorNormal = new PlayerNormal(this.game, null);
         *  var casco = new Casco(this.game, jugadorNormal, null);
         *  casco.setHealth();
         *  jugadorNormal = casco.player;
         *  this.player = this.add.existing(jugadorNormal);
         *
         */
        var jugadorNormal = new PlayerNormal(this.game, null);
        jugadorNormal = new Casco(this.game, jugadorNormal, null);
        jugadorNormal.setHealth();
        jugadorNormal = jugadorNormal.player;
        this.player = this.add.existing(jugadorNormal);



    };

    update():void {
        super.update();
        this.movePlayer();
        this.moveMonsters();
        if (this.game.device.desktop) {
            this.rotatePlayerToPointer();
            this.fireWhenButtonClicked();
        } else {
            this.rotateWithRightStick();
            this.fireWithRightStick();
        }

        this.physics.arcade.collide(this.player, this.monsters, this.monsterTouchesPlayer, null, this);
        this.physics.arcade.collide(this.player, this.walls);
        this.physics.arcade.overlap(this.bullets, this.monsters, this.bulletHitMonster, null, this);
        this.physics.arcade.collide(this.bullets, this.walls, this.bulletHitWall, null, this);
        this.physics.arcade.collide(this.walls, this.monsters, this.resetMonster, null, this);
        this.physics.arcade.collide(this.monsters, this.monsters, this.resetMonster, null, this);
    }
    rotateWithRightStick() {
        var speed = this.gamepad.stick2.speed;

        if (Math.abs(speed.x) + Math.abs(speed.y) > 20) {
            var rotatePos = new Phaser.Point(this.player.x + speed.x, this.player.y + speed.y);
            this.player.rotation = this.physics.arcade.angleToXY(this.player, rotatePos.x, rotatePos.y);

            this.fire();
        }
    }
    fireWithRightStick() {
        //this.gamepad.stick2.
    }
    private monsterTouchesPlayer(player:Player, monster:Phaser.Sprite) {

        monster.kill();

        player.damage(1);

        player.notifica();//cuando el monstruo toca al jugador, notifica usando el patrón observer
        /**
         * Cridant al display per que mostri les vides.
         */
        this.displayVidas.display();
        this.blink(player);

        if (player.health == 0) {
            this.stateText.text = " GAME OVER \n Click to restart";
            this.stateText.visible = true;

            //the "click to restart" handler
            this.input.onTap.addOnce(this.restart, this);
        }
    }
    restart() {
        this.game.state.restart();
    }
    private bulletHitWall(bullet:Phaser.Sprite, walls:Phaser.TilemapLayer) {
        this.explosion(bullet.x, bullet.y);
        bullet.kill();
    }
    private bulletHitMonster(bullet:Phaser.Sprite, monster:Phaser.Sprite) {
        bullet.kill();
        monster.damage(1);


        this.explosion(bullet.x, bullet.y);

        if (monster.health > 0) {
            this.blink(monster)
        } else {
            this.score += 10;
            this.scoreText.setText("Score: " + this.score);
        }
    }
    blink(sprite:Phaser.Sprite) {
        var tween = this.add.tween(sprite)
            .to({alpha: 0.5}, 100, Phaser.Easing.Bounce.Out)
            .to({alpha: 1.0}, 100, Phaser.Easing.Bounce.Out);

        tween.repeat(3);
        tween.start();
    }
    private moveMonsters() {
        this.monsters.forEach(this.advanceStraightAhead, this)
    };
    private advanceStraightAhead(monster:Phaser.Sprite) {
        this.physics.arcade.velocityFromAngle(monster.angle, this.MONSTER_SPEED, monster.body.velocity);
    }
    private fireWhenButtonClicked() {
        if (this.input.activePointer.isDown) {
            this.fire();
        }
    };
    private rotatePlayerToPointer() {
        this.player.rotation = this.physics.arcade.angleToPointer(
            this.player,
            this.input.activePointer
        );
    };
    private movePlayer() {
        var moveWithKeyboard = function () {
            if (this.cursors.left.isDown ||
                this.input.keyboard.isDown(Phaser.Keyboard.A)) {
                this.player.body.acceleration.x = -this.PLAYER_ACCELERATION;
            } else if (this.cursors.right.isDown ||
                this.input.keyboard.isDown(Phaser.Keyboard.D)) {
                this.player.body.acceleration.x = this.PLAYER_ACCELERATION;
            } else if (this.cursors.up.isDown ||
                this.input.keyboard.isDown(Phaser.Keyboard.W)) {
                this.player.body.acceleration.y = -this.PLAYER_ACCELERATION;
            } else if (this.cursors.down.isDown ||
                this.input.keyboard.isDown(Phaser.Keyboard.S)) {
                this.player.body.acceleration.y = this.PLAYER_ACCELERATION;
            } else {
                this.player.body.acceleration.x = 0;
                this.player.body.acceleration.y = 0;
            }
        };

        var moveWithVirtualJoystick = function () {
            if (this.gamepad.stick1.cursors.left) {
                this.player.body.acceleration.x = -this.PLAYER_ACCELERATION;
            }
            if (this.gamepad.stick1.cursors.right) {
                this.player.body.acceleration.x = this.PLAYER_ACCELERATION;
            } else if (this.gamepad.stick1.cursors.up) {
                this.player.body.acceleration.y = -this.PLAYER_ACCELERATION;
            } else if (this.gamepad.stick1.cursors.down) {
                this.player.body.acceleration.y = this.PLAYER_ACCELERATION;
            } else {
                this.player.body.acceleration.x = 0;
                this.player.body.acceleration.y = 0;
            }
        };
        if (this.game.device.desktop) {
            moveWithKeyboard.call(this);
        } else {
            moveWithVirtualJoystick.call(this);
        }
    };
    fire():void {
        if (this.time.now > this.nextFire) {
            var bullet = this.bullets.getFirstDead();
            if (bullet) {
                var length = this.player.width * 0.5 + 20;
                var x = this.player.x + (Math.cos(this.player.rotation) * length);
                var y = this.player.y + (Math.sin(this.player.rotation) * length);

                bullet.reset(x, y);

                this.explosion(x, y);

                bullet.angle = this.player.angle;

                var velocity = this.physics.arcade.velocityFromRotation(bullet.rotation, this.BULLET_SPEED);

                bullet.body.velocity.setTo(velocity.x, velocity.y);

                this.nextFire = this.time.now + this.FIRE_RATE;
            }
        }
    }
    explosion(x:number, y:number):void {
        var explosion:Phaser.Sprite = this.explosions.getFirstDead();
        if (explosion) {
            explosion.reset(
                x - this.rnd.integerInRange(0, 5) + this.rnd.integerInRange(0, 5),
                y - this.rnd.integerInRange(0, 5) + this.rnd.integerInRange(0, 5)
            );
            explosion.alpha = 0.6;
            explosion.angle = this.rnd.angle();
            explosion.scale.setTo(this.rnd.realInRange(0.5, 0.75));

            this.add.tween(explosion.scale).to({x: 0, y: 0}, 500).start();
            var tween = this.add.tween(explosion).to({alpha: 0}, 500);
            tween.onComplete.add(() => {
                explosion.kill();
            });
            tween.start();
        }

    }
}
/**
 *Patró factory : Crea els monstres segons el tipus que hi ha.
 */
/**
 * Segons el parametre que se l'hi introdueix crea un tipus d'objecte o un altre.
 */
class FactoryMonstruos {
    crearMonstruo(game:Phaser.Game,value:String) : Monster{ // Hem de passar per parametres el game perquè sapiga el contexte.
        if(value=='zombie1'){
            return new MonsterZombie(game);
        }else if(value=='zombie2'){
            return new MonsterZombieDos(game)
        }else{
            return new MonsterRobot(game);
        }
    }
}
/**
 * Classe abstracta tipus Monster
 */
abstract class Monster extends Phaser.Sprite {
    game:ShooterGame;

    constructor(game:Phaser.Game, x:number, y:number, key:string|Phaser.RenderTexture|Phaser.BitmapData|PIXI.Texture,VIDES:number){
        super(game, x, y, key, null);
        this.game = game;
        this.game.physics.enable(this, Phaser.Physics.ARCADE);
        this.anchor.setTo(0.5,0.5);
        this.health = VIDES;
        this.angle =  game.rnd.angle();
        this.checkWorldBounds=true;
    }

}
/**
 * Monstre tipus zombie 1
 */
class MonsterZombie extends Monster{
    constructor(game:Phaser.Game){
        super(game,150,150,'zombie1',3);
    }
}
/**
 * Mosntre tipus zombie 2
 */
class MonsterZombieDos extends Monster{
    constructor(game:Phaser.Game){
        super(game,280,120,'zombie2',4);
    }
}
/**
 * Monstre tipus robot
 */
class MonsterRobot extends Monster{
    constructor(game:Phaser.Game){
        super(game,452,235,'robot',5);

    }
}
/**
 * Patró Decorator: El que farem serà crear un patro decorator amb el PLayer de manera que quan l'hi afeguim el Decorator "casco " se li incrementin 10 vides.
 */
abstract class Player extends Phaser.Sprite implements Publicador{// Player també sera utiltizat per fer el publicador per anar comprovant les seves vides.

    private PLAYER_MAX_SPEED = 400; // pixels/second
    private PLAYER_DRAG = 600;
    game:ShooterGame;
    displayVidas:DisplayVidas;

    constructor(game:Phaser.Game, displayVidas:DisplayVidas){
        super(game, game.world.centerX, game.world.centerY, 'player', null);
        this.game = game;
        this.anchor.setTo(0.5, 0.5);
        this.game.physics.enable(this, Phaser.Physics.ARCADE);
        this.body.maxVelocity.setTo(this.PLAYER_MAX_SPEED, this.PLAYER_MAX_SPEED);
        this.body.collideWorldBounds = true;
        this.body.drag.setTo(this.PLAYER_DRAG, this.PLAYER_DRAG);
        this.displayVidas = displayVidas;
    }

    suscriuresObserver(displayVidas) {
        this.displayVidas = displayVidas;
    }

    notifica() {
        this.displayVidas.update(this.health);
    }

}
/**
 * Player normal té 4 vides
 */
class PlayerNormal extends Player {
    constructor(game:Phaser.Game, displayVidas:DisplayVidas){
        super(game, displayVidas);
        this.health = 4;
    }

}
/**
 * Creem la clase abstracta del Decorator
 */
abstract class DecoratorPlayer extends Player{
    constructor(game:Phaser.Game, displayVidas:DisplayVidas){
        super(game, displayVidas);
    }
    abstract setHealth();
}
/**
 * Creem el decorator casco
 */
class Casco extends DecoratorPlayer{
    player:Player;
    constructor(game:Phaser.Game, player:Player, displayVidas:DisplayVidas){
        super(game,displayVidas);
        this.player = player;
    }
    setHealth(){
        this.player.health +=10;
    }
}
/**
 * Patró Observer : Utilitzem al Player com a publicador i anem observant les seves vides per anar mostrant-les per pantalla.
 */
/**
 * Interficie publicador: és el element al que anem observant
 */
interface Publicador{
    suscriuresObserver(element);
    notifica();
}
/**
 * Interficie del observer : és el que va observant al publicador
 */
interface Observer{
    update(vidas:number);
}
/**
 * Interficie Display element : és el que va mostrant les dades.
 */
interface DisplayElement{
    display();
}
/**
 * El displayVidas és el que va observant els notify del publicador i mostrant-los per pantalla (display())
 */
class DisplayVidas implements DisplayElement, Observer{

    player:Player;
    livesText:Phaser.Text;
    lives = 0;

    constructor(player:Player, livesText:Phaser.Text) {
        this.player = player;
        this.livesText = livesText;
        this.player.suscriuresObserver(this);
    }
    update(vidas:number){
        this.lives = vidas;
    }
    display(){
        this.livesText.setText('Lives: ' + this.lives);
    }
}
class ShooterGame extends Phaser.Game {
    constructor() {
        super(800, 480, Phaser.CANVAS, 'gameDiv');
        this.state.add('main', mainState);
        this.state.start('main');
    }
}

window.onload = () => {
    var game = new ShooterGame();
};
