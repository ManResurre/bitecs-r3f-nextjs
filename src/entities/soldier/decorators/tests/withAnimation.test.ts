import { describe, it, expect, vi, beforeEach } from 'vitest';
import {Vector3} from "../../../../core/math/Vector3.ts";
import {ANIMATION_FLAGS, WithAnimation} from "../WithAnimation.ts";
import {Quaternion} from "../../../../core/math/Quaternion.ts";


// Моки для зависимостей
vi.mock('three', () => ({
    AnimationClip: vi.fn()
}));

vi.mock('../Soldier.ts', () => ({
    Api: vi.fn()
}));

vi.mock('recast-navigation', () => ({
    CrowdAgent: vi.fn()
}));

describe('WithAnimation', () => {
    let mockEntity;
    let mockAnimationApi;
    let mockCrowdAgent;

    beforeEach(() => {
        mockCrowdAgent = {
            velocity: vi.fn(() => new Vector3(0, 0, 0))
        };

        mockAnimationApi = {
            actions: {
                soldier_idle: {
                    play: vi.fn(),
                    stop: vi.fn(),
                    enabled: true,
                    weight: 0,
                    timeScale: 1,
                    isRunning: vi.fn(() => false)
                },
                soldier_forward: {
                    enabled: true,
                    weight: 0,
                    timeScale: 1,
                    play: vi.fn(),
                    isRunning: vi.fn(() => false)
                },
                soldier_backward: {
                    enabled: true,
                    weight: 0,
                    timeScale: 1,
                    play: vi.fn(),
                    isRunning: vi.fn(() => false)
                },
                soldier_left: {
                    enabled: true,
                    weight: 0,
                    timeScale: 1,
                    play: vi.fn(),
                    isRunning: vi.fn(() => false)
                },
                soldier_right: {
                    enabled: true,
                    weight: 0,
                    timeScale: 1,
                    play: vi.fn(),
                    isRunning: vi.fn(() => false)
                }
            }
        };

        // Базовый класс для тестирования
        class TestEntity {
            animation = mockAnimationApi;
            lookDirection = new Vector3(0, 0, 1);
            moveDirection = new Vector3(0, 0, 0);
            rotation = new Quaternion();
            crowdAgent = mockCrowdAgent;
            speed = 5;
            maxSpeed = 10;
            position = new Vector3(0, 0, 0);

            isVelocityZero() {
                return this.moveDirection.length() === 0;
            }

            update(delta: number) {
                // Базовая реализация
            }
        }

        mockEntity = new (WithAnimation(TestEntity))();
    });

    describe('updateAnimations', () => {
        it('should play idle animation when velocity is zero', () => {
            mockEntity.moveDirection.set(0, 0, 0);
            mockCrowdAgent.velocity.mockReturnValue(new Vector3(0, 0, 0));

            mockEntity.updateAnimations();

            expect(mockAnimationApi.actions.soldier_idle.play).toHaveBeenCalled();
        });

        it('should stop idle animation when moving', () => {
            mockEntity.moveDirection.set(1, 0, 0);
            mockCrowdAgent.velocity.mockReturnValue(new Vector3(1, 0, 0));

            mockEntity.updateAnimations();

            expect(mockAnimationApi.actions.soldier_idle.stop).toHaveBeenCalled();
        });

        it('should calculate correct animation weights for forward movement', () => {
            mockEntity.lookDirection.set(0, 0, 1);
            mockEntity.moveDirection.set(0, 0, 1);
            mockCrowdAgent.velocity.mockReturnValue(new Vector3(0, 0, 1));

            mockEntity.updateAnimations();

            // При движении вперед вес анимации forward должен быть максимальным
            expect(mockAnimationApi.actions.soldier_forward.weight).toBeGreaterThan(0);
            expect(mockAnimationApi.actions.soldier_forward.enabled).toBe(true);
        });

        it('should set activeAnimations flags correctly', () => {
            mockEntity.lookDirection.set(0, 0, 1);
            mockEntity.moveDirection.set(0, 0, 1);
            mockCrowdAgent.velocity.mockReturnValue(new Vector3(0, 0, 1));

            mockEntity.updateAnimations();

            // Должен быть установлен флаг для forward анимации
            expect(mockEntity['activeAnimations'] & ANIMATION_FLAGS.soldier_forward).toBeTruthy();
        });

        it('should normalize animation weights correctly', () => {
            // Настраиваем движение по диагонали (forward + right)
            mockEntity.lookDirection.set(0, 0, 1);
            mockEntity.moveDirection.set(0.5, 0, 0.5);
            mockCrowdAgent.velocity.mockReturnValue(new Vector3(0.5, 0, 0.5));

            mockEntity.updateAnimations();

            const forwardWeight = mockAnimationApi.actions.soldier_forward.weight;
            const rightWeight = mockAnimationApi.actions.soldier_right.weight;
            const totalWeight = forwardWeight + rightWeight;

            // Веса должны быть нормализованы (сумма = 1)
            expect(totalWeight).toBeCloseTo(1);
        });

        it('should update timeScale based on speed', () => {
            mockEntity.speed = 8;
            mockEntity.maxSpeed = 10;
            mockEntity.lookDirection.set(0, 0, 1);
            mockEntity.moveDirection.set(0, 0, 1);
            mockCrowdAgent.velocity.mockReturnValue(new Vector3(0, 0, 1));

            mockEntity.updateAnimations();

            // timeScale должен быть speed / maxSpeed = 0.8
            expect(mockAnimationApi.actions.soldier_forward.timeScale).toBe(0.8);
        });

        it('should clamp timeScale between 0.1 and 2.0', () => {
            mockEntity.speed = 30; // Превышает maxSpeed
            mockEntity.maxSpeed = 10;
            mockEntity.lookDirection.set(0, 0, 1);
            mockEntity.moveDirection.set(0, 0, 1);
            mockCrowdAgent.velocity.mockReturnValue(new Vector3(0, 0, 1));

            mockEntity.updateAnimations();

            expect(mockAnimationApi.actions.soldier_forward.timeScale).toBe(2.0);

            mockEntity.speed = 0.5;
            mockEntity.updateAnimations();

            expect(mockAnimationApi.actions.soldier_forward.timeScale).toBe(0.1);
        });

        it('should not process animations if animation API is not available', () => {
            mockEntity.animation = undefined;

            expect(() => mockEntity.updateAnimations()).not.toThrow();
        });
    });

    describe('update', () => {
        it('should call parent update and updateAnimations', () => {
            const parentUpdateSpy = vi.spyOn(Object.getPrototypeOf(mockEntity), 'update');
            const updateAnimationsSpy = vi.spyOn(mockEntity, 'updateAnimations');

            mockEntity.update(0.016);

            expect(parentUpdateSpy).toHaveBeenCalledWith(0.016);
            expect(updateAnimationsSpy).toHaveBeenCalled();
        });
    });
});
