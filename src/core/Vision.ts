import {NavMeshQuery, QueryFilter, NavMesh} from "recast-navigation";
import {Vector3} from "./math/Vector3.ts";

export class Vision {
    private navMeshQuery: NavMeshQuery;
    private filter: QueryFilter;

    public fieldOfView = 120;
    public range = 20;

    constructor(navMesh: NavMesh) {
        this.navMeshQuery = new NavMeshQuery(navMesh);
        this.filter = new QueryFilter();
    }

    private getStartRef(position: Vector3): number | null {
        const nearestPoly = this.navMeshQuery.findNearestPoly(position, {
            filter: this.filter,
            halfExtents: {x: 2, y: 4, z: 2} // Увеличиваем область поиска
        });

        if (!nearestPoly.success) {
            console.warn('Cannot find start polygon for position:', position);
            return null;
        }

        return nearestPoly.nearestRef;
    }

    checkFieldOfView(
        agentPosition: Vector3,
        agentDirection: Vector3,
        targetPosition: Vector3,
        maxDistance: number = this.range,
        fovAngle: number = this.fieldOfView
    ): boolean {
        const toTarget = new Vector3()
            .copy(targetPosition)
            .sub(agentPosition);

        const distance = toTarget.lengthSq();

        // Проверяем расстояние
        if (distance > maxDistance * maxDistance/2) {
            return false;
        }

        const directionNormalized = toTarget.normalize();
        const agentDirectionNormalized = agentDirection.normalize();

        // Используем angleTo для более точного вычисления
        const angle = agentDirectionNormalized.angleTo(directionNormalized) * (180 / Math.PI);

        if (angle > fovAngle / 2) {
            return false;
        }

        // Проверяем прямую видимость
        return this.canSee(agentPosition, targetPosition);
    }

    canSee(from: Vector3, to: Vector3): boolean {
        const startRef = this.getStartRef(from);
        if (!startRef) {
            return false;
        }

        const hit = this.navMeshQuery.raycast(
            startRef,
            from,
            to,
            {filter: this.filter}
        );

        return hit.t >= 1;
    }
}
