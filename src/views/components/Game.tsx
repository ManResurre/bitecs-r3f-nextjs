import {Suspense} from "react";
import {OrbitControls, Sky, Stats} from '@react-three/drei';
import {Perf} from 'r3f-perf';
import {useLoaderData} from "@tanstack/react-router";
import {WorldContextProvider} from "../contexts/WorldContextProvider.tsx";
import Light from "./Light.tsx";
import GameScene from "./GameScene.tsx";
import {useControls} from "leva";
import {Vector3} from "three";
import CameraController from "./CameraController.tsx";
import OcclusionController from "./OcclusionController.tsx";

export function Game() {
    const {levelData} = useLoaderData({from: "/"});

    const {sunPosition, rayleigh, turbidity} = useControls('Sky', {
        sunPosition: {x: -700, y: 1000, z: -750},
        rayleigh: {min: 0, max: 10, value: 0.01}, //Night
        turbidity: {min: 0, max: 10, value: 0.5}
    })

    return (
        <>
            <OrbitControls/>
            <WorldContextProvider levelData={levelData}>
                {/*<CameraController/>*/}
                {/*<OcclusionController/>*/}
                <Suspense>
                    <Sky
                        distance={1000}
                        turbidity={turbidity}
                        rayleigh={rayleigh}
                        sunPosition={new Vector3().copy(sunPosition)}
                    />
                    <Light/>
                    {/*<fog attach="fog" color={0x0a0a1a} far={20}/>*/}
                    <GameScene/>
                    <Stats className="stats"/>
                    <Perf position={"bottom-right"}/>
                </Suspense>
            </WorldContextProvider>
        </>
    );
}
