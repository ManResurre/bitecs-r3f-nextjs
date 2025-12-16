import {
    addComponent,
    addEntity,
    defineSystem,
} from "bitecs";
import {mobsQuery, spawnMobsQuery} from "../queries";
import {
    CrowdAgentComponent,
    MobComponent,
    SpawnComponent,
} from "../components";
import {World} from "../../entities/World.ts";
import {Vector3} from "three";

const textEncoder = new TextEncoder();

export const spawnEnemySystem = defineSystem((world: World) => {
    if (!world.crowd)
        return world;

    const spawnPoints = spawnMobsQuery(world);

    for (const spawnId of spawnPoints) {
        if (SpawnComponent.cooldown[spawnId] > 0)
            SpawnComponent.cooldown[spawnId] -= world.time.delta;

        const mobs = mobsQuery(world);
        if (
            SpawnComponent.cooldown[spawnId] <= 0 &&
            mobs.length < SpawnComponent.max[spawnId]
        ) {
            //Add Mob
            const eid = addEntity(world);
            addComponent(world, MobComponent, eid);
            addComponent(world, CrowdAgentComponent, eid);

            MobComponent.name[eid] = textEncoder.encode('zombie');

            const nearestPoly = world.navMeshQuery?.findNearestPoly(
                new Vector3(),
                {halfExtents: {x: 2, y: 10, z: 2}}
            );

            const {agentIndex} = world.crowd.addAgent(nearestPoly!.nearestPoint, {
                radius: 0.1,
                height: 1,
                maxAcceleration: 2.0,    // Убедитесь, что ускорение не 0
                maxSpeed: 2.5,           // Убедитесь, что скорость не 0
                collisionQueryRange: 1,
                separationWeight: 1,
                updateFlags: 0//7           // Убедитесь, что флаги включают движение
            });

            CrowdAgentComponent.crowdId[eid] = agentIndex;

            console.log(mobs.length);

            SpawnComponent.cooldown[spawnId] += SpawnComponent.delay[spawnId];
        }
    }

    return world;
});
