import {Vision} from "../../../core/Vision.ts";
import {Regulator} from "../../../core/Regulator.ts";
import {World} from "../../World.ts";
import {mobsQuery} from "../../../logic/queries";
import {Vector3} from "../../../core/math/Vector3.ts";
import {Quaternion} from "../../../core/math/Quaternion.ts";
import {MemorySystem} from "../../../core/memory/MemorySystem.ts";

export interface EntityVision {
    id: number;
    world: World;
    lookDirection: Vector3;
    rotation: Quaternion;
    currentTime: number;
    position: Vector3;

    update(delta: number): void;
}

export function WithVision<T extends new (...args: any[]) => EntityVision>(Base: T) {
    return class extends Base implements EntityVision {
        vision: Vision;
        visionRegulator = new Regulator(0.5); // 2 раза/сек = каждые 30 кадров
        memorySystem = new MemorySystem(this);

        constructor(...args: any[]) {
            super(...args);
            const world = args[0] as World;
            this.vision = new Vision(world.navMesh!);
        }

        update(delta: number) {
            super.update(delta);
            if (this.visionRegulator.ready()) {
                this.updateVision();
            }
        }

        updateVision() {
            const mobIds = mobsQuery(this.world);
            for (const mobId of mobIds) {
                if (this.id == mobId) continue;

                const competitor = this.world.entityManager.get(mobId);
                if (!competitor) continue;

                const isVisible = this.isVisible(competitor.position);

                if (!this.memorySystem.hasRecord(competitor)) {
                    this.memorySystem.createRecord(competitor);
                }

                const record = this.memorySystem.get(competitor.id);
                if (!record) continue;

                if (isVisible) {
                    record.visible = true;
                    record.timeLastSensed = this.currentTime;
                    record.lastSensedPosition.copy(competitor.position);
                } else {
                    record.visible = false;
                }
            }

            return this;
        }

        isVisible(position: Vector3) {
            return this.vision.checkFieldOfView(
                this.position,
                this.lookDirection,
                position,
                50,
                120
            );
        }
    };
}
