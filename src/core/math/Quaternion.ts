import {Quaternion as TreeQuaternion} from "three";
import {Vector3} from "./Vector3.ts";
import {Matrix3} from "./Matrix3.ts";

const matrix = new Matrix3();

export class Quaternion extends TreeQuaternion {
    fromMatrix3(m: Matrix3) {

        const e = m.elements;

        const m11 = e[0], m12 = e[3], m13 = e[6];
        const m21 = e[1], m22 = e[4], m23 = e[7];
        const m31 = e[2], m32 = e[5], m33 = e[8];

        const trace = m11 + m22 + m33;

        if (trace > 0) {

            const s = 0.5 / Math.sqrt(trace + 1.0);

            this.w = 0.25 / s;
            this.x = (m32 - m23) * s;
            this.y = (m13 - m31) * s;
            this.z = (m21 - m12) * s;

        } else if ((m11 > m22) && (m11 > m33)) {

            const s = 2.0 * Math.sqrt(1.0 + m11 - m22 - m33);

            this.w = (m32 - m23) / s;
            this.x = 0.25 * s;
            this.y = (m12 + m21) / s;
            this.z = (m13 + m31) / s;

        } else if (m22 > m33) {

            const s = 2.0 * Math.sqrt(1.0 + m22 - m11 - m33);

            this.w = (m13 - m31) / s;
            this.x = (m12 + m21) / s;
            this.y = 0.25 * s;
            this.z = (m23 + m32) / s;

        } else {

            const s = 2.0 * Math.sqrt(1.0 + m33 - m11 - m22);

            this.w = (m21 - m12) / s;
            this.x = (m13 + m31) / s;
            this.y = (m23 + m32) / s;
            this.z = 0.25 * s;

        }

        return this;
    }

    lookAt(localForward: Vector3, targetDirection: Vector3, localUp: Vector3) {
        matrix.lookAt(localForward, targetDirection, localUp);
        this.fromMatrix3(matrix);
    }
}
