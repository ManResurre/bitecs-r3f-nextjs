import {World} from "./World.ts";
import {Vector3} from "../core/math/Vector3.ts";
import {Api} from "./soldier/Soldier.ts";
import {AnimationClip} from "three";
import {MemorySystem} from "../core/memory/MemorySystem.ts";

export abstract class GameEntity {
    id: number;
    world: World;

    currentTime = 0;
    abstract position: Vector3;
    abstract memorySystem: MemorySystem<GameEntity>;

    protected constructor(world: World, id: number) {
        this.world = world;
        this.id = id;
    }

    abstract update(delta: number);

    abstract setAnimation(animation: Api<AnimationClip>);
}
