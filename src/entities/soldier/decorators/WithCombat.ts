import {World} from "../../World.ts";
import {TargetSystem} from "../../../core/TargetSystem.ts";
import {GameEntity} from "../../GameEntity.ts";
import {Actor, AnyActorLogic, SnapshotFrom} from "xstate";
import {CrowdAgent} from "recast-navigation";
import {AssaultRifleComponent} from "../../../logic/components";
import {Vector3} from "../../../core/math/Vector3.ts";
import {Regulator} from "../../../core/Regulator.ts";


export interface EntityCombat {
    arId: number;
    world: World;
    stateActor: Actor<AnyActorLogic>;
    currentState: SnapshotFrom<AnyActorLogic>;
    crowdAgent: CrowdAgent;
    lookDirection: Vector3;
    moveDirection: Vector3;
    position: Vector3;
    currentTime: number;

    rotateTo(target: Vector3): void

    update(delta: number): void;
}

export function WithCombat<T extends new (...args: any[]) => EntityCombat>(Base: T) {
    return class extends Base implements EntityCombat {
        targetSystem = new TargetSystem(this as unknown as GameEntity);
        lastShootTime = 0;
        shotTimeInterval = 0.5;

        targetSystemRegulator = new Regulator(2); // 2 раза/сек = каждые 30 кадров
        tempUp = new Vector3(0, 1, 0);

        reactionRegulator = new Regulator(2); // 2 раза/сек = каждые 30 кадров

        constructor(...args: any[]) {
            super(...args);
        }

        update(delta: number) {
            super.update(delta);
            if (this.targetSystemRegulator.ready()) {
                this.targetSystem.update();
            }
            if (this.reactionRegulator.ready()) {
                this.updateCombatBehavior();
            }
        }

        updateCombatBehavior() {
            const target = this.targetSystem.getTarget();
            const context = this.stateActor.getSnapshot().context;

            if (target) {
                if (this.targetSystem.isTargetShootable()) {
                    if (this.currentState.matches('movement')) {
                        this.stateActor.send({type: 'ENEMY_SPOTTED'});
                        this.crowdAgent.resetMoveTarget();
                    }

                    this.rotateTo(target.position);
                } else {
                    this.lookDirection.copy(this.moveDirection).normalize();
                }

                if (this.currentState.matches('combat.attack')) {
                    this.updateAttackBehavior(target, context);
                    this.updateAimAndShot(target);
                }
            } else {
                this.lookDirection.copy(this.moveDirection).normalize();
            }


            // this.lookDirection.copy(this.moveDirection);
            // if (this.currentState.matches('combat')) {
            //     this.stateActor.send({type: 'HUNT'});
            // }
        }

        updateAttackBehavior(target: GameEntity, context: any) {
            const distance = this.position.distanceTo(target.position);
            // Определяем основное поведение на основе дистанции
            if (distance < 100 && this.targetSystem.isTargetShootable()) {
                this.stateActor.send({type: 'RUN'});
            } else {
                this.stateActor.send({type: 'HUNT'});
            }

            // Определяем нужно ли маневрировать
            const shouldDodge = this.shouldDodge();
            if (shouldDodge && !context.isDodging) {
                this.stateActor.send({type: 'DODGE_ON'});
            } else if (!shouldDodge && context.isDodging) {
                this.stateActor.send({type: 'DODGE_OFF'});
            }

            // Выполняем соответствующее боевое поведение
            this.executeCombatMovement(target, context);
        }

        updateAimAndShot(target: GameEntity) {
            if (target && this.targetSystem.isTargetShootable()) {
                // this.rotateTo(target.position);

                // Стрельба в боевых состояниях
                if (this.currentState.matches('combat') &&
                    this.lastShootTime + this.shotTimeInterval < this.currentTime) {
                    AssaultRifleComponent.shoot[this.arId] = 1;
                    this.lastShootTime = this.currentTime;
                }
            }
        }

        shouldDodge(): boolean {
            // Простая логика для определения когда нужно маневрировать
            // Например: маневрировать с 50% вероятностью каждые 2 секунды
            return Math.random() < 0.5 && this.currentTime % 2 < 0.1;
        }

        executeCombatMovement(target: any, context: any) {
            const isRetreating = this.currentState.matches('combat.attack.retreating');
            if (isRetreating) {
                this.executeRetreating(target, context.isDodging);
            } else {
                this.executePursuing(target, context.isDodging);
            }
        }

        executeRetreating(target: any, isDodging: boolean) {
            // Логика отступления
            const awayDirection = new Vector3()
                .subVectors(this.position, target.position)
                .normalize();

            let retreatPoint: Vector3;

            if (isDodging) {
                // Отступление с маневрированием (зигзагами)
                const perpendicular = new Vector3()
                    .crossVectors(awayDirection, this.tempUp)
                    .normalize();
                const zigzagSide = Math.sin(this.currentTime * 3) > 0 ? 1 : -1;

                retreatPoint = new Vector3()
                    .copy(this.position)
                    .add(awayDirection.multiplyScalar(8))
                    .add(perpendicular.multiplyScalar(3 * zigzagSide));
            } else {
                // Прямое отступление
                retreatPoint = new Vector3()
                    .copy(this.position)
                    .add(awayDirection.multiplyScalar(10));
            }

            const closestPoint = this.world.navMeshQuery?.findClosestPoint(retreatPoint);

            if (closestPoint) {
                this.crowdAgent.requestMoveTarget(closestPoint.point);
            }
        }

        executePursuing(target: any, isDodging: boolean) {
            if (isDodging) {
                // Преследование с маневрированием
                const toEnemy = new Vector3()
                    .subVectors(target.position, this.position)
                    .normalize();
                const perpendicular = new Vector3()
                    .crossVectors(toEnemy, this.tempUp)
                    .normalize();

                const zigzagSide = Math.sin(this.currentTime * 3) > 0 ? 1 : -1;
                const maneuverPoint = new Vector3()
                    .copy(this.position)
                    .add(toEnemy.multiplyScalar(5))
                    .add(perpendicular.multiplyScalar(3 * zigzagSide));

                const closestPoint = this.world.navMeshQuery?.findClosestPoint(maneuverPoint);
                if (closestPoint) {
                    this.crowdAgent.requestMoveTarget(closestPoint.point);
                }
            } else {
                // Прямое преследование
                this.crowdAgent.requestMoveTarget(target.position);
            }
        }
    };
}
