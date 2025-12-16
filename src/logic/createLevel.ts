import {addComponent, addEntity, createWorld} from "bitecs";
import {
    HealthPackSpawnComponent, MobSpawnComponent,
    ParticleEmitterComponent,
    PositionComponent,
    SpawnComponent,
} from "./components";
import {LevelData} from "../types/LevelData";
import CONFIG from "../core/Config.ts";
import {World} from "../entities/World.ts";

export function createLevel(levelData: LevelData) {
    const world = createWorld(new World());

    setSpawnMobs(levelData.mobs, world);
    // setSpawnHealthPack(levelData.healthPackSpawningPoints, world)
    // createRainEmitter(world);

    return world;
}

function setSpawnMobs(mobs: LevelData["mobs"], world: World) {
    for (const mob of mobs) {
        const eid = addEntity(world);

        addComponent(world, SpawnComponent, eid);
        addComponent(world, PositionComponent, eid);
        addComponent(world, MobSpawnComponent, eid);

        PositionComponent.x[eid] = mob.position[0];
        PositionComponent.y[eid] = mob.position[1];
        PositionComponent.z[eid] = mob.position[2];

        SpawnComponent.delay[eid] = mob.delay;
        SpawnComponent.max[eid] = mob.max;

        SpawnComponent.cooldown[eid] = 0;
    }
}

function setSpawnHealthPack(points: LevelData["healthPackSpawningPoints"], world: World) {
    for (const point of points) {
        const eid = addEntity(world);
        addComponent(world, SpawnComponent, eid);
        addComponent(world, PositionComponent, eid);
        addComponent(world, HealthPackSpawnComponent, eid);

        PositionComponent.x[eid] = point[0];
        PositionComponent.y[eid] = point[1];
        PositionComponent.z[eid] = point[2];

        SpawnComponent.delay[eid] = CONFIG.HEALTH_PACK.RESPAWN_TIME * 1000;
        SpawnComponent.cooldown[eid] = 0;
        SpawnComponent.max[eid] = 1;
    }
}

function createRainEmitter(world: World) {
    const emitterEid = addEntity(world);

    addComponent(world, PositionComponent, emitterEid);
    addComponent(world, ParticleEmitterComponent, emitterEid);

    // Позиция эмиттера (над сценой)
    PositionComponent.x[emitterEid] = 0;
    PositionComponent.y[emitterEid] = 5;
    PositionComponent.z[emitterEid] = 0;

    // Настройки эмиттера
    ParticleEmitterComponent.rate[emitterEid] = 50; // 50 частиц в секунду
    ParticleEmitterComponent.cooldown[emitterEid] = 0;
    ParticleEmitterComponent.maxParticles[emitterEid] = 500;
    ParticleEmitterComponent.emitterType[emitterEid] = 0; // точечный эмиттер
}
