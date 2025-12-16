import {CrowdAgent} from "recast-navigation";
import {Actor, AnyActorLogic, SnapshotFrom} from "xstate";
import {Regulator} from "../../../core/Regulator.ts";

export interface EntityMovement {
    crowdAgent: CrowdAgent;
    currentState: SnapshotFrom<AnyActorLogic>;
    stateActor: Actor<AnyActorLogic>;

    update(delta: number): void;

    isVelocityZero(): boolean;
}

export function WithMovement<T extends new (...args: any[]) => EntityMovement>(Base: T) {
    return class extends Base implements EntityMovement {

        movementRegulator = new Regulator(2); // 2 раза/сек = каждые 30 кадров
        update(delta: number) {
            super.update(delta);
            this.updateMovement();
        }

        updateMovement() {
            if (!this.currentState)
                return;

            if (!this.movementRegulator.ready())
                return;

            const agentState = this.crowdAgent.state();

            // Проверяем достигли ли точки только в состоянии исследования
            if (this.currentState.matches('movement') && agentState && this.isVelocityZero()) {
                this.stateActor.send({type: 'POINT_REACHED'});
                // console.log('POINT_REACHED');
            }
        }
    };
}
