import {Types, defineComponent} from "bitecs";

export const Vector3 = {x: Types.f32, y: Types.f32, z: Types.f32};
export const Vector2 = {x: Types.f32, y: Types.f32};

export const PositionComponent = defineComponent(Vector3);

export const SpeedComponent = defineComponent({
    maxSpeed: Types.f32,
    acceleration: Types.f32,
});

export const VelocityComponent = defineComponent(Vector3);

export const RotationComponent = defineComponent({y: Types.i8});

export const TileComponent = defineComponent({id: Types.ui8});

export const ColorComponent = defineComponent({team: Types.ui8});
export const MobComponent = defineComponent({
    name: [Types.ui8, 32],
});

export const PlayerComponent = defineComponent({
    name: [Types.ui8, 32],
});

export const CrowdAgentComponent = defineComponent({
    crowdId: Types.i32,
});

export const SpawnComponent = defineComponent({
    delay: Types.ui16,
    cooldown: Types.f32,
    max: Types.ui8,
});

export const HealthComponent = defineComponent({
    value: Types.ui8,
});

export const SelectedCellComponent = defineComponent(Vector2);

export const CircleMovementComponent = defineComponent({
    centerX: Types.f32,    // центр окружности по X
    centerZ: Types.f32,    // центр окружности по Z
    radius: Types.f32,     // радиус окружности
    angle: Types.f32,      // текущий угол в радианах
    angularSpeed: Types.f32, // угловая скорость (радиан/секунду)
});

export const PathMovementComponent = defineComponent({
    timeToNextThink: Types.i16,
    target: Vector3,
    movement: Types.i8,
    pathXs: [Types.i32, 100],
    pathYs: [Types.i32, 100],
    pathZs: [Types.i32, 100],
    pathIndex: Types.i32,        // текущий индекс в пути
    pathLength: Types.i32,       // общая длина пути
});

export const ParticleComponent = defineComponent({
    life: Types.f32,        // время жизни частицы
    maxLife: Types.f32,     // максимальное время жизни
    size: Types.f32,        // размер частицы
    velocityX: Types.f32,   // скорость по X
    velocityY: Types.f32,   // скорость по Y
    velocityZ: Types.f32,   // скорость по Z
    colorR: Types.f32,      // цвет R
    colorG: Types.f32,      // цвет G
    colorB: Types.f32,      // цвет B
});

export const ParticleEmitterComponent = defineComponent({
    rate: Types.f32,        // частота испускания (частиц/секунду)
    cooldown: Types.f32,    // кулдаун до следующего испускания
    maxParticles: Types.ui16, // максимальное количество частиц
    emitterType: Types.ui8,   // тип эмиттера (0 = точечный, 1 = сфера, 2 = конус)
});

export const MobYukaEntityComponent = defineComponent({
    entityId: [Types.ui8, 32], // ID соответствующей сущности в Yuka
});

export const HealthPackComponent = defineComponent({
    entityId: [Types.ui8, 32], // ID соответствующей сущности в Yuka
});

export const HealthPackSpawnComponent = defineComponent({});
export const MobSpawnComponent = defineComponent({});

export const AssaultRifleComponent = defineComponent({
    shoot: Types.i8,
});

export const BulletComponent = defineComponent({
    arId: Types.i32,
    from: Vector3,
    to: Vector3,
    time: Types.i32
});

export const NavigationAgent = defineComponent({
    agentId: Types.i32, // ID агента в Crowd из recast-navigation [citation:1]
    speed: Types.f32,
    state: Types.ui8, // 0 = idle, 1 = moving, 2 = gathering
    target: Vector3
});
