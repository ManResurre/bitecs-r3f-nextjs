import React, {RefObject, useEffect, useRef} from "react";
import {CameraHelper, DirectionalLight, DirectionalLightHelper, Object3D} from "three";
import {useHelper} from "@react-three/drei";
import {useControls} from "leva";
import {useThree} from "@react-three/fiber";

const Light = () => {
    const {scene} = useThree();
    const dr = useRef<DirectionalLight>(null);
    const targetRef = useRef<Object3D>(null);

    useHelper(dr as RefObject<DirectionalLight>, DirectionalLightHelper, 1, "red");
    const {intensity, x, y, z, targetX, targetY, targetZ, color, showHelper} = useControls('Light', {
        intensity: {value: 2, min: 0, max: 15},
        x: {value: 0, min: -30, max: 30},
        y: {value: 40, min: -30, max: 40},
        z: {value: -30, min: -30, max: 30},
        targetX: {value: 0, min: -10, max: 10},
        targetY: {value: 0, min: -10, max: 10},
        targetZ: {value: 0, min: -10, max: 10},
        color: {value: "#ffffff"}, // Холодный синий цвет лунного света
        showHelper: false
    }, {collapsed: true})

    useEffect(() => {
        if (!dr.current || !targetRef.current) return;

        // Устанавливаем позицию цели
        targetRef.current.position.set(targetX, targetY, targetZ);

        // Привязываем цель к свету
        dr.current.target = targetRef.current;

        // Добавляем цель в сцену (это важно!)
        scene.add(targetRef.current);

        const helper = new CameraHelper(dr.current.shadow.camera);
        if (showHelper)
            scene.add(helper);

        return () => {
            scene.remove(helper);
            if (targetRef.current) {
                scene.remove(targetRef.current);
            }
        };
    }, [scene, targetX, targetY, targetZ]);

    return (

        <directionalLight
            ref={dr}
            color={color}
            position={[x, y, z]}
            castShadow
            intensity={intensity}
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-50}
            shadow-camera-right={50}
            shadow-camera-top={50}
            shadow-camera-bottom={-50}
            shadow-camera-near={0.1}
            shadow-camera-far={90}
            shadow-bias={-0.0005}
        >
            <object3D ref={targetRef}/>
        </directionalLight>

    )
}

export default React.memo(Light);
