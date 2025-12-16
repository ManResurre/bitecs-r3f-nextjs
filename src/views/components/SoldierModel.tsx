import {Html, useAnimations, useGLTF} from "@react-three/drei";
import React, {RefObject, useEffect, useMemo, useRef, useState} from "react";
import {cloneWithSkinning} from "../../utils/SceneHelper.ts";
import {Group, MeshBasicMaterial, SphereGeometry} from "three";
import {useWorld} from "../hooks/useWorld.tsx";
import {useFrame} from "@react-three/fiber";
import AssaultRifle from "./AssaultRifle.tsx";
import DebugArrows, {DebugArrowsRef} from "./debug/DebugArrows.tsx";
import {VisionHelper} from "./debug/VisionHelper.tsx";
import {Target} from "./debug/VisionExample.tsx";
import {useControls} from "leva";
import {CrowdAgentComponent} from "../../logic/components";
import {Vector3} from "../../core/math/Vector3.ts";

export interface SoldierModelProps {
    eid: number;
    scale?: number;
    castShadow?: boolean;
    receiveShadow?: boolean;
    debug?: boolean;
}

const SoldierModel = ({eid, ...props}: SoldierModelProps) => {
    const world = useWorld();
    const soldierRef = useRef<Group>(null);
    const weaponRef = useRef<Group>(null);
    const debugArrowsRef = useRef<DebugArrowsRef>(null);
    const visionHelperRef = useRef<Group>(null);
    const targetSpheresRef = useRef<Group>(null); // Ref для сфер целей
    const soldierEntity = useMemo(() => world.getSoldier(eid), [eid, world]);

    const [status, setStatus] = useState<string>('');

    const {
        boundsHelperDebug,
        arrowsHelperDebug,
        targetSHelperDebug,
        visionHelperDebug,
        targetHelper,
        statusHelper
    } = useControls('Soldier', {
        boundsHelperDebug: false,
        arrowsHelperDebug: true,
        targetSHelperDebug: false,
        visionHelperDebug: false,
        targetHelper: false,
        statusHelper: true
    }, {collapsed: true})

    // const mobEntity = useMemo(() => {
    //     return world.entityManager?.getEntityByName(`mob_${eid}`) as Mob;
    // }, [world.entityManager, eid]);
    //
    const crowdAgent = useMemo(() => {
        return world.crowd?.getAgent(CrowdAgentComponent.crowdId[eid]);
    }, [world.crowd, eid]);

    const {scene, animations} = useGLTF("./models/soldier.glb");
    const animation = useAnimations(animations, soldierRef);

    const clonedScene = useMemo(() => {
        return cloneWithSkinning(scene);
    }, [scene])

    // Находим кость руки для прикрепления оружия
    const rightHandBone = useMemo(() => {
        return clonedScene.getObjectByName("Armature_mixamorigRightHand");
    }, [clonedScene]);

    // Привязываем оружие к кости один раз при монтировании
    useEffect(() => {
        if (weaponRef.current && rightHandBone) {
            if (weaponRef.current.parent) {
                if (weaponRef.current.parent != rightHandBone) {
                    weaponRef.current.parent.remove(weaponRef.current);
                }
            }

            if (!weaponRef.current.parent) {
                rightHandBone.add(weaponRef.current);
                weaponRef.current.position.set(-5, 20, 7);
                weaponRef.current.rotation.set(Math.PI / 2.15, Math.PI, 0);
                weaponRef.current.scale.set(100, 100, 100);
            }
        }
    }, [rightHandBone]);

    useEffect(() => {
        if (!soldierEntity)
            return;

        soldierEntity.setRenderComponentRef(soldierRef as RefObject<Group>);
        soldierEntity.setAnimation(animation);
        soldierEntity.setWeaponRef(weaponRef as RefObject<Group>);

    }, [animation]);

    // Создаем геометрию и материал для сфер целей
    const targetSphereGeometry = useMemo(() => new SphereGeometry(1, 8, 8), []);
    const targetSphereMaterial = useMemo(() => new MeshBasicMaterial({color: 0x0000A3}), []);

    // Обновляем направления в useFrame
    useFrame(() => {
        if (crowdAgent && soldierRef.current) {
            // Позиция всегда синхронизирована
            soldierRef.current.position.copy(crowdAgent.position()).add(new Vector3(0,-0.2,0));
            soldierRef.current.quaternion.copy(soldierEntity.rotation);

            if (debugArrowsRef.current) {
                debugArrowsRef.current.position.copy(soldierEntity.position);

                debugArrowsRef.current.lookDirection.copy(soldierEntity.lookDirection);
                debugArrowsRef.current.moveDirection.copy(soldierEntity.moveDirection);
            }

            // Обновляем VisionHelper напрямую из данных моба
            if (visionHelperRef.current) {
                visionHelperRef.current.position.copy(soldierEntity.position).add(new Vector3(0, 1.5, 0));
                visionHelperRef.current.quaternion.copy(soldierEntity.rotation);
            }
            //
            //     // Обновляем сферы целей
            //     if (targetSpheresRef.current && mobEntity.memoryRecords) {
            //         // Очищаем предыдущие сферы
            //         while (targetSpheresRef.current.children.length > 0) {
            //             targetSpheresRef.current.remove(targetSpheresRef.current.children[0]);
            //         }
            //
            //         // Создаем сферы для видимых целей
            //         mobEntity.memoryRecords.forEach((record) => {
            //             if (record.visible && record.entity) {
            //                 const sphere = new Mesh(targetSphereGeometry, targetSphereMaterial);
            //                 sphere.position.copy(record.lastSensedPosition);
            //                 targetSpheresRef.current!.add(sphere);
            //             }
            //         });
            //     }
            //
            if (statusHelper)
                setStatus(soldierEntity.getStatus())
        }
    });


    // const debugBounds = useDebugCharacterBounds(mobEntity.bounds, {
    //     enabled: true,
    //     outerColor: 0xff0000,
    //     innerColor: 0x00ff00
    // });

    return (
        <>
            <primitive
                ref={soldierRef}
                object={clonedScene}
                {...props}
            >
                {statusHelper &&
                    <Html style={{
                        fontSize: '10px',
                        background: 'rgba(34, 38, 42, 0.5)',
                        borderRadius: '5px',
                        padding: '5px'
                    }}
                          position={[0, 2, 0]}>
                        {status}
                    </Html>
                }
            </primitive>
            <AssaultRifle ref={weaponRef} eid={soldierEntity?.arId}/>

            {visionHelperDebug && <VisionHelper
                ref={visionHelperRef}
                fieldOfView={soldierEntity.vision.fieldOfView}
                range={soldierEntity.vision.range}
                division={16}
                color="white"
            />}
            {targetHelper && <Target entity={soldierEntity} position={[0, 0, 0]}/>}
            {/*{targetSHelperDebug &&*/}
            {/*    <group ref={targetSpheresRef}/>*/}
            {/*}*/}
            {/*{boundsHelperDebug && debugBounds}*/}
            {arrowsHelperDebug && <DebugArrows ref={debugArrowsRef}/>}
        </>
    );
};

export default React.memo(SoldierModel);
