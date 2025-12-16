import {defineSystem} from "bitecs";
import {mobsQuery} from "../queries";
import {World} from "../../entities/World.ts";
import {Soldier} from "../../entities/soldier/Soldier.ts";

export const entitySystem = defineSystem((world: World) => {
    if (!world?.crowd)
        return world;

    world.crowd.update(world.time.delta);

    const mobs = mobsQuery(world);
    for (const mobId of mobs) {
        const entity: Soldier = world.entityManager.get(mobId) as Soldier;
        if (entity)
            entity.update(world.time.delta);
    }

    if (world.playerId)
        world.entityManager.get(world.playerId)?.update(world.time.delta);

    return world;
});
