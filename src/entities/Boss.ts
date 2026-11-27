import {Scene} from 'phaser';
import type {BossData} from '../gameData/BossData.ts';
import type {BulletData} from '../gameData/BulletData.ts';
import Entity from './Entity.ts';
import Health from "../components/Health.ts";
import Movement from "../components/Movement.ts";
import Weapon from "../components/Weapon.ts";

export default class Boss extends Entity {
    private readonly _originX: number;
    private _config: BossData;
    private _tint: number;
    private _shootTimer: Phaser.Time.TimerEvent;

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, 'sprites', 'ufoRed');

        this._originX = x;
        this.angle = 90;
    }

    // Everything that can be tuned comes from boss.json
    public init(bulletsGroup: Phaser.Physics.Arcade.Group, config: BossData) {
        this._config = config;

        // Same sprite as the regular enemy, but bigger and tinted to make it visually different
        this._tint = Phaser.Display.Color.HexStringToColor(config.tint).color;
        this.setScale(config.scale).setTint(this._tint);

        const bulletData: BulletData = {
            ...config.attack.bullet,
            color: Phaser.Display.Color.HexStringToColor(config.attack.bullet.color).color
        };

        const health = new Health(config.health, this);
        this.addComponent(health);
        this.addComponent(new Movement(config.movement.speed));
        this.addComponent(new Weapon(bulletsGroup, bulletData));

        // Unscaled radius: check the hitbox with `debug: true` in the arcade config of main.ts
        this.arcadeBody.setCircle(this.width / 2);

        health.on(Health.CHANGE_EVENT, () => {
            this.setTintFill(0xffffff);

            this.scene.time.delayedCall(50, () => {
                // The boss may have been destroyed during the flash
                if (this.active)
                    this.setTint(this._tint);
            });
        });

        health.once(Health.DEATH_EVENT, () => {
            this.destroy();
        });

        this._shootTimer = this.scene.time.addEvent({
            delay: config.attack.delay,
            callback: () => {
                this.getComponent(Weapon)?.shootSpread(this, config.attack.bulletCount, config.attack.spreadAngle);
                this.scene.sound.play('sfx_laser2');
            },
            loop: true
        });

        // Whatever the reason (killed, left the screen), stop shooting once the boss is gone
        this.once(Phaser.GameObjects.Events.DESTROY, () => {
            this._shootTimer.remove();
        });
    }

    preUpdate(timeSinceLaunch: number, deltaTime: number) {
        super.preUpdate(timeSinceLaunch, deltaTime);

        if (!this._config)
            return;

        const movement = this.getComponent(Movement);
        const movementData = this._config.movement;

        // Same direction as the regular enemies: always going down...
        movement?.moveVertically(this, deltaTime);
        // ...while swinging left and right around the spawn column
        movement?.moveSinusoidally(this, this._originX, movementData.amplitude, movementData.frequency, deltaTime);

        // Out of screen: the boss is gone
        if (this.y > this.scene.cameras.main.height + this.displayHeight) {
            this.destroy();
        }
    }
}