import {Vector3} from "../../../core/math/Vector3.ts";
import {CrowdAgent} from "recast-navigation";
import {Quaternion} from "../../../core/math/Quaternion.ts";

export interface EntityControl {
    cameraQuaternion?: Quaternion;
    crowdAgent: CrowdAgent;

    update(delta: number): void;
}

export function WithControl<T extends new (...args: any[]) => EntityControl>(Base: T) {
    return class extends Base implements EntityControl {
        private keys = new Set<string>();
        private movementSpeed = 5;

        constructor(...args: any[]) {
            super(...args);
            this.setupEventListeners();
        }

        private applyCameraRotation(input: Vector3): Vector3 {
            if (!this.cameraQuaternion) return input.normalize();

            // Альтернативный метод - используем векторы направления камеры
            const cameraForward = new Vector3(0, 0, -1).applyQuaternion(this.cameraQuaternion);
            const cameraRight = new Vector3(1, 0, 0).applyQuaternion(this.cameraQuaternion);

            // Обнуляем Y компоненты для работы в горизонтальной плоскости
            cameraForward.y = 0;
            cameraRight.y = 0;
            cameraForward.normalize();
            cameraRight.normalize();

            // Комбинируем направления на основе ввода
            const worldInput = new Vector3();
            worldInput.addScaledVector(cameraForward, -input.z); // Учитываем, что вперед = -Z
            worldInput.addScaledVector(cameraRight, input.x);

            return worldInput.normalize();
        }

        update(delta: number) {
            super.update(delta);
            const velocity = this.getInputVector();
            this.crowdAgent.requestMoveVelocity(velocity.multiplyScalar(this.movementSpeed));
        }

        private setupEventListeners() {
            if (window) {
                window.addEventListener('keydown', this.handleKeyDown);
                window.addEventListener('keyup', this.handleKeyUp);
            }
        }

        private handleKeyDown = (event: KeyboardEvent) => {
            this.keys.add(event.key.toLowerCase());
        }

        private handleKeyUp = (event: KeyboardEvent) => {
            this.keys.delete(event.key.toLowerCase());
        }

        protected getInputVector(): Vector3 {
            const input = new Vector3();

            if (this.keys.has('w') || this.keys.has('arrowup')) input.z -= 1;
            if (this.keys.has('s') || this.keys.has('arrowdown')) input.z += 1;
            if (this.keys.has('a') || this.keys.has('arrowleft')) input.x -= 1;
            if (this.keys.has('d') || this.keys.has('arrowright')) input.x += 1;

            if (input.lengthSq() === 0) return input;

            if (this.cameraQuaternion) {
                return this.applyCameraRotation(input);
            }
            return input.normalize();
        }
    };
}
