import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Vector3 } from "../../core/math/Vector3.ts";
import { useWorld } from "../hooks/useWorld.tsx";
import { PlayerEntity } from "../../entities/soldier/PlayerEntity.ts";
import { useControls } from "leva";
import { Quaternion } from "../../core/math/Quaternion.ts";

const CameraController = () => {
    const { camera, gl } = useThree();
    const world = useWorld();
    const currentPosition = useRef(new Vector3());

    const isRightButtonPressed = useRef(false);
    const currentAngle = useRef(-45);
    const previousMouseX = useRef(0);

    // --- Leva + параметры для фокусировки курсора и удержания персонажа ---
    const {
        distance,
        height,
        offsetX,
        offsetZ,
        fov,
        smoothness,
        rotateX,
        rotateY,
        maxOffsetX,
        maxOffsetZ,
        screenMargin // доля экрана (0..0.5) — внутренняя граница, где персонаж должен оставаться
    } = useControls("Camera", {
        distance: { value: 12, min: 3, max: 30, step: 0.5 },
        height: { value: 30, min: 1, max: 50, step: 0.5 },
        offsetX: { value: 0.5, min: -30, max: 30, step: 0.1 },
        offsetZ: { value: -0.5, min: -30, max: 30, step: 0.1 },
        fov: { value: 50, min: 30, max: 90, step: 1 },
        smoothness: { value: 8, min: 1, max: 15, step: 0.5 },
        rotateX: { value: 70, min: 0, max: 89, step: 1 },
        rotateY: { value: 0, min: -180, max: 180, step: 1 },

        // новые контролы
        maxOffsetX: { value: 15, min: 0, max: 50, step: 0.1 },
        maxOffsetZ: { value: 12, min: 0, max: 50, step: 0.1 },
        screenMargin: { value: 0.18, min: 0, max: 0.45, step: 0.01 }
    });

    useEffect(() => {
        camera.fov = fov;
        camera.near = 0.1;
        camera.far = 1000;
        camera.updateProjectionMatrix();
    }, [fov, camera]);

    useEffect(() => {
        currentAngle.current = rotateY;
    }, [rotateY]);

    // ref для хранения позиции курсора в canvas (px)
    const mousePos = useRef({ x: 0, y: 0 });
    // таргет смещения, которое будет применено к камере (мировые координаты по X и Z)
    const targetOffset = useRef({ x: 0, z: 0 });
    // текущие дополнительные смещения (плавные)
    const dynamicOffset = useRef({ x: 0, z: 0 });

    useEffect(() => {
        const dom = gl.domElement;

        const onMove = (e: MouseEvent) => {
            const rect = dom.getBoundingClientRect();
            // координаты курсора внутри canvas
            const cx = e.clientX - rect.left;
            const cy = e.clientY - rect.top;
            mousePos.current.x = cx;
            mousePos.current.y = cy;
        };

        // отслеживаем и при наведении на canvas
        dom.addEventListener("mousemove", onMove);
        // также на случай когда курсор вне canvas но клики были — сохраняем позицию window
        window.addEventListener("mousemove", onMove);

        return () => {
            dom.removeEventListener("mousemove", onMove);
            window.removeEventListener("mousemove", onMove);
        };
    }, [gl]);

    useEffect(() => {
        const handleMouseDown = (event: MouseEvent) => {
            if (event.button === 2) {
                isRightButtonPressed.current = true;
                previousMouseX.current = event.clientX;
                gl.domElement.style.cursor = "grabbing";
                gl.domElement.style.pointerEvents = "auto";
                event.preventDefault();
            }
        };

        const handleMouseUp = (event: MouseEvent) => {
            if (event.button === 2) {
                isRightButtonPressed.current = false;
                gl.domElement.style.cursor = "default";
                event.preventDefault();
            }
        };

        const handleMouseMove = (event: MouseEvent) => {
            if (!isRightButtonPressed.current) return;
            const deltaX = event.clientX - previousMouseX.current;
            currentAngle.current += deltaX * 0.3;
            previousMouseX.current = event.clientX;
            event.preventDefault();
        };

        const handleContextMenu = (event: Event) => event.preventDefault();
        const handleWheel = (event: WheelEvent) => {
            if (event.target === gl.domElement) event.preventDefault();
        };

        const domElement = gl.domElement;
        domElement.addEventListener("mousedown", handleMouseDown);
        domElement.addEventListener("mouseup", handleMouseUp);
        domElement.addEventListener("mousemove", handleMouseMove);
        domElement.addEventListener("contextmenu", handleContextMenu);
        domElement.addEventListener("wheel", handleWheel, { passive: false });

        return () => {
            domElement.removeEventListener("mousedown", handleMouseDown);
            domElement.removeEventListener("mouseup", handleMouseUp);
            domElement.removeEventListener("mousemove", handleMouseMove);
            domElement.removeEventListener("contextmenu", handleContextMenu);
            domElement.removeEventListener("wheel", handleWheel);
        };
    }, [gl]);

    // временные объекты three.js для проекции и кватернионы
    const threeVec = new THREE.Vector3();
    const qTempA = new Quaternion();
    const qTempB = new Quaternion();
    const qFinal = new Quaternion();

    useFrame((_, delta) => {
        if (!world.playerId) return;
        const player = world.entityManager.get(world.playerId!) as PlayerEntity;
        if (!player) return;

        // --- стандартный расчёт позиции камеры по углу/дистанции/высоте ---
        const playerPos = player.position;
        const angleInRadians = currentAngle.current * (Math.PI / 180);
        const horizontalDistance = distance * Math.cos((height * 0.1) * Math.PI / 180);
        const verticalHeight = height;

        const cameraOffsetX = Math.sin(angleInRadians) * horizontalDistance;
        const cameraOffsetZ = Math.cos(angleInRadians) * horizontalDistance;

        const targetCamPos = new Vector3(
            playerPos.x + cameraOffsetX,
            playerPos.y + verticalHeight,
            playerPos.z + cameraOffsetZ
        );

        const t = Math.min(1, smoothness * delta);
        currentPosition.current.lerp(targetCamPos, t);

        // --- вычисляем динамическое смещение на основе позиции курсора внутри canvas ---
        const rect = gl.domElement.getBoundingClientRect();
        const canvasW = rect.width;
        const canvasH = rect.height;
        // если курсор вне canvas -- не применять сильного смещения
        const cx = mousePos.current.x;
        const cy = mousePos.current.y;
        const insideCanvas = cx >= 0 && cy >= 0 && cx <= canvasW && cy <= canvasH;

        // нормализованные координаты относительно центра: range [-1,1]
        const normX = insideCanvas ? (cx / canvasW) * 2 - 1 : 0;
        const normY = insideCanvas ? (cy / canvasH) * 2 - 1 : 0;
        // инверсия Y: в NDC вверху = +1, но для смещения по Z удобнее использовать отрицательное направление
        const normYInv = -normY;

        // функция "мягкого окна" у края: чем ближе к краю, тем больше множитель (0..1)
        const edgeFactor = (v: number) => {
            // v in [-1,1], расстояние от центра: d in [0,1]
            const d = Math.abs(v);
            // если d < centerThreshold => 0, иначе растёт до 1
            const centerThreshold = 0.25; // можно вынести в контрол
            if (d <= centerThreshold) return 0;
            return Math.min(1, (d - centerThreshold) / (1 - centerThreshold));
        };

        const fx = edgeFactor(normX) * Math.sign(normX); // -1..1
        const fz = edgeFactor(normYInv) * Math.sign(normYInv); // -1..1

        // целевое динамическое смещение в мировой плоскости (учитываем угол камеры)
        // смещение по локальной оси камеры: offsetRight (по X локально), offsetForward (по Z локально)
        const desiredLocalOffsetRight = fx * maxOffsetX; // вправо/влево
        const desiredLocalOffsetForward = -fz * maxOffsetZ; // вперёд/назад (относительно камеры)

        // перевод локального смещения в мировые координаты (учёт yaw only)
        const yaw = angleInRadians;
        const cosY = Math.cos(yaw);
        const sinY = Math.sin(yaw);
        // локальная правая ось камеры (world)
        const rightWorldX = cosY;
        const rightWorldZ = -sinY;
        // локальная вперёд ось камеры (world) — куда камера "смотрит" по горизонтали (от игрока)
        const forwardWorldX = sinY;
        const forwardWorldZ = cosY;

        // комбинируем
        const worldOffsetX =
            desiredLocalOffsetRight * rightWorldX + desiredLocalOffsetForward * forwardWorldX;
        const worldOffsetZ =
            desiredLocalOffsetRight * rightWorldZ + desiredLocalOffsetForward * forwardWorldZ;

        // назначаем targetOffset (плюс базовый offset из Leva)
        targetOffset.current.x = worldOffsetX;
        targetOffset.current.z = worldOffsetZ;

        // --- защита: не позволяем персонажу выйти за пределы экранной области screenMargin ---
        // проецируем мировую позицию (player + текущ динамический offset + base offset) на экран (NDC)
        // рассчитываем потенциальная итоговая позиция камеры (мир), применяем targetOffset и base offset
        const camWorldPos = currentPosition.current.clone().add(new Vector3(offsetX + targetOffset.current.x, 0, offsetZ + targetOffset.current.z));
        // создаём threeVec из позиции игрока для проекции
        threeVec.set(playerPos.x, playerPos.y + 1.5, playerPos.z);
        // вычислим экранную позицию игрока при использовании camWorldPos -> для корректного результата нужен camera позиция,
        // поэтому временно установим camera.position в camWorldPos, вычислим projection, а затем вернём (но проще — проецируем через camera используя текущ camera.position,
        // потому что camera.position уже обновится ниже — но мы хотим предотвратить выход — поэтому используем approx: проектируем player относительно текущ camera)
        // Здесь проецируем с текущей camera (это рабочая приближение, обеспечивает удержание в большинстве случаев).
        threeVec.project(camera); // NDC
        // threeVec.x,y in [-1,1]; переводим в 0..1
        const screenX = (threeVec.x + 1) / 2;
        const screenY = (1 - (threeVec.y + 1) / 2); // вверх->0

        // допустимая внутренняя граница
        const minX = screenMargin;
        const maxX = 1 - screenMargin;
        const minY = screenMargin;
        const maxY = 1 - screenMargin;

        // если игрок выходит за границу, корректируем targetOffset в направлении к центру
        let adjustX = 0;
        let adjustZ = 0;
        if (screenX < minX) {
            // сдвинуть камеру влево в мировых координатах => уменьшить targetOffset.x соответствующим образом
            const deficit = minX - screenX; // 0..1
            adjustX += deficit * maxOffsetX;
        } else if (screenX > maxX) {
            const deficit = screenX - maxX;
            adjustX -= deficit * maxOffsetX;
        }

        if (screenY < minY) {
            // если игрок слишком сверху на экране, смещаем камеру вверх/вперед
            const deficit = minY - screenY;
            adjustZ += deficit * maxOffsetZ;
        } else if (screenY > maxY) {
            const deficit = screenY - maxY;
            adjustZ -= deficit * maxOffsetZ;
        }

        // применяем коррекцию к targetOffset
        targetOffset.current.x += adjustX;
        targetOffset.current.z += adjustZ;

        // --- плавно интерполируем dynamicOffset к targetOffset ---
        const lerpFactor = Math.min(1, smoothness * delta);
        dynamicOffset.current.x = THREE.MathUtils.lerp(dynamicOffset.current.x, targetOffset.current.x, lerpFactor);
        dynamicOffset.current.z = THREE.MathUtils.lerp(dynamicOffset.current.z, targetOffset.current.z, lerpFactor);

        // --- итоговая позиция камеры с учётом базовых offset из Leva и динамического смещения ---
        camera.position.copy(currentPosition.current)
            .add(new Vector3(offsetX + dynamicOffset.current.x, 0, offsetZ + dynamicOffset.current.z));

        // --- ориентация камеры (pitch + yaw) как раньше ---
        const rotXRad = (rotateX * Math.PI) / 180;
        const rotYRad = (currentAngle.current * Math.PI) / 180;
        qTempA.setFromAxisAngle(new Vector3(1, 0, 0), -rotXRad);
        qTempB.setFromAxisAngle(new Vector3(0, 1, 0), rotYRad);
        qFinal.multiplyQuaternions(qTempB, qTempA);
        camera.quaternion.copy(qFinal as any);

        // обновляем чей-то интерфейс/лог или игроку сообщаем кватернион
        if (player.setCameraQuaternion) {
            player.setCameraQuaternion(camera.quaternion as Quaternion);
        }
    });

    return null;
};

export default CameraController;
