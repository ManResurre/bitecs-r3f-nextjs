import {AnimationClip} from "three";
import {Vector3} from "../../../core/math/Vector3.ts";
import {Quaternion} from "../../../core/math/Quaternion.ts";
import {CrowdAgent} from "recast-navigation";
import {Api} from "../Npc.ts";

export const ANIMATION_FLAGS = {
    soldier_forward: 1 << 0,    // 0001
    soldier_backward: 1 << 1,   // 0010
    soldier_left: 1 << 2,       // 0100
    soldier_right: 1 << 3       // 1000
};

const DIRECTIONS = new Map([
    ['soldier_forward', new Vector3(0, 0, 1)],
    ['soldier_backward', new Vector3(0, 0, -1)],
    ['soldier_left', new Vector3(-1, 0, 0)],
    ['soldier_right', new Vector3(1, 0, 0)],
])

export interface EntityAnimatable {
    animation?: Api<AnimationClip>;
    lookDirection: Vector3;
    moveDirection: Vector3;
    rotation: Quaternion;
    crowdAgent: CrowdAgent;
    speed: number;
    maxSpeed: number;
    position: Vector3;

    isVelocityZero(): boolean;

    update(delta: number): void;
}

export function WithAnimation<T extends new (...args: any[]) => EntityAnimatable>(Base: T) {
    return class extends Base implements EntityAnimatable {
        private tempForward = new Vector3(0, 0, 1);
        private tempUp = new Vector3(0, 1, 0);
        private animationsInitialized = false;

        update(delta: number) {
            super.update(delta);
            this.updateAnimations();
        }

        updateAnimations() {
            if (!this.animation) return;

            if (!this.animationsInitialized) {
                for (const action of Object.values(this.animation.actions)) {
                    if (action) {
                        action.play();
                        action.weight = 0;
                    }
                }
                this.animationsInitialized = true;
            }

            this.rotation.lookAt(this.tempForward, this.lookDirection, this.tempUp);

            const velocity = this.crowdAgent.velocity();
            this.moveDirection.copy(velocity);
            this.calculateAnimationWeights(this.lookDirection, this.moveDirection);
        }

        private calculateAnimationWeights(lookDir: Vector3, moveDir: Vector3) {
            if (!this.animation?.actions) return;

            const isMoving = !this.isVelocityZero();
            const idleAction = this.animation.actions["soldier_idle"];

            if (!isMoving) {
                this.setAllMovementWeights(0);
                if (idleAction) idleAction.weight = 1;
                return;
            }

            // ИНВЕРТИРУЕМ ось X для правильного определения направлений
            const rightVector = this.getRightVector(lookDir);
            const localX = -moveDir.dot(rightVector); // Добавляем минус здесь
            const localZ = moveDir.dot(lookDir.normalize());
            const magnitude = Math.sqrt(localX * localX + localZ * localZ);

            const normX = localX / magnitude;
            const normZ = localZ / magnitude;

            const forward = Math.max(0, normZ) * magnitude;
            const backward = Math.max(0, -normZ) * magnitude;
            const right = Math.max(0, normX) * magnitude;
            const left = Math.max(0, -normX) * magnitude;

            const sum = forward + backward + right + left;
            const normalizedSum = sum > 0 ? sum : 1;

            this.setAnimationWeight('soldier_forward', forward / normalizedSum);
            this.setAnimationWeight('soldier_backward', backward / normalizedSum);
            this.setAnimationWeight('soldier_right', right / normalizedSum);
            this.setAnimationWeight('soldier_left', left / normalizedSum);

            if (idleAction) idleAction.weight = 0;
        }

        private getRightVector(lookDir: Vector3): Vector3 {
            return new Vector3().crossVectors(this.tempUp.set(0, 1, 0), lookDir.normalize());
        }

        private setAnimationWeight(name: string, weight: number) {
            const action = this.animation!.actions[name];
            if (action) {
                action.weight = weight;
            }
        }

        private setAllMovementWeights(weight: number) {
            for (const [animationName] of DIRECTIONS) {
                this.setAnimationWeight(animationName, weight);
            }
        }
    };
}
