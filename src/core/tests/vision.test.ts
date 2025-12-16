import { describe, it, expect, beforeEach, vi } from "vitest";
import { NavMesh, NavMeshQuery, QueryFilter } from "recast-navigation";
import {Vision} from "../Vision.ts";
import {Vector3} from "../math/Vector3.ts";

// Мокаем модуль recast-navigation
vi.mock("recast-navigation", () => {
    return {
        NavMeshQuery: vi.fn(),
        QueryFilter: vi.fn(),
        NavMesh: vi.fn()
    };
});

describe("Vision", () => {
    let vision: Vision;
    let mockNavMesh: NavMesh;
    let mockNavMeshQuery: any;

    beforeEach(() => {
        // Сбрасываем все моки
        vi.clearAllMocks();

        // Создаем мок для NavMeshQuery
        mockNavMeshQuery = {
            findNearestPoly: vi.fn(),
            raycast: vi.fn()
        };

        // Настраиваем реализацию моков
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        (NavMeshQuery as vi.Mock).mockImplementation(() => mockNavMeshQuery);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        (QueryFilter as vi.Mock).mockImplementation(() => ({}));

        mockNavMesh = {} as NavMesh;
        vision = new Vision(mockNavMesh);
    });

    describe("конструктор", () => {
        it("должен создавать экземпляр Vision с правильными значениями по умолчанию", () => {
            expect(vision).toBeInstanceOf(Vision);
            expect(vision.fieldOfView).toBe(120);
            expect(vision.range).toBe(20);
            expect(NavMeshQuery).toHaveBeenCalledWith(mockNavMesh);
        });
    });

    describe("checkFieldOfView", () => {
        const agentPosition = new Vector3(0, 0, 0);
        const agentDirection = new Vector3(1, 0, 0); // Смотрит вдоль оси X

        beforeEach(() => {
            // Настраиваем успешное нахождение полигона по умолчанию
            mockNavMeshQuery.findNearestPoly.mockReturnValue({
                success: true,
                nearestRef: 123
            });
        });

        it("должен возвращать false когда цель слишком далеко", () => {
            const targetPosition = new Vector3(25, 0, 0); // За пределами диапазона 20

            const result = vision.checkFieldOfView(
                agentPosition,
                agentDirection,
                targetPosition
            );

            expect(result).toBe(false);
        });

        it("должен возвращать false когда цель вне угла обзора", () => {
            const targetPosition = new Vector3(10, 20, 0); // Увеличиваем Y-координату для большего угла

            // Мокаем raycast для успешной проверки видимости
            mockNavMeshQuery.raycast.mockReturnValue({ t: 1 });

            const result = vision.checkFieldOfView(
                agentPosition,
                agentDirection,
                targetPosition,
                20, // maxDistance
                90  // fovAngle - узкий угол обзора
            );

            expect(result).toBe(false);
        });

        it("должен возвращать true когда цель в поле обзора и нет препятствий", () => {
            const targetPosition = new Vector3(10, 0, 0); // Прямо перед агентом

            // Мокаем успешную проверку луча
            mockNavMeshQuery.raycast.mockReturnValue({ t: 1 });

            const result = vision.checkFieldOfView(
                agentPosition,
                agentDirection,
                targetPosition
            );

            expect(result).toBe(true);
            expect(mockNavMeshQuery.raycast).toHaveBeenCalledWith(
                123,
                agentPosition,
                targetPosition,
                { filter: expect.any(Object) }
            );
        });

        it("должен возвращать false когда есть препятствие", () => {
            const targetPosition = new Vector3(10, 0, 0);

            // Мокаем луч, который попадает в препятствие
            mockNavMeshQuery.raycast.mockReturnValue({ t: 0.5 });

            const result = vision.checkFieldOfView(
                agentPosition,
                agentDirection,
                targetPosition
            );

            expect(result).toBe(false);
        });

        it("должен использовать значения по умолчанию когда параметры не переданы", () => {
            const targetPosition = new Vector3(10, 0, 0);
            mockNavMeshQuery.raycast.mockReturnValue({ t: 1 });

            const result = vision.checkFieldOfView(
                agentPosition,
                agentDirection,
                targetPosition
            );

            expect(result).toBe(true);
        });
    });

    describe("canSee", () => {
        const from = new Vector3(0, 0, 0);
        const to = new Vector3(10, 0, 0);

        it("должен возвращать true когда луч достигает цели", () => {
            mockNavMeshQuery.findNearestPoly.mockReturnValue({
                success: true,
                nearestRef: 123
            });
            mockNavMeshQuery.raycast.mockReturnValue({ t: 1 });

            const result = vision.canSee(from, to);

            expect(result).toBe(true);
            expect(mockNavMeshQuery.raycast).toHaveBeenCalledWith(
                123,
                from,
                to,
                { filter: expect.any(Object) }
            );
        });

        it("должен возвращать false когда луч не достигает цели", () => {
            mockNavMeshQuery.findNearestPoly.mockReturnValue({
                success: true,
                nearestRef: 123
            });
            mockNavMeshQuery.raycast.mockReturnValue({ t: 0.7 });

            const result = vision.canSee(from, to);

            expect(result).toBe(false);
        });

        it("должен возвращать false когда не найден стартовый полигон", () => {
            mockNavMeshQuery.findNearestPoly.mockReturnValue({
                success: false
            });

            const result = vision.canSee(from, to);

            expect(result).toBe(false);
            expect(mockNavMeshQuery.raycast).not.toHaveBeenCalled();
        });
    });

    describe("getStartRef", () => {
        it("должен возвращать ссылку когда полигон найден", () => {
            const position = new Vector3(0, 0, 0);
            mockNavMeshQuery.findNearestPoly.mockReturnValue({
                success: true,
                nearestRef: 456
            });

            const result = vision["getStartRef"](position);

            expect(result).toBe(456);
            expect(mockNavMeshQuery.findNearestPoly).toHaveBeenCalledWith(
                position,
                {
                    filter: expect.any(Object),
                    halfExtents: { x: 2, y: 4, z: 2 }
                }
            );
        });

        it("должен возвращать null когда полигон не найден", () => {
            const position = new Vector3(0, 0, 0);
            mockNavMeshQuery.findNearestPoly.mockReturnValue({
                success: false
            });

            const result = vision["getStartRef"](position);

            expect(result).toBe(null);
        });
    });
});
