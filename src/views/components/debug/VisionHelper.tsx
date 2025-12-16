import {useMemo} from 'react';
import {BufferGeometry, Float32BufferAttribute} from 'three';

interface VisionHelperProps {
    fieldOfView: number;
    range: number;
    division?: number;
    color?: string;
    position?: [number, number, number];
    rotation?: [number, number, number];
}

export const VisionHelper = ({
                                 fieldOfView = 120,
                                 range = 20,
                                 division = 8,
                                 color = 'white',
                                 ...rest
                             }: VisionHelperProps) => {

    const geometry = useMemo(() => {
        const geom = new BufferGeometry();
        const positions: number[] = [];

        // Конвертируем градусы в радианы
        const foV05Rad = (fieldOfView / 2) * (Math.PI / 180);
        const stepRad = (fieldOfView / division) * (Math.PI / 180);

        // Создаем веер из треугольников в плоскости XZ
        for (let i = -foV05Rad; i < foV05Rad; i += stepRad) {
            // Треугольник: начало -> точка i -> точка i+step
            positions.push(
                0, 0, 0, // начало
                Math.sin(i) * range, 0, Math.cos(i) * range, // точка i
                Math.sin(i + stepRad) * range, 0, Math.cos(i + stepRad) * range // точка i+step
            );
        }

        geom.setAttribute('position', new Float32BufferAttribute(positions, 3));
        geom.computeVertexNormals();

        return geom;
    }, [fieldOfView, range, division]);

    return (
        <mesh
            geometry={geometry}
            {...rest}
        >
            <meshBasicMaterial
                color={color}
                wireframe
                transparent
                opacity={0.6}
            />
        </mesh>
    );
};
