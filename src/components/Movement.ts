import Entity from "../entities/Entity.ts";
import IComponent from "./IComponent.ts";

export default class Movement implements IComponent {
    public enabled: boolean = true;

    private _speed: number = 0;
    private _elapsed: number = 0;

    public constructor(speed?: number) {
        if (speed) {
            this._speed = speed;
        }
    }

    public setSpeed(speed: number) {
        this._speed = speed;
    }

    public moveHorizontally(entity: Entity, deltaTime: number) {
        if (!this.enabled)
            return;

        entity.x += this._speed * deltaTime;
    }

    public moveVertically(entity: Entity, deltaTime: number) {
        if (!this.enabled)
            return;

        entity.y += this._speed * deltaTime;
    }

    public moveSinusoidally(entity: Entity, originX: number, amplitude: number, frequency: number, deltaTime: number) {
        if (!this.enabled)
            return;

        this._elapsed += deltaTime;
        entity.x = originX + amplitude * Math.sin(this._elapsed * frequency);
    }
}