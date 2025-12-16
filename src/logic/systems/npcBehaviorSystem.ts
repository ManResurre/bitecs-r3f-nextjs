import {World} from "../../entities/World.ts";
import {mobsQuery} from "../queries";
import {MobComponent} from "../components";
import {MOB_STATE} from "./spawnEnemySystem.ts";

export const npcBehaviorSystem = (world: World) => {
    if (!world.crowd) {
        return world;
    }
    const mobIds = mobsQuery(world);

    for (const eid of mobIds) {
        const state = MobComponent.state[eid];
        const crowdAgent = world.crowd.getAgent(MobComponent.crowdId[eid]);

        // console.log(crowdAgent?.position());

        if (!crowdAgent)
            continue;

        switch (state) {
            case MOB_STATE.IDLE: {
                const randomPointResult = world.navMeshQuery?.findRandomPoint();
                if (randomPointResult?.success) {
                    const success = crowdAgent.requestMoveTarget(randomPointResult.randomPoint);
                    if (success) {
                        MobComponent.state[eid] = MOB_STATE.MOVING;
                        // console.log(`NPC ${eid} started moving to`, randomPointResult.randomPoint);
                    } else {
                        // console.error(`NPC ${eid} failed to set move target`);
                    }
                }

                break;
            }

            case MOB_STATE.MOVING: {
                const agentState = crowdAgent.state();
                const velocity = crowdAgent.velocity();

                const speedSq = velocity.x * velocity.x + velocity.z * velocity.z;
                const THRESHOLD_SQ = 0.01;

                if (!agentState || speedSq < THRESHOLD_SQ) {
                    MobComponent.state[eid] = MOB_STATE.IDLE;
                }

                break;
            }
        }
    }

    return world;
};
