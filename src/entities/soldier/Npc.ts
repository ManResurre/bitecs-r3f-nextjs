import {
    AnimationAction,
    AnimationClip,
    AnimationMixer,
    Group,
    Object3D,
} from "three";
import {World} from "../World.ts";
import {RefObject} from "react";
import {CrowdAgent} from "recast-navigation";
import {AssaultRifleComponent, CrowdAgentComponent} from "../../logic/components";
import {Vector3} from "../../core/math/Vector3.ts";
import {Quaternion} from "../../core/math/Quaternion.ts";
import {addComponent, addEntity} from "bitecs";
import {GameEntity} from "../GameEntity.ts";
import {Actor, AnyActorLogic, createActor, SnapshotFrom} from "xstate";
import {soldierMachine} from "./SoldierStateMachine.ts";
import {Vision} from "../../core/Vision.ts";
import {TargetSystem} from "../../core/TargetSystem.ts";
import {MemorySystem} from "../../core/memory/MemorySystem.ts";

export type Api<T extends AnimationClip> = {
    ref: RefObject<Object3D | undefined | null>;
    clips: AnimationClip[];
    mixer: AnimationMixer;
    names: T['name'][];
    actions: {
        [key in T['name']]: AnimationAction | null;
    };
};

const THRESHOLD_SQ = 0.001;

export class Npc extends GameEntity {
    animation?: Api<AnimationClip>;
    crowdAgent: CrowdAgent;

    soldierRef?: RefObject<Group>;
    weaponRef?: RefObject<Group>;

    lookDirection = new Vector3(0, 0, 1);
    moveDirection = new Vector3(0, 0, 1);
    rotation = new Quaternion();

    arId: number;

    currentState: SnapshotFrom<AnyActorLogic>;
    currentTargetPoint = new Vector3(1, 0, 1);

    stateHandlers = new Map([
        ['exploring', this.startExploring],
        ['combat.attack.retreating', this.startRetreating],
        ['combat.attack.pursuing', this.startPursuing]
    ]);

    stateActor: Actor<AnyActorLogic>;

    declare vision: Vision;
    declare targetSystem: TargetSystem;
    declare memorySystem: MemorySystem<GameEntity>;

    constructor(world: World, id: number) {
        super(world, id);

        this.crowdAgent = world.crowd!.getAgent(CrowdAgentComponent.crowdId[id]) as CrowdAgent;

        this.arId = addEntity(world);
        addComponent(this.world, AssaultRifleComponent, this.arId);
        AssaultRifleComponent.shoot[this.arId] = 0;

        // Инициализация актора машины состояний
        this.stateActor = createActor(soldierMachine).start();

        // Подписка на изменения состояния
        this.stateActor.subscribe((snapshot: SnapshotFrom<AnyActorLogic>) => {
            const oldValue = JSON.stringify(this.currentState?.value);
            this.currentState = snapshot;

            // console.log(`Soldier ${this.id}: `, snapshot.value);

            //новое состояние
            if (oldValue !== JSON.stringify(snapshot.value))
                this.handleStateEntry()
        });

        // this.startExploring();
    }

    get position() {
        return new Vector3().copy(this.crowdAgent.position());
    }

    get speed() {
        const velocity = this.crowdAgent.velocity();
        return new Vector3().copy(velocity).length();
    }

    get maxSpeed() {
        return this.crowdAgent.maxSpeed;
    }

    update(delta: number) {
        const MAX_GAME_TIME = 24 * 60 * 60;
        this.currentTime = (this.currentTime + delta) % MAX_GAME_TIME;
        AssaultRifleComponent.shoot[this.arId] = 0;

        // const target = this.targetSystem?.getTarget();
        // if (!target)
        //     this.lookDirection.copy(this.moveDirection).normalize()
        // console.log(this.moveDirection);
    }

    selectNewRandomPoint() {
        const randomPointResult = this.world.navMeshQuery?.findRandomPoint();

        if (randomPointResult) {
            this.currentTargetPoint.copy(randomPointResult.randomPoint);
            this.crowdAgent.requestMoveTarget(this.currentTargetPoint);
            // console.log(`Soldier ${this.id} moving to new random point`);
        }
    }

    // Добавляем метод для обработки входа в состояния
    handleStateEntry() {
        for (const [state, handler] of this.stateHandlers) {
            if (this.currentState.matches(state)) {
                handler.call(this)
            }
        }
    }

    startExploring() {
        this.selectNewRandomPoint();
    }

    setRenderComponentRef(soldierRef: RefObject<Group>) {
        this.soldierRef = soldierRef;
    }

    setWeaponRef(weaponRef: RefObject<Group>) {
        this.weaponRef = weaponRef;
    }

    rotateTo(target: Vector3) {
        const direction = new Vector3().subVectors(target, this.position);
        direction.normalize();

        // Обновляем направление взгляда
        this.lookDirection.copy(direction);
    }

    isVelocityZero() {
        const velocity = this.crowdAgent.velocity();
        const speedSq = velocity.x * velocity.x + velocity.z * velocity.z;
        return speedSq < THRESHOLD_SQ
    }

    startRetreating() {
        // console.log(`Soldier ${this.id} starting retreat`);
        // Прерываем текущее движение к случайной точке
        // Дальнейшее движение будет управляться в updateCombatBehavior
    }

    startPursuing() {
        // console.log(`Soldier ${this.id} starting pursuit`);
        // Прерываем текущее движение к случайной точке
        // Дальнейшее движение будет управляться в updateCombatBehavior
    }


    getStatus() {
        const target = this.targetSystem?.getTarget();
        if (target)
            return this.id + ':' + JSON.stringify(this.currentState?.value) + ':' + target?.id;
        return this.id + ':' + JSON.stringify(this.currentState?.value);
    }

    setAnimation(animation: Api<AnimationClip>) {
        this.animation = animation;
    }
}
