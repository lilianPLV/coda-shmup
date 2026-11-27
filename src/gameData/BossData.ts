export type BossData = {
    health: number;
    scale: number;
    tint: string;
    spawn: BossSpawnData;
    movement: BossMovementData;
    attack: BossAttackData;
}

export type BossSpawnData = {
    delay: number;
    interval: number;
}

export type BossMovementData = {
    speed: number;
    amplitude: number;
    frequency: number;
}

export type BossAttackData = {
    delay: number;
    bulletCount: number;
    spreadAngle: number;
    bullet: {
        width: number;
        height: number;
        color: string;
        speed: number;
        damage: number;
    };
}