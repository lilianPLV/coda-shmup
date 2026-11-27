import {GameObjects, Plugins, Physics, Scene} from "phaser";
import Health from "../components/Health.ts";
import Boss from "../entities/Boss.ts"
import Bullet from "../entities/Bullet.ts";
import type {BossData} from "../gameData/BossData.ts";
import Enemy from "../entities/Enemy.ts";
import Player from "../entities/Player.ts";
import GroupUtils from "../utils/GroupUtils.ts";
import GameConstants from "../GameConstants.ts";
import RegistryConstants from "../RegistryConstants.ts";

export default class EntityManager extends Plugins.ScenePlugin {
    public static readonly PLUGIN_KEY: string = 'EntityManager';
    public static readonly MAPPING_NAME: string = 'entityManager';

    // noinspection JSUnusedGlobalSymbols
    private readonly bulletGroupConfig = {
        classType: Bullet,
        maxSize: 256,
        runChildUpdate: true,
        createCallback: (bullet: GameObjects.GameObject) => {
            (bullet as Bullet).init();
        }
    }

    private _player: Player;
    private _playerBullets: Physics.Arcade.Group;
    private _enemies: Physics.Arcade.Group;
    private _enemyBullets: Physics.Arcade.Group;
    private _bosses: Physics.Arcade.Group;
    private _boss?: Boss;
    private _bossConfig: BossData;
    private _lastBossContactTime: number = 0;

    constructor(scene: Scene, pluginManager: Plugins.PluginManager) {
        super(scene, pluginManager, EntityManager.PLUGIN_KEY);

        console.log("[EntityManager] Initialized");
    }

    destroy() {
        super.destroy();

        console.log("[EntityManager] Destroyed");
    }

    public initAndSpawnPlayer(): Player {
        this._playerBullets = this.scene!.physics.add.group(this.bulletGroupConfig);
        GroupUtils.populate(64, this._playerBullets);

        this._player = new Player(this.scene!, this.scene!.cameras.main.centerX, this.scene!.cameras.main.height - 128);
        this._player.init(this._playerBullets);

        console.log("[EntityManager] Player spawned");

        this.game!.events.emit(GameConstants.Events.PLAYER_SPAWNED_EVENT, this._player);

        return this._player;
    }

    public initEnemies(): Physics.Arcade.Group {
        this._enemyBullets = this.scene!.physics.add.group(this.bulletGroupConfig);
        GroupUtils.populate(256, this._enemyBullets);

        this._enemies = this.scene!.physics.add.group({
            classType: Enemy,
            defaultKey: 'sprites',
            defaultFrame: 'ufoRed',
            createCallback: (enemy) => {
                (enemy as Enemy).init(this._enemyBullets);
            }
        });

        // The plugin instance survives scene restarts: reset the boss state every time
        this._boss = undefined;
        this._lastBossContactTime = 0;
        this._bosses = this.scene!.physics.add.group();

        this._bossConfig = this.scene!.cache.json.get('boss') as BossData;
        if (this._bossConfig) {
            this.scheduleBoss(this._bossConfig.spawn.delay);
        } else {
            console.error("[EntityManager] 'boss' JSON is not loaded: no boss will spawn");
        }

        // Spawn enemies indefinitely
        this.scene!.time.addEvent({
            delay: 1500,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });

        console.log("[EntityManager] Enemies initialized");

        return this._enemies;
    }

    public initGroupCollisions() {
        this.scene!.physics.add.overlap(this._playerBullets, this._enemies, (bullet, enemy) => {
            this.scene!.registry.inc(RegistryConstants.Keys.PLAYER_SCORE);

            (bullet as Bullet).disable();
            (enemy as Enemy).getComponent(Health)?.damage((bullet as Bullet).damage);
        });

        this.scene!.physics.add.overlap(this._player, this._enemyBullets, (player, bullet) => {
            (bullet as Bullet).disable();
            (player as Player).getComponent(Health)?.damage((bullet as Bullet).damage);

            this.scene?.cameras.main.shake(100, 0.01);
        });

        this.scene!.physics.add.overlap(this._player, this._enemies, (player, enemy) => {
            this.scene!.registry.inc(RegistryConstants.Keys.PLAYER_SCORE);

            const enemyHealth = (enemy as Enemy).getComponent(Health);
            enemyHealth?.damage(enemyHealth?.max);

            const playerHealth = (player as Player).getComponent(Health);
            playerHealth?.damage(1);

            this.scene?.cameras.main.shake(100, 0.03);
        });

        this.scene!.physics.add.overlap(this._playerBullets, this._bosses, (bullet, boss) => {
            this.scene!.registry.inc(RegistryConstants.Keys.PLAYER_SCORE);

            (bullet as Bullet).disable();
            (boss as Boss).getComponent(Health)?.damage((bullet as Bullet).damage);
        });

        this.scene!.physics.add.overlap(this._player, this._bosses, (player) => {
            // The boss doesn't die on contact, so limit the damage taken to once per second
            if (this.scene!.time.now - this._lastBossContactTime < 1000)
                return;
            this._lastBossContactTime = this.scene!.time.now;

            (player as Player).getComponent(Health)?.damage(1);

            this.scene?.cameras.main.shake(100, 0.03);
        });

        console.log("[EntityManager] Group collisions initialized");
    }

    private spawnEnemy() {
        // A boss is alive: no more regular enemies until it is defeated
        if (this._boss) {
            return;
        }

        if (this._enemies.countActive(true) >= 5) {
            return;
        }

        const enemy = this._enemies.get() as Enemy;
        if (!enemy) {
            return;
        }

        enemy.enable(Phaser.Math.Between(64, this.scene!.cameras.main.width - 64), 0);

        this.game!.events.emit(GameConstants.Events.ENEMY_SPAWNED_EVENT, enemy);

        console.log("[EntityManager] Enemy spawned");
    }

    private scheduleBoss(delay: number) {
        this.scene!.time.delayedCall(delay, () => this.spawnBoss());
    }

    private spawnBoss() {
        if (this._boss) {
            return;
        }

        const boss = new Boss(this.scene!, this.scene!.cameras.main.centerX, -256);
        boss.init(this._enemyBullets, this._bossConfig);
        this._bosses.add(boss);
        this._boss = boss;

        // Fired when the boss is killed AND when it leaves the screen
        boss.once(GameObjects.Events.DESTROY, (_boss: Boss, fromScene: boolean) => {
            // The scene is shutting down (restart, game over): nothing to schedule
            if (fromScene)
                return;

            // Regular enemies spawn again, and the next boss is scheduled
            this._boss = undefined;
            this.scheduleBoss(this._bossConfig.spawn.interval);
        });

        console.log("[EntityManager] Boss spawned");
    }
}