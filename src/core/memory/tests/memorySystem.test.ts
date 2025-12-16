import { createWorld } from "bitecs";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { MemorySystem } from "../MemorySystem.ts";
import { GameEntity } from "../../../entities/GameEntity.ts";
import { World } from "../../../entities/World.ts";
import { MemoryRecord } from "../MemoryRecord.ts";

// Mock для MemoryRecord чтобы контролировать время
vi.mock("../MemoryRecord.ts", () => {
    return {
        MemoryRecord: vi.fn().mockImplementation((entity) => ({
            entity: entity,
            timeLastSensed: 0, // Будем менять в тестах
            id: entity.id
        }))
    };
});

class Mob extends GameEntity {
    constructor(world: World, id: number) {
        super(world, id);
    }
}

describe("Memory System", () => {
    let world: World;
    let owner: Mob;
    let memorySystem: MemorySystem<Mob>;

    beforeEach(() => {
        world = createWorld();
        owner = new Mob(world, 1);
        memorySystem = new MemorySystem(owner);
    });

    describe("createRecord", () => {
        it("should create a new memory record", () => {
            const mob = new Mob(world, 2);

            memorySystem.createRecord(mob);

            expect(memorySystem.has(mob.id)).toBe(true);
            expect(memorySystem.get(mob.id)?.entity).toBe(mob);
        });

        it("should return this for chaining", () => {
            const mob = new Mob(world, 2);

            const result = memorySystem.createRecord(mob);

            expect(result).toBe(memorySystem);
        });

        it("should overwrite existing record with same id", () => {
            const mob = new Mob(world, 2);
            memorySystem.createRecord(mob);

            // Мокаем другой MemoryRecord
            const newRecord = { entity: mob, timeLastSensed: 100, id: mob.id };
            (MemoryRecord as any).mockImplementationOnce(() => newRecord);

            memorySystem.createRecord(mob);

            expect(memorySystem.get(mob.id)).toBe(newRecord);
        });
    });

    describe("deleteRecord", () => {
        it("should delete existing record", () => {
            const mob = new Mob(world, 2);
            memorySystem.createRecord(mob);

            memorySystem.deleteRecord(mob);

            expect(memorySystem.has(mob.id)).toBe(false);
        });

        it("should return this for chaining", () => {
            const mob = new Mob(world, 2);
            memorySystem.createRecord(mob);

            const result = memorySystem.deleteRecord(mob);

            expect(result).toBe(memorySystem);
        });

        it("should not throw when deleting non-existent record", () => {
            const mob = new Mob(world, 2);

            expect(() => memorySystem.deleteRecord(mob)).not.toThrow();
        });
    });

    describe("hasRecord", () => {
        it("should return true for existing record", () => {
            const mob = new Mob(world, 2);
            memorySystem.createRecord(mob);

            expect(memorySystem.hasRecord(mob)).toBe(true);
        });

        it("should return false for non-existent record", () => {
            const mob = new Mob(world, 2);

            expect(memorySystem.hasRecord(mob)).toBe(false);
        });
    });

    describe("getValidMemoryRecords", () => {
        beforeEach(() => {
            // Устанавливаем memorySpan для тестов
            memorySystem.memorySpan = 1000;
        });

        it("should return empty array when no records", () => {
            const records = memorySystem.getValidMemoryRecords(5000);

            expect(records).toHaveLength(0);
        });

        it("should return valid records within memory span", () => {
            const mob1 = new Mob(world, 2);
            const mob2 = new Mob(world, 3);

            // Создаем записи с разным временем
            memorySystem.createRecord(mob1);
            memorySystem.createRecord(mob2);

            // Мокаем timeLastSensed для записей
            const record1 = memorySystem.get(mob1.id)!;
            const record2 = memorySystem.get(mob2.id)!;

            record1.timeLastSensed = 4000; // currentTime(5000) - 4000 = 1000 <= 1000 (valid)
            record2.timeLastSensed = 3000; // currentTime(5000) - 3000 = 2000 > 1000 (invalid)

            const records = memorySystem.getValidMemoryRecords(5000);

            expect(records).toHaveLength(1);
            expect(records[0]).toBe(record1);
        });

        it("should return all records when all are valid", () => {
            const mob1 = new Mob(world, 2);
            const mob2 = new Mob(world, 3);

            memorySystem.createRecord(mob1);
            memorySystem.createRecord(mob2);

            const record1 = memorySystem.get(mob1.id)!;
            const record2 = memorySystem.get(mob2.id)!;

            record1.timeLastSensed = 4500; // 5000 - 4500 = 500 <= 1000
            record2.timeLastSensed = 4800; // 5000 - 4800 = 200 <= 1000

            const records = memorySystem.getValidMemoryRecords(5000);

            expect(records).toHaveLength(2);
            expect(records).toContain(record1);
            expect(records).toContain(record2);
        });

        it("should return no records when all are expired", () => {
            const mob1 = new Mob(world, 2);
            const mob2 = new Mob(world, 3);

            memorySystem.createRecord(mob1);
            memorySystem.createRecord(mob2);

            const record1 = memorySystem.get(mob1.id)!;
            const record2 = memorySystem.get(mob2.id)!;

            record1.timeLastSensed = 1000; // 5000 - 1000 = 4000 > 1000
            record2.timeLastSensed = 2000; // 5000 - 2000 = 3000 > 1000

            const records = memorySystem.getValidMemoryRecords(5000);

            expect(records).toHaveLength(0);
        });

        it("should handle edge case when exactly at memory span", () => {
            const mob = new Mob(world, 2);
            memorySystem.createRecord(mob);

            const record = memorySystem.get(mob.id)!;
            record.timeLastSensed = 4000; // 5000 - 4000 = 1000 <= 1000 (valid)

            const records = memorySystem.getValidMemoryRecords(5000);

            expect(records).toHaveLength(1);
        });

        it("should work with different memory spans", () => {
            const mob = new Mob(world, 2);
            memorySystem.createRecord(mob);

            const record = memorySystem.get(mob.id)!;
            record.timeLastSensed = 4000;

            // Уменьшаем memorySpan
            memorySystem.memorySpan = 500; // 5000 - 4000 = 1000 > 500 (invalid)

            const records = memorySystem.getValidMemoryRecords(5000);

            expect(records).toHaveLength(0);
        });
    });

    describe("inherited Map functionality", () => {
        it("should work as a normal Map", () => {
            const mob = new Mob(world, 2);
            const record = new MemoryRecord(mob);

            memorySystem.set(mob.id, record);

            expect(memorySystem.get(mob.id)).toBe(record);
            expect(memorySystem.size).toBe(1);

            memorySystem.delete(mob.id);

            expect(memorySystem.has(mob.id)).toBe(false);
        });
    });
});
