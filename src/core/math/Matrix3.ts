import {Matrix3 as TreeMatrix3} from "three";
import {Vector3} from "./Vector3.ts";

const WorldUp = new Vector3(0, 1, 0);
const localRight = new Vector3();
const worldRight = new Vector3();
const perpWorldUp = new Vector3();
const temp = new Vector3();

export class Matrix3 extends TreeMatrix3 {
    makeBasis(xAxis: Vector3, yAxis: Vector3, zAxis: Vector3) {
        this.set(
            xAxis.x, yAxis.x, zAxis.x,
            xAxis.y, yAxis.y, zAxis.y,
            xAxis.z, yAxis.z, zAxis.z
        );

        return this;
    }

    lookAt(localForward: Vector3, targetDirection: Vector3, localUp: Vector3) {

        localRight.crossVectors(localUp, localForward).normalize();

        // orthonormal linear basis A { localRight, localUp, localForward } for the object local space

        worldRight.crossVectors(WorldUp, targetDirection).normalize();

        if (worldRight.squaredLength() === 0) {

            // handle case when it's not possible to build a basis from targetDirection and worldUp
            // slightly shift targetDirection in order to avoid collinearity

            temp.copy(targetDirection).addScalar(Number.EPSILON);
            worldRight.crossVectors(WorldUp, temp).normalize();

        }

        perpWorldUp.crossVectors(targetDirection, worldRight).normalize();

        // orthonormal linear basis B { worldRight, perpWorldUp, targetDirection } for the desired target orientation
        const m1 = new Matrix3();
        const m2 = new Matrix3();

        m1.makeBasis(worldRight, perpWorldUp, targetDirection);
        m2.makeBasis(localRight, localUp, localForward);

        // construct a matrix that maps basis A to B

        this.multiplyMatrices(m1, m2.transpose());

        return this;
    }
}

