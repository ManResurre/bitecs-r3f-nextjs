import React, {useEffect, useRef} from "react";
import {useLoader} from "@react-three/fiber";
import {GLTFLoader} from "three/examples/jsm/Addons.js";
import {Mesh, MeshBasicMaterial, MeshStandardMaterial} from "three";
import {useGLTF} from '@react-three/drei';
import {useWorld} from "../hooks/useWorld.tsx";

const Level_e = () => {
    const world = useWorld()

    const levelRef = useRef(null);

    const {scene} = useGLTF('./models/level_e1.glb');

    useEffect(() => {
        if (!scene) return;

        world.setLevelRef(levelRef);

        const mesh = scene.getObjectByName('level') as Mesh;

        // if (mesh && mesh.isMesh) {
        //     const material = mesh.material as MeshBasicMaterial;
        //
        //     // Создаем новый материал с явным указанием свойств
        //     const newMaterial = new MeshStandardMaterial({
        //         map: material.map || null,
        //         color: material.color,
        //         transparent: material.transparent,
        //         opacity: material.opacity,
        //         roughness: 0.8,
        //         metalness: 0.1,
        //     });
        //
        //     // Настройка anisotropy для основной текстуры
        //     if (newMaterial.map) {
        //         newMaterial.map.anisotropy = 4;
        //     }
        //
        //     mesh.material = newMaterial;
        //     // Обновляем материал меша
        //     mesh.material.needsUpdate = true;
        // }

        scene.traverse((child) => {
            if ((child as Mesh).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

    }, [scene]);

    useEffect(() => {
        if (!scene)
            return;
        world.initNav(scene, world);
    }, [scene])

    return <primitive position={[0,-4,0]}  ref={levelRef} object={scene}/>;
}

// Предзагрузка ресурсов
useLoader.preload(GLTFLoader, './models/level-e1.glb');

export default React.memo(Level_e);
