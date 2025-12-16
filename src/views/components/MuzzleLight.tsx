import React, {
    ForwardedRef,
    JSX,
    RefObject,
    useCallback, useEffect,
    useImperativeHandle,
    useRef,
} from 'react';
import {PointLight, PointLightHelper, Vector3} from "three";
import {useFrame} from "@react-three/fiber";
import {useWorld} from "../hooks/useWorld.tsx";
import {useHelper} from "@react-three/drei";

interface MuzzleFlashEvent {
    position: Vector3;
    intensity: number;
}

interface LightInstance {
    lightRef: RefObject<PointLight>;
    currentFlash: MuzzleFlashEvent | null;
}

interface MuzzleLightProps {
    baseIntensity?: number;
    distance?: number;
    color?: string;
    maxLights?: number;
    queueThreshold?: number;
}

type PointLightWithHelperProps = JSX.IntrinsicElements['pointLight'] & {
    debug?: boolean; // Добавляем проп для отладки
}

const PointLightWithHelper = ({
                                  debug = false,
                                  ...rest
                              }: PointLightWithHelperProps, forwardedRef: ForwardedRef<PointLight>) => {
    const lightRef = useRef<PointLight>(null) as RefObject<PointLight>;

    // Используем useImperativeHandle для передачи ref
    useImperativeHandle(forwardedRef, () => lightRef.current!);

    // Добавляем хелпер только если debug=true и свет существует
    useHelper(debug ? lightRef : null, PointLightHelper, 0.5, 'hotpink');

    return <pointLight ref={lightRef} {...rest} />;
};

// Обертываем в forwardRef
const PointLightWithHelperForwarded = React.forwardRef(PointLightWithHelper);

const MuzzleLight = ({
                         baseIntensity = 20,
                         distance = 5,
                         color = "#ff7b2c",
                         maxLights = 5,
                     }: MuzzleLightProps) => {

    const world = useWorld();
    // Очередь вспышек
    const flashQueue = useRef<MuzzleFlashEvent[]>([]);
    // Динамические источники света
    const lightInstances = useRef<LightInstance[]>(
        Array.from({length: maxLights}, () => ({
            lightRef: React.createRef<PointLight>() as RefObject<PointLight>,
            currentFlash: null,
        }))
    );
    // Очистка зависших вспышек
    const cleanupTimer = useRef(0);

    // Функция для добавления вспышки в очередь
    const addFlashToQueue = useCallback((position: Vector3, intensity: number = baseIntensity) => {
        flashQueue.current.push({
            position: position.clone(),
            intensity
        });
    }, [baseIntensity]);

    // Экспортируем функцию добавления вспышки в world
    useEffect(() => {
        if (world.muzzleFlashSystem)
            world.muzzleFlashSystem.set('addFlashToQueue', addFlashToQueue);

    }, [world, baseIntensity]);

    useFrame(() => {
        const instances = lightInstances.current;
        const queue = flashQueue.current;
        // Сначала сбрасываем все активные вспышки с предыдущего кадра
        for (const lightInstance of lightInstances.current) {
            if (lightInstance.lightRef.current) {
                lightInstance.lightRef.current.intensity = 0;
                lightInstance.currentFlash = null;
            }
        }

        // Затем обрабатываем очередь вспышек для текущего кадра
        for (const lightInstance of instances) {
            if (!lightInstance.lightRef.current) return;

            // Если у источника нет текущей вспышки, берем следующую из очереди
            if (!lightInstance.currentFlash && queue.length > 0) {
                const nextFlash = queue.shift()!;
                lightInstance.currentFlash = nextFlash;

                // Устанавливаем позицию и интенсивность света
                lightInstance.lightRef.current.position.copy(nextFlash.position);
                lightInstance.lightRef.current.intensity = nextFlash.intensity;
            }
        }

        // Логируем состояние системы (можно убрать в продакшене)
        if (flashQueue.current.length > 5) {
            console.log(`Queue: ${flashQueue.current.length}, Total Lights: ${lightInstances.current.length}`);
        }

        cleanupTimer.current++;
        if (cleanupTimer.current > 180) { // Каждые 3 секунды при 60 FPS
            cleanupTimer.current = 0;

            // Удаляем старые вспышки из очереди (если они там слишком долго)
            if (queue.length > 10) {
                flashQueue.current = queue.slice(-10); // Оставляем только 10 последних
                console.log("Cleaned up flash queue");
            }
        }
    });

    return (
        <>
            {lightInstances.current.map((lightInstance, index) => <PointLightWithHelperForwarded
                    key={index}
                    ref={lightInstance.lightRef}
                    intensity={0}
                    distance={distance}
                    color={color}
                    decay={2}
                    castShadow
                />
            )}
        </>
    );
};

export default React.memo(MuzzleLight);
