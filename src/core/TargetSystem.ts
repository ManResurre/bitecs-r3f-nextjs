import {GameEntity} from "../entities/GameEntity.ts";
import {MemoryRecord} from "./memory/MemoryRecord.ts";

export class TargetSystem {
    owner: GameEntity;

    currentRecord?: MemoryRecord<GameEntity>;
    prevDistance: number = Infinity;
    maxTimeLastSensed = -Infinity;

    constructor(owner: GameEntity) {
        this.owner = owner;
    }

    update() {
        const records: MemoryRecord<GameEntity>[] = this.owner.memorySystem.getValidMemoryRecords(this.owner.currentTime);
        this.reset();

        for (const record of records) {
            this.loadVisibleClosestEnemy(record);
            this.loadInvisibleClosestEnemy(record);
        }
    }

    reset() {
        this.currentRecord = undefined;
        this.prevDistance = Infinity;
        this.maxTimeLastSensed = -Infinity;
    }

    loadVisibleClosestEnemy(record: MemoryRecord<GameEntity>) {
        if (!record.visible)
            return;

        this.setClosestEnemy(record);
    }

    loadInvisibleClosestEnemy(record: MemoryRecord<GameEntity>) {
        if (this.currentRecord)
            return;

        if (record.timeLastSensed > this.maxTimeLastSensed) {
            this.maxTimeLastSensed = record.timeLastSensed;
            this.setClosestEnemy(record)
        }
    }

    setClosestEnemy(record: MemoryRecord<GameEntity>) {
        const distance = this.owner.position.distanceToSquared(record.lastSensedPosition);
        if (this.prevDistance > distance) {
            this.currentRecord = record;
            this.prevDistance = distance;
        }
    }

    isTargetShootable() {
        return this.currentRecord ? this.currentRecord.visible : false;
    }

    getLastSensedPosition() {
        return this.currentRecord ? this.currentRecord.lastSensedPosition : null;
    }

    getTimeLastSensed() {
        return this.currentRecord ? this.currentRecord.timeLastSensed : -1;
    }

    getTimeBecameVisible() {
        return this.currentRecord ? this.currentRecord.timeBecameVisible : -1;
    }

    getTarget() {
        return this.currentRecord ? this.currentRecord.entity : null;
    }

    hasTarget() {
        return !!this.currentRecord;
    }
}
