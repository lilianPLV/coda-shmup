import {Physics} from 'phaser';
import {BulletData} from "../gameData/BulletData.ts";
import Bullet from "../entities/Bullet.ts";
import Entity from "../entities/Entity.ts";
import IComponent from "./IComponent.ts";

export default class Weapon implements IComponent {
    public enabled: boolean = true;

    private readonly _bullets: Physics.Arcade.Group;
    private readonly _bulletData: BulletData;

    constructor(bullets: Physics.Arcade.Group, bulletData: BulletData) {
        if (!bullets) {
            console.error("Weapon 'bullets' group cannot be null or undefined");
        }

        this._bullets = bullets;
        this._bulletData = bulletData;
    }

    public shoot(source: Entity) {
        if (!this.enabled)
            return;

        this.fire(source, source.rotation);
    }

    // Fires bulletCount bullets at once, spread over spreadAngle degrees and centered on the forward direction of the source.
    // e.g. (3, 30) = 3 bullets in a 30° cone, (60, 360) = 60 bullets in a full circle
    public shootSpread(source: Entity, bulletCount: number, spreadAngle: number) {
        if (!this.enabled)
            return;

        if (bulletCount <= 1) {
            this.fire(source, source.rotation);
            return;
        }

        // In a full circle, -180° and +180° are the same direction: don't fire twice in it
        const isFullCircle: boolean = spreadAngle >= 360;
        const step: number = isFullCircle ? 360 / bulletCount : spreadAngle / (bulletCount - 1);
        const start: number = isFullCircle ? 0 : -spreadAngle / 2;

        for (let i: number = 0; i < bulletCount; i++) {
            this.fire(source, source.rotation + Phaser.Math.DegToRad(start + i * step));
        }
    }

    // angle in radians (0 = right, like entity.rotation)
    private fire(source: Entity, angle: number) {
        if (!this._bullets)
            return;

        // null when the pool is exhausted: the bullet is simply skipped
        const bullet: Bullet = this._bullets.get() as Bullet;
        if (bullet) {
            // Get forward vector for this angle
            const forward: Phaser.Math.Vector2 = new Phaser.Math.Vector2(1, 0).rotate(angle);
            const bulletVelocity: Phaser.Math.Vector2 = forward.clone().scale(this._bulletData.speed);
            bullet.enable(source.x + forward.x * source.arcadeBody.radius, source.y + forward.y * source.arcadeBody.radius,
                bulletVelocity.x, bulletVelocity.y, this._bulletData);
        }
    }
}