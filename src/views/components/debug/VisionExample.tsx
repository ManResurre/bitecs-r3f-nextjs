import {useRef, useState, useMemo, useEffect} from 'react';
import {useFrame, ThreeElements} from '@react-three/fiber';
import * as THREE from 'three';
import * as YUKA from 'yuka';
import {useWorld} from "../../hooks/useWorld.tsx";
import {GameEntity, MeshGeometry, Ray, Vector3} from "yuka";
import {Vision} from "../../../core/Vision.ts";
import {Soldier} from "../../../entities/soldier/Soldier.ts";

class ObstacleEntity extends GameEntity {
    geometry: MeshGeometry;

    constructor(geometry = new MeshGeometry()) {
        super();
        this.geometry = geometry;
    }

    lineOfSightTest(ray: Ray, intersectionPoint: Vector3) {
        return this.geometry.intersectRay(ray, this.worldMatrix, true, intersectionPoint);
    }
}

// Компонент для визуализации поля зрения
const VisionHelper = ({range, fieldOfView, division = 16, color = 'white'}) => {
    const geometry = useMemo(() => {
        const geom = new THREE.BufferGeometry();
        const vertices = [];
        const indices = [];

        vertices.push(0, 0, 0);

        for (let i = 0; i <= division; i++) {
            const angle = -fieldOfView / 2 + (i * fieldOfView) / division;
            const x = Math.sin(angle) * range;
            const z = Math.cos(angle) * range;
            vertices.push(x, 0, z);
        }

        for (let i = 1; i <= division; i++) {
            indices.push(0, i, i + 1);
        }

        geom.setIndex(indices);
        geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geom.computeVertexNormals();

        return geom;
    }, [range, fieldOfView, division]);

    return (
        <lineSegments geometry={geometry}>
            <lineBasicMaterial color={color}/>
        </lineSegments>
    );
};

// Основная игровая сущность с системой зрения Yuka
export const Watching = (props: ThreeElements['mesh'] & {
    visionRange: number;
    fov: number,
}) => {
    const meshRef = useRef<THREE.Mesh>(null!);
    const visionHelperRef = useRef<THREE.Group>(null!);
    const entityRef = useRef<YUKA.GameEntity>();
    const visionRef = useRef<YUKA.Vision>();
    const {entityManager} = useWorld();
    const gameEntity = useMemo(() => new YUKA.GameEntity(), [])
    const vision = useMemo(() => new YUKA.Vision(gameEntity), [])

    // Инициализация Yuka entities
    useEffect(() => {
        entityRef.current = gameEntity;
        visionRef.current = vision;

        entityRef.current.name = 'visor';

        visionRef.current.range = props.visionRange;
        visionRef.current.fieldOfView = props.fov;

        // Регистрируем сущность в менеджере
        entityManager.add(gameEntity);

        return () => {
            // Удаляем сущность при размонтировании
            entityManager.remove(gameEntity);
        };
    }, [props.visionRange, props.fov, entityManager]);

    useFrame(() => {
        if (meshRef.current && visionHelperRef.current && entityRef.current) {
            // Синхронизируем позицию Three.js меша с сущностью Yuka
            const position = meshRef.current.position;
            const rotation = meshRef.current.rotation;

            entityRef.current.position.set(position.x, position.y, position.z);
            entityRef.current.rotation.set(rotation.x, rotation.y, rotation.z);

            // Обновляем помощник зрения
            visionHelperRef.current.position.copy(position);
            visionHelperRef.current.rotation.copy(rotation);
        }
    });


    return (
        <>
            <mesh {...props} ref={meshRef} rotation={[0, 0, 0]}>
                <coneGeometry args={[0.1, 0.5, 8]}/>
                <meshNormalMaterial/>
            </mesh>

            <group ref={visionHelperRef}>
                <VisionHelper range={props.visionRange} fieldOfView={props.fov}/>
            </group>

            <Obstacle vision={vision} position={[0, 0, 3]}/>

            <Target vision={vision} position={[0, 0, 4]}/>
        </>
    );
};

// Препятствие для системы зрения
export const Obstacle = ({vision, ...rest}: ThreeElements['mesh'] & { vision?: YUKA.Vision }) => {
    const meshRef = useRef<THREE.Mesh>(null!);
    const planeGeometryRef = useRef<THREE.PlaneGeometry>(null!);

    const obstacleEntityRef = useRef<YUKA.GameEntity>();

    const {entityManager} = useWorld();

    useEffect(() => {
        if (!vision || vision.obstacles.length) return;

        const vertices = planeGeometryRef.current.attributes.position.array as Float32Array;
        const indices = planeGeometryRef.current.index?.array as Uint32Array;

        const geometry = new YUKA.MeshGeometry(vertices, indices);

        const obstacle = new ObstacleEntity(geometry);
        obstacleEntityRef.current = obstacle;

        vision.addObstacle(obstacle);
        entityManager.add(obstacle);

        return () => {
            if (vision) {
                vision.removeObstacle(obstacle);
            }
            entityManager.remove(obstacle);
        };
    }, [entityManager, vision]);

    useFrame(() => {
        if (meshRef.current && obstacleEntityRef.current) {
            const position = meshRef.current.position;
            const quaternion = meshRef.current.quaternion;

            // Синхронизируем позицию Three.js меша с сущностью Yuka
            obstacleEntityRef.current.position.set(position.x, position.y, position.z);
            obstacleEntityRef.current.rotation.copy(quaternion);
        }
    });

    return (
        <mesh {...rest} ref={meshRef} position={[0, 0, 3]} rotation={[0, Math.PI, 0]}>
            <planeGeometry ref={planeGeometryRef} args={[2, 2]}/>
            <meshBasicMaterial color={0x777777} side={THREE.DoubleSide}/>
        </mesh>
    );
};

// Цель с проверкой видимости через Yuka
export const Target = (props: ThreeElements['mesh'] & { entity?: Soldier }) => {
    const meshRef = useRef<THREE.Mesh>(null!);
    const [isVisible, setIsVisible] = useState(false);

    useFrame((state) => {
        if (meshRef.current) {
            // Анимируем движение цели
            const elapsed = state.clock.getElapsedTime();
            const newX = Math.sin(elapsed * 0.5) * 18;

            meshRef.current.position.set(newX, 0, 10);

            // Проверяем видимость через Yuka Vision
            if (props.entity) {
                // console.log(props.vision);
                const visible = props.entity.isVisible(meshRef.current.position);
                setIsVisible(visible);

                // Для отладки - выводим в консоль
                if (visible !== isVisible) {
                    console.log(`Target is ${visible ? 'visible' : 'not visible'}`);
                }
            }
        }
    });

    return (
        <mesh {...props} ref={meshRef}>
            <sphereGeometry args={[0.5, 16, 16]}/>
            <meshBasicMaterial color={isVisible ? 0x00ff00 : 0xff0000}/>
        </mesh>
    );
};
