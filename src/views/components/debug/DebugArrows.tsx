// DebugArrows.tsx
import { ForwardedRef, forwardRef, useImperativeHandle, useRef } from 'react';
import { Vector3 as TREEVector3, ArrowHelper, Group } from 'three';
import { useFrame } from '@react-three/fiber';
import {Vector3} from "../../../core/math/Vector3.ts";

export type DebugArrowsProps = {
    lookDirection?: Vector3;
    moveDirection?: Vector3;
    enabled?: boolean;
} & Partial<Group>;

export type DebugArrowsRef = {
    lookDirection: Vector3;
    moveDirection: Vector3;
} & Group;

const DebugArrows = ({
                         position = new TREEVector3(),
                         lookDirection = new Vector3(),
                         moveDirection = new Vector3(),
                         enabled = true,
                         ...rest
                     }: DebugArrowsProps, forwardedRef: ForwardedRef<DebugArrowsRef>) => {

    const groupRef = useRef<Group>(null);
    const lookDirectionRef = useRef<Vector3>(lookDirection);
    const moveDirectionRef = useRef<Vector3>(moveDirection);

    const lookArrowRef = useRef<ArrowHelper>(null);
    const moveArrowRef = useRef<ArrowHelper>(null);

    useImperativeHandle(forwardedRef, () => ({
        ...groupRef.current!,
        get lookDirection() {
            return lookDirectionRef.current;
        },
        set lookDirection(value: Vector3) {
            lookDirectionRef.current.copy(value);
        },
        get moveDirection() {
            return moveDirectionRef.current;
        },
        set moveDirection(value: Vector3) {
            moveDirectionRef.current.copy(value);
        }
    } as DebugArrowsRef), []);

    useFrame(() => {
        if (!enabled) return;

        const ld = lookDirectionRef.current.clone().normalize();
        const md = moveDirectionRef.current.clone().normalize();

        // Обновляем стрелку направления взгляда (красная)
        if (lookArrowRef.current) {
            lookArrowRef.current.position.copy(position);
            lookArrowRef.current.setDirection(new TREEVector3(ld.x, ld.y, ld.z));
            lookArrowRef.current.setLength(1, 0.2, 0.1);
        }

        // Обновляем стрелку направления движения (синяя)
        if (moveArrowRef.current) {
            moveArrowRef.current.position.copy(position);
            moveArrowRef.current.setDirection(new TREEVector3(md.x, md.y, md.z));
            moveArrowRef.current.setLength(0.8, 0.15, 0.08);
        }
    });

    if (!enabled) return null;

    return (
        <group ref={groupRef} {...rest}>
            <arrowHelper
                ref={lookArrowRef}
                args={[new TREEVector3(0, 0, 1), position, 1, 0xff0000]}
            />
            <arrowHelper
                ref={moveArrowRef}
                args={[new TREEVector3(0, 0, 1), position, 0.8, 0x0000ff]}
            />
        </group>
    );
};

export default forwardRef(DebugArrows);
