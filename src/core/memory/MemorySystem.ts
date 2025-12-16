import {GameEntity} from "../../entities/GameEntity.ts";
import {MemoryRecord} from "./MemoryRecord.ts";

export class MemorySystem<T> extends Map<number, MemoryRecord<GameEntity>> {
    owner: T
    memorySpan = 5000;

    constructor(owner: T) {
        super();
        this.owner = owner;
    }

    createRecord(entity: GameEntity): this {
        const record = new MemoryRecord(entity);
        this.set(entity.id, record);
        return this;
    }

    deleteRecord(entity: GameEntity) {
        this.delete(entity.id)
        return this;
    }

    hasRecord(entity: GameEntity) {
        return this.has(entity.id);
    }

    getValidMemoryRecords(currentTime: number) {
        const result: MemoryRecord<GameEntity>[] = [];
        // Предварительный размер массива
        result.length = this.size;

        let i = 0;
        for (const record of this.values()) {
            if ((currentTime - record.timeLastSensed) <= this.memorySpan) {
                result[i++] = record;
            }
        }

        // Обрезаем массив до фактического размера
        result.length = i;
        return result;
    }
}
