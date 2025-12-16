import {addComponent, addEntity, IWorld} from "bitecs";
import {Crowd, init, NavMeshQuery, NavMesh} from "recast-navigation";
import {Group, Mesh, Vector3} from "three";
import {threeToSoloNavMesh} from "@recast-navigation/three";
import {Soldier} from "./soldier/Soldier.ts";
import {CrowdAgentComponent, PlayerComponent} from "../logic/components";
import {PlayerEntity} from "./soldier/PlayerEntity.ts";
import {Npc} from "./soldier/Npc.ts";

export class World implements IWorld {
    time: {
        delta: number;
        elapsed: number;
        then: number;
    } = {delta: 0, elapsed: 0, then: performance.now()};
    size: {
        width: number;
        height: number;
    } = {width: 0, height: 0};

    entityManager = new Map<number, Npc>();

    muzzleFlashSystem = new Map();

    private isInit = false;

    public crowd!: Crowd;
    public navMesh?: NavMesh;
    public navMeshQuery?: NavMeshQuery;

    playerId?: number;

    levelRef;

    async initNav(scene: Group, world: World) {
        if (this.isInit == true)
            return;
        this.isInit = true;
        await init();

        const mesh = scene.getObjectByName('level') as Mesh;
        console.log(mesh);

        const {success, navMesh} = threeToSoloNavMesh(mesh.children);

        if (!success) {
            console.error('Failed to generate NavMesh');
            return;
        }

        const maxAgents = 200;
        const maxAgentRadius = 0.6;
        this.crowd = new Crowd(navMesh, {maxAgents, maxAgentRadius});
        this.navMesh = navMesh;
        this.navMeshQuery = new NavMeshQuery(navMesh);

        this.createPlayer(world);
    }

    createPlayer(world: World) {
        const nearestPoly = this.navMeshQuery?.findNearestPoly(
            new Vector3(),
            {halfExtents: {x: 2, y: 10, z: 2}}
        );
        const {agentIndex} = this.crowd.addAgent(nearestPoly?.nearestPoint!, {
            radius: 1,
            height: 1.8,
            maxAcceleration: 5.0,    // Убедитесь, что ускорение не 0
            maxSpeed: 2.5,           // Убедитесь, что скорость не 0
            collisionQueryRange: 2.5,
            separationWeight: 2.0,
            updateFlags: 7           // Убедитесь, что флаги включают движение
        });

        this.playerId = addEntity(world);

        addComponent(this, PlayerComponent, this.playerId);
        addComponent(this, CrowdAgentComponent, this.playerId);
        CrowdAgentComponent.crowdId[this.playerId] = agentIndex;
    }

    getSoldier(id: number): Soldier {
        let soldier = this.entityManager.get(id);
        if (soldier)
            return soldier;


        if (id == this.playerId) {
            soldier = new PlayerEntity(this, id)
        } else {
            soldier = new Soldier(this, id);
        }

        this.entityManager.set(id, soldier);

        return soldier;
    }

    setLevelRef(levelRef) {
        this.levelRef = levelRef;
    }
}
