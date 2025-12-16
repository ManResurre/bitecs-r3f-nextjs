import {defineQuery} from "bitecs";
import {
    HealthComponent,
    MobComponent,
    ParticleComponent,
    ParticleEmitterComponent,
    PositionComponent,
    RotationComponent,
    SpawnComponent,
    SpeedComponent,
    TileComponent,
    VelocityComponent,
    MobYukaEntityComponent,
    HealthPackSpawnComponent,
    HealthPackComponent,
    AssaultRifleComponent,
    BulletComponent, MobSpawnComponent, CrowdAgentComponent, PlayerComponent,
} from "../components";

export const movementQuery = defineQuery([
    PositionComponent,
    RotationComponent,
    VelocityComponent,
    SpeedComponent,
]);

export const tilesQuery = defineQuery([
    PositionComponent,
    RotationComponent,
    TileComponent,
]);

export const spawnMobsQuery = defineQuery([
    PositionComponent,
    SpawnComponent,
    MobSpawnComponent
]);

export const mobsQuery = defineQuery([
    MobComponent,
    CrowdAgentComponent
]);

export const playersQuery = defineQuery([
    PlayerComponent,
    CrowdAgentComponent
]);

export const assaultRifleQuery = defineQuery([
    AssaultRifleComponent
]);

export const bulletQuery = defineQuery([
    BulletComponent
]);

export const yukaQuery = defineQuery([
    MobYukaEntityComponent
])

export const healthPackSpawnQuery = defineQuery([
    SpawnComponent,
    PositionComponent,
    HealthPackSpawnComponent
])

export const healthPackQuery = defineQuery([
    HealthPackComponent,
])

export const healthQuery = defineQuery([
    HealthComponent,
]);

export const particleQuery = defineQuery([ParticleComponent, PositionComponent]);
export const particleEmitterQuery = defineQuery([ParticleEmitterComponent]);
