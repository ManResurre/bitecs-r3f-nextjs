import {useGLTF} from "@react-three/drei";
import React, {useEffect, useMemo, useRef, useState} from "react";
import MuzzleFlash from "./MuzzleFlash.tsx";
import {Group, Mesh, Sprite, TextureLoader, Vector3} from "three";
import {useFrame, useLoader} from "@react-three/fiber";
import {GLTFLoader} from "three/examples/jsm/Addons.js";
import {AssaultRifleComponent} from "../../logic/components";

type AssaultRifleProps = {
    eid?: number
} & Partial<Group>;
const AssaultRifle = ({
                          eid,
                          ...rest
                      }: AssaultRifleProps) => {

    const weaponRef = useRef(null);
    const muzzleFlashRef = useRef<Sprite>(null);

    const {scene} = useGLTF("./models/assaultRifle_high.glb");

    const clonedScene = useMemo(() => {
        return scene.clone();
    }, [scene]);


    useEffect(() => {
        if (!clonedScene) return;

        clonedScene.traverse((child) => {
            if ((child as Mesh).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }, [clonedScene])

    const [muzzleFlashVisible, setMuzzleFlashVisible] = useState(true);

    // Основная логика в useFrame
    useFrame(() => {
        if (muzzleFlashVisible) {
            setMuzzleFlashVisible(false);
        }

        if (eid && AssaultRifleComponent.shoot[eid]) {
            setMuzzleFlashVisible(true);
        }
    });

    return (
        <group {...rest}>
            <primitive
                ref={weaponRef}
                object={clonedScene}/>
            <MuzzleFlash
                name="MuzzleFlash"
                ref={muzzleFlashRef}
                position={new Vector3(0, 0.05, 0.5)}
                visible={muzzleFlashVisible}
                size={0.4}
            />
        </group>
    );
};

useLoader.preload(GLTFLoader, './models/assaultRifle_high.glb');
useLoader.preload(TextureLoader, './textures/muzzle.png');
export default React.memo(AssaultRifle);
